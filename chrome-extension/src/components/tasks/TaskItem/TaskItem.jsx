import { feather } from 'feather-icons';
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
                    dangerouslySetInnerHTML={{
                        __html: feather.icons[task.completed ? "check-square" : "square"].toSvg({
                            width: 20,
                            height: 20,
                            stroke: task.completed ? "var(--color-primary)" : "var(--color-text-secondary)",
                        }),
                    }}
                />
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
                            dangerouslySetInnerHTML={{
                                __html: feather.icons.check.toSvg({
                                    width: 16,
                                    height: 16,
                                    stroke: "var(--color-primary)",
                                }),
                            }}
                        />
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
                            dangerouslySetInnerHTML={{
                                __html: feather.icons.edit.toSvg({
                                    width: 16,
                                    height: 16,
                                    stroke: "var(--color-text-secondary)",
                                }),
                            }}
                        />
                        <button
                            className={styles.actionButton}
                            onClick={() => onDelete(task.id)}
                            dangerouslySetInnerHTML={{
                                __html: feather.icons.trash.toSvg({
                                    width: 16,
                                    height: 16,
                                    stroke: "var(--color-text-secondary)",
                                }),
                            }}
                        />
                    </>
                )}
            </div>
        </div>
    );
};

export default TaskItem; 