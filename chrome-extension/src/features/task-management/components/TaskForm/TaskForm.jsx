import React, { useState } from 'react';

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
        <form onSubmit={handleSubmit} style={{ display: 'flex', marginBottom: '15px' }}>
            <input
                type="text"
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                placeholder="Task Title"
                style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #ccc',
                    marginRight: '10px',
                }}
            />
            <select
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value)}
                style={{
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #ccc',
                    marginRight: '10px',
                }}
            >
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
            </select>
            <button
                type="submit"
                style={{
                    padding: '8px 16px',
                    backgroundColor: '#4e2a84',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                }}
            >
                Add Task
            </button>
        </form>
    );
} 