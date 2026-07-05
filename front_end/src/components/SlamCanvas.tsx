import { useRef, useEffect, useCallback } from "react";
import type { RobotState, LidarPoint } from "@/types/robot";

interface Props {
  robots: RobotState[];
  lidarPoints: LidarPoint[];
  exploredCells: Set<string>;
}

const GRID_COLOR = "rgba(34,221,102,0.12)";
const GRID_COLOR_AXIS = "rgba(34,221,102,0.35)";
const BG_COLOR = "#0a0e14";
const ORIGIN_COLOR = "#22dd66";
const POINT_ALPHA = 0.5;
const METERS_PER_GRID = 1;

export default function SlamCanvas({ robots, lidarPoints, exploredCells }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewRef = useRef({ offsetX: 0, offsetY: 0, scale: 60 }); // px per meter
  const dragRef = useRef<{ dragging: boolean; lastX: number; lastY: number }>({
    dragging: false,
    lastX: 0,
    lastY: 0,
  });
  const animRef = useRef<number>(0);
  const dataRef = useRef({ robots, lidarPoints, exploredCells });
  dataRef.current = { robots, lidarPoints, exploredCells };

  const worldToScreen = useCallback(
    (wx: number, wy: number) => {
      const v = viewRef.current;
      const canvas = canvasRef.current!;
      return {
        sx: canvas.width / 2 + (wx * v.scale) + v.offsetX,
        sy: canvas.height / 2 - (wy * v.scale) + v.offsetY,
      };
    },
    []
  );

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const w = canvas.width;
    const h = canvas.height;
    const v = viewRef.current;

    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, w, h);

    // Grid
    const gridPx = METERS_PER_GRID * v.scale;
    if (gridPx > 8) {
      const cx = w / 2 + v.offsetX;
      const cy = h / 2 + v.offsetY;

      const startX = cx % gridPx;
      const startY = cy % gridPx;

      ctx.lineWidth = 1;
      for (let x = startX; x < w; x += gridPx) {
        const isAxis = Math.abs(x - cx) < 1;
        ctx.strokeStyle = isAxis ? GRID_COLOR_AXIS : GRID_COLOR;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = startY; y < h; y += gridPx) {
        const isAxis = Math.abs(y - cy) < 1;
        ctx.strokeStyle = isAxis ? GRID_COLOR_AXIS : GRID_COLOR;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
    }

    // Origin
    const origin = worldToScreen(0, 0);
    ctx.fillStyle = ORIGIN_COLOR;
    ctx.beginPath();
    ctx.arc(origin.sx, origin.sy, 4, 0, Math.PI * 2);
    ctx.fill();

    // Explored Occupancy Grid Cells
    const { robots: robs, lidarPoints: pts, exploredCells: explored } = dataRef.current;
    if (explored && explored.size > 0) {
      const GRID_SIZE = 0.2;
      ctx.fillStyle = "rgba(34, 221, 102, 0.08)"; // Beautiful semi-transparent neon green
      explored.forEach((cellKey) => {
        const [colStr, rowStr] = cellKey.split(",");
        const col = parseInt(colStr, 10);
        const row = parseInt(rowStr, 10);
        
        const wx = col * GRID_SIZE;
        const wy = row * GRID_SIZE;
        
        const screenPos = worldToScreen(wx, wy);
        const cellSizePx = GRID_SIZE * v.scale;
        
        // Fill square (worldToScreen flips Y axis, so cell bottom-left is screen top-left)
        ctx.fillRect(screenPos.sx, screenPos.sy - cellSizePx, cellSizePx, cellSizePx);
      });
    }

    // LiDAR points
    const robotColorMap = new Map<string, string>();
    robs.forEach((r) => robotColorMap.set(r.id, r.color));

    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      const { sx, sy } = worldToScreen(p.x, p.y);
      if (sx < -5 || sx > w + 5 || sy < -5 || sy > h + 5) continue;
      const color = robotColorMap.get(p.robotId) || "#888";
      ctx.fillStyle = color;
      ctx.globalAlpha = POINT_ALPHA;
      ctx.fillRect(sx - 1, sy - 1, 2, 2);
    }
    ctx.globalAlpha = 1;

    // Robots
    robs.forEach((robot) => {
      // Path
      if (robot.path.length > 1) {
        ctx.strokeStyle = robot.color;
        ctx.globalAlpha = 0.4;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        const first = worldToScreen(robot.path[0].x, robot.path[0].y);
        ctx.moveTo(first.sx, first.sy);
        for (let i = 1; i < robot.path.length; i++) {
          const p = worldToScreen(robot.path[i].x, robot.path[i].y);
          ctx.lineTo(p.sx, p.sy);
        }
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // Robot marker
      const { sx, sy } = worldToScreen(robot.pose.x, robot.pose.y);
      const r = 10;
      ctx.fillStyle = robot.color;
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fill();

      // Direction arrow
      const arrowLen = r + 8;
      const ax = sx + Math.cos(-robot.pose.theta) * arrowLen;
      const ay = sy + Math.sin(-robot.pose.theta) * arrowLen;
      ctx.strokeStyle = robot.color;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(ax, ay);
      ctx.stroke();

      // Arrowhead
      const headLen = 6;
      const headAngle = 0.5;
      const angle = Math.atan2(ay - sy, ax - sx);
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(
        ax - headLen * Math.cos(angle - headAngle),
        ay - headLen * Math.sin(angle - headAngle)
      );
      ctx.moveTo(ax, ay);
      ctx.lineTo(
        ax - headLen * Math.cos(angle + headAngle),
        ay - headLen * Math.sin(angle + headAngle)
      );
      ctx.stroke();

      // Label
      ctx.fillStyle = robot.color;
      ctx.font = "10px monospace";
      ctx.fillText(robot.id, sx + r + 4, sy - r);
    });

    // Scale indicator
    const scaleMeters = 1;
    const scalePx = scaleMeters * v.scale;
    if (scalePx > 10 && scalePx < w / 2) {
      ctx.strokeStyle = "rgba(255,255,255,0.4)";
      ctx.lineWidth = 2;
      const sx2 = w - 20;
      const sy2 = h - 20;
      ctx.beginPath();
      ctx.moveTo(sx2 - scalePx, sy2);
      ctx.lineTo(sx2, sy2);
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.font = "10px monospace";
      ctx.fillText(`${scaleMeters}m`, sx2 - scalePx / 2 - 8, sy2 - 6);
    }

    animRef.current = requestAnimationFrame(draw);
  }, [worldToScreen]);

  // Resize
  useEffect(() => {
    const canvas = canvasRef.current!;
    const resize = () => {
      const parent = canvas.parentElement!;
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  // Animation loop
  useEffect(() => {
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [draw]);

  // Mouse handlers
  useEffect(() => {
    const canvas = canvasRef.current!;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 0.9 : 1.1;
      viewRef.current.scale *= factor;
      viewRef.current.scale = Math.max(5, Math.min(500, viewRef.current.scale));
    };
    const onDown = (e: MouseEvent) => {
      dragRef.current = { dragging: true, lastX: e.clientX, lastY: e.clientY };
    };
    const onMove = (e: MouseEvent) => {
      if (!dragRef.current.dragging) return;
      viewRef.current.offsetX += e.clientX - dragRef.current.lastX;
      viewRef.current.offsetY += e.clientY - dragRef.current.lastY;
      dragRef.current.lastX = e.clientX;
      dragRef.current.lastY = e.clientY;
    };
    const onUp = () => {
      dragRef.current.dragging = false;
    };

    canvas.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("mousedown", onDown);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="block w-full h-full cursor-grab active:cursor-grabbing"
      style={{ touchAction: "none" }}
    />
  );
}
