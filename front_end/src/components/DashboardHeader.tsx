import type { RobotConfig } from "@/types/robot";
import RobotConfigManager from "@/components/RobotConfigManager";

type ConfigAction = (config: RobotConfig) => Promise<void>;
type UpdateAction = (
  robot_id: string,
  updates: Partial<RobotConfig>,
) => Promise<void>;
type RemoveAction = (robot_id: string) => Promise<void>;
type ImportAction = (json: string) => Promise<void>;

interface Props {
  configs: RobotConfig[];
  onAdd: ConfigAction;
  onUpdate: UpdateAction;
  onRemove: RemoveAction;
  onExport: () => void;
  onImport: ImportAction;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
}

export default function DashboardHeader({
  configs,
  onAdd,
  onUpdate,
  onRemove,
  onExport,
  onImport,
  isLoading,
  isSaving,
  error,
}: Readonly<Props>) {
  return (
    <header className="h-12 flex items-center px-5 border-b border-border bg-card shrink-0">
      <div className="flex items-center gap-3">
        <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse-glow" />
        <h1 className="text-sm font-bold tracking-wide text-foreground uppercase">
          Multi-Robot SLAM Visualization Dashboard
        </h1>
      </div>
      <div className="ml-auto flex items-center gap-3">
        {isLoading && (
          <span className="text-xs text-muted-foreground">
            Loading robots...
          </span>
        )}
        {isSaving && (
          <span className="text-xs text-muted-foreground">Syncing...</span>
        )}
        {!isLoading && error && (
          <span className="text-xs text-destructive max-w-64 truncate">
            {error}
          </span>
        )}
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
