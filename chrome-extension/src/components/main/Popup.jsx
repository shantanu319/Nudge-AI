import feather from 'feather-icons';
import React, { useEffect, useState } from 'react';
import { usePopup } from '../../hooks/usePopup';
import ActivitySummary from '../activity/ActivitySummary';
import Block from '../block-sites/Block';
import DomainUsage from '../focus/DomainUsage';
import Settings from '../settings/Settings';
import TaskParasite from '../tasks/TaskParasite';
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

    const [activeTab, setActiveTab] = useState('tasks');
    const [showSettings, setShowSettings] = useState(false);

    useEffect(() => {
        feather.replace();
    }, [activeTab, showSettings]);

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <div className={styles.header}>
                    <div className={styles.titleContainer}>
                        <h1 className={styles.title}>Nudge</h1>
                        <div className={styles.statusContainer}>
                            <span className={styles.status}>{isActive ? 'Active' : 'Paused'}</span>
                            <button
                                className={`${styles.toggleButton} ${isActive ? styles.active : ''}`}
                                onClick={toggleActive}
                            >
                                {isActive ? 'Pause' : 'Resume'}
                            </button>
                        </div>
                    </div>
                    <button
                        className={styles.settingsButton}
                        onClick={() => setShowSettings(!showSettings)}
                        dangerouslySetInnerHTML={{ __html: feather.icons.settings.toSvg() }}
                    />
                </div>

                {showSettings ? (
                    <div className={styles.section}>
                        <Settings
                            settings={settings}
                            onUpdateSettings={updateSettings}
                            onSaveSettings={saveSettings}
                        />
                    </div>
                ) : (
                    <>
                        <div className={styles.tabs}>
                            <button
                                className={`${styles.tab} ${activeTab === 'tasks' ? styles.active : ''}`}
                                onClick={() => setActiveTab('tasks')}
                            >
                                <span dangerouslySetInnerHTML={{ __html: feather.icons.check.toSvg() }} />
                                <span>Tasks</span>
                            </button>
                            <button
                                className={`${styles.tab} ${activeTab === 'focus' ? styles.active : ''}`}
                                onClick={() => setActiveTab('focus')}
                            >
                                <span dangerouslySetInnerHTML={{ __html: feather.icons.lock.toSvg() }} />
                                <span>Focus</span>
                            </button>
                            <button
                                className={`${styles.tab} ${activeTab === 'analytics' ? styles.active : ''}`}
                                onClick={() => setActiveTab('analytics')}
                            >
                                <span dangerouslySetInnerHTML={{ __html: feather.icons.barChart2.toSvg() }} />
                                <span>Analytics</span>
                            </button>
                        </div>

                        <div className={styles.content}>
                            {activeTab === 'tasks' && (
                                <div className={styles.section}>
                                    <TaskParasite />
                                </div>
                            )}

                            {activeTab === 'focus' && (
                                <div className={styles.section}>
                                    <Block />
                                </div>
                            )}

                            {activeTab === 'analytics' && (
                                <div className={styles.section}>
                                    <ActivitySummary stats={stats} />
                                    <DomainUsage domainUsage={domainUsage} />
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
} 