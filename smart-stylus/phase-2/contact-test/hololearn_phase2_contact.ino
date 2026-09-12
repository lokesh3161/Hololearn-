/*
 * HOLOLEARN SMART STYLUS — PHASE 2A HARDWARE FIRMWARE
 * Physical Button / Wire Contact Test over BLE
 * 
 * Target: ESP32 / ESP32-S3
 * Service UUID:        183a0001-4532-4e89-89a1-000000000001
 * Characteristic UUID: 183a0002-4532-4e89-89a1-000000000001
 */

#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include <math.h>

#define SERVICE_UUID        "183a0001-4532-4e89-89a1-000000000001"
#define CHARACTERISTIC_UUID "183a0002-4532-4e89-89a1-000000000001"

// Physical Tip Contact Pin (GPIO 15)
const int TIP_CONTACT_PIN = 15;

BLEServer* pServer = NULL;
BLECharacteristic* pCharacteristic = NULL;
bool deviceConnected = false;
uint32_t sequenceNum = 0;

// Trajectory motion parameters for Phase 2 test
float angle = 0.0;
const int CENTER_X = 600;
const int CENTER_Y = 400;
const int RADIUS_X = 350;
const int RADIUS_Y = 200;

class MyServerCallbacks: public BLEServerCallbacks {
    void onConnect(BLEServer* pServer) {
      deviceConnected = true;
      Serial.println("========================================");
      Serial.println(" [BLE] SMART STYLUS CONNECTED TO LAPTOP");
      Serial.println("========================================");
    };

    void onDisconnect(BLEServer* pServer) {
      deviceConnected = false;
      Serial.println("========================================");
      Serial.println(" [BLE] SMART STYLUS DISCONNECTED");
      Serial.println(" Restarting BLE advertising...");
      Serial.println("========================================");
      BLEDevice::startAdvertising();
    }
};

void setup() {
  Serial.begin(115200);

  // Configure Tip Contact GPIO 15
  pinMode(TIP_CONTACT_PIN, INPUT);

  Serial.println("========================================");
  Serial.println(" HOLOLEARN SMART STYLUS");
  Serial.println(" PHASE 2 CONTACT TEST");
  Serial.println("========================================");

  BLEDevice::init("HOLOLEARN_SMART_STYLUS");
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new MyServerCallbacks());

  BLEService *pService = pServer->createService(SERVICE_UUID);

  pCharacteristic = pService->createCharacteristic(
                      CHARACTERISTIC_UUID,
                      BLECharacteristic::PROPERTY_READ   |
                      BLECharacteristic::PROPERTY_NOTIFY
                    );

  pCharacteristic->addDescriptor(new BLE2902());
  pService->start();

  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setScanResponse(true);
  pAdvertising->setMinPreferred(0x06);
  pAdvertising->setMinPreferred(0x12);
  BLEDevice::startAdvertising();

  Serial.println("BLE INITIALIZED");
  Serial.println("Device Name: HOLOLEARN_SMART_STYLUS");
  Serial.println("Waiting for laptop connection...");
}

void loop() {
  if (deviceConnected) {
    // 1. Update motion trajectory (synthetic continuous position)
    angle += 0.04;
    if (angle > 2 * M_PI) angle -= 2 * M_PI;

    int currentX = CENTER_X + (int)(RADIUS_X * cos(angle));
    int currentY = CENTER_Y + (int)(RADIUS_Y * sin(2 * angle) / 2.0);

    // 2. Read physical button / wire tip contact state from GPIO 15
    int rawContact = digitalRead(TIP_CONTACT_PIN);
    int contactState = (rawContact == HIGH) ? 1 : 0;
    float pressureVal = (contactState == 1) ? 1.0 : 0.0;
    uint32_t nowMs = millis();
    sequenceNum++;

    // 3. Construct CSV Telemetry packet: "x,y,pressure,contact,sequence,timestamp"
    String packet = String(currentX) + "," +
                    String(currentY) + "," +
                    String(pressureVal, 2) + "," +
                    String(contactState) + "," +
                    String(sequenceNum) + "," +
                    String(nowMs);

    pCharacteristic->setValue(packet.c_str());
    pCharacteristic->notify();

    // 4. Output clear status to Serial Monitor
    Serial.println("TX:");
    Serial.print("X: "); Serial.println(currentX);
    Serial.print("Y: "); Serial.println(currentY);
    Serial.print("Contact: "); Serial.println(contactState == 1 ? "CONTACT" : "HOVER");
    Serial.print("Pressure: "); Serial.println(pressureVal, 2);
    Serial.println("----------------------------------------");

    delay(20); // ~50 Hz update frequency
  }
}
