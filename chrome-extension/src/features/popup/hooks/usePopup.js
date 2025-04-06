import { useEffect, useState } from 'react';

export function usePopup() {
    const [stats, setStats] = useState({ productive: 0, unproductive: 0 });
    const [domainUsage, setDomainUsage] = useState({});
    const [settings, setSettings] = useState({
        interval: 5,
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
                if (res.timeSpent) setDomainUsage(res.timeSpent);
                if (changes.settings) setSettings(changes.settings.newValue);
                if (changes.isActive) setIsActive(changes.isActive.newValue);
            }
        };

        chrome.storage.onChanged.addListener(handleStorageChange);
        return () => chrome.storage.onChanged.removeListener(handleStorageChange);
    }, []);

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

    const updateSettings = (newSettings) => {
        setSettings(newSettings);
    };

    const resetStats = () => {
        const resetValue = { productive: 0, unproductive: 0 };
        setStats(resetValue);
        chrome.storage.local.set({ productivityStats: resetValue });
    };

    return {
        stats,
        domainUsage,
        settings,
        isActive,
        toggleActive,
        saveSettings,
        updateSettings,
        resetStats
    };
} 