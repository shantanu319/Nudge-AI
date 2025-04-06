import React from 'react';
import { useTaskManagement } from '../../hooks/useTaskManagement';
import FocusIndicator from './FocusIndicator';
import TaskForm from './TaskForm';
import TaskItem from './TaskItem';
import styles from './TaskParasite.module.css';

export default function TaskParasite() {
    const {
        tasks,
        currentFocus,
        focusTimer,
        secondsRemaining,
        timerRunning,
        handleAddTask,
        handleToggleComplete,
        handleRemoveTask,
        handleSetFocus,
        updateTask
    } = useTaskManagement();

    // Separate active and completed tasks
    const activeTasks = tasks.filter(task => !task.completed);
    const completedTasks = tasks.filter(task => task.completed);

    // Sort active tasks by priority
    const sortedActiveTasks = [...activeTasks].sort((a, b) => {
        const priorityOrder = { High: 3, Medium: 2, Low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    const focusedTask = tasks.find(task => task.id === currentFocus);

    return (
        <div className={styles.container}>
            <TaskForm onSubmit={handleAddTask} />
            <FocusIndicator 
                focusedTask={focusedTask} 
                timer={focusTimer} 
                secondsRemaining={secondsRemaining}
                isRunning={timerRunning} 
            />
            
            <div className={styles.tasksSection}>
                {sortedActiveTasks.map((task) => (
                    <TaskItem
                        key={task.id}
                        task={task}
                        isFocused={currentFocus === task.id}
                        onToggleComplete={handleToggleComplete}
                        onSetFocus={handleSetFocus}
                        onRemove={handleRemoveTask}
                        onUpdateTask={updateTask}
                    />
                ))}
            </div>
            
            {completedTasks.length > 0 && (
                <div className={styles.completedSection}>
                    <h3 className={styles.completedTitle}>Completed Tasks</h3>
                    {completedTasks.map((task) => (
                        <TaskItem
                            key={task.id}
                            task={task}
                            isFocused={false}
                            onToggleComplete={handleToggleComplete}
                            onSetFocus={handleSetFocus}
                            onRemove={handleRemoveTask}
                            onUpdateTask={updateTask}
                        />
                    ))}
                </div>
            )}
        </div>
    );
} 