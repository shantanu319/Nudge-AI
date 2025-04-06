import React from 'react';
import styles from './FocusIndicator.module.css';

export default function FocusIndicator({ focusedTask, timer, secondsRemaining, isRunning }) {
    if (!focusedTask) return null;

    // Format the timer display with minutes and seconds
    const formatTimer = (minutes, seconds) => {
        if ((minutes === null || minutes === undefined) && seconds === undefined) return '';
        
        // Format the time as MM:SS
        const minutesPart = String(minutes || 0).padStart(2, '0');
        const secondsPart = String(seconds || 0).padStart(2, '0');
        
        // Determine the appropriate message
        if (minutes === 0 && seconds === 0) {
            return "Time's up!";
        }
        
        return `${minutesPart}:${secondsPart} remaining`;
    };

    return (
        <div className={styles.container}>
            <p className={styles.text}>
                <strong>Currently Focusing On:</strong> {focusedTask.title}
            </p>
            {(timer !== null || secondsRemaining !== null) && (
                <p className={`${styles.timer} ${isRunning ? styles.pulsing : ''}`}>
                    <span className={styles.timerIcon}>⏱️</span> {formatTimer(timer, secondsRemaining)}
                </p>
            )}
        </div>
    );
} 