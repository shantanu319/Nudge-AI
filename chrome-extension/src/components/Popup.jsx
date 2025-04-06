// import { ArcElement, Chart as ChartJS, Legend, Tooltip } from 'chart.js';
// import React, { useEffect, useState } from 'react';
// import { Pie } from 'react-chartjs-2';
// import Block from './Block';

// // Register Chart.js components
// ChartJS.register(ArcElement, Tooltip, Legend);

// const Popup = () => {
//   // ---------- State Variables ----------
//   // Productivity stats: { productive, unproductive }
//   const [stats, setStats] = useState({ productive: 0, unproductive: 0 });

//   // Settings: { interval, threshold }
//   const [settings, setSettings] = useState({
//     interval: 5,
//     threshold: 50,
//   });

//   // Active state: true/false
//   const [isActive, setIsActive] = useState(true);

//   // Domain usage: { "www.google.com": msSpent, ... }
//   const [domainUsage, setDomainUsage] = useState({});

//   // ---------- Effects: On Mount, load from storage, attach listeners ----------
//   useEffect(() => {
//     // 1) Get initial data from storage
//     chrome.storage.local.get(
//       ['productivityStats', 'settings', 'isActive', 'timeSpent'],
//       (result) => {
//         if (result.productivityStats) {
//           setStats(result.productivityStats);
//         }
//         if (result.settings) {
//           setSettings(result.settings);
//         }
//         if (result.isActive !== undefined) {
//           setIsActive(result.isActive);
//         }
//         if (result.timeSpent) {
//           setDomainUsage(result.timeSpent);
//         }
//       }
//     );

//     // 2) Listen for ANY changes in local storage
//     const handleStorageChange = (changes, areaName) => {
//       if (areaName === 'local') {
//         // If productivityStats changed
//         if (changes.productivityStats) {
//           setStats(changes.productivityStats.newValue);
//         }
//         // If settings changed
//         if (changes.settings) {
//           setSettings(changes.settings.newValue);
//         }
//         // If isActive changed
//         if (changes.isActive) {
//           setIsActive(changes.isActive.newValue);
//         }
//         // If timeSpent changed
//         if (changes.timeSpent) {
//           setDomainUsage(changes.timeSpent.newValue);
//         }
//       }
//     };

//     chrome.storage.onChanged.addListener(handleStorageChange);

//     // Cleanup listener on unmount
//     return () => {
//       chrome.storage.onChanged.removeListener(handleStorageChange);
//     };
//   }, []);

//   // ---------- Handlers ----------
//   // Toggle active/inactive extension
//   const toggleActive = () => {
//     const newActiveState = !isActive;
//     setIsActive(newActiveState);
//     chrome.storage.local.set({ isActive: newActiveState }, () => {
//       chrome.runtime.sendMessage({
//         action: 'toggleActive',
//         isActive: newActiveState,
//       });
//     });
//   };

//   // Save updated settings
//   const saveSettings = () => {
//     chrome.storage.local.set({ settings }, () => {
//       // Notify background script
//       chrome.runtime.sendMessage({
//         action: 'updateSettings',
//         settings,
//       });
//     });
//   };

//   // Reset the productive/unproductive counters
//   const resetStats = () => {
//     const resetValue = { productive: 0, unproductive: 0 };
//     setStats(resetValue);
//     chrome.storage.local.set({ productivityStats: resetValue });
//   };

//   // ---------- Derived Data ----------
//   const totalSessions = stats.productive + stats.unproductive;
//   const chartData = {
//     labels: ['Productive', 'Unproductive'],
//     datasets: [
//       {
//         data: [stats.productive, stats.unproductive],
//         backgroundColor: ['rgba(75,192,192,0.6)', 'rgba(255,99,132,0.6)'],
//         borderColor: ['rgba(75,192,192,1)', 'rgba(255,99,132,1)'],
//         borderWidth: 1,
//       },
//     ],
//   };

//   // ---------- Render ----------
//   return (
//     <div style={{ minWidth: '300px', fontFamily: 'sans-serif', padding: '1rem' }}>
//       <h2>Productivity Nudge</h2>

//       {/* Active / Pause Button */}
//       <div style={{ marginBottom: '1rem' }}>
//         <span><strong>Status:</strong> {isActive ? 'Active' : 'Paused'}</span>{' '}
//         <button onClick={toggleActive}>
//           {isActive ? 'Pause' : 'Resume'}
//         </button>
//       </div>

//       {/* Productive vs. Unproductive Pie */}
//       <div>
//         <h3>Activity Summary</h3>
//         {totalSessions > 0 ? (
//           <>
//             <div style={{ width: '200px', margin: '0 auto' }}>
//               <Pie data={chartData} />
//             </div>
//             <p>Total Sessions: {totalSessions}</p>
//             <p>
//               Productive: {stats.productive} (
//               {Math.round((stats.productive / totalSessions) * 100)}%)
//             </p>
//             <p>
//               Unproductive: {stats.unproductive} (
//               {Math.round((stats.unproductive / totalSessions) * 100)}%)
//             </p>
//             <button onClick={resetStats}>Reset Stats</button>
//           </>
//         ) : (
//           <p>No activity data yet.</p>
//         )}
//       </div>

