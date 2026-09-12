# HoloLearn Smart Stylus Firmware V0.2 (ESP32 + MPU6050)

Firmware for the physical prototype of the **HoloLearn Air-Mouse Smart Stylus**.

Translates physical MPU6050 gyroscope and accelerometer angular rate measurements into real-time relative `(dx, dy)` telemetry and broadcasts it over BLE to the PC driver.

---

## 🔌 Hardware Wiring Diagram

| MPU6050 Pin | ESP32 Pin | Function |
|---|---|---|
| **VCC** | **3V3** (or 3.3V) | Power supply (3.3V) |
| **GND** | **GND** | Ground |
| **SDA** | **GPIO 21** | I2C Data Line |
| **SCL** | **GPIO 22** | I2C Clock Line |
| **AD0** | **GND** (Optional / Default) | I2C Address `0x68` |

---

## 📡 BLE Protocol & Matching Specifications

This firmware strictly matches the configuration in [`hardware/smart-stylus/driver/config.py`](file:///c:/Users/Lokesh%20Thanala/OneDrive/Desktop/Hololearn%20AI/hardware/smart-stylus/driver/config.py) and [`hardware/smart-stylus/driver/ble_receiver.py`](file:///c:/Users/Lokesh%20Thanala/OneDrive/Desktop/Hololearn%20AI/hardware/smart-stylus/driver/ble_receiver.py):

- **Device Advertising Name**: `HoloLearn-Stylus`
- **BLE Service UUID**: `4fafc201-1fb5-459e-8fcc-c5c9c331914b`
- **BLE Characteristic UUID**: `beb5483e-36e1-4688-b7f5-ea07361b26a8`
- **Telemetry Frequency**: ~60 Hz (16 ms packet interval)
- **Packet Structure**: 10-byte binary struct (Little-Endian `<ffBB`)
  - `float dx` (4 bytes IEEE 754 float)
  - `float dy` (4 bytes IEEE 754 float)
  - `uint8_t contact` (1 byte, `0` = in air, `1` = tip pressed)
  - `uint8_t button` (1 byte, `0` = released, `1` = pressed)

---

## 🛠️ Arduino IDE Setup & Upload Instructions

### 1. Board Installation
1. Open **Arduino IDE**.
2. Go to **File → Preferences**.
3. In *Additional Board Manager URLs*, add:
   ```
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```
4. Go to **Tools → Board → Boards Manager**, search for `esp32` (by Espressif Systems), and install it.

### 2. Board & Port Settings
- **Board**: `ESP32 Dev Module` (or `DOIT ESP32 DEVKIT V1` / `NodeMCU-32S`)
- **Upload Speed**: `921600` (or `115200` if upload fails)
- **CPU Frequency**: `240MHz (WiFi/BT)`
- **Flash Frequency**: `80MHz`
- **Flash Mode**: `QIO`
- **Partition Scheme**: `Default 4MB with spiffs (1.2MB APP/1.5MB SPIFFS)`
- **Port**: Select your ESP32 COM port (e.g., `COM3`, `COM5`).

### 3. Library Requirements
- **No external third-party libraries needed!**
  The firmware uses built-in ESP32 core libraries:
  - `Wire.h` (Hardware I2C)
  - `BLEDevice.h`, `BLEServer.h`, `BLEUtils.h`, `BLE2902.h` (ESP32 BLE Stack)

### 4. Flashing the Firmware
1. Connect your ESP32 to PC via USB cable.
2. Open [`v0.2-mpu6050.ino`](file:///c:/Users/Lokesh%20Thanala/OneDrive/Desktop/Hololearn%20AI/hardware/smart-stylus/firmware/v0.2-mpu6050/v0.2-mpu6050.ino) in Arduino IDE.
3. Click **Upload** (Arrow button). *(If ESP32 stays stuck at `Connecting......._____`, press and hold the **BOOT** button on the ESP32 until the flashing begins).*

---

## 🖥️ Serial Monitor Diagnostics

- **Baud Rate**: `115200`

### Expected Output at Startup:
```
================================
HOLOLEARN SMART STYLUS V0.2
ESP32 + MPU6050 AIR MOUSE
================================

Connecting to MPU6050 on SDA(21), SCL(22)... MPU6050 initialized

----------------------------------------
[CALIBRATION] KEEP STYLUS COMPLETELY STILL!
[CALIBRATION] Calibrating gyroscope offsets (2-3s)...
----------------------------------------
......
[CALIBRATION] Offsets calculated: GX=12.4 GY=-38.1 GZ=5.2
[CALIBRATION] Ready!

BLE advertising...
Waiting for connection...
```

### When Connected to Python Driver:
```
--------------------------------
BLE CONNECTED
--------------------------------

AX: +0.02 | AY: -0.01 | AZ: +0.98 | GX:   +0.1 | GY:   -0.2 | GZ:   +0.0 | DX: +0.00 | DY: +0.00
AX: +0.05 | AY: +0.12 | AZ: +0.97 | GX:   +4.5 | GY:  -15.3 | GZ:  +22.8 | DX: +1.82 | DY: -1.22
```

---

## 🔧 Troubleshooting MPU6050

1. **`[ERROR] MPU6050 NOT DETECTED!`**:
   - Check jumper wires: Ensure VCC is in **3.3V** (not 5V if using a raw 3.3V board, though most GY-521 modules have an onboard 3.3V regulator).
   - Ensure SDA is on **GPIO 21** and SCL is on **GPIO 22**.
   - Check if the power LED on the MPU6050 board is lit.
   - If the module uses address `0x69`, solder/connect AD0 to GND to force `0x68`, or change `#define MPU6050_I2C_ADDR 0x68` to `0x69`.

2. **Cursor Drifting While Stationary**:
   - Make sure you do **NOT** move the stylus during the 2-3s startup calibration period.
   - If minor drift persists, increase `GYRO_DEADZONE_DPS` in `v0.2-mpu6050.ino` (e.g. from `1.2f` to `2.0f`).
