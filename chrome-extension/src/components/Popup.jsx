import React, { useEffect, useState } from 'react';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

// Import your TaskParasite component
import TaskParasite from './TaskParasite';

// Import the Block component
import Block from './Block';

ChartJS.register(ArcElement, Tooltip, Legend);

const Popup = () => {
  /********************************************************
   * 1) STATE VARIABLES
   ********************************************************/
  // Productivity Stats
  const [stats, setStats] = useState({ productive: 0, unproductive: 0 });

  // Real-Time Domain Usage
  const [domainUsage, setDomainUsage] = useState({});

  // Extension settings (interval, threshold)
  const [settings, setSettings] = useState({
    interval: 5,   // minutes
    threshold: 50  // %
  });

  // Whether extension is active or paused
  const [isActive, setIsActive] = useState(true);

  /********************************************************
   * 2) LOAD FROM STORAGE ON MOUNT + LISTEN FOR CHANGES
   ********************************************************/
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

    // Listen for changes in storage
    const handleStorageChange = (changes, areaName) => {
      if (areaName === 'local') {
        if (changes.productivityStats) {
          setStats(changes.productivityStats.newValue);
        }
        if (changes.timeSpent) {
          setDomainUsage(changes.timeSpent.newValue);
        }
        if (changes.settings) {
          setSettings(changes.settings.newValue);
        }
        if (changes.isActive) {
          setIsActive(changes.isActive.newValue);
        }
      }
    };
    chrome.storage.onChanged.addListener(handleStorageChange);

    // Cleanup on unmount
    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  /********************************************************
   * 3) HANDLERS FOR SETTINGS / ACTIVE TOGGLING
   ********************************************************/
  // Toggle extension active/paused
  const toggleActive = () => {
    const newActive = !isActive;
    setIsActive(newActive);
    chrome.storage.local.set({ isActive: newActive }, () => {
      chrome.runtime.sendMessage({
        action: 'toggleActive',
        isActive: newActive,
      });
    });
  };

  // Save new settings to storage + notify background
  const saveSettings = () => {
    chrome.storage.local.set({ settings }, () => {
      chrome.runtime.sendMessage({
        action: 'updateSettings',
        settings,
      });
    });
  };

  // Reset the “productive vs. unproductive” counters
  const resetStats = () => {
    const resetValue = { productive: 0, unproductive: 0 };
    setStats(resetValue);
    chrome.storage.local.set({ productivityStats: resetValue });
  };

  /********************************************************
   * 4) PIE CHART DATA
   ********************************************************/
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

  /********************************************************
   * 5) RENDER
   ********************************************************/
  return (
    <div style={{ minWidth: '320px', padding: '1rem', fontFamily: 'sans-serif' }}>
      <h2>Productivity Nudge</h2>

      {/* Status Toggle */}
      <div style={{ marginBottom: '1rem' }}>
        <strong>Status:</strong> {isActive ? 'Active' : 'Paused'}{' '}
        <button onClick={toggleActive}>
          {isActive ? 'Pause' : 'Resume'}
        </button>
      </div>

      {/* TASKS */}
      <h3>Tasks:</h3>
      <TaskParasite />

      {/* PRODUCTIVITY CHART */}
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

      {/* REAL-TIME DOMAIN USAGE */}
      <div style={{ marginTop: '1rem' }}>
        <h3>Real-Time Domain Usage</h3>
        {Object.keys(domainUsage).length === 0 ? (
          <p>No domains tracked yet.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }} border={1}>
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

      {/* SETTINGS */}
      <div style={{ marginTop: '1rem' }}>
        <h3>Settings</h3>
        <div style={{ margin: '0.5rem 0' }}>
          <label>Check Interval (minutes): </label>
          <select
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
          <label>Productivity Threshold (%): </label>
          <input
            type="range"
            min={10}
            max={90}
            step={5}
            value={settings.threshold}
            onChange={(e) =>
              setSettings({ ...settings, threshold: Number(e.target.value) })
            }
          />
          <span> {settings.threshold}%</span>
        </div>
        <button onClick={saveSettings}>Save Settings</button>
      </div>

      {/* WEBSITE BLOCKING */}
      <div style={{ marginTop: '1rem' }}>
        <h3>Block Distractions</h3>
        <Block />
      </div>
    </div>
  );
};

export default Popup;
