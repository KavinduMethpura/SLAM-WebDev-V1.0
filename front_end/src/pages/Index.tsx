import DashboardHeader from "@/components/DashboardHeader";
import SlamCanvas from "@/components/SlamCanvas";
import ControlPanel from "@/components/ControlPanel";
import { useRobotSimulation } from "@/hooks/useRobotSimulation";
import { useRobotConfigs } from "@/hooks/useRobotConfigs";
import { useEffect, useState, useCallback } from "react";
import { getSimulatorStatus, startSimulator, stopSimulator } from "@/lib/api";

export default function Index() {
  const {
    configs,
    addConfig,
    updateConfig,
    removeConfig,
    exportConfigs,
    importConfigs,
    isLoading,
    isSaving,
    error,
  } = useRobotConfigs();
  const { robots, allPoints, clearPoints, resetMap } =
    useRobotSimulation(configs);
  const [simulatorRunning, setSimulatorRunning] = useState(false);
  const [simulatorBusy, setSimulatorBusy] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadSimulatorStatus() {
      try {
        const status = await getSimulatorStatus();
        if (active) setSimulatorRunning(status.running);
      } catch {
        if (active) setSimulatorRunning(false);
      }
    }

    void loadSimulatorStatus();
    return () => {
      active = false;
    };
  }, []);

  const handleStartSimulator = useCallback(async () => {
    setSimulatorBusy(true);
    try {
      const status = await startSimulator();
      setSimulatorRunning(status.running);
    } finally {
      setSimulatorBusy(false);
    }
  }, []);

  const handleStopSimulator = useCallback(async () => {
    setSimulatorBusy(true);
    try {
      const status = await stopSimulator();
      setSimulatorRunning(status.running);
    } finally {
      setSimulatorBusy(false);
    }
  }, []);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <DashboardHeader
        configs={configs}
        onAdd={addConfig}
        onUpdate={updateConfig}
        onRemove={removeConfig}
        onExport={exportConfigs}
        onImport={importConfigs}
        isLoading={isLoading}
        isSaving={isSaving}
        error={error}
      />
      <div className="flex flex-1 min-h-0">
        <main className="flex-1 relative">
          <SlamCanvas robots={robots} lidarPoints={allPoints} />
        </main>
        <ControlPanel
          robots={robots}
          configs={configs}
          pointCount={allPoints.length}
          simulatorRunning={simulatorRunning}
          simulatorBusy={simulatorBusy}
          onStartSimulator={handleStartSimulator}
          onStopSimulator={handleStopSimulator}
          onClearPoints={clearPoints}
          onResetMap={resetMap}
        />
      </div>
    </div>
  );
}
