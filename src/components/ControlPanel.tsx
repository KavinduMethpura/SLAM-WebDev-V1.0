import type { RobotState } from "@/types/robot";

interface Props {
  robots: RobotState[];
  pointCount: number;
  onClearPoints: () => void;
  onResetMap: () => void;
}

function StatusDot({ connected }: { connected: boolean }) {
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full ${
        connected ? "bg-primary animate-pulse-glow" : "bg-destructive"
      }`}
    />
  );
}

function BatteryBar({ level }: { level: number }) {
  const color =
    level > 50 ? "bg-primary" : level > 20 ? "bg-accent" : "bg-destructive";
  return (
    <div className="w-full h-2 rounded-sm bg-muted overflow-hidden">
      <div
        className={`h-full rounded-sm transition-all ${color}`}
        style={{ width: `${Math.min(100, level)}%` }}
      />
    </div>
  );
}

export default function ControlPanel({
  robots,
  pointCount,
  onClearPoints,
  onResetMap,
}: Props) {
  return (
    <aside className="w-72 min-w-[280px] bg-card border-l border-border flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Robot Status
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          {robots.length} robot{robots.length !== 1 ? "s" : ""} · {pointCount.toLocaleString()} pts
        </p>
      </div>

      {/* Robot cards */}
      <div className="flex-1 p-3 space-y-3">
        {robots.map((robot) => (
          <div
            key={robot.id}
            className="rounded-md bg-secondary p-3 space-y-2"
          >
            <div className="flex items-center justify-between">
              <span
                className="text-sm font-bold"
                style={{ color: robot.color }}
              >
                {robot.id}
              </span>
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

            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Battery</span>
                <span className="text-foreground">
                  {robot.battery.toFixed(0)}%
                </span>
              </div>
              <BatteryBar level={robot.battery} />
            </div>

            <div className="flex gap-2 pt-1">
              <button className="flex-1 text-xs py-1.5 rounded bg-primary text-primary-foreground hover:opacity-90 transition-opacity font-medium">
                Start
              </button>
              <button className="flex-1 text-xs py-1.5 rounded bg-muted text-foreground hover:bg-muted/80 transition-colors font-medium">
                Stop
              </button>
            </div>
          </div>
        ))}

        {robots.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-8">
            Waiting for robots…
          </p>
        )}
      </div>

      {/* Global controls */}
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
