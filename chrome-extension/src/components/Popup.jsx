import { ArcElement, Chart as ChartJS, Legend, Tooltip } from 'chart.js';
import React, { useEffect, useState } from 'react';
import { Pie } from 'react-chartjs-2';
import Block from './Block';

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend);

const Popup = () => {
  const [stats, setStats] = useState({ productive: 0, unproductive: 0 });
  const [settings, setSettings] = useState({
    interval: 5,  // Default: 5 minutes
    threshold: 50  // Default: 50% threshold for unproductive
  });
  const [isActive, setIsActive] = useState(true);

  // Fetch stats from extension storage
  useEffect(() => {
    chrome.storage.local.get(['productivityStats', 'settings', 'isActive'], (result) => {
      if (result.productivityStats) {
        setStats(result.productivityStats);
      }
      if (result.settings) {
        setSettings(result.settings);
      }
      if (result.isActive !== undefined) {
        setIsActive(result.isActive);
      }
    });
  }, []);

  // Save settings to storage
  const saveSettings = () => {
    chrome.storage.local.set({ settings }, () => {
      // Send message to background script to update interval
      chrome.runtime.sendMessage({
        action: 'updateSettings',
        settings
      });
    });
  };

  // Toggle active state
  const toggleActive = () => {
    const newActiveState = !isActive;
    setIsActive(newActiveState);
    chrome.storage.local.set({ isActive: newActiveState }, () => {
      chrome.runtime.sendMessage({
        action: 'toggleActive',
        isActive: newActiveState
      });
    });
  };

  // Reset stats
  const resetStats = () => {
    const resetStats = { productive: 0, unproductive: 0 };
    setStats(resetStats);
    chrome.storage.local.set({ productivityStats: resetStats });
  };

  // Calculate total sessions
  const totalSessions = stats.productive + stats.unproductive;

  // Prepare chart data
  const chartData = {
    labels: ['Productive', 'Unproductive'],
    datasets: [
      {
        data: [stats.productive, stats.unproductive],
        backgroundColor: ['rgba(75, 192, 192, 0.6)', 'rgba(255, 99, 132, 0.6)'],
        borderColor: ['rgba(75, 192, 192, 1)', 'rgba(255, 99, 132, 1)'],
        borderWidth: 1,
      },
    ],
  };

  return (
    <div className="container">
      <h2>Productivity Nudge</h2>

      <div className="status-toggle">
        <span>Status: {isActive ? 'Active' : 'Paused'}</span>
        <button onClick={toggleActive}>
          {isActive ? 'Pause' : 'Resume'}
        </button>
      </div>

      <div className="stats-container">
        <h3>Activity Summary</h3>
        {totalSessions > 0 ? (
          <>
            <div style={{ width: '200px', height: '200px', margin: '0 auto' }}>
              <Pie data={chartData} />
            </div>
            <p>Total Sessions: {totalSessions}</p>
            <p>Productive: {stats.productive} ({Math.round((stats.productive / totalSessions) * 100)}%)</p>
            <p>Unproductive: {stats.unproductive} ({Math.round((stats.unproductive / totalSessions) * 100)}%)</p>
            <button onClick={resetStats}>Reset Stats</button>
          </>
        ) : (
          <p>No activity data yet. We'll start collecting data once you begin browsing.</p>
        )}
      </div>

      <div className="settings-container">
        <h3>Settings</h3>

        <div className="setting-row">
          <label htmlFor="interval">Check Interval (minutes):</label>
          <select
            id="interval"
            value={settings.interval}
            onChange={(e) => setSettings({ ...settings, interval: Number(e.target.value) })}
          >
            <option value="1">1</option>
            <option value="3">3</option>
            <option value="5">5</option>
            <option value="10">10</option>
            <option value="15">15</option>
            <option value="30">30</option>
          </select>
        </div>

        <div className="setting-row">
          <label htmlFor="threshold">Productivity Threshold (%):</label>
          <input
            type="range"
            id="threshold"
            min="10"
            max="90"
            step="5"
            value={settings.threshold}
            onChange={(e) => setSettings({ ...settings, threshold: Number(e.target.value) })}
          />
          <span>{settings.threshold}%</span>
        </div>

        <button onClick={saveSettings}>Save Settings</button>
      </div>

      <div >
        <h3>Web Blocking</h3>
        <Block />
      </div>

    </div>
  );
};

export default Popup;