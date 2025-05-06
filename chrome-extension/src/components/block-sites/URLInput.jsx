import Icon from '../icons/Icon';
import React, { useState } from 'react';
import styles from './URLInput.module.css';

export default function URLInput({ onSubmit }) {
    const [newUrl, setNewUrl] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (onSubmit(newUrl)) {
            setNewUrl('');
        }
    };

    return (
        <div className={styles.container}>
            <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.inputContainer}>
                    <input
                        type="text"
                        value={newUrl}
                        onChange={(e) => setNewUrl(e.target.value)}
                        placeholder="Enter a distracting website!"
                        className={styles.input}
                    />
                    <button type="submit" className={styles.button}>
                        <Icon name="plus" />
                    </button>
                </div>
            </form>
        </div>
    );
} 