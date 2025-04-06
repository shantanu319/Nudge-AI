import React, { useState } from 'react';
import styles from './TaskInput.module.css';

export default function TaskInput({ onSubmit }) {
    const [newTask, setNewTask] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (onSubmit(newTask)) {
            setNewTask('');
        }
    };

    return (
        <div className={styles.container}>
            <form onSubmit={handleSubmit} className={styles.form}>
                <input
                    type="text"
                    className={styles.input}
                    placeholder="Add a new task..."
                    value={newTask}
                    onChange={(e) => setNewTask(e.target.value)}
                />
                <button
                    type="submit"
                    className={styles.button}
                >
                    Add
                </button>
            </form>
        </div>
    );
} 