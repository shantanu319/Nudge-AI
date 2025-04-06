import { useEffect, useState } from 'react';

export function usePopup() {
    const [stats, setStats] = useState({ productive: 0, unproductive: 0 });
    const [domainUsage, setDomainUsage] = useState({});
    const [settings, setSettings] = useState({
        interval: 5,
        threshold: 50,
        interventionStyle: 'drill_sergeant'
    });
    const [isActive, setIsActive] = useState(true);

    // Load from storage
    useEffect(() => {
        chrome.storage.local.get(
            ['productivityStats', 'timeSpent', 'settings', 'isActive'],
            (res) => {
                if (res.productivityStats) setStats(res.productivityStats);
                if (res.timeSpent) setDomainUsage(res.timeSpent);
                if (res.settings) {
                    setSettings({
                        interval: 5,
                        threshold: 50,
                        interventionStyle: 'drill_sergeant',
                        ...res.settings
                    });
                }
                if (res.isActive !== undefined) setIsActive(res.isActive);
            }
        );

        // Storage change listener
        const handleStorageChange = (changes, areaName) => {
            if (areaName === 'local') {
                if (changes.productivityStats) setStats(changes.productivityStats.newValue);
                if (changes.timeSpent) setDomainUsage(changes.timeSpent.newValue);
                if (changes.settings) setSettings(prev => ({ ...prev, ...changes.settings.newValue }));
                if (changes.isActive) setIsActive(changes.isActive.newValue);
            }
        };

        chrome.storage.onChanged.addListener(handleStorageChange);
        return () => chrome.storage.onChanged.removeListener(handleStorageChange);
    }, []);

    const toggleActive = () => {
        const newActive = !isActive;
        setIsActive(newActive);
        chrome.runtime.sendMessage({ action: 'toggleActive', isActive: newActive });
    };

    const updateSettings = (newSettings) => {
        const updatedSettings = { ...settings, ...newSettings };
        setSettings(updatedSettings);
        chrome.runtime.sendMessage({
            action: 'updateSettings',
            settings: updatedSettings
        });
    };

    const updateStats = (isProductive) => {
        const newStats = { ...stats };
        if (isProductive) {
            newStats.productive += 1;
        } else {
            newStats.unproductive += 1;
        }
        setStats(newStats);
        chrome.storage.local.set({ stats: newStats });
    };

    return {
        stats,
        domainUsage,
        settings,
        isActive,
        toggleActive,
        updateSettings,
        updateStats
    };
} 