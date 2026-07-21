#include <Arduino.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

// PlantMate BLE identifiers. The mobile App uses the same UUIDs.
const char DEVICE_NAME[] = "PlantMate-ESP32";
const char SERVICE_UUID[] = "7b1e0001-1f3b-4c3d-9a5e-120000000001";
const char TELEMETRY_UUID[] = "7b1e0002-1f3b-4c3d-9a5e-120000000002";
const char COMMAND_UUID[] = "7b1e0003-1f3b-4c3d-9a5e-120000000003";
const unsigned long PUBLISH_INTERVAL_MS = 2000;

BLECharacteristic *telemetryCharacteristic = nullptr;
bool clientConnected = false;
bool demoEnabled = true;
unsigned long lastPublishAt = 0;

struct SensorData {
  float temperature;
  float humidity;
  float water;
  float soil;
  float light;
};

class PlantMateServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer *server) {
    clientConnected = true;
    Serial.println("BLE client connected");
  }

  void onDisconnect(BLEServer *server) {
    clientConnected = false;
    Serial.println("BLE client disconnected; advertising restarted");
    delay(150);
    server->getAdvertising()->start();
  }
};

class PlantMateCommandCallbacks : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic *characteristic) {
    std::string command = characteristic->getValue();
    if (command == "DEMO:ON") {
      demoEnabled = true;
    } else if (command == "DEMO:OFF") {
      demoEnabled = false;
    }
    Serial.printf("Command: %s\n", command.c_str());
  }
};

SensorData readSensors() {
  // 后期接入真实硬件时，只替换这个函数，App 和蓝牙协议都不需要改。
  float t = millis() / 1000.0f;
  SensorData data;
  if (demoEnabled) {
    data.temperature = 24.5f + 1.2f * sinf(t / 11.0f);
    data.humidity = 61.0f + 4.5f * sinf(t / 17.0f + 0.8f);
    data.water = 78.0f - fmodf(t / 45.0f, 18.0f);
    data.soil = 52.0f + 6.0f * sinf(t / 23.0f + 1.5f);
    data.light = 640.0f + 120.0f * sinf(t / 9.0f);
  } else {
    data.temperature = 0;
    data.humidity = 0;
    data.water = 0;
    data.soil = 0;
    data.light = 0;
  }
  return data;
}

String sensorDataToJson(const SensorData &data) {
  char payload[220];
  snprintf(payload, sizeof(payload),
           "{\"temperature\":%.1f,\"humidity\":%.1f,\"water\":%.1f,"
           "\"soil\":%.1f,\"light\":%.0f,\"uptime\":%lu,\"demo\":%s}",
           data.temperature, data.humidity, data.water, data.soil, data.light,
           millis() / 1000UL, demoEnabled ? "true" : "false");
  return String(payload);
}

void setup() {
  Serial.begin(115200);
  delay(300);
  Serial.println("PlantMate BLE starting...");

  BLEDevice::init(DEVICE_NAME);
  BLEServer *server = BLEDevice::createServer();
  server->setCallbacks(new PlantMateServerCallbacks());

  BLEService *service = server->createService(SERVICE_UUID);
  telemetryCharacteristic = service->createCharacteristic(
      TELEMETRY_UUID,
      BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY);
  telemetryCharacteristic->addDescriptor(new BLE2902());

  BLECharacteristic *commandCharacteristic = service->createCharacteristic(
      COMMAND_UUID, BLECharacteristic::PROPERTY_WRITE);
  commandCharacteristic->setCallbacks(new PlantMateCommandCallbacks());

  service->start();
  BLEAdvertising *advertising = BLEDevice::getAdvertising();
  advertising->addServiceUUID(SERVICE_UUID);
  advertising->setScanResponse(true);
  advertising->setMinPreferred(0x06);
  advertising->setMaxPreferred(0x12);
  BLEDevice::startAdvertising();
  Serial.printf("Advertising as %s\n", DEVICE_NAME);
}

void loop() {
  unsigned long now = millis();
  if (now - lastPublishAt < PUBLISH_INTERVAL_MS) {
    return;
  }
  lastPublishAt = now;

  String payload = sensorDataToJson(readSensors());
  telemetryCharacteristic->setValue(payload.c_str());
  if (clientConnected) {
    telemetryCharacteristic->notify();
  }
  Serial.println(payload);
}

