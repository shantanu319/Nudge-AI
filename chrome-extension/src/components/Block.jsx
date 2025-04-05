import React, { useEffect, useState } from 'react';

const Block = () => {
    const [blockList, setBlockList] = useState([]);
    const [newUrl, setNewUrl] = useState('');

    // Load saved blocklist
    useEffect(() => {
        chrome.storage.local.get(['blockedSites'], (result) => {
            if (result.blockedSites) {
                setBlockList(result.blockedSites);
            }
        });
    }, []);

    const updateBlockRules = () => {
        // Generate unique rule IDs
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

    return (
        <div>
            <div>
                <input
                    type="text"
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    placeholder="Enter website domain (e.g. facebook.com)"
                />
                <button onClick={() => {
                    if (newUrl) {
                        const updatedList = [...new Set([...blockList, newUrl])];
                        setBlockList(updatedList);
                        chrome.storage.local.set({ blockedSites: updatedList });
                        setNewUrl('');
                    }
                }}>
                    Add Site
                </button>
            </div>

            <div>
                {blockList.map((url) => (
                    <div key={url}>
                        {url}
                        <button onClick={() => {
                            const filtered = blockList.filter(u => u !== url);
                            setBlockList(filtered);
                            chrome.storage.local.set({ blockedSites: filtered });
                        }}>Remove</button>
                    </div>
                ))}
            </div>

            <button onClick={updateBlockRules}>
                Apply Blocking Rules
            </button>
        </div>
    );
};

export default Block;
