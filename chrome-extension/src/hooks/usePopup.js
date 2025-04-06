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

    // Load from storage
    useEffect(() => {
        console.log('🔄 Loading popup data from storage...');
        chrome.storage.local.get(
            ['productivityStats', 'timeSpent', 'settings', 'isActive'],
            (res) => {
                console.log('📦 Storage data loaded:', {
                    hasStats: !!res.productivityStats,
                    hasTimeSpent: !!res.timeSpent,
                    hasSettings: !!res.settings,
                    isActive: res.isActive
                });

                if (res.productivityStats) setStats(res.productivityStats);
                if (res.timeSpent) setDomainUsage(res.timeSpent);
                if (res.settings) {
                    const newSettings = {
                        interval: 1,
                        threshold: 50,
                        interventionStyle: 'drill_sergeant',
                        useGemini: true,
                        geminiApiKey: '',
                        ...res.settings
                    };
                    console.log('⚙️ Updated settings:', newSettings);
                    setSettings(newSettings);
                }
                if (res.isActive !== undefined) setIsActive(res.isActive);
            }
        );

        // Storage change listener
        const handleStorageChange = (changes, areaName) => {
            if (areaName === 'local') {
                console.log('🔄 Storage changes detected:', Object.keys(changes));
                if (changes.productivityStats) setStats(changes.productivityStats.newValue);
                if (changes.timeSpent) setDomainUsage(changes.timeSpent.newValue);
                if (changes.settings) {
                    console.log('⚙️ Settings updated:', changes.settings.newValue);
                    setSettings(prev => ({ ...prev, ...changes.settings.newValue }));
                }
                if (changes.isActive) setIsActive(changes.isActive.newValue);
            }
        };

        chrome.storage.onChanged.addListener(handleStorageChange);
        return () => chrome.storage.onChanged.removeListener(handleStorageChange);
    }, []);

    const toggleActive = () => {
        const newActive = !isActive;
        console.log('🔄 Toggling extension active state:', newActive);
        setIsActive(newActive);
        chrome.runtime.sendMessage({
            action: 'toggleActive',
            isActive: newActive
        });
    };

    const updateSettings = (newSettings) => {
        console.log('⚙️ Updating settings:', newSettings);
        const updatedSettings = { ...settings, ...newSettings };
        setSettings(updatedSettings);
        chrome.runtime.sendMessage({
            action: 'updateSettings',
            settings: updatedSettings
        });
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