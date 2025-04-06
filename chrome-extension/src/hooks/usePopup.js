import { useEffect, useState } from 'react';

export function usePopup() {
    const [stats, setStats] = useState({ productive: 0, unproductive: 0 });
    const [domainUsage, setDomainUsage] = useState({});
    const [settings, setSettings] = useState({
        interval: 1,
        threshold: 50,
        interventionStyle: 'drill_sergeant',
        useGemini: true,
        geminiApiKey: ''
    });
    const [isActive, setIsActive] = useState(true);

    // Load from storage and set up live updates
    useEffect(() => {
        console.log('🔄 Loading popup data from storage...');

        // Listen for storage changes
        const handleStorageChange = (changes, areaName) => {
            if (areaName === 'local') {
                console.log('🔄 Storage changes detected:', changes);

                if (changes.timeSpent) {
                    const newTimeSpent = changes.timeSpent.newValue;
                    console.log('📊 Time spent updated:', newTimeSpent);
                    if (newTimeSpent && typeof newTimeSpent === 'object') {
                        // Create a new object with the updated times
                        const updatedUsage = Object.entries(newTimeSpent).reduce((acc, [domain, data]) => {
                            acc[domain] = {
                                ...data,
                                totalTime: data.totalTime || 0
                            };
                            return acc;
                        }, {});
                        console.log('📊 Setting new domain usage:', updatedUsage);
                        setDomainUsage(updatedUsage);
                    }
                }

                if (changes.productivityStats) {
                    const newStats = changes.productivityStats.newValue;
                    console.log('📊 Productivity stats updated:', newStats);
                    setStats(newStats);
                }

                if (changes.settings) {
                    const newSettings = changes.settings.newValue;
                    console.log('⚙️ Settings updated:', newSettings);
                    setSettings(prev => ({ ...prev, ...newSettings }));
                }

                if (changes.isActive !== undefined) {
                    console.log('🔄 Active state updated:', changes.isActive.newValue);
                    setIsActive(changes.isActive.newValue);
                }
            }
        };

        // Add storage change listener
        chrome.storage.onChanged.addListener(handleStorageChange);

        // Initial load from storage
        chrome.storage.local.get(['timeSpent', 'productivityStats', 'settings', 'isActive'], (result) => {
            console.log('📦 Initial storage load:', result);
            if (result.timeSpent) {
                const initialUsage = Object.entries(result.timeSpent).reduce((acc, [domain, data]) => {
                    acc[domain] = {
                        ...data,
                        totalTime: data.totalTime || 0
                    };
                    return acc;
                }, {});
                console.log('📊 Setting initial domain usage:', initialUsage);
                setDomainUsage(initialUsage);
            }
            if (result.productivityStats) {
                setStats(result.productivityStats);
            }
            if (result.settings) {
                setSettings(prev => ({ ...prev, ...result.settings }));
            }
            if (result.isActive !== undefined) {
                setIsActive(result.isActive);
            }
        });

        // Cleanup listener
        return () => {
            console.log('🧹 Cleaning up storage listener');
            chrome.storage.onChanged.removeListener(handleStorageChange);
        };
    }, []);

    const toggleActive = () => {
        const newActive = !isActive;
        console.log('🔄 Toggling extension active state:', newActive);
        setIsActive(newActive);
        chrome.storage.local.set({ isActive: newActive });
    };

    const updateSettings = (newSettings) => {
        console.log('⚙️ Updating settings:', newSettings);
        const updatedSettings = { ...settings, ...newSettings };
        setSettings(updatedSettings);
        chrome.storage.local.set({ settings: updatedSettings });
    };

    const updateStats = (isProductive) => {
        const newStats = { ...stats };
        if (isProductive) {
            newStats.productive += 1;
        } else {
            newStats.unproductive += 1;
        }
        setStats(newStats);
        chrome.storage.local.set({ productivityStats: newStats });
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