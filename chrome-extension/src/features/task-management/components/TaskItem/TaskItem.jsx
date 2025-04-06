import React, { useState } from 'react';
import styles from './TaskItem.module.css';

// Helper function to get priority color
function getPriorityColor(priority) {
    if (priority === 'High') {
        return 'hsl(262, 52%, 29%)'; // Darkest purple
    } else if (priority === 'Medium') {
        return 'hsl(262, 52%, 50%)'; // Medium purple
    } else {
        return 'hsl(262, 52%, 70%)'; // Lightest purple
    }
}

export default function TaskItem({ task, isFocused, onToggleComplete, onSetFocus, onUpdateTask }) {
    const [isEditing, setIsEditing] = useState(false);
    const [editTitle, setEditTitle] = useState(task.title);
    const [editPriority, setEditPriority] = useState(task.priority);

    const circleSize = task.priority === 'High' ? 70 : task.priority === 'Medium' ? 60 : 50;

    const handleSaveEdit = () => {
        onUpdateTask(task.id, {
            title: editTitle,
            priority: editPriority
        });
        setIsEditing(false);
    };

    return (
        <div
            className={`${styles.taskContainer} ${isFocused ? styles.focused : ''}`}
            style={{
                '--circle-size': `${circleSize}px`,
                '--priority-color': getPriorityColor(task.priority)
            }}
        >
            {/* Priority Circle */}
            <div className={styles.priorityCircle}>
                {task.priority[0]}
            </div>

            {/* Task Content */}
            <div className={styles.taskContent}>
                {isEditing ? (
                    <div className={styles.editForm}>
                        <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className={styles.editInput}
                        />
                        <select
                            value={editPriority}
                            onChange={(e) => setEditPriority(e.target.value)}
                            className={styles.editSelect}
                        >
                            <option value="High">High</option>
                            <option value="Medium">Medium</option>
                            <option value="Low">Low</option>
                        </select>
                        <div className={styles.buttonGroup}>
                            <button
                                onClick={handleSaveEdit}
                                className={styles.saveButton}
                            >
                                Save
                            </button>
                            <button
                                onClick={() => setIsEditing(false)}
                                className={styles.cancelButton}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        <h3 className={styles.taskTitle}>{task.title}</h3>
                        <div className={styles.buttonGroup}>
                            <button
                                onClick={() => onSetFocus(task.id)}
                                className={`${styles.actionButton} ${isFocused ? styles.focused : ''}`}
                            >
                                {isFocused ? 'Unfocus' : 'Focus'}
                            </button>
                            <button
                                onClick={() => setIsEditing(true)}
                                className={styles.actionButton}
                            >
                                Edit
                            </button>
                        </div>
                    </>
                )}
            </div>

            {/* Complete Toggle */}
            <label className={styles.toggleContainer}>
                <input
                    type="checkbox"
                    checked={false}
                    onChange={() => onToggleComplete(task.id)}
                    className={styles.toggleInput}
                />
                <span className={styles.toggleSlider} />
            </label>
        </div>
    );
} 