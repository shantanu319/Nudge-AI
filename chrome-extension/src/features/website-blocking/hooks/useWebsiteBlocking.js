import { useEffect, useState } from 'react';

export function useWebsiteBlocking() {
    const [blockList, setBlockList] = useState([]);

    // Load blocklist on mount
    useEffect(() => {
        chrome.storage.local.get(['blockedSites'], (result) => {
            if (result.blockedSites) {
                setBlockList(result.blockedSites);
            }
        });

        // Listen for block list updates from the service worker
        const handleMessage = (message) => {
            if (message.action === 'blockListUpdated') {
                setBlockList(message.blockList);
            }
        };

        chrome.runtime.onMessage.addListener(handleMessage);

        // Cleanup listener on unmount
        return () => {
            chrome.runtime.onMessage.removeListener(handleMessage);
        };
    }, []);

    // Update block rules
    const updateBlockRules = () => {
        const rules = blockList.map((url, index) => ({
            id: index + 1,
            priority: 1,
            action: { type: 'block' },
            condition: {
                urlFilter: `||${url.replace(/https?:\/\//, '')}`,
                resourceTypes: ['main_frame'],
            },
        }));

        chrome.runtime.sendMessage({
            action: 'updateBlockedSites',
            rules,
        });
    };

    const addUrl = (url) => {
        if (url.trim()) {
            const updatedList = [...new Set([...blockList, url.trim()])];
            setBlockList(updatedList);
            chrome.storage.local.set({ blockedSites: updatedList });
            return true;
        }
        return false;
    };

    const removeUrl = (urlToRemove) => {
        const filtered = blockList.filter(url => url !== urlToRemove);
        setBlockList(filtered);
        chrome.storage.local.set({ blockedSites: filtered });
    };

    return {
        blockList,
        addUrl,
        removeUrl,
        updateBlockRules
    };
} 