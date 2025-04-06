import React from 'react';
import ActivitySummary from '../activity/ActivitySummary';
import styles from './Analytics.module.css';
import SiteUsage from './SiteUsage';

const Analytics = () => {
    return (
        <div className={styles.container}>
            <ActivitySummary />
            <SiteUsage />
        </div>
    );
};

export default Analytics; 