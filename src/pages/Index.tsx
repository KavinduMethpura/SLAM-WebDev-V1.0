import DashboardHeader from "@/components/DashboardHeader";
import SlamCanvas from "@/components/SlamCanvas";
import ControlPanel from "@/components/ControlPanel";
import { useRobotSimulation } from "@/hooks/useRobotSimulation";

export default function Index() {
  const { robots, allPoints, clearPoints, resetMap } = useRobotSimulation();

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <DashboardHeader />
      <div className="flex flex-1 min-h-0">
        <main className="flex-1 relative">
          <SlamCanvas robots={robots} lidarPoints={allPoints} />
        </main>
        <ControlPanel
          robots={robots}
          pointCount={allPoints.length}
          onClearPoints={clearPoints}
          onResetMap={resetMap}
        />
      </div>
    </div>
  );
}
