"""
Automated unit & integration tests for HoloLearn Smart Stylus Driver
"""

import struct
import unittest
from config import StylusConfig
from ble_receiver import StylusPacket
from mouse_controller import MouseController
from smart_stylus_driver import SmartStylusDriver


class TestStylusDriver(unittest.TestCase):

    def test_packet_from_json(self):
        json_data = '{"dx": 5.2, "dy": -2.1, "contact": 1, "button": 0}'.encode("utf-8")
        packet = StylusPacket.from_bytes(json_data)
        self.assertIsNotNone(packet)
        self.assertAlmostEqual(packet.dx, 5.2, places=2)
        self.assertAlmostEqual(packet.dy, -2.1, places=2)
        self.assertEqual(packet.contact, 1)
        self.assertEqual(packet.button, 0)

    def test_packet_from_binary_struct(self):
        # Binary struct: 2 floats + 2 uint8 (<ffBB)
        binary_data = struct.pack("<ffBB", 12.34, -45.67, 1, 1)
        packet = StylusPacket.from_bytes(binary_data)
        self.assertIsNotNone(packet)
        self.assertAlmostEqual(packet.dx, 12.34, places=2)
        self.assertAlmostEqual(packet.dy, -45.67, places=2)
        self.assertEqual(packet.contact, 1)
        self.assertEqual(packet.button, 1)

    def test_mouse_controller_subpixel_accumulation(self):
        controller = MouseController(safe_mode=True, subpixel_accumulation=True)
        # Small fractional step that does not reach integer
        step_x, step_y = controller.move_relative(0.4, 0.3)
        self.assertEqual((step_x, step_y), (0, 0))

        # Second fractional step that pushes accumulator past 1.0
        step_x, step_y = controller.move_relative(0.7, 0.8)
        self.assertEqual((step_x, step_y), (1, 1))

    def test_driver_state_machine_clicks(self):
        config = StylusConfig(safe_mode=True, deadzone=0.1)
        driver = SmartStylusDriver(config)

        # In air packet
        driver.process_packet(StylusPacket(dx=0.0, dy=0.0, contact=0, button=0))
        self.assertFalse(driver.mouse.is_left_down)

        # Contact down transition (0 -> 1)
        driver.process_packet(StylusPacket(dx=0.0, dy=0.0, contact=1, button=0))
        self.assertTrue(driver.mouse.is_left_down)

        # Sustained contact (1 -> 1)
        driver.process_packet(StylusPacket(dx=2.0, dy=2.0, contact=1, button=0))
        self.assertTrue(driver.mouse.is_left_down)

        # Contact released (1 -> 0)
        driver.process_packet(StylusPacket(dx=0.0, dy=0.0, contact=0, button=0))
        self.assertFalse(driver.mouse.is_left_down)

        # Button pressed (0 -> 1)
        driver.process_packet(StylusPacket(dx=0.0, dy=0.0, contact=0, button=1))
        self.assertTrue(driver.mouse.is_right_down)

        # Button released (1 -> 0)
        driver.process_packet(StylusPacket(dx=0.0, dy=0.0, contact=0, button=0))
        self.assertFalse(driver.mouse.is_right_down)

    def test_driver_deadzone(self):
        config = StylusConfig(safe_mode=True, deadzone=0.5, sensitivity_x=1.0, sensitivity_y=1.0)
        driver = SmartStylusDriver(config)

        # Movement below deadzone threshold
        driver.process_packet(StylusPacket(dx=0.2, dy=-0.3, contact=0, button=0))
        self.assertEqual(driver.mouse._acc_x, 0.0)
        self.assertEqual(driver.mouse._acc_y, 0.0)

        # Movement above deadzone threshold
        driver.process_packet(StylusPacket(dx=1.5, dy=2.5, contact=0, button=0))
        # 1.5 and 2.5 applied -> integer step 1, 2, remaining acc 0.5, 0.5
        self.assertAlmostEqual(driver.mouse._acc_x, 0.5, places=2)
        self.assertAlmostEqual(driver.mouse._acc_y, 0.5, places=2)


if __name__ == "__main__":
    unittest.main()
