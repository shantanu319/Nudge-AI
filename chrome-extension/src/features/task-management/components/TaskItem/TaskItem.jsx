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
        <div className={`${styles.taskContainer} ${isFocused ? styles.focused : ''}`}>
            <input
                type="checkbox"
                className={styles.checkbox}
                checked={task.completed}
                onChange={() => onToggleComplete(task.id)}
            />

            <div className={styles.taskContent}>
                {isEditing ? (
                    <div className={styles.editForm}>
                        <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className={styles.editInput}
                            autoFocus
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
                                className={styles.saveButton}
                                onClick={handleSaveEdit}
                            >
                                Save
                            </button>
                            <button
                                className={styles.cancelButton}
                                onClick={() => setIsEditing(false)}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        <h3 className={`${styles.taskTitle} ${task.completed ? styles.completed : ''}`}>
                            {task.title}
                        </h3>
                        <div className={styles.buttonGroup}>
                            <button
                                className={`${styles.actionButton} ${isFocused ? styles.focused : ''}`}
                                onClick={() => onSetFocus(task.id)}
                            >
                                Focus
                            </button>
                            <button
                                className={styles.editButton}
                                onClick={() => setIsEditing(true)}
                            >
                                Edit
                            </button>
                            <button
                                className={styles.deleteButton}
                                onClick={() => onUpdateTask(task.id, { deleted: true })}
                            >
                                Delete
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
} 