import * as feather from 'feather-icons';
import React, { useEffect, useState } from 'react';
import { usePopup } from '../../hooks/usePopup';
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
        updateSettings
    } = usePopup();

    const [activeTab, setActiveTab] = useState('tasks');
    const [showSettings, setShowSettings] = useState(false);

    useEffect(() => {
        feather.replace();
    }, [activeTab, showSettings]);

    const getIcon = (name) => {
        const icon = feather.icons[name];
        return icon ? icon.toSvg() : '';
    };

    return (
        <div className={styles.container}>
            {showSettings ? (
                <Settings
                    settings={settings}
                    onUpdateSettings={updateSettings}
                    onClose={() => setShowSettings(false)}
                />
            ) : (
                <div className={styles.card}>
                    <div className={styles.header}>
                        <div className={styles.titleContainer}>
                            <h1 className={styles.title}>Nudge</h1>
                            <div className={styles.statusContainer}>
                                <span className={styles.status}>{isActive ? 'Active' : 'Paused'}</span>
                                <button
                                    className={`${styles.toggleButton} ${isActive ? styles.active : ''}`}
                                    onClick={toggleActive}
                                    dangerouslySetInnerHTML={{ __html: isActive ? getIcon('pause') : getIcon('play') }}
                                />
                            </div>
                        </div>
                        <button
                            className={styles.settingsButton}
                            onClick={() => setShowSettings(true)}
                            dangerouslySetInnerHTML={{ __html: getIcon('settings') }}
                        />
                    </div>

                    <div className={styles.tabs}>
                        <button
                            className={`${styles.tab} ${activeTab === 'tasks' ? styles.active : ''}`}
                            onClick={() => setActiveTab('tasks')}
                        >
                            <span dangerouslySetInnerHTML={{ __html: getIcon('check') }} />
                            <span>Tasks</span>
                        </button>
                        <button
                            className={`${styles.tab} ${activeTab === 'focus' ? styles.active : ''}`}
                            onClick={() => setActiveTab('focus')}
                        >
                            <span dangerouslySetInnerHTML={{ __html: getIcon('lock') }} />
                            <span>Blocking</span>
                        </button>
                        <button
                            className={`${styles.tab} ${activeTab === 'analytics' ? styles.active : ''}`}
                            onClick={() => setActiveTab('analytics')}
                        >
                            <span dangerouslySetInnerHTML={{ __html: getIcon('bar-chart-2') }} />
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
                                <DomainUsage domainUsage={domainUsage} />
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
} 