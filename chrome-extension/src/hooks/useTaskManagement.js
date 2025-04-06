import { useEffect, useState } from 'react';

export function useTaskManagement() {
    const [tasks, setTasks] = useState([]);
    const [currentFocus, setCurrentFocus] = useState(null);
    const [focusTimer, setFocusTimer] = useState(null); // Timer in minutes
    const [secondsRemaining, setSecondsRemaining] = useState(0); // Seconds countdown
    const [timerRunning, setTimerRunning] = useState(false);

    // Load tasks from Chrome storage on component mount
    useEffect(() => {
        if (chrome && chrome.storage) {
            chrome.storage.local.get(['parasiteTasks', 'currentFocusParasite', 'focusTimer', 'secondsRemaining', 'timerRunning', 'timerEndTime'], (result) => {
                if (result.parasiteTasks) {
                    setTasks(result.parasiteTasks);
                }
                if (result.currentFocusParasite) {
                    setCurrentFocus(result.currentFocusParasite);
                }
                if (result.focusTimer) {
                    setFocusTimer(result.focusTimer);
                }
                if (result.secondsRemaining) {
                    setSecondsRemaining(result.secondsRemaining);
                }
                if (result.timerRunning) {
                    setTimerRunning(result.timerRunning);
                    
                    // If timer was running, calculate remaining time
                    if (result.timerEndTime && result.timerRunning) {
                        const now = new Date().getTime();
                        const endTime = result.timerEndTime;
                        
                        if (now < endTime) {
                            // Timer still has time left
                            const remainingMs = endTime - now;
                            const secondsLeft = Math.floor(remainingMs / 1000);
                            const minutesLeft = Math.floor(secondsLeft / 60);
                            
                            setFocusTimer(minutesLeft);
                            setSecondsRemaining(secondsLeft % 60);
                            
                            // Restart the countdown
                            startTimerCountdown(minutesLeft, secondsLeft % 60);
                        } else {
                            // Timer expired
                            setTimerRunning(false);
                            saveBooleanValue('timerRunning', false);
                            setFocusTimer(0);
                            setSecondsRemaining(0);
                            saveValue('focusTimer', 0);
                            saveValue('secondsRemaining', 0);
                        }
                    }
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
                    if (changes.focusTimer) {
                        setFocusTimer(changes.focusTimer.newValue);
                    }
                    if (changes.secondsRemaining) {
                        setSecondsRemaining(changes.secondsRemaining.newValue);
                    }
                    if (changes.timerRunning) {
                        setTimerRunning(changes.timerRunning.newValue);
                    }
                }
            };

            chrome.storage.onChanged.addListener(handleStorageChange);
            return () => {
                chrome.storage.onChanged.removeListener(handleStorageChange);
            };
        }
    }, []);

    // Timer countdown effect - every second
    useEffect(() => {
        let interval = null;
        
        if (timerRunning && (focusTimer > 0 || secondsRemaining > 0)) {
            interval = setInterval(() => {
                if (secondsRemaining > 0) {
                    // Decrement seconds
                    setSecondsRemaining(prevSeconds => {
                        const newSeconds = prevSeconds - 1;
                        saveValue('secondsRemaining', newSeconds);
                        return newSeconds;
                    });
                } else if (focusTimer > 0) {
                    // Decrement minutes and reset seconds
                    setFocusTimer(prevTimer => {
                        const newTimer = prevTimer - 1;
                        saveValue('focusTimer', newTimer);
                        return newTimer;
                    });
                    setSecondsRemaining(59);
                    saveValue('secondsRemaining', 59);
                } else {
                    // Timer complete
                    clearInterval(interval);
                    setTimerRunning(false);
                    saveBooleanValue('timerRunning', false);
                }
            }, 1000); // Update every second
        } else if (focusTimer === 0 && secondsRemaining === 0 && timerRunning) {
            // Timer has ended
            setTimerRunning(false);
            saveBooleanValue('timerRunning', false);
        }
        
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [timerRunning, focusTimer, secondsRemaining]);

    // Helper to save boolean values
    const saveBooleanValue = (key, value) => {
        if (chrome && chrome.storage) {
            chrome.storage.local.set({ [key]: value });
        }
    };
    
    // Helper to save values
    const saveValue = (key, value) => {
        if (chrome && chrome.storage) {
            chrome.storage.local.set({ [key]: value });
        }
    };

    // Start timer countdown
    const startTimerCountdown = (minutes, seconds = 0) => {
        setTimerRunning(true);
        saveBooleanValue('timerRunning', true);
        setSecondsRemaining(seconds);
        saveValue('secondsRemaining', seconds);
        
        // Calculate end time and save it
        const totalSeconds = minutes * 60 + seconds;
        const endTime = new Date().getTime() + (totalSeconds * 1000);
        if (chrome && chrome.storage) {
            chrome.storage.local.set({ timerEndTime: endTime });
        }
    };

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

    // Save focus timer to Chrome storage
    const saveFocusTimer = (timer) => {
        if (chrome && chrome.storage) {
            chrome.storage.local.set({ focusTimer: timer });
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

    // Function to mark task as completed
    const handleToggleComplete = (taskId) => {
        const updatedTasks = tasks.map(task => 
            task.id === taskId ? { ...task, completed: !task.completed } : task
        );
        setTasks(updatedTasks);
        saveTasks(updatedTasks);

        // If completed task was the current focus, clear the focus
        if (currentFocus === taskId) {
            setCurrentFocus(null);
            saveCurrentFocus(null);
            setFocusTimer(null);
            saveFocusTimer(null);
            setSecondsRemaining(0);
            saveValue('secondsRemaining', 0);
            setTimerRunning(false);
            saveBooleanValue('timerRunning', false);
        }
    };

    const handleRemoveTask = (taskId) => {
        const updatedTasks = tasks.filter((t) => t.id !== taskId);
        setTasks(updatedTasks);
        saveTasks(updatedTasks);

        // Also clear focus if needed
        if (currentFocus === taskId) {
            setCurrentFocus(null);
            saveCurrentFocus(null);
            setFocusTimer(null);
            saveFocusTimer(null);
            setSecondsRemaining(0);
            saveValue('secondsRemaining', 0);
            setTimerRunning(false);
            saveBooleanValue('timerRunning', false);
        }
    };

    // Function to set focus on a task with optional timer
    const handleSetFocus = (taskId, timer = null) => {
        if (currentFocus === taskId && !timer) {
            // Clear focus if clicking on already focused task
            setCurrentFocus(null);
            saveCurrentFocus(null);
            setFocusTimer(null);
            saveFocusTimer(null);
            setSecondsRemaining(0);
            saveValue('secondsRemaining', 0);
            setTimerRunning(false);
            saveBooleanValue('timerRunning', false);
        } else {
            // Set new focus
            setCurrentFocus(taskId);
            saveCurrentFocus(taskId);
            
            if (timer) {
                setFocusTimer(timer);
                saveFocusTimer(timer);
                setSecondsRemaining(0);
                saveValue('secondsRemaining', 0);
                // Start countdown if timer is provided
                startTimerCountdown(timer, 0);
            } else {
                setFocusTimer(null);
                saveFocusTimer(null);
                setSecondsRemaining(0);
                saveValue('secondsRemaining', 0);
                setTimerRunning(false);
                saveBooleanValue('timerRunning', false);
            }
        }
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
        focusTimer,
        secondsRemaining,
        timerRunning,
        handleAddTask,
        handleToggleComplete,
        handleRemoveTask,
        handleSetFocus,
        updateTask
    };
} 