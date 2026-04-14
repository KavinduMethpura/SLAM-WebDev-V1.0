from __future__ import annotations

import asyncio
import json
from pathlib import Path

from back_end.models import RobotConfig, RobotCreate, RobotUpdateRequest


class DuplicateRobotError(ValueError):
    pass


class RobotNotFoundError(KeyError):
    pass


class RobotManager:
    """JSON-backed robot configuration storage with async-safe mutation."""

    def __init__(self, file_path: str | Path) -> None:
        self._file_path = Path(file_path)
        self._lock = asyncio.Lock()
        self._robots: dict[str, RobotConfig] = {}

    async def load_robots(self) -> None:
        async with self._lock:
            self._file_path.parent.mkdir(parents=True, exist_ok=True)
            if not self._file_path.exists():
                self._file_path.write_text("[]", encoding="utf-8")

            raw = self._file_path.read_text(encoding="utf-8").strip()
            if not raw:
                raw = "[]"

            payload = json.loads(raw)
            if not isinstance(payload, list):
                raise ValueError("robots.json must contain a JSON array")

            robots: dict[str, RobotConfig] = {}
            for item in payload:
                robot = RobotConfig.model_validate(item)
                robots[robot.robot_id] = robot

            self._robots = robots

    async def save_robots(self) -> None:
        async with self._lock:
            self._save_locked()

    async def list_robots(self) -> list[RobotConfig]:
        async with self._lock:
            return [
                robot.model_copy(deep=True)
                for robot in self._robots.values()
            ]

    async def get_robot(self, robot_id: str) -> RobotConfig:
        async with self._lock:
            robot = self._robots.get(robot_id)
            if not robot:
                raise RobotNotFoundError(robot_id)
            return robot.model_copy(deep=True)

    async def add_robot(self, payload: RobotCreate) -> RobotConfig:
        async with self._lock:
            if payload.robot_id in self._robots:
                raise DuplicateRobotError(payload.robot_id)

            robot = RobotConfig.model_validate(payload.model_dump())
            self._robots[robot.robot_id] = robot
            self._save_locked()
            return robot.model_copy(deep=True)

    async def update_robot(
        self,
        robot_id: str,
        payload: RobotUpdateRequest,
    ) -> RobotConfig:
        async with self._lock:
            robot = self._robots.get(robot_id)
            if not robot:
                raise RobotNotFoundError(robot_id)

            updates = payload.model_dump(exclude_unset=True)
            if not updates:
                return robot.model_copy(deep=True)

            updated = robot.model_copy(update=updates)
            validated = RobotConfig.model_validate(updated.model_dump())
            self._robots[robot_id] = validated
            self._save_locked()
            return validated.model_copy(deep=True)

    async def delete_robot(self, robot_id: str) -> None:
        async with self._lock:
            if robot_id not in self._robots:
                raise RobotNotFoundError(robot_id)

            del self._robots[robot_id]
            self._save_locked()

    def _save_locked(self) -> None:
        robots_data = [robot.model_dump() for robot in self._robots.values()]
        self._file_path.write_text(
            json.dumps(robots_data, indent=2),
            encoding="utf-8",
        )
