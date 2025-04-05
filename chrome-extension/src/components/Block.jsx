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
        if (newUrl.trim()) {
            setBlockList(prev => [...prev, newUrl.trim()]);
            setNewUrl('');
        }
    };

    const handleRemoveUrl = (urlToRemove) => {
        setBlockList(prev => prev.filter(url => url !== urlToRemove));
    };

    return (
        <div style={{ marginTop: '1rem' }}>
            <form onSubmit={handleAddUrl}>
                <input
                    type="text"
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    placeholder="Enter domain to block"
                />
                <button type="submit">Add</button>
            </form>

            <ul style={{ listStyle: 'none', padding: 0 }}>
                {blockList.map((url) => (
                    <li key={url} style={{ margin: '0.5rem 0', display: 'flex', alignItems: 'center' }}>
                        <span style={{ flexGrow: 1 }}>{url}</span>
                        <button
                            onClick={() => handleRemoveUrl(url)}
                            style={{ marginLeft: '0.5rem', cursor: 'pointer' }}
                        >
                            ×
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default Block;
