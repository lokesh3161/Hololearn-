"""
HoloLearn Smart Stylus Driver Configuration
"""

from dataclasses import dataclass, field
from typing import Optional


@dataclass
class StylusConfig:
    # Safe Mode: If True, log actions without executing real Windows mouse inputs
    safe_mode: bool = False

    # Motion sensitivity multipliers
    sensitivity_x: float = 1.0
    sensitivity_y: float = 1.0

    # Invert motion axes if needed
    invert_x: bool = False
    invert_y: bool = False

    # Deadzone: Ignore motion smaller than this threshold (filters IMU noise/jitter)
    deadzone: float = 0.15

    # Subpixel movement accumulator (accumulates fractional dx/dy for smooth micro-movements)
    enable_subpixel_acc: bool = True

    # BLE Settings
    ble_device_name: str = "HoloLearn-Stylus"
    ble_service_uuid: str = "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
    ble_char_uuid: str = "beb5483e-36e1-4688-b7f5-ea07361b26a8"
    ble_scan_timeout_sec: float = 10.0
    ble_auto_reconnect: bool = True

    # Logging
    verbose_logging: bool = True
    log_stream_packets: bool = True  # If True, log continuous dx/dy movements

    # Test Mode parameters
    test_mode_fps: int = 60  # Hz
