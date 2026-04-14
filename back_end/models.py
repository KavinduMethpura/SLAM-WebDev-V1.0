from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


class ScanPoint(BaseModel):
    angle: float
    distance: float = Field(ge=0.0)


class RobotUpdate(BaseModel):
    """WebSocket payload shape consumed by the frontend."""

    robot_id: str
    x: float
    y: float
    theta: float
    scans: Optional[list[ScanPoint]] = None


class RobotConfig(BaseModel):
    robot_id: str = Field(min_length=1)
    name: str = Field(min_length=1)
    color: str = Field(default="#3b82f6", min_length=4, max_length=16)
    radius: float = Field(default=0.2, gt=0.0)
    max_speed: float = Field(default=1.0, gt=0.0)
    battery_capacity: float = Field(default=100.0, gt=0.0)
    enabled: bool = True


class RobotCreate(RobotConfig):
    pass


class RobotUpdateRequest(BaseModel):
    """Partial robot update payload for PATCH endpoints."""

    name: Optional[str] = Field(default=None, min_length=1)
    color: Optional[str] = Field(default=None, min_length=4, max_length=16)
    radius: Optional[float] = Field(default=None, gt=0.0)
    max_speed: Optional[float] = Field(default=None, gt=0.0)
    battery_capacity: Optional[float] = Field(default=None, gt=0.0)
    enabled: Optional[bool] = None


class RobotsResponse(BaseModel):
    robots: list[RobotConfig]


class DeleteResponse(BaseModel):
    success: bool = True


class SimulatorStatusResponse(BaseModel):
    running: bool
