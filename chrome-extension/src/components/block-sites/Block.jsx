import React from 'react';
import { useWebsiteBlocking } from '../../hooks/useWebsiteBlocking';
import styles from './Block.module.css';
import BlockList from './BlockList';
import URLInput from './URLInput';

export default function Block() {
    const {
        blockList,
        addUrl,
        removeUrl
    } = useWebsiteBlocking();

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h2>Blocked Websites</h2>
            </div>
            <URLInput onSubmit={addUrl} />
            <BlockList blockList={blockList} onRemoveUrl={removeUrl} />
        </div>
    );
} 