import type { RobotConfig } from "@/types/robot";

type JsonRecord = Record<string, unknown>;

const envApiBase = (import.meta.env.VITE_API_BASE_URL ?? "").trim();

function normalizeBaseUrl(baseUrl: string): string {
  if (!baseUrl) return "";
  return baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
}

const API_BASE_URL = normalizeBaseUrl(envApiBase);

function toApiUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return API_BASE_URL ? `${API_BASE_URL}${normalizedPath}` : normalizedPath;
}

async function parseError(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as JsonRecord;
    if (typeof data.detail === "string" && data.detail.trim()) {
      return data.detail;
    }
  } catch {
    // Ignore JSON parse failures and fall back to status text.
  }

  return response.statusText || `Request failed with status ${response.status}`;
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");

  const response = await fetch(toApiUrl(path), {
    headers,
    ...init,
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return (await response.json()) as T;
}

export interface RobotsResponse {
  robots: RobotConfig[];
}



export async function listRobots(): Promise<RobotConfig[]> {
  const result = await requestJson<RobotsResponse>("/api/robots", {
    method: "GET",
  });
  return Array.isArray(result.robots) ? result.robots : [];
}

export function createRobot(config: RobotConfig): Promise<RobotConfig> {
  return requestJson<RobotConfig>("/api/robots", {
    method: "POST",
    body: JSON.stringify(config),
  });
}

export function updateRobot(
  robotId: string,
  updates: Partial<RobotConfig>,
): Promise<RobotConfig> {
  return requestJson<RobotConfig>(
    `/api/robots/${encodeURIComponent(robotId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(updates),
    },
  );
}

export async function deleteRobot(robotId: string): Promise<void> {
  await requestJson<{ success: boolean }>(
    `/api/robots/${encodeURIComponent(robotId)}`,
    {
      method: "DELETE",
    },
  );
}



export function sendRobotCommand(command: string): Promise<{ success: boolean }> {
  return requestJson<{ success: boolean }>("/api/robot/command", {
    method: "POST",
    body: JSON.stringify({ command }),
  });
}
