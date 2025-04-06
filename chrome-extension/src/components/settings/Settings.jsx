import React from 'react';
import styles from './Settings.module.css';

export default function Settings({ settings, onUpdateSettings, onClose }) {
    const handleSettingChange = (updates) => {
        onUpdateSettings(updates);
    };

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
                        onChange={(e) => handleSettingChange({ interval: Number(e.target.value) })}
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
                        onChange={(e) => handleSettingChange({ interventionStyle: e.target.value })}
                    >
                        <option value="drill_sergeant">Drill Sergeant (Every unproductive instance)</option>
                        <option value="vigilant_mentor">Vigilant Mentor (Every 2 instances)</option>
                        <option value="steady_coach">Steady Coach (Every 4 instances)</option>
                        <option value="patient_guide">Patient Guide (Every 7 instances)</option>
                        <option value="zen_observer">Zen Observer (Every 10 instances)</option>
                    </select>
                    <p className={styles.helperText}>
                        {settings.interventionStyle === 'drill_sergeant' && "Notifies you immediately when unproductive behavior is detected"}
                        {settings.interventionStyle === 'vigilant_mentor' && "Notifies you after 2 unproductive instances"}
                        {settings.interventionStyle === 'steady_coach' && "Notifies you after 4 unproductive instances"}
                        {settings.interventionStyle === 'patient_guide' && "Notifies you after 7 unproductive instances"}
                        {settings.interventionStyle === 'zen_observer' && "Notifies you after 10 unproductive instances"}
                    </p>
                </div>
            </div>
        </div>
    );
} 