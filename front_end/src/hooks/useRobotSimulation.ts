import { useRef, useEffect, useCallback, useState } from "react";
import type {
  RobotState,
  LidarPoint,
  WSMessage,
} from "@/types/robot";

const MAX_LIDAR_POINTS = 8000;
const MAX_PATH_LENGTH = 500;
const WS_BASE_URL = (
  import.meta.env.VITE_WS_BASE_URL ?? "ws://localhost:8000"
).trim();

function normalizeWsBase(baseUrl: string): string {
  return baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
}

function polarToCartesian(
  robotPose: { x: number; y: number; theta: number },
  angle: number,
  distance: number,
  robotId: string,
): LidarPoint {
  const worldAngle = robotPose.theta + angle;
  return {
    x: robotPose.x + Math.cos(worldAngle) * distance,
    y: robotPose.y + Math.sin(worldAngle) * distance,
    robotId,
  };
}

export function useRobotSimulation() {
  const [robot, setRobot] = useState<RobotState>({
    id: "ROBOT-01",
    pose: { x: 0, y: 0, theta: 0 },
    color: "#22c55e",
    path: [],
    connected: false,
    battery: 100,
    lidarPoints: [],
  });
  const robotRef = useRef<RobotState>({
    id: "ROBOT-01",
    pose: { x: 0, y: 0, theta: 0 },
    color: "#22c55e",
    path: [],
    connected: false,
    battery: 100,
    lidarPoints: [],
  });
  const [allPoints, setAllPoints] = useState<LidarPoint[]>([]);
  const allPointsRef = useRef<LidarPoint[]>([]);
  const exploredCellsRef = useRef<Set<string>>(new Set());
  const wsRef = useRef<WebSocket | null>(null);

  const processMessage = useCallback((msg: WSMessage) => {
    const r = robotRef.current;
    r.pose = { x: msg.x, y: msg.y, theta: msg.theta };
    r.path.push({ ...r.pose });
    if (r.path.length > MAX_PATH_LENGTH) r.path.shift();
    r.connected = true;

    if (msg.scans) {
      // 1. Ray-trace to accumulate explored free space cells (empty area grid boxes)
      const GRID_SIZE = 0.2;
      const MAX_TRACE_DIST = 2.5;
      const x0 = msg.x;
      const y0 = msg.y;
      
      // Explore current robot position cell
      exploredCellsRef.current.add(
        `${Math.floor(x0 / GRID_SIZE)},${Math.floor(y0 / GRID_SIZE)}`
      );

      msg.scans.forEach((s) => {
        const worldAngle = r.pose.theta + s.angle;
        const hasObstacle = s.distance > 0;
        const step = GRID_SIZE * 0.5;
        // Stop ray-tracing just before the obstacle cell to keep the obstacle cell occupied
        const maxDist = hasObstacle ? s.distance - step : MAX_TRACE_DIST;
        
        for (let d = 0; d < maxDist; d += step) {
          const sx = x0 + Math.cos(worldAngle) * d;
          const sy = y0 + Math.sin(worldAngle) * d;
          const col = Math.floor(sx / GRID_SIZE);
          const row = Math.floor(sy / GRID_SIZE);
          exploredCellsRef.current.add(`${col},${row}`);
        }
      });

      // 2. Filter out out-of-range lidar rays (distance <= 0, e.g. -1.0) so they don't get drawn as fake obstacles
      const validScans = msg.scans.filter((s) => s.distance > 0);
      const newPoints = validScans.map((s) =>
        polarToCartesian(r.pose, s.angle, s.distance, "ROBOT-01"),
      );
      allPointsRef.current.push(...newPoints);
      if (allPointsRef.current.length > MAX_LIDAR_POINTS) {
        allPointsRef.current = allPointsRef.current.slice(-MAX_LIDAR_POINTS);
      }
    }
  }, []);

  const flush = useCallback(() => {
    setRobot({
      ...robotRef.current,
      path: [...robotRef.current.path],
    });
    setAllPoints([...allPointsRef.current]);
  }, []);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimeout: number;
    const wsUrl = `${normalizeWsBase(WS_BASE_URL)}/ws`;

    function connect() {
      try {
        ws = new WebSocket(wsUrl);
        wsRef.current = ws;
        
        ws.onmessage = (e) => {
          try {
            const msg: WSMessage = JSON.parse(e.data);
            processMessage(msg);
          } catch {}
        };
        
        ws.onclose = () => {
          // Mark offline and schedule reconnect
          setRobot((prev) => ({ ...prev, connected: false }));
          reconnectTimeout = window.setTimeout(connect, 3000);
        };
        
        ws.onerror = () => {
          ws?.close();
        };
      } catch {
        reconnectTimeout = window.setTimeout(connect, 3000);
      }
    }

    connect();

    const flushInterval = setInterval(flush, 100);

    return () => {
      ws?.close();
      clearTimeout(reconnectTimeout);
      clearInterval(flushInterval);
    };
  }, [processMessage, flush]);

  const clearPoints = useCallback(() => {
    allPointsRef.current = [];
    exploredCellsRef.current.clear();
    setAllPoints([]);
  }, []);

  const resetMap = useCallback(() => {
    robotRef.current = {
      id: "ROBOT-01",
      pose: { x: 0, y: 0, theta: 0 },
      color: "#22c55e",
      path: [],
      connected: false,
      battery: 100,
      lidarPoints: [],
    };
    allPointsRef.current = [];
    exploredCellsRef.current.clear();
    setRobot({
      id: "ROBOT-01",
      pose: { x: 0, y: 0, theta: 0 },
      color: "#22c55e",
      path: [],
      connected: false,
      battery: 100,
      lidarPoints: [],
    });
    setAllPoints([]);
  }, []);

  return {
    robot,
    allPoints,
    exploredCells: exploredCellsRef.current,
    clearPoints,
    resetMap,
  };
}
