# ==============================
import os
from dotenv import load_dotenv
import requests
import psycopg2
import time
import random
import threading
from datetime import datetime
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

# Load environment variables
load_dotenv()

app = FastAPI()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==============================
# DATABASE CONNECTION
# ==============================

def get_connection():
    conn = psycopg2.connect(
        host="pg-20613e19-manasvirapolu-ada4.h.aivencloud.com",
        port="16862",
        database="defaultdb",
        user="avnadmin",
        password="AVNS_fqFo5npbreSM7-fHDj8",
        sslmode="require"
    )
    return conn


# ==============================
# CREATE TABLES
# ==============================

def create_tables():

    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
    CREATE TABLE IF NOT EXISTS sensor_data (
        id SERIAL PRIMARY KEY,
        node_id VARCHAR(50),
        field1 FLOAT,
        field2 FLOAT,
        created_at TIMESTAMP
    )
    """)

    cur.execute("""
    CREATE TABLE IF NOT EXISTS tank_sensorparameters (
        id SERIAL PRIMARY KEY,
        node_id VARCHAR(50),
        tank_height_cm FLOAT,
        tank_length_cm FLOAT,
        tank_width_cm FLOAT,
        lat FLOAT,
        long FLOAT
    )
    """)

    conn.commit()
    cur.close()
    conn.close()


# ==============================
# SENSOR CONFIG
# ==============================

TEST_MODE = True
NODE_ID = "NODE_001"

url = "https://api.thingspeak.com/channels/3290444/feeds.json?api_key=AWP8F08WA7SLO5EQ&results=-1"


# ==============================
# GENERATE TEST DATA
# ==============================

def generate_test_data():

    base_values = {
        "distance": 94.0,
        "temperature": 20.8
    }

    return {
        "distance": round(base_values["distance"] + random.uniform(-10, 10), 1),
        "temperature": round(base_values["temperature"] + random.uniform(-2, 2), 1),
        "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }


# ==============================
# SENSOR COLLECTOR
# ==============================

def sensor_collector():

    print("Sensor Data Collector Started")

    while True:

        try:

            if TEST_MODE:

                test_data = generate_test_data()

                distance = test_data["distance"]
                temperature = test_data["temperature"]
                created_at = test_data["created_at"]

            else:

                response = requests.get(url)
                data = response.json()

                feed = data["feeds"][0]

                distance = float(feed["field1"])
                temperature = float(feed["field2"])
                created_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

            print("NEW DATA:", distance, temperature)

            conn = get_connection()
            cur = conn.cursor()

            cur.execute("""
            INSERT INTO sensor_data
            (node_id, field1, field2, created_at)
            VALUES (%s,%s,%s,%s)
            """,
            (NODE_ID, distance, temperature, created_at))

            conn.commit()

            cur.close()
            conn.close()

            print("Sensor data inserted")

        except Exception as e:
            print("Error:", e)

        time.sleep(20)


# ==============================
# REQUEST MODEL
# ==============================

class TankParameters(BaseModel):

    node_id: str
    tank_height_cm: float
    tank_length_cm: float
    tank_width_cm: float
    lat: float
    long: float


# ==============================
# POST TANK PARAMETERS
# ==============================

@app.post("/tank-parameters")
def create_tank_parameters(data: TankParameters):

    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
    INSERT INTO tank_sensorparameters
    (node_id, tank_height_cm, tank_length_cm, tank_width_cm, lat, long)
    VALUES (%s,%s,%s,%s,%s,%s)
    RETURNING id
    """,
    (
        data.node_id,
        data.tank_height_cm,
        data.tank_length_cm,
        data.tank_width_cm,
        data.lat,
        data.long
    ))

    new_id = cur.fetchone()[0]

    conn.commit()
    cur.close()
    conn.close()

    return {
        "message": "Tank parameters inserted successfully",
        "id": new_id
    }


# ==============================
# GET TANK PARAMETERS
# ==============================

@app.get("/tank-parameters")
def get_tank_parameters():

    conn = get_connection()
    cur = conn.cursor()

    cur.execute("SELECT * FROM tank_sensorparameters")

    rows = cur.fetchall()

    cur.close()
    conn.close()

    result = []

    for row in rows:
        result.append({
            "id": row[0],
            "node_id": row[1],
            "tank_height_cm": row[2],
            "tank_length_cm": row[3],
            "tank_width_cm": row[4],
            "lat": row[5],
            "long": row[6]
        })

    return result


# ==============================
# SENSOR DATA API
# ==============================

@app.get("/sensor-data")
def get_sensor_data(node_id: str = None):

    conn = get_connection()
    cur = conn.cursor()

    if node_id:

        cur.execute("""
        SELECT id,node_id,field1,field2,created_at
        FROM sensor_data
        WHERE node_id = %s
        ORDER BY created_at DESC
        LIMIT 100
        """, (node_id,))

    else:

        cur.execute("""
        SELECT id,node_id,field1,field2,created_at
        FROM sensor_data
        ORDER BY created_at DESC
        LIMIT 100
        """)

    rows = cur.fetchall()

    cur.close()
    conn.close()

    result = []

    for row in rows:
        result.append({
            "id": row[0],
            "node_id": row[1],
            "distance": row[2],
            "temperature": row[3],
            "created_at": row[4]
        })

    return result


# ==============================
# PREDICTION API
# ==============================

@app.post("/api/v1/predict")
def predict_water_activity(data: dict):

    distance = float(data.get("distance", 0))
    temperature = float(data.get("temperature", 0))

    if distance < 30:
        prediction = "shower"
        confidence = 0.85
    elif distance < 60:
        prediction = "faucet"
        confidence = 0.80
    else:
        prediction = "no_activity"
        confidence = 0.90

    return {
        "prediction": prediction,
        "confidence": confidence
    }


# ==============================
# START BACKGROUND TASK
# ==============================

@app.on_event("startup")
def start_background_tasks():

    create_tables()

    thread = threading.Thread(target=sensor_collector)
    thread.daemon = True
    thread.start()


# ==============================
# MAIN
# ==============================

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)