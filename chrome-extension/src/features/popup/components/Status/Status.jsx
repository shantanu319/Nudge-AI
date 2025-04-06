import React from 'react';
import styles from './Status.module.css';

export default function Status({ isActive, onToggleActive }) {
    return (
        <div className={styles.container}>
            <span className={styles.label}>
                Status: {isActive ? 'Active' : 'Paused'}
            </span>
            <button
                className={`${styles.button} ${isActive ? styles.active : styles.inactive}`}
                onClick={onToggleActive}
            >
                {isActive ? 'Pause' : 'Resume'}
            </button>
        </div>
    );
} 