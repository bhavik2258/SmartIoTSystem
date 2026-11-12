#include <DHT.h>
#include <PubSubClient.h>
#include <WiFi.h>

const char *WIFI_SSID = "6th-flr";
const char *WIFI_PASSWORD = "1234567890";
const char *MQTT_HOST = "192.168.67.225";
constexpr uint16_t MQTT_PORT = 1883;
const char *MQTT_TOPIC = "smart-room/ac/sensors";

constexpr uint8_t DHT_PIN = 4;
constexpr uint8_t IR_DIGITAL_PIN = 18;
constexpr uint8_t IR_ANALOG_PIN = 34;
constexpr uint8_t DHT_TYPE = DHT11;

DHT dht(DHT_PIN, DHT_TYPE);
WiFiClient wifiClient;
PubSubClient mqtt(wifiClient);
unsigned long lastPublishedAt = 0;

void connectWifi() {
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to Wi-Fi");
  unsigned long startedAt = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - startedAt < 20000) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("Wi-Fi connected: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("Wi-Fi connection timed out.");
  }
}

void connectMqtt() {
  while (!mqtt.connected()) {
    Serial.print("Connecting to MQTT...");
    if (mqtt.connect("esp32-smart-ac-room-01")) {
      Serial.println("connected");
      return;
    }
    Serial.print("failed, state=");
    Serial.println(mqtt.state());
    delay(1000);
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(IR_DIGITAL_PIN, INPUT);
  dht.begin();
  connectWifi();
  mqtt.setServer(MQTT_HOST, MQTT_PORT);
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    connectWifi();
  }
  if (!mqtt.connected()) {
    connectMqtt();
  }
  mqtt.loop();

  if (millis() - lastPublishedAt < 5000) {
    delay(50);
    return;
  }

  const int irValue = analogRead(IR_ANALOG_PIN);
  const bool objectDetected = digitalRead(IR_DIGITAL_PIN) == LOW;
  Serial.print("IR digital=");
  Serial.print(objectDetected ? "DETECTED" : "CLEAR");
  Serial.print(", analog=");
  Serial.println(irValue);

  const float temperature = dht.readTemperature();
  const float humidity = dht.readHumidity();
  if (isnan(temperature) || isnan(humidity)) {
    Serial.println("DHT11 read failed.");
    lastPublishedAt = millis();
    return;
  }

  char payload[256];
  snprintf(
      payload,
      sizeof(payload),
      "{\"device_id\":\"esp32-room-01\",\"temperature\":%.1f,\"humidity\":%.1f,\"object_detected\":%s,\"ir_value\":%d,\"uptime_ms\":%lu}",
      temperature,
      humidity,
      objectDetected ? "true" : "false",
      irValue,
      millis());
  if (mqtt.publish(MQTT_TOPIC, payload)) {
    Serial.print("Published: ");
    Serial.println(payload);
  } else {
    Serial.println("MQTT publish failed.");
  }
  lastPublishedAt = millis();
}
