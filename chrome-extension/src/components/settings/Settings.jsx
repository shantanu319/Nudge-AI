import React, { useState } from 'react';
import styles from './Settings.module.css';

export default function Settings({ settings, onUpdateSettings, onClose }) {
    const [activeTab, setActiveTab] = useState('general');
    
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
            <div className={styles.tabs}>
                <button 
                    className={`${styles.tab} ${styles.activeTab}`}
                    onClick={() => setActiveTab('general')}
                >
                    General
                </button>
            </div>
            <div className={styles.content}>
                {(
                    <>
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
                                <option value="drill_sergeant">Drill Sergeant (Strict)</option>
                                <option value="vigilant_mentor">Vigilant Mentor (Firm)</option>
                                <option value="steady_coach">Steady Coach (Balanced)</option>
                                <option value="patient_guide">Patient Guide (Lenient)</option>
                                <option value="zen_observer">Zen Observer (Very Lenient)</option>
                            </select>
                            <p className={styles.helperText}>
                                {settings.interventionStyle === 'drill_sergeant' && "Strict monitoring with frequent reminders for unproductive behavior"}
                                {settings.interventionStyle === 'vigilant_mentor' && "Firm monitoring with regular reminders"}
                                {settings.interventionStyle === 'steady_coach' && "Balanced monitoring with moderate reminders"}
                                {settings.interventionStyle === 'patient_guide' && "Lenient monitoring with sparse reminders"}
                                {settings.interventionStyle === 'zen_observer' && "Very lenient monitoring with minimal reminders"}
                            </p>
                        </div>

                        <div className={styles.settingRow}>
                            <label htmlFor="testMode" className={styles.label}>
                                Test Mode:
                            </label>
                            <div className={styles.toggleContainer}>
                                <input
                                    type="checkbox"
                                    id="testMode"
                                    className={styles.toggleInput}
                                    checked={settings.testMode || false}
                                    onChange={(e) => handleSettingChange({ testMode: e.target.checked })}
                                />
                                <label htmlFor="testMode" className={styles.toggleLabel}>
                                    <span className={styles.toggleButton}></span>
                                </label>
                                <span className={styles.toggleText}>
                                    {settings.testMode ? 'Enabled' : 'Disabled'}
                                </span>
                            </div>
                            <p className={styles.helperText}>
                                Test mode captures screenshots every 30 seconds deterministically to verify the system is working correctly. For debugging purposes only.
                            </p>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
} 