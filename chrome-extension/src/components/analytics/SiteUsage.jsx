import React, { useEffect, useState } from 'react';
import { FaCode, FaFacebook, FaGamepad, FaNewspaper, FaShoppingCart, FaYoutube } from 'react-icons/fa';
import styles from './SiteUsage.module.css';

const CATEGORIES = {
    STREAMING: {
        name: 'Streaming',
        icon: <FaYoutube />,
        color: '#FF0000',
        domains: ['youtube.com', 'netflix.com', 'hulu.com', 'twitch.tv', 'disney.com', 'hbomax.com']
    },
    GAMING: {
        name: 'Gaming',
        icon: <FaGamepad />,
        color: '#4CAF50',
        domains: ['games', 'gaming', 'steam', 'roblox', 'minecraft', 'slither.io']
    },
    SOCIAL: {
        name: 'Social Media',
        icon: <FaFacebook />,
        color: '#2196F3',
        domains: ['facebook.com', 'instagram.com', 'twitter.com', 'tiktok.com', 'snapchat.com', 'linkedin.com']
    },
    NEWS: {
        name: 'News & Forums',
        icon: <FaNewspaper />,
        color: '#FF9800',
        domains: ['reddit.com', 'news', 'forum', 'discussion']
    },
    SHOPPING: {
        name: 'Shopping',
        icon: <FaShoppingCart />,
        color: '#9C27B0',
        domains: ['amazon.com', 'ebay.com', 'shopping', 'store', 'shop']
    },
    PRODUCTIVITY: {
        name: 'Productivity',
        icon: <FaCode />,
        color: '#607D8B',
        domains: ['github.com', 'docs.google.com', 'notion.so', 'trello.com', 'asana.com']
    }
};

