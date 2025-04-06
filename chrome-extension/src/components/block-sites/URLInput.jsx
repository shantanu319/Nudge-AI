import * as feather from 'feather-icons';
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
            <label className={styles.label}>
                Add websites to block when you're being unproductive:
            </label>
            <form onSubmit={handleSubmit} className={styles.form}>
                <input
                    type="text"
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    placeholder="Enter domain (e.g. facebook.com)"
                    className={styles.input}
                />
                <button type="submit" className={styles.button} dangerouslySetInnerHTML={{ __html: feather.icons.plus.toSvg() }} />
            </form>
        </div>
    );
} 