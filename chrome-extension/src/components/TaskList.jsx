import React, { useState, useEffect } from 'react';

const TaskList = () => {
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState('');
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
  const handleAddTask = () => {
    if (newTask.trim() === '') return;
    
    const newTaskItem = {
      id: Date.now(),
      title: newTask.trim(),
      completed: false,
      created: new Date().toISOString()
    };
    
    const updatedTasks = [...tasks, newTaskItem];
    setTasks(updatedTasks);
    saveTasks(updatedTasks);
    setNewTask('');
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
  const handleSetFocus = (taskId) => {
    setCurrentFocus(currentFocus === taskId ? null : taskId);
    saveCurrentFocus(currentFocus === taskId ? null : taskId);
  };

  return (
    <div className="task-list">
      <div className="mb-4">
        <div className="flex">
          <input
            type="text"
            className="form-control flex-1 mr-2"
            placeholder="Add a new task..."
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddTask()}
          />
          <button
            className="btn btn-primary"
            onClick={handleAddTask}
          >
            Add
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-4">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-indigo-500"></div>
          <p className="mt-2 text-gray-600">Loading tasks...</p>
        </div>
      ) : tasks.length === 0 ? (
        <div className="empty-state p-4 bg-gray-50 rounded-lg text-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <h3 className="font-medium text-gray-800 mb-1">No Tasks Yet</h3>
          <p className="text-sm text-gray-500">Add tasks to keep track of your work</p>
        </div>
      ) : (
        <div className="task-items space-y-3">
          {tasks.map(task => (
            <div 
              key={task.id} 
              className={`task-item p-3 rounded-lg border ${currentFocus === task.id ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-gray-200'}`}
            >
              <div className="flex items-center">
                <input
                  type="checkbox"
                  className="mr-3 h-5 w-5 text-indigo-600"
                  checked={task.completed}
                  onChange={() => toggleTaskCompletion(task.id)}
                />
                <span className={`flex-1 ${task.completed ? 'line-through text-gray-500' : 'text-gray-800'}`}>
                  {task.title}
                </span>
                
                <button
                  className={`btn btn-sm mr-2 ${currentFocus === task.id ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => handleSetFocus(task.id)}
                >
                  {currentFocus === task.id ? 'Focused' : 'Focus'}
                </button>
                
                <button
                  className="btn btn-sm btn-outline text-red-500"
                  onClick={() => removeTask(task.id)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
              
              {currentFocus === task.id && (
                <div className="mt-2 text-sm text-indigo-700 bg-indigo-50 p-2 rounded-md">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline-block mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Currently focusing on this task
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {currentFocus && (
        <div className="mt-4 p-3 bg-indigo-100 rounded-lg border border-indigo-200">
          <h3 className="font-medium text-indigo-800 mb-1">Current Focus</h3>
          <p className="text-indigo-700">
            {tasks.find(t => t.id === currentFocus)?.title}
          </p>
        </div>
      )}
    </div>
  );
};

export default TaskList; 