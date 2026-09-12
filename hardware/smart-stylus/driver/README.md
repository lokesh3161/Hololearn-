# HoloLearn Smart Stylus Driver V0.1

Native Windows PC driver for the **HoloLearn Physical Smart Stylus**.

Translates wireless BLE IMU/contact packets into real OS-level relative mouse movement, clicks, and drag events.

---

## 🏗️ Architecture

```
Physical Stylus (ESP32 + IMU + Tip Switch)
                  ↓ (BLE Notifications)
   PC Driver Receiver (ble_receiver.py)
                  ↓ (StylusPacket: dx, dy, contact, button)
      State Machine & Filters (smart_stylus_driver.py)
                  ↓ (Relative Steps & Click Transitions)
 Windows Native User32 HAL (mouse_controller.py)
                  ↓
       Real Windows Mouse Cursor / Click Events
```

---

## 📦 File Structure

```
hardware/smart-stylus/driver/
├── config.py                 # Central configuration parameters
├── mouse_controller.py       # Windows ctypes User32 mouse controller HAL
├── ble_receiver.py           # BLE receiver (Bleak) + Test Mode synthetic generator
├── smart_stylus_driver.py    # Main CLI runner, event loop & state machine
├── requirements.txt          # Python dependencies
└── README.md                 # Documentation and testing guide
```

---

## 🚀 Setup & Installation

### 1. Requirements
- Windows 10 or 11
- Python 3.10+ (tested with Python 3.11)

### 2. Install Dependencies
Open PowerShell or Command Prompt in this folder:

```powershell
py -m pip install -r requirements.txt
```

*(Note: Test Mode works with zero external dependencies using Python's standard library `ctypes` & `asyncio`.)*

---

## 🎮 How to Run

### 1. Test Mode in SAFE MODE (Recommended First Step)
Simulates hardware gestures without moving your real mouse. All events are logged to the console:

```powershell
py smart_stylus_driver.py --test --safe
```

### 2. Test Mode with REAL OS Mouse Control
Simulates smooth figure-8 movement, tip contact dragging, and tap clicks directly on your Windows desktop:

```powershell
py smart_stylus_driver.py --test
```

> **Safety Notice:** You can press `Ctrl + C` in the terminal at any moment to immediately release any held mouse button and stop the driver.

### 3. BLE Hardware Mode (ESP32 Connected)
Once ESP32 firmware is broadcasting BLE packets:

```powershell
py smart_stylus_driver.py
```

---

## ⚙️ CLI Flags

| Flag | Description | Default |
|---|---|---|
| `--test` | Enable synthetic test mode without ESP32 | `False` |
| `--safe` | Safe mode (log only, no real mouse movement) | `False` |
| `--sensitivity <float>` | Mouse movement multiplier | `1.0` |
| `--deadzone <float>` | Jitter noise threshold (ignore tiny IMU drift) | `0.15` |
| `--ble-name <str>` | Target BLE advertising device name | `HoloLearn-Stylus` |
| `--quiet` | Suppress streaming dx/dy logs, show only clicks | `False` |

---

## 📡 Packet Specification

```json
{
  "dx": 5.2,
  "dy": -2.1,
  "contact": 1,
  "button": 0
}
```

- **`dx`**: Horizontal delta
- **`dy`**: Vertical delta
- **`contact`**: `0` = In air, `1` = Tip pressed on surface (triggers **LEFT DOWN** / Drag)
- **`button`**: `0` = Released, `1` = Pressed (triggers **RIGHT DOWN**)
