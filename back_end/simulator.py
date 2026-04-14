from __future__ import annotations

import asyncio
import math
import random
import time
from typing import Optional

from back_end.models import RobotConfig, RobotUpdate
from back_end.robot_manager import RobotManager
from back_end.websocket_manager import WebSocketManager


class RobotSimulator:
    """Generates live robot telemetry and broadcasts over WebSocket."""

    def __init__(
        self,
        robot_manager: RobotManager,
        websocket_manager: WebSocketManager,
        interval_seconds: float = 0.1,
    ) -> None:
        self._robot_manager = robot_manager
        self._websocket_manager = websocket_manager
        self._interval_seconds = interval_seconds
        self._task: Optional[asyncio.Task[None]] = None
        self._stop_event = asyncio.Event()

    def is_running(self) -> bool:
        return self._task is not None and not self._task.done()

    def start(self) -> None:
        if self.is_running():
            return
        self._stop_event.clear()
        self._task = asyncio.create_task(self._run_loop())

    async def stop(self) -> None:
        if not self._task:
            return

        self._stop_event.set()
        task = self._task
        self._task = None
        await task

    async def _run_loop(self) -> None:
        start = time.time()
        while not self._stop_event.is_set():
            robots = await self._robot_manager.list_robots()
            enabled = [robot for robot in robots if robot.enabled]

            for index, robot in enumerate(enabled):
                update = self._simulate_update(
                    robot=robot,
                    robot_index=index,
                    enabled_count=max(1, len(enabled)),
                    elapsed=time.time() - start,
                )
                await self._websocket_manager.broadcast_json(
                    update.model_dump(exclude_none=True)
                )

            await asyncio.sleep(self._interval_seconds)

    def _simulate_update(
        self,
        robot: RobotConfig,
        robot_index: int,
        enabled_count: int,
        elapsed: float,
    ) -> RobotUpdate:
        phase = (robot_index * math.pi * 2) / enabled_count
        radius = 2 + robot_index * 0.8
        speed = 0.3 + robot_index * 0.1

        x = (
            math.cos(elapsed * speed + phase) * radius
            + math.sin(elapsed * speed * 0.3) * 0.5
        )
        y = (
            math.sin(elapsed * speed + phase) * radius
            + math.cos(elapsed * speed * 0.4) * 0.5
        )
        theta = elapsed * speed + phase + math.pi / 2

        scans = []
        for ray in range(36):
            angle = (ray / 36) * math.pi * 2
            base_distance = (
                2
                + math.sin(angle * 3 + x * 0.5) * 1.5
                + math.cos(angle * 2 + y * 0.3) * 1.0
            )
            distance = max(0.1, base_distance + (random.random() - 0.5) * 0.4)
            scans.append({"angle": angle, "distance": distance})

        return RobotUpdate(
            robot_id=robot.robot_id,
            x=x,
            y=y,
            theta=theta,
            scans=scans,
        )
