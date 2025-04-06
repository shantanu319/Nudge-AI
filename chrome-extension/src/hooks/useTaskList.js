import { useEffect, useState } from 'react';

export function useTaskList() {
    const [tasks, setTasks] = useState([]);
    const [currentFocus, setCurrentFocus] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // Load tasks from Chrome storage on component mount
    useEffect(() => {
        if (chrome && chrome.storage) {
            chrome.storage.local.get(['tasks', 'currentFocus'], (result) => {
                if (result.tasks) {
                    setTasks(result.tasks);
                }
                if (result.currentFocus) {
                    setCurrentFocus(result.currentFocus);
                }
                setIsLoading(false);
            });

            // Listen for changes to tasks in storage
            const handleStorageChange = (changes, areaName) => {
                if (areaName === 'local') {
                    if (changes.tasks) {
                        setTasks(changes.tasks.newValue);
                    }
                    if (changes.currentFocus) {
                        setCurrentFocus(changes.currentFocus.newValue);
                    }
                }
            };

            chrome.storage.onChanged.addListener(handleStorageChange);
            return () => {
                chrome.storage.onChanged.removeListener(handleStorageChange);
            };
        }
    }, []);

    // Save tasks to Chrome storage
    const saveTasks = (updatedTasks) => {
        if (chrome && chrome.storage) {
            chrome.storage.local.set({ tasks: updatedTasks });

            // Notify background script about task changes for Gemini analysis
            if (chrome && chrome.runtime) {
                chrome.runtime.sendMessage({
                    action: 'updateTasks',
                    tasks: updatedTasks
                });
            }
        }
    };

    // Save current focus task to Chrome storage
    const saveCurrentFocus = (taskId) => {
        if (chrome && chrome.storage) {
            chrome.storage.local.set({ currentFocus: taskId });

            // Notify background script about focus change
            if (chrome && chrome.runtime) {
                chrome.runtime.sendMessage({
                    action: 'updateCurrentFocus',
                    currentFocus: taskId
                });
            }
        }
    };

    // Add a new task
    const addTask = (title) => {
        if (title.trim() === '') return false;

        const newTaskItem = {
            id: Date.now(),
            title: title.trim(),
            completed: false,
            created: new Date().toISOString()
        };

        const updatedTasks = [...tasks, newTaskItem];
        setTasks(updatedTasks);
        saveTasks(updatedTasks);
        return true;
    };

    // Toggle task completion
    const toggleTaskCompletion = (taskId) => {
        const updatedTasks = tasks.map(task =>
            task.id === taskId ? { ...task, completed: !task.completed } : task
        );

        setTasks(updatedTasks);
        saveTasks(updatedTasks);

        // If completed task was the current focus, clear the focus
        if (currentFocus === taskId) {
            setCurrentFocus(null);
            saveCurrentFocus(null);
        }
    };

    // Remove a task
    const removeTask = (taskId) => {
        const updatedTasks = tasks.filter(task => task.id !== taskId);
        setTasks(updatedTasks);
        saveTasks(updatedTasks);

        // If removed task was the current focus, clear the focus
        if (currentFocus === taskId) {
            setCurrentFocus(null);
            saveCurrentFocus(null);
        }
    };

    // Set current focus task
    const setFocus = (taskId) => {
        const newFocus = currentFocus === taskId ? null : taskId;
        setCurrentFocus(newFocus);
        saveCurrentFocus(newFocus);
    };

    return {
        tasks,
        currentFocus,
        isLoading,
        addTask,
        toggleTaskCompletion,
        removeTask,
        setFocus
    };
} 