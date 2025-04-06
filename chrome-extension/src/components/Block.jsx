import { ArcElement, Chart as ChartJS, Legend, Tooltip } from 'chart.js';
import React, { useEffect, useState } from 'react';

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend);

const Block = () => {
  const [blockList, setBlockList] = useState([]);
  const [newUrl, setNewUrl] = useState('');

  // Load blocklist on mount
  useEffect(() => {
    chrome.storage.local.get(['blockedSites'], (result) => {
      if (result.blockedSites) {
        setBlockList(result.blockedSites);
      }
    });
  }, []);

  // Automatically update rules when blocklist changes
  useEffect(() => {
    updateBlockRules();
    chrome.storage.local.set({ blockedSites: blockList });
  }, [blockList]);

  const updateBlockRules = () => {
    const rules = blockList.map((url, index) => ({
      id: index + 1,
      priority: 1,
      action: { type: 'block' },
      condition: {
        urlFilter: `||${url.replace(/https?:\/\//, '')}`,
        resourceTypes: ['main_frame']
      }
    }));

    chrome.runtime.sendMessage({
      action: 'updateBlockedSites',
      rules
    });
  };

  const handleAddUrl = (e) => {
    e.preventDefault();
    const trimmedUrl = newUrl.trim();
    if (trimmedUrl) {
      setBlockList((prev) => [...prev, trimmedUrl]);
      setNewUrl('');
    }
  };

  const handleRemoveUrl = (urlToRemove) => {
    setBlockList((prev) => prev.filter((url) => url !== urlToRemove));
  };

    return (
        <div>
            <div className="setting-row slider-row">
                <label className="setting-label">Add websites to block when you're being unproductive:</label>
                <div className="url-input-container" style={{ display: 'flex', gap: '10px', width: '100%', marginTop: '8px' }}>
                    <input
                        type="text"
                        className="glass-select"
                        style={{ width: '100%', flexGrow: 1 }}
                        value={newUrl}
                        onChange={(e) => setNewUrl(e.target.value)}
                        placeholder="Enter domain (e.g. facebook.com)"
                    />
                    <button 
                        className="glass-button"
                        onClick={() => {
                            if (newUrl) {
                                const updatedList = [...new Set([...blockList, newUrl])];
                                setBlockList(updatedList);
                                chrome.storage.local.set({ blockedSites: updatedList });
                                setNewUrl('');
                            }
                        }}
                    >
                        Add
                    </button>
                </div>
            </div>

            <div className="table-container" style={{ marginTop: '15px', maxHeight: '150px' }}>
                {blockList.length > 0 ? (
                    <table className="glass-table">
                        <thead>
                            <tr>
                                <th>Domain</th>
                                <th style={{ width: '80px' }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {blockList.map((url) => (
                                <tr key={url}>
                                    <td>{url}</td>
                                    <td>
                                        <button 
                                            className="glass-button"
                                            style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                                            onClick={() => {
                                                const filtered = blockList.filter(u => u !== url);
                                                setBlockList(filtered);
                                                chrome.storage.local.set({ blockedSites: filtered });
                                            }}
                                        >
                                            Remove
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <p className="no-data">No blocked sites yet. Add domains above.</p>
                )}
            </div>

            <button 
                className="glass-button save-button"
                onClick={updateBlockRules}
                style={{ marginTop: '15px' }}
            >
                Apply Blocking Rules
            </button>
        </div>
    );
};

export default Block;
