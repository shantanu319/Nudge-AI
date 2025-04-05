import React, { useEffect, useState } from 'react';

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
    <div style={{ marginTop: '1rem' }}>
      {/* Form with some spacing */}
      <form onSubmit={handleAddUrl} style={{ marginBottom: '1rem' }}>
        <input
          type="text"
          value={newUrl}
          onChange={(e) => setNewUrl(e.target.value)}
          placeholder="Enter website domain (e.g. facebook.com)"
          style={{ marginRight: '0.5rem', padding: '4px' }}
        />
        <button type="submit" style={{ padding: '4px 8px' }}>
          Add Site
        </button>
      </form>

      {/* List of blocked sites with spacing */}
      <div style={{ marginBottom: '1rem' }}>
        {blockList.map((url) => (
          <div key={url} style={{ marginBottom: '0.5rem' }}>
            <span style={{ marginRight: '0.5rem' }}>{url}</span>
            <button
              onClick={() => handleRemoveUrl(url)}
              style={{ padding: '2px 6px' }}
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      {/* "Apply" button for blocking rules */}
      <button onClick={updateBlockRules} style={{ padding: '4px 8px' }}>
        Apply Blocking Rules
      </button>
    </div>
  );
};

export default Block;