//       {/* Settings Section */}
//       <div style={{ marginTop: '1rem' }}>
//         <h3>Settings</h3>
//         <div style={{ margin: '0.5rem 0' }}>
//           <label htmlFor="interval">Check Interval (minutes): </label>
//           <select
//             id="interval"
//             value={settings.interval}
//             onChange={(e) =>
//               setSettings({ ...settings, interval: Number(e.target.value) })
//             }
//           >
//             <option value={1}>1</option>
//             <option value={3}>3</option>
//             <option value={5}>5</option>
//             <option value={10}>10</option>
//             <option value={15}>15</option>
//             <option value={30}>30</option>
//           </select>
//         </div>
//         <div style={{ margin: '0.5rem 0' }}>
//           <label htmlFor="threshold">Productivity Threshold (%): </label>
//           <input
//             type="range"
//             id="threshold"
//             min="10"
//             max="90"
//             step="5"
//             value={settings.threshold}
//             onChange={(e) =>
//               setSettings({ ...settings, threshold: Number(e.target.value) })
//             }
//           />
//           <span>{' '}{settings.threshold}%</span>
//         </div>
//         <button onClick={saveSettings}>Save Settings</button>
//       </div>

//       <div style={{ marginTop: '1rem' }}>
//         <h3>Real-Time Domain Usage</h3>
//         {Object.keys(domainUsage).length === 0 ? (
//           <p>No domains tracked yet.</p>
//         ) : (
//           <table style={{ width: '100%', borderCollapse: 'collapse' }} border="1">
//             <thead>
//               <tr>
//                 <th>Domain</th>
//                 <th style={{ textAlign: 'right' }}>Time (sec)</th>
//               </tr>
//             </thead>
//             <tbody>
//               {Object.entries(domainUsage).map(([domain, ms]) => {
//                 const seconds = (ms / 1000).toFixed(1);
//                 return (
//                   <tr key={domain}>
//                     <td>{domain}</td>
//                     <td style={{ textAlign: 'right' }}>{seconds}</td>
//                   </tr>
//                 );
//               })}
//             </tbody>
//           </table>
//         )}
//       </div>

//       <div >
//         <h3>Web Blocking</h3>
//         <Block />
//       </div>
//     </div>
//   );
// };

// export default Popup;


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
        backgroundColor: ['rgba(75,192,192,0.8)', 'rgba(255,99,132,0.8)'],
        borderColor: ['rgba(75,192,192,1)', 'rgba(255,99,132,1)'],
        borderWidth: 1,
      },
    ],
  };

  // Custom chart options for glassmorphism theme
  const chartOptions = {
    plugins: {
      legend: {
        labels: {
          color: 'rgba(255, 255, 255, 0.8)',
          font: {
            family: "'Roboto', sans-serif",
          }
        }
      }
    }
  };

  // ---------- Render ----------
  return (
    <div className="glassmorphism-container">
      <div className="glass-card main-card">
        <h2 className="glass-title">Nudge AI</h2>

        {/* Active / Pause Button */}
        <div className="status-container">
          <span className="status-label">
            <strong>Status:</strong> {isActive ? 'Active' : 'Paused'}
          </span>
          <button 
            className={`glass-button ${isActive ? 'active' : 'inactive'}`} 
            onClick={toggleActive}
          >
            {isActive ? 'Pause' : 'Resume'}
          </button>
        </div>

        {/* Productive vs. Unproductive Pie */}
        <div className="glass-card chart-card">
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
                  <span className="stat-value">
                    {stats.productive} ({Math.round((stats.productive / totalSessions) * 100)}%)
                  </span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Unproductive:</span>
                  <span className="stat-value">
                    {stats.unproductive} ({Math.round((stats.unproductive / totalSessions) * 100)}%)
                  </span>
                </div>
                <button className="glass-button reset-button" onClick={resetStats}>
                  Reset Stats
                </button>
              </div>
            </>
          ) : (
            <p className="no-data">No activity data yet.</p>
          )}
        </div>

        {/* Settings Section */}
        <div className="glass-card settings-card">
          <h3 className="section-title">Settings</h3>
          <div className="setting-row">
            <label htmlFor="interval" className="setting-label">Check Interval (minutes):</label>
            <select
              id="interval"
              className="glass-select"
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
          <div className="setting-row slider-row">
            <label htmlFor="threshold" className="setting-label">Productivity Threshold:</label>
            <div className="slider-container">
              <input
                type="range"
                id="threshold"
                className="glass-slider"
                min="10"
                max="90"
                step="5"
                value={settings.threshold}
                onChange={(e) =>
                  setSettings({ ...settings, threshold: Number(e.target.value) })
                }
              />
              <span className="threshold-value">{settings.threshold}%</span>
            </div>
          </div>
          <button className="glass-button save-button" onClick={saveSettings}>
            Save Settings
          </button>
        </div>

        {/* Domain Usage */}
        <div className="glass-card domain-card">
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

        {/* Web Blocking */}
        <div className="glass-card blocking-card">
          <h3 className="section-title">Block Distractions</h3>
          <Block />
        </div>
      </div>
    </div>
  );
};

export default Popup;