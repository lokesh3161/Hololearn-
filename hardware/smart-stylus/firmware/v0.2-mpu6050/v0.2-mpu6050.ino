/*
  =============================================================================
  HoloLearn Smart Stylus Firmware V0.2 (ESP32 + MPU6050 Air Mouse)
  =============================================================================

  Hardware Connections:
  - MPU6050 VCC -> ESP32 3V3
  - MPU6050 GND -> ESP32 GND
  - MPU6050 SDA -> ESP32 GPIO 21
  - MPU6050 SCL -> ESP32 GPIO 22
  - MPU6050 AD0 -> GND (I2C address 0x68)

  BLE Configuration:
  - Device Name:        "HoloLearn-Stylus"
  - Service UUID:       "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
  - Characteristic UUID: "beb5483e-36e1-4688-b7f5-ea07361b26a8"

  Packet Format (10-byte binary struct, little-endian):
  - float   dx      (4 bytes)
  - float   dy      (4 bytes)
  - uint8_t contact (1 byte, initially 0)
  - uint8_t button  (1 byte, initially 0)
  =============================================================================
*/

#include <Wire.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

// =============================================================================
// CONFIGURATION & CONSTANTS
// =============================================================================
#define SERIAL_BAUD             115200
#define I2C_SDA_PIN             21
#define I2C_SCL_PIN             22
#define MPU6050_I2C_ADDR        0x68

#define BLE_DEVICE_NAME         "HoloLearn-Stylus"
#define SERVICE_UUID            "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define CHARACTERISTIC_UUID     "beb5483e-36e1-4688-b7f5-ea07361b26a8"

// Telemetry rate (approx 60 Hz = ~16 ms per cycle)
#define TELEMETRY_INTERVAL_MS   16

// Diagnostics print interval (~10 Hz = 100 ms)
#define DIAG_PRINT_INTERVAL_MS  100

// Air Mouse Motion Tuning
#define GYRO_SENSITIVITY_SCALE  131.0f  // For ±250 deg/sec scale (MPU6050 default)
#define SENSITIVITY_X           0.08f   // Yaw multiplier -> horizontal cursor dx
#define SENSITIVITY_Y           0.08f   // Pitch multiplier -> vertical cursor dy
#define GYRO_DEADZONE_DPS       1.2f    // Deadzone in degrees/sec to suppress resting jitter

#define INVERT_X                false
#define INVERT_Y                true    // Pitch up tilts up -> cursor up (-dy)

// Calibration Samples (200 samples @ 10ms = 2.0 seconds)
#define CALIBRATION_SAMPLES     200

// =============================================================================
// DATA STRUCTURES (Exact 10-byte match with Python ble_receiver.py)
// =============================================================================
#pragma pack(push, 1)
struct StylusPacket {
  float   dx;       // 4 bytes IEEE 754 float
  float   dy;       // 4 bytes IEEE 754 float
  uint8_t contact;  // 1 byte (0 = air, 1 = touching surface)
  uint8_t button;   // 1 byte (0 = released, 1 = pressed)
};
#pragma pack(pop)

// =============================================================================
// GLOBAL VARIABLES
// =============================================================================
BLEServer* pServer = nullptr;
BLECharacteristic* pCharacteristic = nullptr;
bool deviceConnected = false;
bool oldDeviceConnected = false;

// Calibration offsets
float gx_offset = 0.0f;
float gy_offset = 0.0f;
float gz_offset = 0.0f;

// Raw sensor readings
int16_t raw_ax, raw_ay, raw_az;
int16_t raw_temp;
int16_t raw_gx, raw_gy, raw_gz;

// Scaled sensor values
float ax_g, ay_g, az_g;
float gx_dps, gy_dps, gz_dps;

// Calculated mouse deltas
float cur_dx = 0.0f;
float cur_dy = 0.0f;

unsigned long lastTelemetryTime = 0;
unsigned long lastDiagTime = 0;

// =============================================================================
// BLE SERVER CALLBACKS
// =============================================================================
class StylusServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer* pServer) {
    deviceConnected = true;
    Serial.println("\n--------------------------------");
    Serial.println("BLE CONNECTED");
    Serial.println("--------------------------------\n");
  }

  void onDisconnect(BLEServer* pServer) {
    deviceConnected = false;
    Serial.println("\n--------------------------------");
    Serial.println("BLE DISCONNECTED");
    Serial.println("BLE advertising restarted...");
    Serial.println("--------------------------------\n");
  }
};

