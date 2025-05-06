import Icon from '../icons/Icon';
import React from 'react';
import styles from './BlockList.module.css';

export default function BlockList({ blockList, onRemoveUrl }) {
    if (blockList.length === 0) {
        return (
            <p className={styles.noData}>
                No blocked sites yet. Add websites above.
            </p>
        );
    }

    return (
        <div className={styles.container}>
            <ul className={styles.list}>
                {blockList.map((url) => (
                    <li key={url} className={styles.listItem}>
                        <button
                            className={styles.removeButton}
                            onClick={() => onRemoveUrl(url)}
                        >
                            <Icon name="x" />
                        </button>
                        <span className={styles.url}>{url}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
} 