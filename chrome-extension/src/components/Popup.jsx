import React, { useEffect, useState } from 'react';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend);

const Popup = () => {
  // ---------- State Variables ----------
  // Productivity stats: { productive, unproductive }
  const [stats, setStats] = useState({ productive: 0, unproductive: 0 });

  // Settings: { interval, threshold }
  const [settings, setSettings] = useState({
    interval: 5,
    threshold: 50,
  });

  // Active state: true/false
  const [isActive, setIsActive] = useState(true);

  // Domain usage: { "www.google.com": msSpent, ... }
  const [domainUsage, setDomainUsage] = useState({});

  // ---------- Effects: On Mount, load from storage, attach listeners ----------
  useEffect(() => {
    // 1) Get initial data from storage
    chrome.storage.local.get(
      ['productivityStats', 'settings', 'isActive', 'timeSpent'],
      (result) => {
        if (result.productivityStats) {
          setStats(result.productivityStats);
        }
        if (result.settings) {
          setSettings(result.settings);
        }
        if (result.isActive !== undefined) {
          setIsActive(result.isActive);
        }
        if (result.timeSpent) {
          setDomainUsage(result.timeSpent);
        }
      }
    );

    // 2) Listen for ANY changes in local storage
    const handleStorageChange = (changes, areaName) => {
      if (areaName === 'local') {
        // If productivityStats changed
        if (changes.productivityStats) {
          setStats(changes.productivityStats.newValue);
        }
        // If settings changed
        if (changes.settings) {
          setSettings(changes.settings.newValue);
        }
        // If isActive changed
        if (changes.isActive) {
          setIsActive(changes.isActive.newValue);
        }
        // If timeSpent changed
        if (changes.timeSpent) {
          setDomainUsage(changes.timeSpent.newValue);
        }
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);

    // Cleanup listener on unmount
    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  // ---------- Handlers ----------
  // Toggle active/inactive extension
  const toggleActive = () => {
    const newActiveState = !isActive;
    setIsActive(newActiveState);
    chrome.storage.local.set({ isActive: newActiveState }, () => {
      chrome.runtime.sendMessage({
        action: 'toggleActive',
        isActive: newActiveState,
      });
    });
  };

  // Save updated settings
  const saveSettings = () => {
    chrome.storage.local.set({ settings }, () => {
      // Notify background script
      chrome.runtime.sendMessage({
        action: 'updateSettings',
        settings,
      });
    });
  };

  // Reset the productive/unproductive counters
  const resetStats = () => {
    const resetValue = { productive: 0, unproductive: 0 };
    setStats(resetValue);
    chrome.storage.local.set({ productivityStats: resetValue });
  };

  // ---------- Derived Data ----------
  const totalSessions = stats.productive + stats.unproductive;
  const chartData = {
    labels: ['Productive', 'Unproductive'],
    datasets: [
      {
        data: [stats.productive, stats.unproductive],
        backgroundColor: ['rgba(75,192,192,0.6)', 'rgba(255,99,132,0.6)'],
        borderColor: ['rgba(75,192,192,1)', 'rgba(255,99,132,1)'],
        borderWidth: 1,
      },
    ],
  };

  // ---------- Render ----------
  return (
    <div style={{ minWidth: '300px', fontFamily: 'sans-serif', padding: '1rem' }}>
      <h2>Productivity Nudge</h2>

      {/* Active / Pause Button */}
      <div style={{ marginBottom: '1rem' }}>
        <span><strong>Status:</strong> {isActive ? 'Active' : 'Paused'}</span>{' '}
        <button onClick={toggleActive}>
          {isActive ? 'Pause' : 'Resume'}
        </button>
      </div>

      {/* Productive vs. Unproductive Pie */}
      <div>
        <h3>Activity Summary</h3>
        {totalSessions > 0 ? (
          <>
            <div style={{ width: '200px', margin: '0 auto' }}>
              <Pie data={chartData} />
            </div>
            <p>Total Sessions: {totalSessions}</p>
            <p>
              Productive: {stats.productive} (
              {Math.round((stats.productive / totalSessions) * 100)}%)
            </p>
            <p>
              Unproductive: {stats.unproductive} (
              {Math.round((stats.unproductive / totalSessions) * 100)}%)
            </p>
            <button onClick={resetStats}>Reset Stats</button>
          </>
        ) : (
          <p>No activity data yet.</p>
        )}
      </div>

      {/* Settings Section */}
      <div style={{ marginTop: '1rem' }}>
        <h3>Settings</h3>
        <div style={{ margin: '0.5rem 0' }}>
          <label htmlFor="interval">Check Interval (minutes): </label>
          <select
            id="interval"
            value={settings.interval}
            onChange={(e) =>
              setSettings({ ...settings, interval: Number(e.target.value) })
            }
          >
            <option value={1}>1</option>
            <option value={3}>3</option>
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={15}>15</option>
            <option value={30}>30</option>
          </select>
        </div>
        <div style={{ margin: '0.5rem 0' }}>
          <label htmlFor="threshold">Productivity Threshold (%): </label>
          <input
            type="range"
            id="threshold"
            min="10"
            max="90"
            step="5"
            value={settings.threshold}
            onChange={(e) =>
              setSettings({ ...settings, threshold: Number(e.target.value) })
            }
          />
          <span>{' '}{settings.threshold}%</span>
        </div>
        <button onClick={saveSettings}>Save Settings</button>
      </div>

      {/* Domain Usage Table */}
      <div style={{ marginTop: '1rem' }}>
        <h3>Real-Time Domain Usage</h3>
        {Object.keys(domainUsage).length === 0 ? (
          <p>No domains tracked yet.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }} border="1">
            <thead>
              <tr>
                <th>Domain</th>
                <th style={{ textAlign: 'right' }}>Time (sec)</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(domainUsage).map(([domain, ms]) => {
                const seconds = (ms / 1000).toFixed(1);
                return (
                  <tr key={domain}>
                    <td>{domain}</td>
                    <td style={{ textAlign: 'right' }}>{seconds}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Popup;
