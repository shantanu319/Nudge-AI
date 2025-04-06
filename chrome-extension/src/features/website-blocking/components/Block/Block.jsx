import React from 'react';
import { useWebsiteBlocking } from '../../hooks/useWebsiteBlocking';
import BlockList from '../BlockList/BlockList';
import URLInput from '../URLInput/URLInput';
import styles from './Block.module.css';

export default function Block() {
    const {
        blockList,
        addUrl,
        removeUrl,
        updateBlockRules
    } = useWebsiteBlocking();

    return (
        <div className={styles.container}>
            <URLInput onSubmit={addUrl} />
            <BlockList blockList={blockList} onRemoveUrl={removeUrl} />
            <button
                className={styles.saveButton}
                onClick={updateBlockRules}
            >
                Apply Blocking Rules
            </button>
        </div>
    );
} 