// =============================================================================
// MPU6050 LOW-LEVEL DRIVER (Direct Wire.h I2C)
// =============================================================================
bool initMPU6050() {
  Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN, 400000); // 400kHz Fast I2C

  // Check WHO_AM_I register (0x75)
  Wire.beginTransmission(MPU6050_I2C_ADDR);
  Wire.write(0x75);
  if (Wire.endTransmission() != 0) {
    return false;
  }

  Wire.requestFrom(MPU6050_I2C_ADDR, 1);
  if (!Wire.available()) return false;
  uint8_t whoAmI = Wire.read();
  if (whoAmI != 0x68 && whoAmI != 0x70 && whoAmI != 0x72) {
    Serial.printf("[WARN] Unexpected WHO_AM_I ID: 0x%02X\n", whoAmI);
  }

  // Wake up MPU6050 (PWR_MGMT_1 = 0x00, clears sleep bit)
  Wire.beginTransmission(MPU6050_I2C_ADDR);
  Wire.write(0x6B);
  Wire.write(0x00);
  if (Wire.endTransmission() != 0) return false;

  delay(20);

  // Set DLPF (Digital Low Pass Filter) to ~44Hz (CONFIG reg 0x1A = 0x03)
  Wire.beginTransmission(MPU6050_I2C_ADDR);
  Wire.write(0x1A);
  Wire.write(0x03);
  Wire.endTransmission();

  // Set Gyroscope Full Scale to ±250 deg/s (GYRO_CONFIG reg 0x1B = 0x00)
  Wire.beginTransmission(MPU6050_I2C_ADDR);
  Wire.write(0x1B);
  Wire.write(0x00);
  Wire.endTransmission();

  // Set Accelerometer Full Scale to ±2g (ACCEL_CONFIG reg 0x1C = 0x00)
  Wire.beginTransmission(MPU6050_I2C_ADDR);
  Wire.write(0x1C);
  Wire.write(0x00);
  Wire.endTransmission();

  return true;
}

bool readMPU6050() {
  Wire.beginTransmission(MPU6050_I2C_ADDR);
  Wire.write(0x3B); // Start reading at ACCEL_XOUT_H
  if (Wire.endTransmission(false) != 0) {
    return false;
  }

  // Burst read 14 bytes (Ax, Ay, Az, Temp, Gx, Gy, Gz)
  uint8_t count = Wire.requestFrom(MPU6050_I2C_ADDR, 14);
  if (count < 14) return false;

  raw_ax = (Wire.read() << 8) | Wire.read();
  raw_ay = (Wire.read() << 8) | Wire.read();
  raw_az = (Wire.read() << 8) | Wire.read();
  raw_temp = (Wire.read() << 8) | Wire.read();
  raw_gx = (Wire.read() << 8) | Wire.read();
  raw_gy = (Wire.read() << 8) | Wire.read();
  raw_gz = (Wire.read() << 8) | Wire.read();

  // Accelerometer in G's (±2g range: 16384 LSB/g)
  ax_g = (float)raw_ax / 16384.0f;
  ay_g = (float)raw_ay / 16384.0f;
  az_g = (float)raw_az / 16384.0f;

  // Gyroscope in deg/sec (subtract calibrated zero-rate offsets)
  gx_dps = ((float)raw_gx - gx_offset) / GYRO_SENSITIVITY_SCALE;
  gy_dps = ((float)raw_gy - gy_offset) / GYRO_SENSITIVITY_SCALE;
  gz_dps = ((float)raw_gz - gz_offset) / GYRO_SENSITIVITY_SCALE;

  return true;
}

void calibrateGyroscope() {
  Serial.println("\n----------------------------------------");
  Serial.println("[CALIBRATION] KEEP STYLUS COMPLETELY STILL!");
  Serial.println("[CALIBRATION] Calibrating gyroscope offsets (2-3s)...");
  Serial.println("----------------------------------------");

  float sum_gx = 0, sum_gy = 0, sum_gz = 0;
  int validSamples = 0;

  for (int i = 0; i < CALIBRATION_SAMPLES; i++) {
    Wire.beginTransmission(MPU6050_I2C_ADDR);
    Wire.write(0x43); // GYRO_XOUT_H
    if (Wire.endTransmission(false) == 0 && Wire.requestFrom(MPU6050_I2C_ADDR, 6) == 6) {
      int16_t gx = (Wire.read() << 8) | Wire.read();
      int16_t gy = (Wire.read() << 8) | Wire.read();
      int16_t gz = (Wire.read() << 8) | Wire.read();
      sum_gx += gx;
      sum_gy += gy;
      sum_gz += gz;
      validSamples++;
    }
    delay(10);
    if (i % 40 == 0) Serial.print(".");
  }
  Serial.println();

  if (validSamples > 0) {
    gx_offset = sum_gx / (float)validSamples;
    gy_offset = sum_gy / (float)validSamples;
    gz_offset = sum_gz / (float)validSamples;
    Serial.printf("[CALIBRATION] Offsets calculated: GX=%.1f GY=%.1f GZ=%.1f\n", gx_offset, gy_offset, gz_offset);
    Serial.println("[CALIBRATION] Ready!\n");
  } else {
    Serial.println("[ERROR] Calibration failed (no I2C response). Check wiring!");
  }
}

