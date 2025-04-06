import React from 'react';
import TaskParasite from '../../../../features/task-management/components/TaskParasite/TaskParasite';
import Block from '../../../../features/website-blocking/components/Block/Block.jsx';
import { usePopup } from '../../hooks/usePopup';
import ActivitySummary from '../ActivitySummary/ActivitySummary';
import DomainUsage from '../DomainUsage/DomainUsage';
import Settings from '../Settings/Settings';
import Status from '../Status/Status';
import styles from './Popup.module.css';

export default function Popup() {
    const {
        stats,
        domainUsage,
        settings,
        isActive,
        toggleActive,
        saveSettings,
        updateSettings
    } = usePopup();

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <h1 className={styles.title}>Nudge</h1>

                <Status isActive={isActive} onToggleActive={toggleActive} />

                <div className={styles.section}>
                    <h3 className={styles.sectionTitle}>Tasks</h3>
                    <TaskParasite />
                </div>

                <div className={styles.section}>
                    <h3 className={styles.sectionTitle}>Focus</h3>
                    <DomainUsage domainUsage={domainUsage} />
                </div>

                <div className={styles.section}>
                    <h3 className={styles.sectionTitle}>Block Sites</h3>
                    <Block />
                </div>

                <div className={styles.section}>
                    <h3 className={styles.sectionTitle}>Activity</h3>
                    <ActivitySummary stats={stats} />
                </div>

                <div className={styles.section}>
                    <h3 className={styles.sectionTitle}>Settings</h3>
                    <Settings
                        settings={settings}
                        onUpdateSettings={updateSettings}
                        onSaveSettings={saveSettings}
                    />
                </div>
            </div>
        </div>
    );
} 