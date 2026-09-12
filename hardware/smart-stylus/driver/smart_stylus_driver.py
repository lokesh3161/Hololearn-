"""
HoloLearn Smart Stylus PC Driver V0.1
Translates BLE stylus packets into native Windows mouse motion, clicks, and drag events.
Supports Safe Mode (dry run) and Test Mode (synthetic hardware simulation).
"""

import argparse
import asyncio
import signal
import sys
import time

from config import StylusConfig
from mouse_controller import MouseController
from ble_receiver import BleReceiver, StylusPacket, TestSignalGenerator, BLEAK_AVAILABLE


class SmartStylusDriver:
    """
    Main driver engine coordinating BLE / synthetic packets with OS mouse controller.
    """

    def __init__(self, config: StylusConfig):
        self.config = config
        self.mouse = MouseController(
            safe_mode=self.config.safe_mode,
            subpixel_accumulation=self.config.enable_subpixel_acc
        )

        # State transition tracking
        self.last_contact: int = 0
        self.last_button: int = 0
        self.packet_count: int = 0
        self._last_log_time: float = 0.0

    def process_packet(self, packet: StylusPacket) -> None:
        """
        Process a single incoming telemetry packet.
        Handles relative cursor movement, tip contact down/up, and barrel button down/up.
        """
        self.packet_count += 1
        now = time.time()

        # 1. Process Relative Movement (dx, dy)
        raw_dx = packet.dx
        raw_dy = packet.dy

        # Apply deadzone filtering
        filtered_dx = 0.0 if abs(raw_dx) < self.config.deadzone else raw_dx
        filtered_dy = 0.0 if abs(raw_dy) < self.config.deadzone else raw_dy

        # Apply sensitivity multipliers and axis inversion
        sx = -self.config.sensitivity_x if self.config.invert_x else self.config.sensitivity_x
        sy = -self.config.sensitivity_y if self.config.invert_y else self.config.sensitivity_y

        target_dx = filtered_dx * sx
        target_dy = filtered_dy * sy

        # Send movement to mouse controller
        if target_dx != 0.0 or target_dy != 0.0:
            self.mouse.move_relative(target_dx, target_dy)

        # 2. Process Tip Contact (0 -> 1 : LEFT DOWN, 1 -> 0 : LEFT UP)
        if packet.contact != self.last_contact:
            if packet.contact == 1:
                print(f"[STYLUS] LEFT DOWN (contact=1, safe_mode={self.mouse.safe_mode})", flush=True)
                self.mouse.left_down()
            else:
                print(f"[STYLUS] LEFT UP (contact=0, safe_mode={self.mouse.safe_mode})", flush=True)
                self.mouse.left_up()
            self.last_contact = packet.contact

        # 3. Process Barrel Button (0 -> 1 : RIGHT DOWN, 1 -> 0 : RIGHT UP)
        if packet.button != self.last_button:
            if packet.button == 1:
                print(f"[STYLUS] RIGHT DOWN (button=1, safe_mode={self.mouse.safe_mode})", flush=True)
                self.mouse.right_down()
            else:
                print(f"[STYLUS] RIGHT UP (button=0, safe_mode={self.mouse.safe_mode})", flush=True)
                self.mouse.right_up()
            self.last_button = packet.button

        # 4. Stream Logging (throttled to ~10Hz for clean terminal readability)
        if self.config.log_stream_packets and (now - self._last_log_time >= 0.1):
            status_tag = "[SAFE MODE]" if self.mouse.safe_mode else "[LIVE]"
            print(f"[STYLUS] {status_tag} dx={raw_dx:+.2f} dy={raw_dy:+.2f} contact={packet.contact} button={packet.button}", flush=True)
            self._last_log_time = now

    def shutdown(self) -> None:
        """Release OS input handles and reset mouse button states."""
        print("\n[STYLUS] Shutting down driver...", flush=True)
        self.mouse.release_all()
        print("[STYLUS] All mouse buttons released. Goodbye!", flush=True)


async def run_driver(args: argparse.Namespace) -> None:
    config = StylusConfig(
        safe_mode=args.safe,
        sensitivity_x=args.sensitivity,
        sensitivity_y=args.sensitivity,
        deadzone=args.deadzone,
        log_stream_packets=not args.quiet,
        ble_device_name=args.ble_name
    )

    driver = SmartStylusDriver(config)

    print("=" * 65)
    print("       HOLOLearn SMART STYLUS PC DRIVER V0.1")
    print("=" * 65)
    print(f" Mode:            {'TEST MODE (Simulated Hardware)' if args.test else 'BLE HARDWARE MODE'}")
    print(f" Safe Mode:       {config.safe_mode} ({'NO real OS mouse events' if config.safe_mode else 'REAL OS MOUSE CONTROL ACTIVE'})")
    print(f" Sensitivity:     {config.sensitivity_x:.2f}x")
    print(f" Deadzone:        {config.deadzone:.2f}")
    print(f" Subpixel Acc:    {config.enable_subpixel_acc}")
    print("=" * 65)

    if not config.safe_mode:
        print("[SAFETY TIP] Real mouse control is ENABLED.")
        print("[SAFETY TIP] Press Ctrl+C in this terminal at any time to immediately stop and regain mouse control.")
        print("-" * 65)

    generator: TestSignalGenerator | None = None
    receiver: BleReceiver | None = None

    try:
        if args.test:
            generator = TestSignalGenerator(
                on_packet=driver.process_packet,
                fps=config.test_mode_fps
            )
            await generator.run()
        else:
            if not BLEAK_AVAILABLE:
                print("[ERROR] 'bleak' package is not installed. Please run: pip install -r requirements.txt")
                print("        Or run in test mode: python smart_stylus_driver.py --test")
                return

            receiver = BleReceiver(
                device_name=config.ble_device_name,
                char_uuid=config.ble_char_uuid,
                on_packet=driver.process_packet,
                scan_timeout=config.ble_scan_timeout_sec
            )
            await receiver.start()

    except asyncio.CancelledError:
        pass
    except KeyboardInterrupt:
        pass
    except Exception as e:
        print(f"[ERROR] Driver exception: {e}")
    finally:
        if generator:
            generator.stop()
        if receiver:
            await receiver.stop()
        driver.shutdown()


def parse_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="HoloLearn Smart Stylus Driver - BLE to Windows Mouse Controller"
    )
    parser.add_argument(
        "--test",
        action="store_true",
        help="Run in TEST MODE with synthetic hardware signals (no ESP32 required)"
    )
    parser.add_argument(
        "--safe",
        action="store_true",
        help="Run in SAFE MODE (mouse control disabled, logs actions only)"
    )
    parser.add_argument(
        "--sensitivity",
        type=float,
        default=1.0,
        help="Cursor sensitivity multiplier (default: 1.0)"
    )
    parser.add_argument(
        "--deadzone",
        type=float,
        default=0.15,
        help="Jitter deadzone threshold (default: 0.15)"
    )
    parser.add_argument(
        "--ble-name",
        type=str,
        default="HoloLearn-Stylus",
        help="Target BLE device advertising name (default: HoloLearn-Stylus)"
    )
    parser.add_argument(
        "--quiet",
        action="store_true",
        help="Suppress continuous dx/dy stream logs, showing only state transitions (clicks/connect)"
    )
    return parser.parse_args()


def main():
    args = parse_arguments()
    try:
        asyncio.run(run_driver(args))
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
