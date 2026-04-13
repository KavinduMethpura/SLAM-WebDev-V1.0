export default function DashboardHeader() {
  return (
    <header className="h-12 flex items-center px-5 border-b border-border bg-card shrink-0">
      <div className="flex items-center gap-3">
        <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse-glow" />
        <h1 className="text-sm font-bold tracking-wide text-foreground uppercase">
          Multi-Robot SLAM Visualization Dashboard
        </h1>
      </div>
      <span className="ml-auto text-xs text-muted-foreground">
        ws://localhost:8000/ws
      </span>
    </header>
  );
}
