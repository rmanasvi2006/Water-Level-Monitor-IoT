import React, { useState } from "react";
import axios from "axios";

function Prediction() {
  const [distance, setDistance] = useState("");
  const [temperature, setTemperature] = useState("");
  const [result, setResult] = useState(null);

  const handlePredict = async () => {
    try {
      const response = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/api/v1/predict`,
        {
          distance: distance,
          temperature: temperature
        }
      );
      setResult(response.data);
    } catch (error) {
      console.error("Prediction error:", error);
    }
  };

  return (
    <div style={{ padding: "40px" }}>
      <h2>Water Activity Prediction</h2>

      <input
        placeholder="Distance"
        value={distance}
        onChange={(e) => setDistance(e.target.value)}
      />

      <br /><br />

      <input
        placeholder="Temperature"
        value={temperature}
        onChange={(e) => setTemperature(e.target.value)}
      />

      <br /><br />

      <button onClick={handlePredict}>Predict</button>

      {result && (
        <div>
          <h3>Prediction: {result.prediction}</h3>
          <h3>Confidence: {result.confidence}</h3>
        </div>
      )}
    </div>
  );
}

export default Prediction;