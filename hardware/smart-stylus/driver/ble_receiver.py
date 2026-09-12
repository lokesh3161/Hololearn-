"""
BLE Receiver and Test Signal Generator for HoloLearn Smart Stylus.
Handles BLE connection, characteristic notification decoding (JSON/binary),
and synthetic packet generation for offline Test Mode.
"""

import asyncio
import json
import math
import struct
import time
from dataclasses import dataclass
from typing import Callable, Optional

try:
    from bleak import BleakClient, BleakScanner
    BLEAK_AVAILABLE = True
except ImportError:
    BLEAK_AVAILABLE = False


@dataclass
class StylusPacket:
    """
    Standardized packet format for Smart Stylus incoming telemetry.
    """
    dx: float = 0.0          # Relative horizontal movement
    dy: float = 0.0          # Relative vertical movement
    contact: int = 0         # Tip contact switch (0 = in air, 1 = touching surface)
    button: int = 0          # Barrel button (0 = released, 1 = pressed)
    timestamp: float = 0.0   # Local receipt/generation timestamp

    @classmethod
    def from_json_dict(cls, data: dict) -> "StylusPacket":
        return cls(
            dx=float(data.get("dx", 0.0)),
            dy=float(data.get("dy", 0.0)),
            contact=int(data.get("contact", 0)),
            button=int(data.get("button", 0)),
            timestamp=time.time()
        )

    @classmethod
    def from_bytes(cls, raw: bytes) -> Optional["StylusPacket"]:
        """
        Attempts to decode packet from UTF-8 JSON string, comma-separated text, or binary struct.
        """
        if not raw:
            return None

        # 1. Try decoding as UTF-8 string (JSON or CSV)
        try:
            text = raw.decode("utf-8").strip()
            if text.startswith("{") and text.endswith("}"):
                data = json.loads(text)
                return cls.from_json_dict(data)
            elif "," in text:
                parts = [p.strip() for p in text.split(",")]
                if len(parts) >= 4:
                    return cls(
                        dx=float(parts[0]),
                        dy=float(parts[1]),
                        contact=int(parts[2]),
                        button=int(parts[3]),
                        timestamp=time.time()
                    )
        except Exception:
            pass

        # 2. Try decoding as Binary struct: 2 floats (dx, dy) + 2 unsigned chars (contact, button) = 10 bytes
        if len(raw) >= 10:
            try:
                dx, dy, contact, button = struct.unpack("<ffBB", raw[:10])
                return cls(
                    dx=dx,
                    dy=dy,
                    contact=contact,
                    button=button,
                    timestamp=time.time()
                )
            except Exception:
                pass

        return None


class BleReceiver:
    """
    Asynchronous BLE Receiver using Bleak to interface with ESP32 Smart Stylus.
    """

    def __init__(
        self,
        device_name: str,
        char_uuid: str,
        on_packet: Callable[[StylusPacket], None],
        scan_timeout: float = 10.0
    ):
        self.device_name = device_name
        self.char_uuid = char_uuid
        self.on_packet = on_packet
        self.scan_timeout = scan_timeout

        self._client: Optional["BleakClient"] = None
        self._is_running = False

    async def start(self) -> None:
        """Scan, connect, and subscribe to BLE notifications."""
        if not BLEAK_AVAILABLE:
            raise RuntimeError(
                "The 'bleak' library is required for real BLE mode. Install it via 'pip install bleak'."
            )

        self._is_running = True
        print(f"[BLE] Scanning for device with name '{self.device_name}' (timeout: {self.scan_timeout}s)...")

        device = await BleakScanner.find_device_by_filter(
            lambda d, ad: (d.name and self.device_name.lower() in d.name.lower()),
            timeout=self.scan_timeout
        )

        if not device:
            raise TimeoutError(f"[BLE] Device '{self.device_name}' not found within timeout.")

        print(f"[BLE] Found device: {device.name} [{device.address}]")
        self._client = BleakClient(device)

        await self._client.connect()
        print(f"[STYLUS] Connected to {device.name}")

        def _notification_handler(sender, data: bytearray):
            packet = StylusPacket.from_bytes(bytes(data))
            if packet:
                self.on_packet(packet)

        await self._client.start_notify(self.char_uuid, _notification_handler)
        print(f"[BLE] Subscribed to characteristic notifications: {self.char_uuid}")

        # Keep alive while running
        while self._is_running and self._client.is_connected:
            await asyncio.sleep(0.5)

    async def stop(self) -> None:
        """Disconnect cleanly."""
        self._is_running = False
        if self._client and self._client.is_connected:
            try:
                await self._client.stop_notify(self.char_uuid)
                await self._client.disconnect()
            except Exception:
                pass
            print("[BLE] Disconnected from device.")


class TestSignalGenerator:
    """
    Synthetic event generator for TEST MODE.
    Emulates realistic physical stylus gestures, movements, and button presses.
    """

    def __init__(self, on_packet: Callable[[StylusPacket], None], fps: int = 60):
        self.on_packet = on_packet
        self.fps = fps
        self.dt = 1.0 / fps
        self._is_running = False

    async def run(self, scenario: str = "cycle") -> None:
        """
        Runs the test pattern loop.
        Scenarios: 'cycle' (comprehensive automated demo), 'circle', 'drag', 'click'
        """
        self._is_running = True
        print("[STYLUS] Connected (TEST MODE: Virtual Hardware Simulation)", flush=True)

        start_time = time.time()
        step = 0

        while self._is_running:
            elapsed = time.time() - start_time
            t = elapsed

            # Cycle through realistic test phases every 20 seconds
            phase = int(t // 5) % 4

            dx = 0.0
            dy = 0.0
            contact = 0
            button = 0

            if phase == 0:
                # Phase 0: Smooth Figure-8 hover movement (in air, contact=0)
                # Tests relative dx/dy accumulator and smooth cursor gliding
                omega = 2.0 * math.pi * 0.4
                dx = 3.5 * math.cos(omega * t)
                dy = 3.5 * math.sin(2 * omega * t)
                contact = 0
                button = 0

            elif phase == 1:
                # Phase 1: Tip Contact & Drag gesture
                # Stylus moves slowly in a circle while contact=1 (performing drag)
                omega = 2.0 * math.pi * 0.3
                dx = 2.5 * math.cos(omega * t)
                dy = 2.5 * math.sin(omega * t)
                contact = 1  # Surface pressed! Triggers LEFT DOWN then drag
                button = 0

            elif phase == 2:
                # Phase 2: Tap clicks (approaching target, quick 0.3s taps)
                # Linear hover glide with periodic contact pulses
                dx = 1.8 * math.sin(t * 1.5)
                dy = 0.8 * math.cos(t * 1.5)
                # Tap every 1.5 seconds for 0.25 seconds
                tap_cycle = t % 1.5
                contact = 1 if tap_cycle < 0.25 else 0
                button = 0

            elif phase == 3:
                # Phase 3: Barrel Button (Right click / secondary action)
                dx = 1.0 * math.sin(t * 2.0)
                dy = -1.0 * math.cos(t * 2.0)
                contact = 0
                # Barrel button pressed periodically
                btn_cycle = t % 2.0
                button = 1 if btn_cycle < 0.3 else 0

            packet = StylusPacket(
                dx=dx,
                dy=dy,
                contact=contact,
                button=button,
                timestamp=time.time()
            )

            self.on_packet(packet)
            step += 1
            await asyncio.sleep(self.dt)

    def stop(self) -> None:
        """Stop signal generation."""
        self._is_running = False
