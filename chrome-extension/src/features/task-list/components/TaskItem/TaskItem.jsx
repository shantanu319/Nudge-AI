import React from 'react';
import styles from './TaskItem.module.css';

export default function TaskItem({ task, isFocused, onToggleComplete, onRemove, onSetFocus }) {
    return (
        <div className={`${styles.container} ${isFocused ? styles.focused : ''}`}>
            <div className={styles.content}>
                <input
                    type="checkbox"
                    className={styles.checkbox}
                    checked={task.completed}
                    onChange={() => onToggleComplete(task.id)}
                />
                <span className={`${styles.title} ${task.completed ? styles.completed : ''}`}>
                    {task.title}
                </span>

                <button
                    className={`${styles.focusButton} ${isFocused ? styles.focused : ''}`}
                    onClick={() => onSetFocus(task.id)}
                >
                    {isFocused ? 'Focused' : 'Focus'}
                </button>

                <button
                    className={styles.removeButton}
                    onClick={() => onRemove(task.id)}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className={styles.icon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </button>
            </div>

            {isFocused && (
                <div className={styles.focusIndicator}>
                    <svg xmlns="http://www.w3.org/2000/svg" className={styles.focusIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Currently focusing on this task
                </div>
            )}
        </div>
    );
} 