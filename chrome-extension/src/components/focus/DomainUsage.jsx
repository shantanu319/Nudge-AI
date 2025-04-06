import React from 'react';
import styles from './DomainUsage.module.css';

export default function DomainUsage({ domainUsage }) {
    const hasDomains = Object.keys(domainUsage).length > 0;

    return (
        <div className={styles.container}>
            <div className={styles.tableContainer}>
                {hasDomains ? (
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Domain</th>
                                <th>Time (s)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Object.entries(domainUsage).map(([domain, timeMs]) => (
                                <tr key={domain}>
                                    <td>{domain}</td>
                                    <td className={styles.timeCell}>
                                        {Math.round(timeMs / 1000)}
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