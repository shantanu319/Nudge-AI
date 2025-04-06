import React from 'react';
import { useTaskManagement } from '../../hooks/useTaskManagement';
import FocusIndicator from '../FocusIndicator/FocusIndicator';
import TaskForm from '../TaskForm/TaskForm';
import TaskItem from '../TaskItem/TaskItem';
import styles from './TaskParasite.module.css';

export default function TaskParasite() {
    const {
        tasks,
        currentFocus,
        handleAddTask,
        handleToggleComplete,
        handleSetFocus,
        updateTask
    } = useTaskManagement();

    // Sort tasks by priority
    const sortedTasks = [...tasks].sort((a, b) => {
        const priorityOrder = { High: 3, Medium: 2, Low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    const focusedTask = tasks.find(task => task.id === currentFocus);

    return (
        <div className={styles.container}>
            <TaskForm onSubmit={handleAddTask} />
            <FocusIndicator focusedTask={focusedTask} />
            {sortedTasks.map((task) => (
                <TaskItem
                    key={task.id}
                    task={task}
                    isFocused={currentFocus === task.id}
                    onToggleComplete={handleToggleComplete}
                    onSetFocus={handleSetFocus}
                    onUpdateTask={updateTask}
                />
            ))}
        </div>
    );
} 