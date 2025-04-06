import React from 'react';
import styles from './FocusIndicator.module.css';

export default function FocusIndicator({ focusedTask }) {
    if (!focusedTask) return null;

    return (
        <div className={styles.container}>
            <p className={styles.text}>
                <strong>Currently Focusing On:</strong> {focusedTask.title}
            </p>
        </div>
    );
} 