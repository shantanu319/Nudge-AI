import { useEffect, useState } from 'react';
import { blockWebsite } from '../../public/blockUtils.js';

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

    const addUrl = async (url) => {
        if (url.trim()) {
            try {
                await blockWebsite(url.trim());
                // The blockList will be updated via the message listener
            } catch (error) {
                console.error('Error blocking website:', error);
            }
        }
    };

    const removeUrl = async (urlToRemove) => {
        try {
            // Get current block list
            const result = await new Promise((resolve) => {
                chrome.storage.local.get(['blockedSites', 'blockedRules'], resolve);
            });

            const currentList = result.blockedSites || [];
            const updatedList = currentList.filter(url => url !== urlToRemove);

            // Update storage
            await new Promise((resolve) => {
                chrome.storage.local.set({ blockedSites: updatedList }, resolve);
            });

            // Remove all existing rules first
            const currentRules = result.blockedRules || [];
            const removeIds = currentRules.map(rule => rule.id);
            await new Promise((resolve) => {
                chrome.declarativeNetRequest.updateDynamicRules({
                    removeRuleIds: removeIds
                }, resolve);
            });

            // Create new rules for the updated list
            const rules = updatedList.map((url, index) => ({
                id: index + 1,
                priority: 1,
                action: { type: 'block' },
                condition: {
                    urlFilter: `||${url.replace(/https?:\/\//, '')}`,
                    resourceTypes: ['main_frame'],
                },
            }));

            // Add the new rules
            await new Promise((resolve) => {
                chrome.declarativeNetRequest.updateDynamicRules({
                    addRules: rules
                }, resolve);
            });

            // Store the current rules
            await new Promise((resolve) => {
                chrome.storage.local.set({ blockedRules: rules }, resolve);
            });

            // Update local state
            setBlockList(updatedList);

            // Notify other parts of the extension
            chrome.runtime.sendMessage({
                action: 'blockListUpdated',
                blockList: updatedList,
            });
        } catch (error) {
            console.error('Error unblocking website:', error);
        }
    };

    return {
        blockList,
        addUrl,
        removeUrl
    };
} 