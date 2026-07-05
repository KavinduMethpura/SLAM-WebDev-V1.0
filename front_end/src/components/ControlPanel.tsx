import { useState, useEffect, useRef } from "react";
import type { RobotState } from "@/types/robot";
import { sendRobotCommand } from "@/lib/api";

interface Props {
  robot: RobotState;
  pointCount: number;
  onClearPoints: () => void;
  onResetMap: () => void;
}

function StatusDot({ connected }: Readonly<{ connected: boolean }>) {
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full ${
        connected ? "bg-primary animate-pulse-glow" : "bg-destructive"
      }`}
    />
  );
}

export default function ControlPanel({
  robot,
  pointCount,
  onClearPoints,
  onResetMap,
}: Readonly<Props>) {
  const [kbDriveActive, setKbDriveActive] = useState(false);
  const [currentSpeed, setCurrentSpeed] = useState({ linear: 0.0, angular: 0.0 });
  const velRef = useRef({ linear: 0.0, angular: 0.0 });

  const handleRobotCmd = async (cmd: string) => {
    try {
      await sendRobotCommand(cmd);
    } catch (err) {
      console.error("Failed to send command:", err);
    }
  };

  useEffect(() => {
    if (!kbDriveActive) {
      if (velRef.current.linear !== 0.0 || velRef.current.angular !== 0.0) {
        velRef.current = { linear: 0.0, angular: 0.0 };
        setCurrentSpeed({ linear: 0.0, angular: 0.0 });
        void handleRobotCmd("V,0.0,0.0");
      }
      return;
    }

    const LINEAR_STEP = 0.05;
    const ANGULAR_STEP = 0.1;
    const MAX_LINEAR = 0.4;
    const MAX_ANGULAR = 0.8;

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      let changed = false;

      if (key === "w") {
        velRef.current.linear = parseFloat(
          Math.min(velRef.current.linear + LINEAR_STEP, MAX_LINEAR).toFixed(2)
        );
        changed = true;
      } else if (key === "s") {
        velRef.current.linear = parseFloat(
          Math.max(velRef.current.linear - LINEAR_STEP, -MAX_LINEAR).toFixed(2)
        );
        changed = true;
      } else if (key === "a") {
        velRef.current.angular = parseFloat(
          Math.min(velRef.current.angular + ANGULAR_STEP, MAX_ANGULAR).toFixed(2)
        );
        changed = true;
      } else if (key === "d") {
        velRef.current.angular = parseFloat(
          Math.max(velRef.current.angular - ANGULAR_STEP, -MAX_ANGULAR).toFixed(2)
        );
        changed = true;
      } else if (key === " " || key === "x") {
        velRef.current = { linear: 0.0, angular: 0.0 };
        changed = true;
        e.preventDefault(); // prevent page scroll on Space
      }

      if (changed) {
        const payload = `V,${velRef.current.linear},${velRef.current.angular}`;
        setCurrentSpeed({ linear: velRef.current.linear, angular: velRef.current.angular });
        void handleRobotCmd(payload);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [kbDriveActive]);

  return (
    <aside className="w-72 min-w-[280px] bg-card border-l border-border flex flex-col overflow-y-auto">
      <div className="p-4 border-b border-border">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Robot Status
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          1 Robot Connected · {pointCount.toLocaleString()} pts
        </p>
      </div>

      <div className="flex-1 p-3 space-y-3">
        <div className="rounded-md bg-secondary p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <span
                className="text-sm font-bold"
                style={{ color: robot.color }}
              >
                Atlas
              </span>
              <span className="text-[10px] text-muted-foreground ml-1.5">
                ROBOT-01
              </span>
            </div>
            <StatusDot connected={robot.connected} />
          </div>

          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>X</span>
            <span className="text-foreground text-right">
              {robot.pose.x.toFixed(2)} m
            </span>
            <span>Y</span>
            <span className="text-foreground text-right">
              {robot.pose.y.toFixed(2)} m
            </span>
            <span>θ</span>
            <span className="text-foreground text-right">
              {((robot.pose.theta * 180) / Math.PI).toFixed(1)}°
            </span>
          </div>
        </div>
      </div>

      {/* Real Robot Controls */}
      <div className="p-3 border-t border-border space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Real Robot (ROBOT-01)</span>
          <span
            className={`text-xs ${
              robot.connected ? "text-primary font-bold animate-pulse" : "text-muted-foreground"
            }`}
          >
            {robot.connected ? "Online" : "Offline"}
          </span>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => void handleRobotCmd("C,I")}
            className="text-xs py-2 rounded bg-emerald-600 text-white hover:bg-emerald-500 transition-colors font-medium"
          >
            Start Alg (I)
          </button>
          <button
            onClick={() => void handleRobotCmd("C,S")}
            className="text-xs py-2 rounded bg-destructive text-destructive-foreground hover:opacity-90 transition-opacity font-medium"
          >
            Stop Robot (S)
          </button>
          <button
            onClick={() => void handleRobotCmd("C,R")}
            className="text-xs py-2 rounded bg-muted text-foreground hover:bg-muted/80 transition-colors font-medium"
          >
            Reset Odom (R)
          </button>
          <button
            onClick={() => void handleRobotCmd("C,C")}
            className="text-xs py-2 rounded bg-muted text-foreground hover:bg-muted/80 transition-colors font-medium"
          >
            Calib Gyro (C)
          </button>
        </div>

        {/* Keyboard Drive Mode */}
        <div className="pt-2 border-t border-border">
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-xs font-medium text-foreground">Keyboard Drive (WASD)</span>
            <input
              type="checkbox"
              checked={kbDriveActive}
              onChange={(e) => setKbDriveActive(e.target.checked)}
              className="w-4 h-4 rounded border-border text-primary focus:ring-primary accent-primary cursor-pointer"
            />
          </label>
          
          {kbDriveActive && (
            <div className="mt-2 p-2 bg-secondary rounded text-[10px] space-y-1 text-muted-foreground border border-primary/20">
              <p className="font-bold text-foreground">Active Drive Keys:</p>
              <p>• <span className="text-primary font-bold">W / S</span> : Forward / Backward</p>
              <p>• <span className="text-primary font-bold">A / D</span> : Turn Left / Right</p>
              <p>• <span className="text-primary font-bold">Space / X</span> : Stop Robot</p>
              <p className="text-[9px] text-destructive/70 italic">Keep this browser tab focused.</p>
              <div className="flex justify-between text-xs text-foreground font-mono mt-1 pt-1 border-t border-border">
                <span>L: {currentSpeed.linear.toFixed(2)} m/s</span>
                <span>A: {currentSpeed.angular.toFixed(2)} rad/s</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="p-3 border-t border-border space-y-2">
        <button
          onClick={onResetMap}
          className="w-full text-xs py-2 rounded bg-destructive text-destructive-foreground hover:opacity-90 transition-opacity font-medium"
        >
          Reset Map
        </button>
        <button
          onClick={onClearPoints}
          className="w-full text-xs py-2 rounded bg-muted text-foreground hover:bg-muted/80 transition-colors font-medium"
        >
          Clear Points
        </button>
      </div>
    </aside>
  );
}
