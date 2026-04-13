import { useState, useCallback, useEffect } from "react";
import type { RobotConfig } from "@/types/robot";

const STORAGE_KEY = "robots_config";

const DEFAULT_CONFIGS: RobotConfig[] = [
  { robot_id: "ROBOT-01", name: "Scout Alpha", color: "#22dd66", radius: 0.3, max_speed: 1.5, battery_capacity: 100, enabled: true },
  { robot_id: "ROBOT-02", name: "Scout Beta", color: "#22ccdd", radius: 0.3, max_speed: 1.2, battery_capacity: 100, enabled: true },
  { robot_id: "ROBOT-03", name: "Scout Gamma", color: "#ddcc22", radius: 0.25, max_speed: 1.8, battery_capacity: 100, enabled: true },
];

function loadConfigs(): RobotConfig[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return DEFAULT_CONFIGS;
}

function saveConfigs(configs: RobotConfig[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(configs));
}

export function useRobotConfigs() {
  const [configs, setConfigs] = useState<RobotConfig[]>(loadConfigs);

  useEffect(() => {
    saveConfigs(configs);
  }, [configs]);

  const addConfig = useCallback((config: RobotConfig) => {
    setConfigs((prev) => {
      if (prev.some((c) => c.robot_id === config.robot_id)) return prev;
      return [...prev, config];
    });
  }, []);

  const updateConfig = useCallback((robot_id: string, updates: Partial<RobotConfig>) => {
    setConfigs((prev) =>
      prev.map((c) => (c.robot_id === robot_id ? { ...c, ...updates } : c))
    );
  }, []);

  const removeConfig = useCallback((robot_id: string) => {
    setConfigs((prev) => prev.filter((c) => c.robot_id !== robot_id));
  }, []);

  const exportConfigs = useCallback(() => {
    const blob = new Blob([JSON.stringify(configs, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "robots.json";
    a.click();
    URL.revokeObjectURL(url);
  }, [configs]);

  const importConfigs = useCallback((json: string) => {
    try {
      const parsed = JSON.parse(json) as RobotConfig[];
      if (Array.isArray(parsed)) setConfigs(parsed);
    } catch {}
  }, []);

  return { configs, addConfig, updateConfig, removeConfig, exportConfigs, importConfigs };
}
