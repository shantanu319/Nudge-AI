import React, { useMemo, useState } from 'react';
import styles from './DomainUsage.module.css';

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
        return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
        return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
}

function getTimeBreakdown(domains, viewMode) {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const oneWeek = 7 * oneDay;
    const period = viewMode === 'daily' ? oneDay : oneWeek;

    // Group domains by category and calculate total time
    const categoryTotals = {};
    const domainDetails = {};
    let maxTime = 0;

    // First, filter domains by the selected time period
    const filteredDomains = Object.entries(domains).filter(([_, data]) => {
        return now - data.lastVisit <= period;
    });

    // Then process the filtered domains
    filteredDomains.forEach(([domain, data]) => {
        const category = data.category || 'Other';
        const time = data.totalTime;

        // Only include time from the selected period
        const timeInPeriod = Math.min(time, period / 1000); // Convert period to seconds
        categoryTotals[category] = (categoryTotals[category] || 0) + timeInPeriod;
        maxTime = Math.max(maxTime, categoryTotals[category]);

        if (!domainDetails[category]) {
            domainDetails[category] = [];
        }
        domainDetails[category].push({
            domain,
            time: timeInPeriod,
            lastVisit: data.lastVisit
        });
    });

    // Sort categories by total time
    const sortedCategories = Object.entries(categoryTotals)
        .sort(([, a], [, b]) => b - a)
        .map(([category]) => category);

    // Sort domains within each category by time
    Object.keys(domainDetails).forEach(category => {
        domainDetails[category].sort((a, b) => b.time - a.time);
    });

    return { sortedCategories, domainDetails, maxTime };
}

function TimeBar({ time, maxTime, category }) {
    const percentage = (time / maxTime) * 100;
    return (
        <div className={styles.timeBarContainer}>
            <div
                className={`${styles.timeBar} ${styles[category.toLowerCase()]}`}
                style={{ width: `${percentage}%` }}
            />
        </div>
    );
}

function TimeIndicator({ time, maxTime }) {
    const percentage = (time / maxTime) * 100;
    let indicatorClass = styles.low;
    if (percentage > 50) {
        indicatorClass = styles.high;
    } else if (percentage > 25) {
        indicatorClass = styles.medium;
    }
    return (
        <div className={`${styles.timeIndicator} ${indicatorClass}`}>
            <div className={styles.indicatorDot} />
            <div className={styles.indicatorPulse} />
        </div>
    );
}

export default function DomainUsage({ domainUsage }) {
    const [viewMode, setViewMode] = useState('daily');
    const hasDomains = Object.keys(domainUsage).length > 0;

    const { sortedCategories, domainDetails, maxTime } = useMemo(
        () => getTimeBreakdown(domainUsage, viewMode),
        [domainUsage, viewMode]
    );

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h3 className={styles.title}>Screen Time</h3>
                <div className={styles.viewToggle}>
                    <button
                        className={`${styles.toggleButton} ${viewMode === 'daily' ? styles.active : ''}`}
                        onClick={() => setViewMode('daily')}
                    >
                        Today
                    </button>
                    <button
                        className={`${styles.toggleButton} ${viewMode === 'weekly' ? styles.active : ''}`}
                        onClick={() => setViewMode('weekly')}
                    >
                        This Week
                    </button>
                </div>
            </div>
            <div className={styles.content}>
                {hasDomains ? (
                    sortedCategories.map(category => {
                        const totalTime = domainDetails[category].reduce((sum, d) => sum + d.time, 0);
                        return (
                            <div key={category} className={styles.categorySection}>
                                <div className={styles.categoryHeader}>
                                    <span className={`${styles.categoryBadge} ${styles[category.toLowerCase()]}`}>
                                        {category}
                                    </span>
                                    <span className={styles.categoryTime}>
                                        {formatTime(totalTime)}
                                    </span>
                                </div>
                                <TimeBar time={totalTime} maxTime={maxTime} category={category} />
                                <div className={styles.domainList}>
                                    {domainDetails[category].map(({ domain, time }) => (
                                        <div key={domain} className={styles.domainItem}>
                                            <span className={styles.domainName}>{domain}</span>
                                            <div className={styles.domainTimeContainer}>
                                                <TimeIndicator time={time} maxTime={maxTime} />
                                                <span className={styles.domainTime}>{formatTime(time)}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <p className={styles.noData}>No domains tracked yet.</p>
                )}
            </div>
        </div>
    );
} 