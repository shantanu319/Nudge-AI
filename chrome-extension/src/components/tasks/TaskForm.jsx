import Icon from '../icons/Icon';
import React, { useState } from 'react';
import styles from './TaskForm.module.css';

export default function TaskForm({ onSubmit }) {
    const [newTask, setNewTask] = useState('');
    const [newPriority, setNewPriority] = useState('Medium');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (onSubmit(newTask, newPriority)) {
            setNewTask('');
        }
    };

    return (
        <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.inputGroup}>
                <input
                    type="text"
                    value={newTask}
                    onChange={(e) => setNewTask(e.target.value)}
                    placeholder="What needs to get done?"
                    className={styles.input}
                />
                <div className={styles.priorityGroup}>
                    <select
                        className={styles.select}
                        value={newPriority}
                        onChange={(e) => setNewPriority(e.target.value)}
                        title="Task Priority"
                    >
                        <option value="" disabled>Priority</option>
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                    </select>
                    <button
                        type="submit"
                        className={styles.button}
                    >
                        <Icon name="plus" />
                    </button>
                </div>
            </div>
        </form>
    );
} 