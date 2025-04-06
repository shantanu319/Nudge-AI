import React from 'react';
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

export default function DomainUsage({ domainUsage }) {
    const hasDomains = Object.keys(domainUsage).length > 0;

    // Sort domains by time spent
    const sortedDomains = Object.entries(domainUsage)
        .sort(([, a], [, b]) => b.totalTime - a.totalTime);

    return (
        <div className={styles.container}>
            <h3 className={styles.title}>Domain Activity</h3>
            <div className={styles.tableContainer}>
                {hasDomains ? (
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Domain</th>
                                <th>Category</th>
                                <th>Time</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedDomains.map(([domain, data]) => (
                                <tr key={domain}>
                                    <td className={styles.domain}>{domain}</td>
                                    <td className={styles.category}>
                                        <span className={`${styles.categoryBadge} ${styles[data.category?.toLowerCase()]}`}>
                                            {data.category || 'Other'}
                                        </span>
                                    </td>
                                    <td className={styles.timeCell}>
                                        {formatTime(data.totalTime)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <p className={styles.noData}>No domains tracked yet.</p>
                )}
            </div>
        </div>
    );
} 