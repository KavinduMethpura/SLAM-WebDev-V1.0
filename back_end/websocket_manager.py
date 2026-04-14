from __future__ import annotations

import asyncio

from fastapi import WebSocket


class WebSocketManager:
    """Tracks active sockets and fans out JSON messages safely."""

    def __init__(self) -> None:
        self._connections: set[WebSocket] = set()
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        async with self._lock:
            self._connections.add(websocket)

    async def disconnect(self, websocket: WebSocket) -> None:
        async with self._lock:
            self._connections.discard(websocket)

    async def connection_count(self) -> int:
        async with self._lock:
            return len(self._connections)

    async def send_json(self, websocket: WebSocket, payload: dict) -> None:
        await websocket.send_json(payload)

    async def broadcast_json(self, payload: dict) -> None:
        async with self._lock:
            sockets = list(self._connections)

        if not sockets:
            return

        stale: list[WebSocket] = []
        for socket in sockets:
            try:
                await socket.send_json(payload)
            except Exception:
                stale.append(socket)

        if stale:
            async with self._lock:
                for socket in stale:
                    self._connections.discard(socket)