// =============================================================================
// BLE INITIALIZATION
// =============================================================================
void initBLE() {
  BLEDevice::init(BLE_DEVICE_NAME);

  // Create BLE Server
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new StylusServerCallbacks());

  // Create BLE Service
  BLEService* pService = pServer->createService(SERVICE_UUID);

  // Create BLE Characteristic with NOTIFY permission
  pCharacteristic = pService->createCharacteristic(
                      CHARACTERISTIC_UUID,
                      BLECharacteristic::PROPERTY_READ   |
                      BLECharacteristic::PROPERTY_NOTIFY
                    );

  // Add Descriptor for Notifications
  pCharacteristic->addDescriptor(new BLE2902());

  // Start the service
  pService->start();

  // Start Advertising
  BLEAdvertising* pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setScanResponse(true);
  pAdvertising->setMinPreferred(0x06);  // Helper for iPhone connection
  pAdvertising->setMinPreferred(0x12);
  BLEDevice::startAdvertising();

  Serial.println("BLE advertising...");
  Serial.println("Waiting for connection...");
}

// =============================================================================
// ARDUINO SETUP
// =============================================================================
void setup() {
  Serial.begin(SERIAL_BAUD);
  delay(1000);

  Serial.println("\n================================");
  Serial.println("HOLOLEARN SMART STYLUS V0.2");
  Serial.println("ESP32 + MPU6050 AIR MOUSE");
  Serial.println("================================\n");

  // 1. Initialize MPU6050
  Serial.print("Connecting to MPU6050 on SDA(21), SCL(22)... ");
  if (!initMPU6050()) {
    Serial.println("\n[ERROR] MPU6050 NOT DETECTED!");
    Serial.println("[HELP] Check 3V3, GND, SDA(GPIO21), SCL(GPIO22) connections.");
    while (true) {
      delay(1000);
    }
  }
  Serial.println("MPU6050 initialized");

  // 2. Perform Startup Calibration
  calibrateGyroscope();

  // 3. Initialize BLE Peripheral
  initBLE();
}

// =============================================================================
// ARDUINO MAIN LOOP
// =============================================================================
void loop() {
  unsigned long now = millis();

  // Handle BLE disconnection / reconnect advertising
  if (!deviceConnected && oldDeviceConnected) {
    delay(200); // Give Bluetooth stack time
    pServer->startAdvertising();
    oldDeviceConnected = deviceConnected;
  }
  if (deviceConnected && !oldDeviceConnected) {
    oldDeviceConnected = deviceConnected;
  }

  // Read IMU sensor data
  if (readMPU6050()) {
    // --- AIR MOUSE RELATIVE MOTION CALCULATION ---
    // Stylus coordinate mapping:
    // Yaw angular velocity (GZ) -> Horizontal movement (dx)
    // Pitch angular velocity (GY or GX) -> Vertical movement (dy)
    float raw_rate_x = gz_dps;
    float raw_rate_y = gy_dps;

    // Apply deadzone threshold (filters idle hand tremor / gyro noise)
    float filtered_rate_x = (fabs(raw_rate_x) < GYRO_DEADZONE_DPS) ? 0.0f : raw_rate_x;
    float filtered_rate_y = (fabs(raw_rate_y) < GYRO_DEADZONE_DPS) ? 0.0f : raw_rate_y;

    cur_dx = filtered_rate_x * (INVERT_X ? -SENSITIVITY_X : SENSITIVITY_X);
    cur_dy = filtered_rate_y * (INVERT_Y ? -SENSITIVITY_Y : SENSITIVITY_Y);

    // Send BLE telemetry packet at ~60 Hz
    if (now - lastTelemetryTime >= TELEMETRY_INTERVAL_MS) {
      lastTelemetryTime = now;

      if (deviceConnected && pCharacteristic != nullptr) {
        StylusPacket packet;
        packet.dx = cur_dx;
        packet.dy = cur_dy;
        packet.contact = 0; // In air prototype (contact = 0)
        packet.button = 0;  // Released (button = 0)

        pCharacteristic->setValue((uint8_t*)&packet, sizeof(StylusPacket));
        pCharacteristic->notify();
      }
    }

    // Print Serial Diagnostics at ~10 Hz
    if (now - lastDiagTime >= DIAG_PRINT_INTERVAL_MS) {
      lastDiagTime = now;

      if (deviceConnected) {
        Serial.printf("AX: %+.2f | AY: %+.2f | AZ: %+.2f | GX: %+6.1f | GY: %+6.1f | GZ: %+6.1f | DX: %+5.2f | DY: %+5.2f\n",
                      ax_g, ay_g, az_g, gx_dps, gy_dps, gz_dps, cur_dx, cur_dy);
      }
    }
  }

  delay(2);
}
