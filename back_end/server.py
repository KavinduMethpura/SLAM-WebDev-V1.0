from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import ValidationError

from back_end.models import (
    DeleteResponse,
    RobotCreate,
    RobotUpdate,
    RobotUpdateRequest,
    RobotsResponse,
    SimulatorStatusResponse,
)
from back_end.robot_manager import (
    DuplicateRobotError,
    RobotManager,
    RobotNotFoundError,
)
from back_end.simulator import RobotSimulator
from back_end.websocket_manager import WebSocketManager


BASE_DIR = Path(__file__).resolve().parent
ROBOTS_FILE = BASE_DIR / "robots.json"

robot_manager = RobotManager(ROBOTS_FILE)
websocket_manager = WebSocketManager()
simulator = RobotSimulator(robot_manager, websocket_manager)

app = FastAPI(title="SLAM Robot Backend", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event() -> None:
    await robot_manager.load_robots()
    simulator.start()


@app.on_event("shutdown")
async def shutdown_event() -> None:
    await simulator.stop()


@app.get("/api/robots")
async def list_robots() -> RobotsResponse:
    robots = await robot_manager.list_robots()
    return RobotsResponse(robots=robots)


@app.post(
    "/api/robots",
    status_code=201,
    responses={409: {"description": "Robot already exists"}},
)
async def create_robot(payload: RobotCreate):
    try:
        return await robot_manager.add_robot(payload)
    except DuplicateRobotError as exc:
        raise HTTPException(
            status_code=409,
            detail=f"Robot '{exc.args[0]}' already exists",
        ) from exc


@app.patch(
    "/api/robots/{robot_id}",
    responses={404: {"description": "Robot not found"}},
)
async def update_robot(robot_id: str, payload: RobotUpdateRequest):
    try:
        return await robot_manager.update_robot(robot_id, payload)
    except RobotNotFoundError as exc:
        raise HTTPException(
            status_code=404,
            detail=f"Robot '{exc.args[0]}' was not found",
        ) from exc


@app.delete(
    "/api/robots/{robot_id}",
    responses={404: {"description": "Robot not found"}},
)
async def delete_robot(robot_id: str) -> DeleteResponse:
    try:
        await robot_manager.delete_robot(robot_id)
        return DeleteResponse(success=True)
    except RobotNotFoundError as exc:
        raise HTTPException(
            status_code=404,
            detail=f"Robot '{exc.args[0]}' was not found",
        ) from exc


@app.post("/api/simulator/start")
async def start_simulator() -> SimulatorStatusResponse:
    simulator.start()
    return SimulatorStatusResponse(running=simulator.is_running())


@app.post("/api/simulator/stop")
async def stop_simulator() -> SimulatorStatusResponse:
    await simulator.stop()
    return SimulatorStatusResponse(running=simulator.is_running())


@app.get("/api/simulator/status")
async def simulator_status() -> SimulatorStatusResponse:
    return SimulatorStatusResponse(running=simulator.is_running())


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket) -> None:
    await websocket_manager.connect(websocket)
    try:
        while True:
            message = await websocket.receive_text()
            try:
                payload = RobotUpdate.model_validate_json(message)
                await websocket_manager.broadcast_json(
                    payload.model_dump(exclude_none=True)
                )
            except ValidationError:
                # Ignore invalid inbound payloads and keep the socket alive.
                continue
    except WebSocketDisconnect:
        await websocket_manager.disconnect(websocket)
