import { ArcElement, Chart as ChartJS, Legend, Tooltip } from 'chart.js';
import React, { useEffect, useState } from 'react';
import { Pie } from 'react-chartjs-2';
import '../../styles/colors.css';
import styles from './ActivitySummary.module.css';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function ActivitySummary() {
    const [stats, setStats] = useState({
        productive: 0,
        unproductive: 0
    });
    
    useEffect(() => {
        // Load productivity stats from storage
        chrome.storage.local.get(['productivityStats'], (result) => {
            if (result.productivityStats) {
                setStats(result.productivityStats);
            }
        });
        
        // Listen for changes to productivity stats
        const handleStorageChange = (changes) => {
            if (changes.productivityStats) {
                setStats(changes.productivityStats.newValue);
            }
        };
        
        chrome.storage.onChanged.addListener(handleStorageChange);
        
        return () => {
            chrome.storage.onChanged.removeListener(handleStorageChange);
        };
    }, []);
    
    const totalSessions = stats.productive + stats.unproductive;

    const chartData = {
        labels: ['Productive', 'Unproductive'],
        datasets: [{
            data: [stats.productive, stats.unproductive],
            backgroundColor: ['#4CAF50', '#F44336'],
            borderColor: ['#388E3C', '#D32F2F'],
            borderWidth: 1,
        }],
    };

    const chartOptions = {
        plugins: {
            legend: {
                labels: { color: 'var(--color-text-primary)' },
            },
        },
    };

    return (
        <div className={styles.container}>
            <div className={styles.chartContainer}>
                {totalSessions > 0 ? (
                    <>
                        <Pie data={chartData} options={chartOptions} />
                        <div className={styles.statsDetails}>
                            <div className={styles.statItem}>
                                <span className={styles.statLabel}>Total Sessions:</span>
                                <span className={styles.statValue}>{totalSessions}</span>
                            </div>
                            <div className={styles.statItem}>
                                <span className={styles.statLabel}>Productive:</span>
                                <span className={styles.statValue} style={{ color: '#4CAF50' }}>
                                    {stats.productive} ({totalSessions > 0 ? Math.round((stats.productive / totalSessions) * 100) : 0}%)
                                </span>
                            </div>
                            <div className={styles.statItem}>
                                <span className={styles.statLabel}>Unproductive:</span>
                                <span className={styles.statValue} style={{ color: '#F44336' }}>
                                    {stats.unproductive} ({totalSessions > 0 ? Math.round((stats.unproductive / totalSessions) * 100) : 0}%)
                                </span>
                            </div>
                        </div>
                    </>
                ) : (
                    <p className={styles.noData}>No activity data yet.</p>
                )}
            </div>
        </div>
    );
} 