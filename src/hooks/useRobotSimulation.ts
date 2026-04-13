import { useRef, useEffect, useCallback, useState } from "react";
import type { RobotState, LidarPoint, WSMessage } from "@/types/robot";

const ROBOT_COLORS = ["#22dd66", "#22ccdd", "#ddcc22", "#dd44cc", "#dd7722"];
const MAX_LIDAR_POINTS = 8000;
const MAX_PATH_LENGTH = 500;

function createDefaultRobot(id: string, colorIdx: number): RobotState {
  return {
    id,
    pose: { x: 0, y: 0, theta: 0 },
    color: ROBOT_COLORS[colorIdx % ROBOT_COLORS.length],
    path: [],
    connected: true,
    battery: 70 + Math.random() * 30,
    lidarPoints: [],
  };
}

function generateSimScan(pose: { x: number; y: number; theta: number }): { angle: number; distance: number }[] {
  const scans: { angle: number; distance: number }[] = [];
  const numRays = 60;
  for (let i = 0; i < numRays; i++) {
    const angle = (i / numRays) * Math.PI * 2;
    // simulate walls / obstacles with noise
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

export function useRobotSimulation() {
  const robotsRef = useRef<Map<string, RobotState>>(new Map());
  const [robots, setRobots] = useState<RobotState[]>([]);
  const [allPoints, setAllPoints] = useState<LidarPoint[]>([]);
  const allPointsRef = useRef<LidarPoint[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const simRef = useRef<number>(0);

  const processMessage = useCallback((msg: WSMessage) => {
    const map = robotsRef.current;
    let robot = map.get(msg.robot_id);
    if (!robot) {
      robot = createDefaultRobot(msg.robot_id, map.size);
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

  // Try WebSocket, fall back to simulation
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
      ws.onerror = () => {
        if (!simulating) startSimulation();
      };
      ws.onclose = () => {
        if (!simulating) startSimulation();
      };
    } catch {
      startSimulation();
    }

    function startSimulation() {
      simulating = true;
      const robotIds = ["ROBOT-01", "ROBOT-02", "ROBOT-03"];
      const time = { t: 0 };

      const simInterval = setInterval(() => {
        time.t += 0.05;
        robotIds.forEach((id, idx) => {
          const phase = (idx * Math.PI * 2) / 3;
          const radius = 2 + idx * 0.8;
          const speed = 0.3 + idx * 0.1;
          const x = Math.cos(time.t * speed + phase) * radius + Math.sin(time.t * speed * 0.3) * 0.5;
          const y = Math.sin(time.t * speed + phase) * radius + Math.cos(time.t * speed * 0.4) * 0.5;
          const theta = time.t * speed + phase + Math.PI / 2;

          const scans = generateSimScan({ x, y, theta });
          processMessage({ robot_id: id, x, y, theta, scans });
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
