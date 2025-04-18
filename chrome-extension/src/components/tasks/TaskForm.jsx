import * as feather from 'feather-icons';
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
                        value={newPriority}
                        onChange={(e) => setNewPriority(e.target.value)}
                        className={styles.select}
                    >
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                    </select>
                    <button
                        type="submit"
                        className={styles.button}
                        dangerouslySetInnerHTML={{ __html: feather.icons.plus.toSvg() }}
                    />
                </div>
            </div>
        </form>
    );
} 