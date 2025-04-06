import React from 'react';
import styles from './BlockList.module.css';

export default function BlockList({ blockList, onRemoveUrl }) {
    if (blockList.length === 0) {
        return (
            <p className={styles.noData}>
                No blocked sites yet. Add domains above.
            </p>
        );
    }

    return (
        <div className={styles.container}>
            <table className={styles.table}>
                <thead>
                    <tr>
                        <th>Domain</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    {blockList.map((url) => (
                        <tr key={url}>
                            <td>{url}</td>
                            <td>
                                <button
                                    className={styles.removeButton}
                                    onClick={() => onRemoveUrl(url)}
                                >
                                    Remove
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
} 