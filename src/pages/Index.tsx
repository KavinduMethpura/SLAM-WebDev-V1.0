import DashboardHeader from "@/components/DashboardHeader";
import SlamCanvas from "@/components/SlamCanvas";
import ControlPanel from "@/components/ControlPanel";
import { useRobotSimulation } from "@/hooks/useRobotSimulation";
import { useRobotConfigs } from "@/hooks/useRobotConfigs";

export default function Index() {
  const { configs, addConfig, updateConfig, removeConfig, exportConfigs, importConfigs } = useRobotConfigs();
  const { robots, allPoints, clearPoints, resetMap } = useRobotSimulation(configs);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <DashboardHeader
        configs={configs}
        onAdd={addConfig}
        onUpdate={updateConfig}
        onRemove={removeConfig}
        onExport={exportConfigs}
        onImport={importConfigs}
      />
      <div className="flex flex-1 min-h-0">
        <main className="flex-1 relative">
          <SlamCanvas robots={robots} lidarPoints={allPoints} />
        </main>
        <ControlPanel
          robots={robots}
          configs={configs}
          pointCount={allPoints.length}
          onClearPoints={clearPoints}
          onResetMap={resetMap}
        />
      </div>
    </div>
  );
}
