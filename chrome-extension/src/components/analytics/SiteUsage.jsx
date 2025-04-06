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

    useEffect(() => {
        // Load initial data
        chrome.storage.local.get(['timeSpent'], (data) => {
            if (data.timeSpent) {
                processSiteData(data.timeSpent);
            }
        });

        // Set up listener for real-time updates
        const handleStorageChange = (changes) => {
            if (changes.timeSpent) {
                processSiteData(changes.timeSpent.newValue);
            }
        };

        chrome.storage.onChanged.addListener(handleStorageChange);

        // Track current site
        const updateCurrentSite = () => {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0]) {
                    const url = new URL(tabs[0].url);
                    setCurrentSite(url.hostname);
                }
            });
        };

        // Update every second
        updateCurrentSite();
        const interval = setInterval(updateCurrentSite, 1000);

        return () => {
            chrome.storage.onChanged.removeListener(handleStorageChange);
            clearInterval(interval);
        };
    }, []);

    const processSiteData = (timeSpent) => {
        const categoryData = {};

        Object.entries(timeSpent).forEach(([domain, data]) => {
            const category = getCategoryForDomain(domain);
            if (!categoryData[category]) {
                categoryData[category] = {
                    time: 0,
                    sites: []
                };
            }
            categoryData[category].time += data.totalTime;
            categoryData[category].sites.push({
                domain,
                time: data.totalTime,
                url: data.url
            });
        });

        // Sort sites within each category by time spent
        Object.values(categoryData).forEach(category => {
            category.sites.sort((a, b) => b.time - a.time);
        });

        setSiteData(categoryData);
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
        if (minutes < 60) return `${minutes}m`;
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        return `${hours}h ${remainingMinutes}m`;
    };

    return (
        <div className={styles.container}>
            <h2 className={styles.title}>Screen Time</h2>
            {currentSite && (
                <div className={styles.currentSite}>
                    Currently on: {currentSite}
                </div>
            )}

            <div className={styles.categories}>
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
        </div>
    );
} 