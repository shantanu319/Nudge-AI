import React, { useEffect, useState } from 'react';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';


// Import TaskParasite and Block components
import TaskParasite from './TaskParasite';
import Block from './Block';


// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend);

const Popup = () => {
  // State variables
  const [stats, setStats] = useState({ productive: 0, unproductive: 0 });
  const [domainUsage, setDomainUsage] = useState({});
  const [settings, setSettings] = useState({
    interval: 5,
    threshold: 50,
    interventionStyle: 'drill_sergeant' // Default to most aggressive intervention style
  });
  const [isActive, setIsActive] = useState(true);

  // Load from storage
  useEffect(() => {
    chrome.storage.local.get(
      ['productivityStats', 'timeSpent', 'settings', 'isActive'],
      (res) => {
        if (res.productivityStats) setStats(res.productivityStats);
        if (res.timeSpent) setDomainUsage(res.timeSpent);
        if (res.settings) setSettings(res.settings);
        if (res.isActive !== undefined) setIsActive(res.isActive);
      }
    );
    // Storage change listener
    const handleStorageChange = (changes, areaName) => {
      if (areaName === 'local') {
        if (changes.productivityStats) setStats(changes.productivityStats.newValue);
        if (changes.timeSpent) setDomainUsage(changes.timeSpent.newValue);
        if (changes.settings) setSettings(changes.settings.newValue);
        if (changes.isActive) setIsActive(changes.isActive.newValue);
      }
    };
    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => chrome.storage.onChanged.removeListener(handleStorageChange);
  }, []);

  // Handlers
  const toggleActive = () => {
    const newActive = !isActive;
    setIsActive(newActive);
    chrome.storage.local.set({ isActive: newActive }, () => {
      chrome.runtime.sendMessage({ action: 'toggleActive', isActive: newActive });
    });
  };

  const saveSettings = () => {
    chrome.storage.local.set({ settings }, () => {
      chrome.runtime.sendMessage({ action: 'updateSettings', settings });
    });
  };

  const resetStats = () => {
    const resetValue = { productive: 0, unproductive: 0 };
    setStats(resetValue);
    chrome.storage.local.set({ productivityStats: resetValue });
  };

  const totalSessions = stats.productive + stats.unproductive;
  const chartData = {
    labels: ['Productive', 'Unproductive'],
    datasets: [{
      data: [stats.productive, stats.unproductive],
      backgroundColor: ['rgba(75,192,192,0.8)', 'rgba(255,99,132,0.8)'],
      borderColor: ['rgba(75,192,192,1)', 'rgba(255,99,132,1)'],
      borderWidth: 1,
    }],
  };

  const chartOptions = {
    plugins: {
      legend: {
        labels: { color: 'rgba(255, 255, 255, 0.8)' },
      },
    },
  };

  // Return JSX structure
  return (
    <div className="glassmorphism-container">
      <div className="glass-card main-card">
        <h2 className="glass-title">Nudge AI</h2>

        {/* Status Section */}
        <div className="status-container">
          <span className="status-label"><strong>Status:</strong> {isActive ? 'Active' : 'Paused'}</span>
          <button className={`glass-button ${isActive ? 'active' : 'inactive'}`} onClick={toggleActive}>
            {isActive ? 'Pause' : 'Resume'}
          </button>
        </div>

        {/* TaskParasite Section */}
        <div className="glass-card task-parasite-card" style={{ marginBottom: '20px' }}>
          <h3 className="section-title">My Task List</h3>
          <TaskParasite />
        </div>

        {/* Activity Summary */}
        <div className="glass-card chart-card" style={{ marginBottom: '20px' }}>
          <h3 className="section-title">Activity Summary</h3>
          {totalSessions > 0 ? (
            <>
              <div className="chart-container">
                <Pie data={chartData} options={chartOptions} />
              </div>
              <div className="stats-details">
                <div className="stat-item">
                  <span className="stat-label">Total Sessions:</span>
                  <span className="stat-value">{totalSessions}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Productive:</span>
                  <span className="stat-value">{stats.productive} ({Math.round((stats.productive / totalSessions) * 100)}%)</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Unproductive:</span>
                  <span className="stat-value">{stats.unproductive} ({Math.round((stats.unproductive / totalSessions) * 100)}%)</span>
                </div>
                <button className="glass-button reset-button" onClick={resetStats}>Reset Stats</button>
              </div>
            </>
          ) : (
            <p className="no-data">No activity data yet.</p>
          )}
        </div>

        {/* Settings Section */}
        <div className="glass-card settings-card" style={{ marginBottom: '20px' }}>
          <h3 className="section-title">Settings</h3>
          <div className="setting-row">
            <label htmlFor="interval" className="setting-label">Check Interval (minutes):</label>
            <select id="interval" className="glass-select" value={settings.interval} onChange={(e) =>
              setSettings({ ...settings, interval: Number(e.target.value) })
            }>
              <option value={0.1}>0.1</option> {/* added this for testing */}
              <option value={1}>1</option>
              <option value={3}>3</option>
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={30}>30</option>
            </select>
          </div>
          <div className="setting-row slider-row">
            <label htmlFor="threshold" className="setting-label">Threshold</label>
            <div className="threshold-container">
              <span>{settings.threshold}%</span>
              <input
                type="range"
                id="threshold"
                className="glass-slider"
                min="10"
                max="90"
                step="5"
                value={settings.threshold}
                onChange={(e) => setSettings({ ...settings, threshold: Number(e.target.value) })}
              />
            </div>
          </div>
          <div className="setting-row">
            <label htmlFor="interventionStyle" className="setting-label">Focus Guardian Style</label>
            <div className="input-container">
              <select id="interventionStyle" className="glass-select" value={settings.interventionStyle} onChange={(e) =>
                setSettings({ ...settings, interventionStyle: e.target.value })
              }>
                <option value="drill_sergeant">Drill Sergeant</option>
                <option value="vigilant_mentor">Vigilant Mentor</option>
                <option value="steady_coach">Steady Coach</option>
                <option value="patient_guide">Patient Guide</option>
                <option value="zen_observer">Zen Observer</option>
              </select>
            </div>
          </div>
          <button className="glass-button save-button" onClick={saveSettings}>Save Settings</button>
        </div>


        {/* Real-Time Domain Usage */}
        <div className="glass-card domain-card" style={{ marginBottom: '20px' }}>
          <h3 className="section-title">Real-Time Domain Usage</h3>
          {Object.keys(domainUsage).length === 0 ? (
            <p className="no-data">No domains tracked yet.</p>
          ) : (
            <div className="table-container">
              <table className="glass-table">
                <thead>
                  <tr>
                    <th>Domain</th>
                    <th>Time (sec)</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(domainUsage).map(([domain, ms]) => {
                    const seconds = (ms / 1000).toFixed(1);
                    return (
                      <tr key={domain}>
                        <td>{domain}</td>
                        <td className="time-cell">{seconds}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>


        {/* Block Distractions */}
        <div className="glass-card blocking-card">
          <h3 className="section-title">Block Distractions</h3>
          <Block />
        </div>
      </div>
    </div>
  );
};


export default Popup;