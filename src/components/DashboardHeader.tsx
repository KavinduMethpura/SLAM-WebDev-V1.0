import type { RobotConfig } from "@/types/robot";
import RobotConfigManager from "@/components/RobotConfigManager";

interface Props {
  configs: RobotConfig[];
  onAdd: (config: RobotConfig) => void;
  onUpdate: (robot_id: string, updates: Partial<RobotConfig>) => void;
  onRemove: (robot_id: string) => void;
  onExport: () => void;
  onImport: (json: string) => void;
}

export default function DashboardHeader({ configs, onAdd, onUpdate, onRemove, onExport, onImport }: Props) {
  return (
    <header className="h-12 flex items-center px-5 border-b border-border bg-card shrink-0">
      <div className="flex items-center gap-3">
        <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse-glow" />
        <h1 className="text-sm font-bold tracking-wide text-foreground uppercase">
          Multi-Robot SLAM Visualization Dashboard
        </h1>
      </div>
      <div className="ml-auto flex items-center gap-3">
        <span className="text-xs text-muted-foreground">
          {configs.filter((c) => c.enabled).length} robots active
        </span>
        <RobotConfigManager
          configs={configs}
          onAdd={onAdd}
          onUpdate={onUpdate}
          onRemove={onRemove}
          onExport={onExport}
          onImport={onImport}
        />
      </div>
    </header>
  );
}
