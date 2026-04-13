import { useRef, useEffect, useCallback, useState } from "react";
import type { RobotState, LidarPoint, WSMessage, RobotConfig } from "@/types/robot";

const MAX_LIDAR_POINTS = 8000;
const MAX_PATH_LENGTH = 500;

function createDefaultRobot(config: RobotConfig): RobotState {
  return {
    id: config.robot_id,
    pose: { x: 0, y: 0, theta: 0 },
    color: config.color,
    path: [],
    connected: true,
    battery: config.battery_capacity,
    lidarPoints: [],
  };
}

function generateSimScan(pose: { x: number; y: number; theta: number }): { angle: number; distance: number }[] {
  const scans: { angle: number; distance: number }[] = [];
  const numRays = 60;
  for (let i = 0; i < numRays; i++) {
    const angle = (i / numRays) * Math.PI * 2;
    const baseDistance = 2 + Math.sin(angle * 3 + pose.x * 0.5) * 1.5 + Math.cos(angle * 2 + pose.y * 0.3) * 1;
    const distance = Math.max(0.3, baseDistance + (Math.random() - 0.5) * 0.4);
    scans.push({ angle, distance });
  }
  return scans;
}

function polarToCartesian(
  robotPose: { x: number; y: number; theta: number },
  angle: number,
  distance: number,
  robotId: string
): LidarPoint {
  const worldAngle = robotPose.theta + angle;
  return {
    x: robotPose.x + Math.cos(worldAngle) * distance,
    y: robotPose.y + Math.sin(worldAngle) * distance,
    robotId,
  };
}

export function useRobotSimulation(configs: RobotConfig[]) {
  const robotsRef = useRef<Map<string, RobotState>>(new Map());
  const [robots, setRobots] = useState<RobotState[]>([]);
  const [allPoints, setAllPoints] = useState<LidarPoint[]>([]);
  const allPointsRef = useRef<LidarPoint[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const simRef = useRef<number>(0);
  const configsRef = useRef(configs);
  configsRef.current = configs;

  // Sync configs: add new robots, update colors, remove deleted ones
  useEffect(() => {
    const map = robotsRef.current;
    const enabledIds = new Set(configs.filter((c) => c.enabled).map((c) => c.robot_id));

    // Remove robots no longer in config
    for (const id of map.keys()) {
      if (!enabledIds.has(id)) map.delete(id);
    }

    // Update colors for existing robots
    configs.forEach((c) => {
      const existing = map.get(c.robot_id);
      if (existing) existing.color = c.color;
    });
  }, [configs]);

  const processMessage = useCallback((msg: WSMessage) => {
    const map = robotsRef.current;
    const cfg = configsRef.current.find((c) => c.robot_id === msg.robot_id);
    if (cfg && !cfg.enabled) return;

    let robot = map.get(msg.robot_id);
    if (!robot) {
      const config = cfg || { robot_id: msg.robot_id, name: msg.robot_id, color: "#888888", radius: 0.3, max_speed: 1, battery_capacity: 100, enabled: true };
      robot = createDefaultRobot(config);
      map.set(msg.robot_id, robot);
    }

    robot.pose = { x: msg.x, y: msg.y, theta: msg.theta };
    robot.path.push({ ...robot.pose });
    if (robot.path.length > MAX_PATH_LENGTH) robot.path.shift();
    robot.battery = Math.max(5, robot.battery - 0.01);
    robot.connected = true;

    if (msg.scans) {
      const newPoints = msg.scans.map((s) =>
        polarToCartesian(robot!.pose, s.angle, s.distance, msg.robot_id)
      );
      allPointsRef.current.push(...newPoints);
      if (allPointsRef.current.length > MAX_LIDAR_POINTS) {
        allPointsRef.current = allPointsRef.current.slice(-MAX_LIDAR_POINTS);
      }
    }
  }, []);

  const flush = useCallback(() => {
    setRobots(Array.from(robotsRef.current.values()).map((r) => ({ ...r, path: [...r.path] })));
    setAllPoints([...allPointsRef.current]);
  }, []);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let simulating = false;

    try {
      ws = new WebSocket("ws://localhost:8000/ws");
      wsRef.current = ws;
      ws.onmessage = (e) => {
        try {
          const msg: WSMessage = JSON.parse(e.data);
          processMessage(msg);
        } catch {}
      };
      ws.onerror = () => { if (!simulating) startSimulation(); };
      ws.onclose = () => { if (!simulating) startSimulation(); };
    } catch {
      startSimulation();
    }

    function startSimulation() {
      simulating = true;
      const time = { t: 0 };

      const simInterval = setInterval(() => {
        time.t += 0.05;
        const enabled = configsRef.current.filter((c) => c.enabled);
        enabled.forEach((cfg, idx) => {
          const phase = (idx * Math.PI * 2) / Math.max(enabled.length, 1);
          const radius = 2 + idx * 0.8;
          const speed = 0.3 + idx * 0.1;
          const x = Math.cos(time.t * speed + phase) * radius + Math.sin(time.t * speed * 0.3) * 0.5;
          const y = Math.sin(time.t * speed + phase) * radius + Math.cos(time.t * speed * 0.4) * 0.5;
          const theta = time.t * speed + phase + Math.PI / 2;

          const scans = generateSimScan({ x, y, theta });
          processMessage({ robot_id: cfg.robot_id, x, y, theta, scans });
        });
        flush();
      }, 100);

      simRef.current = simInterval as unknown as number;
    }

    const flushInterval = setInterval(flush, 100);

    return () => {
      ws?.close();
      clearInterval(flushInterval);
      if (simRef.current) clearInterval(simRef.current);
    };
  }, [processMessage, flush]);

  const clearPoints = useCallback(() => {
    allPointsRef.current = [];
    setAllPoints([]);
  }, []);

  const resetMap = useCallback(() => {
    robotsRef.current.clear();
    allPointsRef.current = [];
    setRobots([]);
    setAllPoints([]);
  }, []);

  return { robots, allPoints, clearPoints, resetMap };
}
