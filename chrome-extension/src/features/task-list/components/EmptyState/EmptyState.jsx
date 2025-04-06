import React from 'react';
import styles from './EmptyState.module.css';

export default function EmptyState() {
    return (
        <div className={styles.container}>
            <svg xmlns="http://www.w3.org/2000/svg" className={styles.icon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h3 className={styles.title}>No Tasks Yet</h3>
            <p className={styles.text}>Add tasks to keep track of your work</p>
        </div>
    );
} 