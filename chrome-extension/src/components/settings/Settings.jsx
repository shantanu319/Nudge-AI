import React from 'react';
import styles from './Settings.module.css';

export default function Settings({ settings, onUpdateSettings, onSaveSettings, onClose }) {
    return (
        <div className={styles.fullContainer}>
            <div className={styles.header}>
                <h2 className={styles.title}>Settings</h2>
                <button className={styles.closeButton} onClick={onClose}>
                    ×
                </button>
            </div>
            <div className={styles.content}>
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
                        <option value={0.1}>0.1</option>
                        <option value={1}>1</option>
                        <option value={3}>3</option>
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={15}>15</option>
                        <option value={30}>30</option>
                    </select>
                </div>

                <div className={styles.settingRow}>
                    <label htmlFor="interventionStyle" className={styles.label}>
                        Focus Guardian Style:
                    </label>
                    <select
                        id="interventionStyle"
                        className={styles.select}
                        value={settings.interventionStyle}
                        onChange={(e) => onUpdateSettings({
                            ...settings,
                            interventionStyle: e.target.value
                        })}
                    >
                        <option value="drill_sergeant">Drill Sergeant</option>
                        <option value="vigilant_mentor">Vigilant Mentor</option>
                        <option value="steady_coach">Steady Coach</option>
                        <option value="patient_guide">Patient Guide</option>
                        <option value="zen_observer">Zen Observer</option>
                    </select>
                </div>

                <button className={styles.saveButton} onClick={onSaveSettings}>
                    Save Settings
                </button>
            </div>
        </div>
    );
} 