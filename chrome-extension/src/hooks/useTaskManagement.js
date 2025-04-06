import { useEffect, useState } from 'react';

export function useTaskManagement() {
    const [tasks, setTasks] = useState([]);
    const [currentFocus, setCurrentFocus] = useState(null);

    // Load tasks from Chrome storage on component mount
    useEffect(() => {
        if (chrome && chrome.storage) {
            chrome.storage.local.get(['parasiteTasks', 'currentFocusParasite'], (result) => {
                if (result.parasiteTasks) {
                    setTasks(result.parasiteTasks);
                }
                if (result.currentFocusParasite) {
                    setCurrentFocus(result.currentFocusParasite);
                }
            });

            // Listen for changes to tasks in storage
            const handleStorageChange = (changes, areaName) => {
                if (areaName === 'local') {
                    if (changes.parasiteTasks) {
                        setTasks(changes.parasiteTasks.newValue);
                    }
                    if (changes.currentFocusParasite) {
                        setCurrentFocus(changes.currentFocusParasite.newValue);
                    }
                }
            };

            chrome.storage.onChanged.addListener(handleStorageChange);
            return () => {
                chrome.storage.onChanged.removeListener(handleStorageChange);
            };
        }
    }, []);

    // Save tasks to Chrome storage and notify background script
    const saveTasks = (updatedTasks) => {
        if (chrome && chrome.storage) {
            chrome.storage.local.set({ parasiteTasks: updatedTasks });

            // Notify background script about task changes for Gemini analysis
            if (chrome && chrome.runtime) {
                chrome.runtime.sendMessage({
                    action: 'updateParasiteTasks',
                    tasks: updatedTasks
                });
            }
        }
    };

    // Save current focus task to Chrome storage
    const saveCurrentFocus = (taskId) => {
        if (chrome && chrome.storage) {
            chrome.storage.local.set({ currentFocusParasite: taskId });

            // Notify background script about focus change
            if (chrome && chrome.runtime) {
                chrome.runtime.sendMessage({
                    action: 'updateCurrentFocusParasite',
                    currentFocus: taskId
                });
            }
        }
    };

    // Function to handle adding a new task
    const handleAddTask = (newTask, newPriority) => {
        const trimmed = newTask.trim();
        if (trimmed) {
            const newTaskObject = {
                id: Date.now(),
                title: trimmed,
                priority: newPriority,
                completed: false,
            };
            const updatedTasks = [...tasks, newTaskObject];
            setTasks(updatedTasks);
            saveTasks(updatedTasks);
            return true;
        }
        return false;
    };

    // Function to mark task as completed and delete task
    const handleToggleComplete = (taskId) => {
        const updatedTasks = tasks.filter((t) => t.id !== taskId);
        setTasks(updatedTasks);
        saveTasks(updatedTasks);

        // If completed task was the current focus, clear the focus
        if (currentFocus === taskId) {
            setCurrentFocus(null);
            saveCurrentFocus(null);
        }
    };

    // Function to set focus on a task
    const handleSetFocus = (taskId) => {
        const newFocus = currentFocus === taskId ? null : taskId;
        setCurrentFocus(newFocus);
        saveCurrentFocus(newFocus);
    };

    // Function to update a task
    const updateTask = (taskId, updates) => {
        const updatedTasks = tasks.map((task) =>
            task.id === taskId ? { ...task, ...updates } : task
        );
        setTasks(updatedTasks);
        saveTasks(updatedTasks);
    };

    return {
        tasks,
        currentFocus,
        handleAddTask,
        handleToggleComplete,
        handleSetFocus,
        updateTask
    };
} 