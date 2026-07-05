import asyncio
import math
import socket
from back_end.models import RobotUpdate, ScanPoint
from back_end.websocket_manager import WebSocketManager

class RobotUDPProtocol(asyncio.DatagramProtocol):
    def __init__(self, websocket_manager: WebSocketManager):
        self.websocket_manager = websocket_manager
        self.transport = None
        self.robot_ip = None
        
        # Keep track of latest pose to attach to scan points
        self.latest_x = 0.0
        self.latest_y = 0.0
        self.latest_theta = 0.0

    def connection_made(self, transport):
        self.transport = transport
        print("[UDP Receiver] Listening for robot telemetry on port 5005...")

    def datagram_received(self, data: bytes, addr):
        self.robot_ip = addr[0]
        try:
            message = data.decode("utf-8").strip()
            
            # Handle pose packets
            if message.startswith("$ODOM"):
                parts = message.split(",")
                if len(parts) == 6:
                    x, y, theta, l_vel, a_vel = map(float, parts[1:])
                    self.latest_x = x
                    self.latest_y = y
                    self.latest_theta = theta
                    
                    # Broadcast pose update
                    asyncio.create_task(self.broadcast_update(x, y, theta))
                    
            # Handle scan packets
            elif message.startswith("$SCAN"):
                parts = message.split(",")
                if len(parts) == 3:
                    angle_deg = int(parts[1])
                    distance_mm = int(parts[2])
                    
                    # Convert to radians
                    angle_rad = angle_deg * math.pi / 180.0
                    
                    # Convert to meters. If out of range (-1), use -1.0
                    distance_m = distance_mm / 1000.0 if distance_mm >= 0 else -1.0
                    
                    # Broadcast scan update
                    asyncio.create_task(
                        self.broadcast_update(
                            self.latest_x,
                            self.latest_y,
                            self.latest_theta,
                            [ScanPoint(angle=angle_rad, distance=distance_m)]
                        )
                    )
            # Handle raw debug/calibration outputs
            elif message.startswith("$DEBUG"):
                print(f"[ROBOT DEBUG] {message[7:]}")
                # We can broadcast debugs to the frontend by prefixing with debug
                asyncio.create_task(self.broadcast_debug(message[7:]))
        except Exception as e:
            # Silently catch decode/parsing errors
            pass

    async def broadcast_update(self, x: float, y: float, theta: float, scans=None):
        # We assign the real robot's telemetry to "ROBOT-01"
        update = RobotUpdate(
            robot_id="ROBOT-01",
            x=x,
            y=y,
            theta=theta,
            scans=scans
        )
        await self.websocket_manager.broadcast_json(update.model_dump(exclude_none=True))

    async def broadcast_debug(self, msg: str):
        # Custom payload for debug logs
        await self.websocket_manager.broadcast_json({
            "robot_id": "ROBOT-01",
            "debug": msg
        })

    def send_robot_command(self, command: str) -> bool:
        if not self.robot_ip:
            print("[UDP Receiver] Cannot send command: robot IP is not yet discovered.")
            return False
            
        try:
            # Send command to port 5006
            sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            sock.sendto(command.encode("utf-8"), (self.robot_ip, 5006))
            print(f"[UDP Receiver] Sent command '{command}' to robot at {self.robot_ip}:5006")
            return True
        except Exception as e:
            print(f"[UDP Receiver] Error sending command: {e}")
            return False
