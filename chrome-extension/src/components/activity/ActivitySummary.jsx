import { ArcElement, Chart as ChartJS, Legend, Tooltip } from 'chart.js';
import React from 'react';
import { Pie } from 'react-chartjs-2';
import '../../styles/colors.css';
import styles from './ActivitySummary.module.css';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function ActivitySummary({ stats }) {
    const totalSessions = stats.productive + stats.unproductive;

    const chartData = {
        labels: ['Productive', 'Unproductive'],
        datasets: [{
            data: [stats.productive, stats.unproductive],
            backgroundColor: ['red', 'var(--color-inactive)'],
            borderColor: ['var(--color-primary)', 'var(--color-secondary)'],
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
                                <span className={styles.statValue} style={{ color: 'red' }}>
                                    {stats.productive} ({Math.round((stats.productive / totalSessions) * 100)}%)
                                </span>
                            </div>
                            <div className={styles.statItem}>
                                <span className={styles.statLabel}>Unproductive:</span>
                                <span className={styles.statValue}>
                                    {stats.unproductive} ({Math.round((stats.unproductive / totalSessions) * 100)}%)
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