import React, { useState } from 'react';
import { usePopup } from '../../hooks/usePopup';
import Block from '../block-sites/Block';
import DomainUsage from '../focus/DomainUsage';
import Settings from '../settings/Settings';
import TaskParasite from '../tasks/TaskParasite';
import Icon from '../icons/Icon';
import styles from './Popup.module.css';


export default function Popup() {
    const {
        stats,
        domainUsage,
        settings,
        isActive,
        toggleActive,
        updateSettings
    } = usePopup();

    const [activeTab, setActiveTab] = useState('tasks');
    const [showSettings, setShowSettings] = useState(false);
    
    return (
        <div className={styles.container}>
            {showSettings ? (
                <Settings
                    settings={settings}
                    onUpdateSettings={updateSettings}
                    onClose={() => setShowSettings(false)}
                />
            ) : (
                <div className={styles.glassCard}>
                    <div className={styles.header}>
                        <div className={styles.titleContainer}>
                            <h1 className={styles.title}>Nudge</h1>
                            <div className={styles.statusContainer}>
                                <span className={`${styles.status} ${!isActive ? styles.inactive : ''}`}>
                                    {isActive ? 'Enabled' : 'Disabled'}
                                </span>
                            </div>
                        </div>
                        <div className={styles.controls}>
                            <button
                                className={`${styles.glassButton} ${isActive ? styles.active : ''}`}
                                onClick={toggleActive}
                            >
                                {isActive ? <Icon name="pause" /> : <Icon name="play" />}
                            </button>
                            <button
                                className={styles.glassButton}
                                onClick={() => setShowSettings(true)}
                            >
                                <Icon name="settings" />
                            </button>
                        </div>
                    </div>

                    <div className={styles.glassTabs}>
                        <button
                            className={`${styles.glassTab} ${activeTab === 'tasks' ? styles.active : ''}`}
                            onClick={() => setActiveTab('tasks')}
                        >
                            <span><Icon name="check" /></span>
                            <span>Tasks</span>
                        </button>
                        <button
                            className={`${styles.glassTab} ${activeTab === 'focus' ? styles.active : ''}`}
                            onClick={() => setActiveTab('focus')}
                        >
                            <span><Icon name="shield" /></span>
                            <span>Block</span>
                        </button>
                        <button
                            className={`${styles.glassTab} ${activeTab === 'analytics' ? styles.active : ''}`}
                            onClick={() => setActiveTab('analytics')}
                        >
                            <span><Icon name="list" /></span>
                            <span>Analytics</span>
                        </button>
                    </div>

                    <div className={styles.content}>
                        {activeTab === 'tasks' && (
                            <div className={styles.glassSection}>
                                <TaskParasite />
                            </div>
                        )}

                        {activeTab === 'focus' && (
                            <div className={styles.glassSection}>
                                <Block />
                            </div>
                        )}

                        {activeTab === 'analytics' && (
                            <div className={styles.glassSection}>
                                <DomainUsage domainUsage={domainUsage} />
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}