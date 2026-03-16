// src/config.js
// Central config for API URLs and other constants

// Use environment variable for production, fallback to deployed backend
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "https://water-level-monitor-iot-production.up.railway.app";

export default {
  API_BASE_URL,
  SENSOR_DATA_URL: `${API_BASE_URL}/sensor-data`,
  TANK_PARAMETERS_URL: `${API_BASE_URL}/tank-parameters`,
};