import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import axios from 'axios';

const Home = () => {
  const [waterLevel, setWaterLevel] = useState(0);
  const [temperature, setTemperature] = useState(0);
  const [waterLevelData, setWaterLevelData] = useState([]);
  const [temperatureData, setTemperatureData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Fetch real sensor data from API
  const fetchSensorData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        'http://127.0.0.1:8000/api/v1/tank-sensor?page=1&size=50&sort_by=created_at&sort_order=desc',
        {
          headers: {
            'accept': 'application/json'
          }
        }
      );
      
      const sensorData = response.data.data || [];
      
      if (sensorData.length > 0) {
        // Get the latest reading for current values
        const latest = sensorData[0];
        
        // Convert water level cm to percentage (assuming 200cm max tank height)
        const waterLevelPercentage = Math.min(100, Math.round((latest.water_level_cm / 200) * 100 * 10) / 10);
        setWaterLevel(waterLevelPercentage);
        setTemperature(Math.round(latest.temperature_c * 10) / 10);
        setLastUpdated(new Date(latest.created_at));
        
        // Process data for charts (reverse to show chronological order)
        const reversedData = [...sensorData].reverse();
        
        const waterData = reversedData.map(item => {
          const time = new Date(item.created_at).toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
          });
          const percentage = Math.min(100, Math.round((item.water_level_cm / 200) * 100 * 10) / 10);
          
          return {
            time: time,
            value: percentage,
            raw_cm: item.water_level_cm
          };
        });

        const tempData = reversedData.map(item => {
          const time = new Date(item.created_at).toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
          });
          
          return {
            time: time,
            value: Math.round(item.temperature_c * 10) / 10
          };
        });

        setWaterLevelData(waterData);
        setTemperatureData(tempData);
      }
    } catch (error) {
      console.error('Error fetching sensor data:', error);
      // Keep existing data or show error state
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial data fetch
    fetchSensorData();

    // Update data every 30 seconds
    const interval = setInterval(() => {
      fetchSensorData();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="home-page">
      <div className="page-header">
        <h2 className="page-title">Dashboard Overview</h2>
        {lastUpdated && (
          <div className="last-updated">
            Last updated: {lastUpdated.toLocaleTimeString('en-US', { 
              hour: '2-digit', 
              minute: '2-digit',
              second: '2-digit'
            })}
            {loading && <span className="update-indicator"> • Updating...</span>}
          </div>
        )}
      </div>
      
      {/* Cards Section */}
      <div className="cards-container">
        <div className="card water-level-card">
          <div className="card-header">
            <div className="card-icon water-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0z"/>
              </svg>
            </div>
            <h3>Water Level</h3>
          </div>
          <div className="card-value">
            <span className="value">{loading ? '--' : waterLevel}</span>
            <span className="unit">%</span>
          </div>
          <div className="card-status">
            <span className={`status ${waterLevel > 50 ? 'good' : 'warning'}`}>
              {waterLevel > 80 ? 'High' : waterLevel > 50 ? 'Normal' : waterLevel > 20 ? 'Low' : 'Critical'}
            </span>
          </div>
        </div>

        <div className="card temperature-card">
          <div className="card-header">
            <div className="card-icon temp-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 4v10.54a4 4 0 11-4 0V4a2 2 0 114 0z"/>
              </svg>
            </div>
            <h3>Temperature</h3>
          </div>
          <div className="card-value">
            <span className="value">{loading ? '--' : temperature}</span>
            <span className="unit">°C</span>
          </div>
          <div className="card-status">
            <span className={`status ${temperature < 30 ? 'good' : 'warning'}`}>
              {temperature < 25 ? 'Normal' : temperature < 30 ? 'Warm' : 'Hot'}
            </span>
          </div>
        </div>
      </div>

      {/* Graphs Section */}
      <div className="graphs-container">
        <div className="graph-card">
          <h3>Water Level Trend - Recent Readings</h3>
          {loading && waterLevelData.length === 0 ? (
            <div className="graph-loading">Loading sensor data...</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={waterLevelData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis domain={[0, 100]} />
                <Tooltip 
                  labelFormatter={(value) => `Time: ${value}`}
                  formatter={(value, name, props) => [
                    `${value}% (${props.payload.raw_cm}cm)`,
                    'Water Level'
                  ]}
                />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#2196F3" 
                  strokeWidth="3"
                  dot={{ fill: '#2196F3', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="graph-card">
          <h3>Temperature Trend - Recent Readings</h3>
          {loading && temperatureData.length === 0 ? (
            <div className="graph-loading">Loading sensor data...</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={temperatureData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis domain={['dataMin - 2', 'dataMax + 2']} />
                <Tooltip 
                  labelFormatter={(value) => `Time: ${value}`}
                  formatter={(value) => [`${value}°C`, 'Temperature']}
                />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#FF9800" 
                  strokeWidth="3"
                  dot={{ fill: '#FF9800', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
};

export default Home;