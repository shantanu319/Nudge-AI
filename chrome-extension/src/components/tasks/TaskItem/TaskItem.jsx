import Icon from '../../icons/Icon';
import React, { useState } from 'react';
import { getPriorityColor } from '../../../utils/priorityColors';
import styles from './TaskItem.module.css';

const TaskItem = ({ task, onToggle, onDelete, onEdit }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editedText, setEditedText] = useState(task.text);
    const [editedPriority, setEditedPriority] = useState(task.priority);

    const handleEdit = () => {
        onEdit(task.id, editedText, editedPriority);
        setIsEditing(false);
    };

    const priorityColor = getPriorityColor(task.priority);

    return (
        <div className={styles.taskItem} style={{ borderLeft: `3px solid ${priorityColor}` }}>
            <div className={styles.taskContent}>
                <button
                    className={styles.checkbox}
                    onClick={() => onToggle(task.id)}
                >
                    <Icon 
                        name={task.completed ? "check-square" : "square"}
                        size={20}
                        style={{
                            stroke: task.completed ? "var(--color-primary)" : "var(--color-text-secondary)"
                        }}
                    />
                </button>
                {isEditing ? (
                    <div className={styles.editForm}>
                        <input
                            type="text"
                            value={editedText}
                            onChange={(e) => setEditedText(e.target.value)}
                            className={styles.editInput}
                            autoFocus
                        />
                        <select
                            value={editedPriority}
                            onChange={(e) => setEditedPriority(e.target.value)}
                            className={styles.prioritySelect}
                        >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                        </select>
                        <button
                            className={styles.saveButton}
                            onClick={handleEdit}
                        >
                            <Icon 
                                name="check"
                                size={16}
                                style={{ stroke: "var(--color-primary)" }}
                            />
                        </button>
                    </div>
                ) : (
                    <span className={`${styles.taskText} ${task.completed ? styles.completed : ""}`}>
                        {task.text}
                    </span>
                )}
            </div>
            <div className={styles.taskActions}>
                {!isEditing && (
                    <>
                        <button
                            className={styles.actionButton}
                            onClick={() => setIsEditing(true)}
                        >
                            <Icon 
                                name="edit"
                                size={16}
                                style={{ stroke: "var(--color-text-secondary)" }}
                            />
                        </button>
                        <button
                            className={styles.actionButton}
                            onClick={() => onDelete(task.id)}
                        >
                            <Icon 
                                name="trash"
                                size={16}
                                style={{ stroke: "var(--color-text-secondary)" }}
                            />
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

export default TaskItem; 