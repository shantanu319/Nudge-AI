import React from 'react';
import styles from './Settings.module.css';

export default function Settings({ settings, onUpdateSettings, onSaveSettings }) {
    return (
        <div className={styles.container}>
            <div className={styles.settingRow}>
                <label htmlFor="interval" className={styles.label}>
                    Check Interval (minutes):
                </label>
                <select
                    id="interval"
                    className={styles.select}
                    value={settings.interval}
                    onChange={(e) => onUpdateSettings({
                        ...settings,
                        interval: Number(e.target.value)
                    })}
                >
                    <option value={1}>1</option>
                    <option value={3}>3</option>
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={15}>15</option>
                    <option value={30}>30</option>
                </select>
            </div>

            <div className={styles.settingRow}>
                <label htmlFor="threshold" className={styles.label}>
                    Productivity Threshold:
                </label>
                <div className={styles.sliderContainer}>
                    <input
                        type="range"
                        id="threshold"
                        className={styles.slider}
                        min="10"
                        max="90"
                        step="5"
                        value={settings.threshold}
                        onChange={(e) => onUpdateSettings({
                            ...settings,
                            threshold: Number(e.target.value)
                        })}
                    />
                    <span className={styles.value}>{settings.threshold}%</span>
                </div>
            </div>

            <button className={styles.saveButton} onClick={onSaveSettings}>
                Save Settings
            </button>
        </div>
    );
} 