export default function SiteUsage() {
    const [siteData, setSiteData] = useState({});
    const [currentSite, setCurrentSite] = useState(null);
    const [openTabs, setOpenTabs] = useState([]);
    const [dailyUsage, setDailyUsage] = useState({});
    const [weeklyUsage, setWeeklyUsage] = useState({});
    const [isLoading, setIsLoading] = useState(true);

    const processSiteData = (rawData) => {
        const processed = {};
        
        // Initialize categories
        Object.keys(CATEGORIES).forEach(category => {
            processed[category] = {
                time: 0,
                sites: []
            };
        });

        // Process each domain's data
        for (const [domain, data] of Object.entries(rawData)) {
            const category = data.category || 'OTHER';
            const timeInMinutes = Math.floor(data.totalTime / 60);
            
            if (!processed[category]) {
                processed[category] = {
                    time: 0,
                    sites: []
                };
            }

            processed[category].time += timeInMinutes;
            processed[category].sites.push({
                domain,
                time: timeInMinutes,
                url: data.url,
                lastVisit: data.lastVisit
            });
        }

        // Sort sites by time spent
        Object.keys(processed).forEach(category => {
            processed[category].sites.sort((a, b) => b.time - a.time);
        });

        setSiteData(processed);
    };

    useEffect(() => {
        setIsLoading(true);
        
        // Load all usage data
        chrome.storage.local.get(['timeSpent', 'dailyUsage', 'weeklyUsage'], (data) => {
            if (data.timeSpent) {
                processSiteData(data.timeSpent);
            }
            if (data.dailyUsage) {
                setDailyUsage(data.dailyUsage);
            }
            if (data.weeklyUsage) {
                setWeeklyUsage(data.weeklyUsage);
            }
            setIsLoading(false);
        });

        // Set up listener for real-time updates
        const handleStorageChange = (changes) => {
            if (changes.timeSpent) {
                processSiteData(changes.timeSpent.newValue);
            }
            if (changes.dailyUsage) {
                setDailyUsage(changes.dailyUsage.newValue);
            }
            if (changes.weeklyUsage) {
                setWeeklyUsage(changes.weeklyUsage.newValue);
            }
        };

        chrome.storage.onChanged.addListener(handleStorageChange);

        // Track current site and all open tabs
        const updateTabInfo = () => {
            chrome.tabs.query({}, (tabs) => {
                if (chrome.runtime.lastError) {
                    console.error('Error querying tabs:', chrome.runtime.lastError);
                    return;
                }

                const tabData = tabs.map(tab => {
                    try {
                        if (!tab.url) return null;
                        
                        const url = new URL(tab.url);
                        return {
                            id: tab.id,
                            url: tab.url,
                            domain: url.hostname.replace('www.', ''),
                            title: tab.title,
                            active: tab.active
                        };
                    } catch (e) {
                        console.warn('Invalid tab URL:', tab.url);
                        return null;
                    }
                }).filter(tab => 
                    tab !== null && 
                    !tab.domain.includes('chrome://') &&
                    !tab.domain.includes('chrome-extension://')
                );
                
                setOpenTabs(tabData);
                
                // Set current active tab
                const activeTab = tabData.find(tab => tab.active);
                if (activeTab) {
                    setCurrentSite(activeTab.domain);
                }
            });
        };

        // Update every second
        updateTabInfo();
        const interval = setInterval(updateTabInfo, 1000);

        return () => {
            chrome.storage.onChanged.removeListener(handleStorageChange);
            clearInterval(interval);
        };
    }, []);

    const getWeekNumber = (date) => {
        const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
        const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
        return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
    };

    const getCategoryForDomain = (domain) => {
        for (const [category, info] of Object.entries(CATEGORIES)) {
            if (info.domains.some(d => domain.includes(d))) {
                return category;
            }
        }
        return 'OTHER';
    };

    const formatTime = (minutes) => {
        if (minutes < 1) return `<1m`;
        if (minutes < 60) return `${minutes}m`;
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        return `${hours}h ${remainingMinutes}m`;
    };

    return (
        <div className={styles.container}>
            {isLoading ? (
                <div className={styles.loading}>Loading analytics data...</div>
            ) : (
                <>
                    <div className={styles.currentSite}>
                        <h2 className={styles.title}>Current Activity</h2>
                        {currentSite ? (
                            <div className={styles.siteInfo}>
                                <span className={styles.domain}>{currentSite}</span>
                                {openTabs.find(tab => tab.domain === currentSite)?.title && (
                                    <span className={styles.pageTitle}>
                                        {openTabs.find(tab => tab.domain === currentSite).title}
                                    </span>
                                )}
                            </div>
                        ) : (
                            <div className={styles.noData}>No active site detected</div>
                        )}
                    </div>

                    <div className={styles.openTabs}>
                        <h3 className={styles.sectionTitle}>Open Tabs</h3>
                        {openTabs.length > 0 ? (
                            <div className={styles.tabsList}>
                                {openTabs.map(tab => (
                                    <div 
                                        key={tab.id} 
                                        className={`${styles.tabItem} ${tab.active ? styles.activeTab : ''}`}
                                    >
                                        <span className={styles.tabDomain}>{tab.domain}</span>
                                        <span className={styles.tabTitle}>{tab.title}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className={styles.noData}>No open tabs detected</div>
                        )}
                    </div>

                    <div className={styles.categories}>
                        <h3 className={styles.sectionTitle}>Today's Usage (Minutes)</h3>
                        {Object.entries(CATEGORIES).map(([category, info]) => (
                            <div key={category} className={styles.category}>
                                <div className={styles.categoryHeader}>
                                    <span className={styles.categoryIcon} style={{ color: info.color }}>
                                        {info.icon}
                                    </span>
                                    <span className={styles.categoryName}>{info.name}</span>
                                    <span className={styles.categoryTime}>
                                        {formatTime(siteData[category]?.time || 0)}
                                    </span>
                                </div>
                                <div className={styles.sitesList}>
                                    {siteData[category]?.sites?.map(site => (
                                        <div key={site.domain} className={styles.siteItem}>
                                            <span className={styles.siteDomain}>{site.domain}</span>
                                            <span className={styles.siteTime}>{formatTime(site.time)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className={styles.weeklyReport}>
                        <h3 className={styles.sectionTitle}>Weekly Report (Hours)</h3>
                        <div className={styles.weeklyData}>
                            {Object.entries(weeklyUsage).length > 0 ? (
                                Object.entries(weeklyUsage[Object.keys(weeklyUsage).sort().pop()] || {}).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([domain, hours]) => (
                                    <div key={domain} className={styles.weeklyItem}>
                                        <span className={styles.weeklyDomain}>{domain}</span>
                                        <span className={styles.weeklyHours}>{hours}h</span>
                                    </div>
                                ))
                            ) : (
                                <p className={styles.noData}>No weekly data yet</p>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}