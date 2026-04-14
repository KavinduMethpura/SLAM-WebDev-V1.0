import { useState, useCallback, useEffect } from "react";
import type { RobotConfig } from "@/types/robot";
import { createRobot, deleteRobot, listRobots, updateRobot } from "@/lib/api";

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return "Unexpected error while syncing robot configs";
}

export function useRobotConfigs() {
  const [configs, setConfigs] = useState<RobotConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshConfigs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const robots = await listRobots();
      setConfigs(robots);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshConfigs();
  }, [refreshConfigs]);

  const addConfig = useCallback(async (config: RobotConfig) => {
    setIsSaving(true);
    setError(null);
    try {
      const created = await createRobot(config);
      setConfigs((prev) => [...prev, created]);
    } catch (err) {
      const message = errorMessage(err);
      setError(message);
      throw new Error(message);
    } finally {
      setIsSaving(false);
    }
  }, []);

  const updateConfig = useCallback(
    async (robot_id: string, updates: Partial<RobotConfig>) => {
      setIsSaving(true);
      setError(null);
      try {
        const updated = await updateRobot(robot_id, updates);
        setConfigs((prev) =>
          prev.map((c) => (c.robot_id === robot_id ? updated : c)),
        );
      } catch (err) {
        const message = errorMessage(err);
        setError(message);
        throw new Error(message);
      } finally {
        setIsSaving(false);
      }
    },
    [],
  );

  const removeConfig = useCallback(async (robot_id: string) => {
    setIsSaving(true);
    setError(null);
    try {
      await deleteRobot(robot_id);
      setConfigs((prev) => prev.filter((c) => c.robot_id !== robot_id));
    } catch (err) {
      const message = errorMessage(err);
      setError(message);
      throw new Error(message);
    } finally {
      setIsSaving(false);
    }
  }, []);

  const exportConfigs = useCallback(() => {
    const blob = new Blob([JSON.stringify(configs, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "robots.json";
    a.click();
    URL.revokeObjectURL(url);
  }, [configs]);

  const importConfigs = useCallback(async (json: string) => {
    try {
      const parsed = JSON.parse(json) as RobotConfig[];
      if (!Array.isArray(parsed)) {
        throw new TypeError("Invalid JSON format for robot import");
      }

      setIsSaving(true);
      setError(null);

      const currentConfigs = await listRobots();
      const nextById = new Map(
        parsed.map((config) => [config.robot_id, config]),
      );

      for (const config of parsed) {
        const existing = currentConfigs.find(
          (item) => item.robot_id === config.robot_id,
        );
        if (existing) {
          await updateRobot(config.robot_id, {
            name: config.name,
            color: config.color,
            radius: config.radius,
            max_speed: config.max_speed,
            battery_capacity: config.battery_capacity,
            enabled: config.enabled,
          });
        } else {
          await createRobot(config);
        }
      }

      for (const existing of currentConfigs) {
        if (!nextById.has(existing.robot_id)) {
          await deleteRobot(existing.robot_id);
        }
      }

      const synced = await listRobots();
      setConfigs(synced);
    } catch (err) {
      const message = errorMessage(err);
      setError(message);
      throw new Error(message);
    } finally {
      setIsSaving(false);
    }
  }, []);

  return {
    configs,
    addConfig,
    updateConfig,
    removeConfig,
    exportConfigs,
    importConfigs,
    refreshConfigs,
    isLoading,
    isSaving,
    error,
  };
}
