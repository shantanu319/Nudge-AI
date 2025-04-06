import React from 'react';
import styles from './LoadingSpinner.module.css';

export default function LoadingSpinner() {
    return (
        <div className={styles.container}>
            <div className={styles.spinner} />
            <p className={styles.text}>Loading tasks...</p>
        </div>
    );
} 