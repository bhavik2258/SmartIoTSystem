
import json
import sqlite3
import time
from datetime import datetime, timezone

import paho.mqtt.client as mqtt

# MQTT configuration
BROKER = "mosquitto"
PORT = 1883
TOPIC = "smart-room/ac/sensors"

# Database configuration
DB_PATH = "/app/data/sensor_data.db"


def initialize_database():
    conn = sqlite3.connect(DB_PATH)

    conn.execute("""
        CREATE TABLE IF NOT EXISTS readings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            device_id TEXT,
            temperature REAL,
            humidity REAL,
            object_detected INTEGER,
            ir_value INTEGER,
            uptime_ms INTEGER,
            received_at TEXT
        )
    """)

    columns = {row[1] for row in conn.execute("PRAGMA table_info(readings)")}
    if "object_detected" not in columns:
        conn.execute("ALTER TABLE readings ADD COLUMN object_detected INTEGER")
    if "ir_value" not in columns:
        conn.execute("ALTER TABLE readings ADD COLUMN ir_value INTEGER")

    conn.commit()
    conn.close()
    print("Database initialized successfully!")


def process_message(client, userdata, msg):
    try:
        payload = json.loads(msg.payload.decode())

        temperature = float(payload["temperature"])
        humidity = float(payload["humidity"])
        object_detected = bool(payload["object_detected"])
        ir_value = int(payload.get("ir_value", 0))
        device_id = payload["device_id"]
        uptime_ms = int(payload["uptime_ms"])

        received_at = datetime.now(timezone.utc).isoformat()

        # Basic sensor validation
        if not (-10 <= temperature <= 60):
            print("Warning: Temperature outside expected range!")

        if not (0 <= humidity <= 100):
            print("Warning: Invalid humidity reading!")
            return

        # Store data in SQLite
        conn = sqlite3.connect(DB_PATH)

        conn.execute("""
            INSERT INTO readings
            (device_id, temperature, humidity, object_detected, ir_value, uptime_ms, received_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            device_id,
            temperature,
            humidity,
            object_detected,
            ir_value,
            uptime_ms,
            received_at
        ))

        conn.commit()
        conn.close()

        # Edge processing
        if temperature >= 35:
            status = "HIGH TEMPERATURE"
        elif temperature <= 18:
            status = "LOW TEMPERATURE"
        else:
            status = "NORMAL"

        print("\n========== SENSOR DATA ==========")
        print(f"Device      : {device_id}")
        print(f"Temperature : {temperature} C")
        print(f"Humidity    : {humidity}%")
        print(f"Status      : {status}")
        print(f"Received at : {received_at}")
        print("Saved to SQLite successfully")
        print("=================================")

    except (ValueError, KeyError, TypeError, json.JSONDecodeError) as error:
        print(f"Invalid sensor message: {error}")


def on_connect(client, userdata, flags, reason_code, properties):
    if reason_code == 0:
        print("Connected to MQTT broker!")
        client.subscribe(TOPIC)
        print(f"Subscribed to: {TOPIC}")
    else:
        print(f"MQTT connection failed: {reason_code}")


def main():
    initialize_database()

    client = mqtt.Client(
        callback_api_version=mqtt.CallbackAPIVersion.VERSION2,
        client_id="odroid-classroom-subscriber"
    )

    client.on_connect = on_connect
    client.message_callback_add(TOPIC, process_message)

    print("Starting Smart AC sensor gateway...")
    print(f"Connecting to MQTT broker: {BROKER}:{PORT}")

    client.connect(BROKER, PORT, 60)
    client.loop_forever()


if __name__ == "__main__":
    main()
