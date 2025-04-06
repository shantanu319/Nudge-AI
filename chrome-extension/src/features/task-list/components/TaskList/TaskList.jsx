import React from 'react';
import { useTaskList } from '../../hooks/useTaskList';
import EmptyState from '../EmptyState/EmptyState';
import LoadingSpinner from '../LoadingSpinner/LoadingSpinner';
import TaskInput from '../TaskInput/TaskInput';
import TaskItem from '../TaskItem/TaskItem';
import styles from './TaskList.module.css';

export default function TaskList() {
    const {
        tasks,
        currentFocus,
        isLoading,
        addTask,
        toggleTaskCompletion,
        removeTask,
        setFocus
    } = useTaskList();

    if (isLoading) {
        return <LoadingSpinner />;
    }

    const focusedTask = tasks.find(task => task.id === currentFocus);

    return (
        <div className={styles.container}>
            <TaskInput onSubmit={addTask} />

            {tasks.length === 0 ? (
                <EmptyState />
            ) : (
                <div className={styles.taskItems}>
                    {tasks.map((task) => (
                        <TaskItem
                            key={task.id}
                            task={task}
                            isFocused={currentFocus === task.id}
                            onToggleComplete={toggleTaskCompletion}
                            onRemove={removeTask}
                            onSetFocus={setFocus}
                        />
                    ))}
                </div>
            )}

            {focusedTask && (
                <div className={styles.focusBar}>
                    <h3 className={styles.focusTitle}>Current Focus</h3>
                    <p className={styles.focusText}>{focusedTask.title}</p>
                </div>
            )}
        </div>
    );
} 