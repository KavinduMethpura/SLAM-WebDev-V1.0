export interface RobotPose {
  x: number;
  y: number;
  theta: number; // radians
}

export interface LidarPoint {
  x: number;
  y: number;
  robotId: string;
}

export interface RobotState {
  id: string;
  pose: RobotPose;
  color: string;
  path: RobotPose[];
  connected: boolean;
  battery: number;
  lidarPoints: LidarPoint[];
}

export interface WSMessage {
  robot_id: string;
  x: number;
  y: number;
  theta: number;
  scans?: { angle: number; distance: number }[];
}
