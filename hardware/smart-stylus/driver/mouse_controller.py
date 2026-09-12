"""
Windows Mouse Controller Hardware Abstraction Layer (HAL)
Provides native OS-level relative mouse movement, clicks, and drag control using Windows User32 API.
"""

import sys
import ctypes
from typing import Tuple

# Windows User32 Mouse Event Flags
MOUSEEVENTF_MOVE = 0x0001
MOUSEEVENTF_LEFTDOWN = 0x0002
MOUSEEVENTF_LEFTUP = 0x0004
MOUSEEVENTF_RIGHTDOWN = 0x0008
MOUSEEVENTF_RIGHTUP = 0x0010
MOUSEEVENTF_MIDDLEDOWN = 0x0020
MOUSEEVENTF_MIDDLEUP = 0x0040
MOUSEEVENTF_ABSOLUTE = 0x8000


class MouseController:
    """
    Direct Windows OS mouse controller using ctypes user32 API.
    Supports relative movement, button transitions (down/up/click/drag),
    fractional sub-pixel accumulation, and safe-mode dry runs.
    """

    def __init__(self, safe_mode: bool = False, subpixel_accumulation: bool = True):
        self.safe_mode: bool = safe_mode
        self.subpixel_accumulation: bool = subpixel_accumulation

        # Fractional remainder accumulator for sub-pixel precision
        self._acc_x: float = 0.0
        self._acc_y: float = 0.0

        # State tracking
        self.is_left_down: bool = False
        self.is_right_down: bool = False

        self._is_windows: bool = sys.platform == "win32"
        if self._is_windows:
            self._user32 = ctypes.windll.user32
        else:
            self._user32 = None

    def set_safe_mode(self, enabled: bool) -> None:
        """Enable or disable Safe Mode."""
        self.safe_mode = enabled

    def move_relative(self, dx: float, dy: float) -> Tuple[int, int]:
        """
        Move the Windows mouse cursor by a relative offset (dx, dy).
        Converts floats to integers while maintaining subpixel accumulator.
        Returns the actual integer steps applied (step_x, step_y).
        """
        if self.subpixel_accumulation:
            self._acc_x += dx
            self._acc_y += dy

            step_x = int(self._acc_x)
            step_y = int(self._acc_y)

            self._acc_x -= step_x
            self._acc_y -= step_y
        else:
            step_x = int(round(dx))
            step_y = int(round(dy))

        if step_x == 0 and step_y == 0:
            return 0, 0

        if not self.safe_mode and self._is_windows:
            # Send relative mouse move event
            self._user32.mouse_event(MOUSEEVENTF_MOVE, step_x, step_y, 0, 0)

        return step_x, step_y

    def left_down(self) -> None:
        """Press and hold the Left Mouse Button (starts click or drag)."""
        if not self.is_left_down:
            self.is_left_down = True
            if not self.safe_mode and self._is_windows:
                self._user32.mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0)

    def left_up(self) -> None:
        """Release the Left Mouse Button (completes click or ends drag)."""
        if self.is_left_down:
            self.is_left_down = False
            if not self.safe_mode and self._is_windows:
                self._user32.mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, 0)

    def left_click(self) -> None:
        """Execute a full left click (down then up)."""
        self.left_down()
        self.left_up()

    def right_down(self) -> None:
        """Press and hold the Right Mouse Button."""
        if not self.is_right_down:
            self.is_right_down = True
            if not self.safe_mode and self._is_windows:
                self._user32.mouse_event(MOUSEEVENTF_RIGHTDOWN, 0, 0, 0, 0)

    def right_up(self) -> None:
        """Release the Right Mouse Button."""
        if self.is_right_down:
            self.is_right_down = False
            if not self.safe_mode and self._is_windows:
                self._user32.mouse_event(MOUSEEVENTF_RIGHTUP, 0, 0, 0, 0)

    def right_click(self) -> None:
        """Execute a full right click."""
        self.right_down()
        self.right_up()

    def release_all(self) -> None:
        """Safety cleanup: release any held mouse buttons."""
        if self.is_left_down:
            self.left_up()
        if self.is_right_down:
            self.right_up()
        self._acc_x = 0.0
        self._acc_y = 0.0
