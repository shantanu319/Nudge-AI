import React, { useState } from 'react';
import styles from './TaskItem.module.css';

export default function TaskItem({ task, isFocused, onToggleComplete, onRemove, onSetFocus, onUpdateTask }) {
    const [showTimerInput, setShowTimerInput] = useState(false);
    const [timer, setTimer] = useState(''); // Empty by default
    
    const handleRemove = () => {
        // Add logging to verify the prop is received properly
        console.log('Removing task with id:', task.id);
        onRemove(task.id);
    };

    const handleFocusClick = () => {
        if (isFocused) {
            // If already focused, just remove focus
            onSetFocus(task.id);
        } else {
            // If not focused, show timer input
            setShowTimerInput(true);
            setTimer(''); // Reset timer to empty
        }
    };

    const handleSetTimer = () => {
        const numericTimer = Number(timer);
        if (numericTimer > 0 && numericTimer <= 120) {
            onSetFocus(task.id, numericTimer);
            setShowTimerInput(false);
        }
    };

    const handleCancelTimer = () => {
        setShowTimerInput(false);
    };
    
    const handleTimerChange = (e) => {
        const value = e.target.value;
        if (value === '' || (Number(value) >= 0 && Number(value) <= 120)) {
            setTimer(value);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleSetTimer();
        } else if (e.key === 'Escape') {
            handleCancelTimer();
        }
    };

    return (
        <div className={`${styles.container} ${isFocused ? styles.focused : ''} ${task.completed ? styles.completed : ''}`}>
            <div className={styles.content}>
                <div className={styles.toggleContainer}>
                    <span className={styles.toggleLabel}>Done?</span>
                    <label className={styles.switch}>
                        <input
                            type="checkbox"
                            checked={task.completed}
                            onChange={() => onToggleComplete(task.id)}
                        />
                        <span className={styles.slider}></span>
                    </label>
                </div>
                
                <span className={`${styles.title} ${task.completed ? styles.completed : ''}`}>
                    {task.title}
                </span>

                {showTimerInput ? (
                    <div className={styles.timerInput}>
                        <label className={styles.timerLabel}>
                            Enter Mins:
                            <input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                value={timer}
                                onChange={handleTimerChange}
                                onKeyDown={handleKeyDown}
                                className={styles.timerField}
                                placeholder="25"
                                autoFocus
                            />
                        </label>
                        <div className={styles.timerButtons}>
                            <button
                                className={styles.timerButton}
                                onClick={handleSetTimer}
                            >
                                Set
                            </button>
                            <button
                                className={styles.timerButton}
                                onClick={handleCancelTimer}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                ) : (
                    <button
                        className={`${styles.focusButton} ${isFocused ? styles.focused : ''}`}
                        onClick={handleFocusClick}
                        disabled={task.completed}
                    >
                        {isFocused ? 'Focused' : 'Focus'}
                    </button>
                )}

                <button
                    className={styles.removeButton}
                    onClick={handleRemove}
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