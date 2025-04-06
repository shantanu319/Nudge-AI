import React, { useState, useEffect } from 'react';

// Helper function to get priority color
function getPriorityColor(priority) {
  if (priority === 'High') {
    return 'hsl(262, 52%, 29%)'; // Darkest purple
  } else if (priority === 'Medium') {
    return 'hsl(262, 52%, 50%)'; // Medium purple
  } else if (priority === 'Low') {
    return 'hsl(262, 52%, 70%)'; // Lightest purple
  }
  return 'hsl(0, 0%, 80%)'; // Default if none selected
}

// Convert a "minutes" string into total seconds
function parseTime(timeString) {
  if (!timeString) return 0;
  const minutes = parseInt(timeString, 10);
  return isNaN(minutes) ? 0 : minutes * 60;
}

// Convert total seconds into "mm:ss" format
function formatTime(totalSeconds) {
  if (!totalSeconds) return '0:00';
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export default function TaskParasite() {
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState('');
  const [newPriority, setNewPriority] = useState(''); // default to empty
  const [newTime, setNewTime] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editPriority, setEditPriority] = useState(''); // default to empty
  const [editTime, setEditTime] = useState('');
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
      
      // Notify background script about task changes
      if (chrome && chrome.runtime) {
        chrome.runtime.sendMessage({
          action: 'updateParasiteTasks',
          tasks: updatedTasks,
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
          currentFocus: taskId,
        });
      }
    }
  };

  // Function to handle adding a new task
  const handleAddTask = () => {
    const trimmed = newTask.trim();
    if (trimmed) {
      const newTaskObject = {
        id: Date.now(),
        title: trimmed,
        priority: newPriority || 'Low',
        completed: false, // newly created tasks are incomplete
        timeLeft: parseTime(newTime),
      };
      const updatedTasks = [...tasks, newTaskObject];
      setTasks(updatedTasks);
      saveTasks(updatedTasks);
      setNewTask('');
      setNewTime('');
      setNewPriority('');
    }
  };

  // Function to mark task as completed (using slider toggle) and delete task
  const handleToggleComplete = (taskId) => {
    const updatedTasks = tasks.filter((t) => t.id !== taskId); // Remove task when checked
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
    setCurrentFocus(currentFocus === taskId ? null : taskId);
    saveCurrentFocus(currentFocus === taskId ? null : taskId);
  };

  // Function to start editing a task
  const startEditing = (task) => {
    setEditingTaskId(task.id);
    setEditTitle(task.title);
    setEditPriority(task.priority || '');
    setEditTime(String(task.timeLeft ? Math.floor(task.timeLeft / 60) : ''));
  };

  // Function to save edited task
  const saveEdit = (taskId) => {
    const updatedTasks = tasks.map((task) =>
      task.id === taskId
        ? {
            ...task,
            title: editTitle,
            priority: editPriority || 'Low',
            timeLeft: parseTime(editTime),
          }
        : task
    );
    setTasks(updatedTasks);
    saveTasks(updatedTasks);
    setEditingTaskId(null);
  };

  const sortedTasks = [...tasks].sort((a, b) => {
    const priorityOrder = { High: 3, Medium: 2, Low: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });

  return (
    <div>
      {/* Add Task */}
      <div style={{ display: 'flex', marginBottom: '15px' }}>
        <input
          type="text"
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          placeholder="Task Title"
          style={{
            flex: 1,
            padding: '8px',
            borderRadius: '4px',
            border: '1px solid #ccc',
            marginRight: '10px',
          }}
        />
        <select
          value={newPriority}
          onChange={(e) => setNewPriority(e.target.value)}
          style={{
            padding: '8px',
            borderRadius: '4px',
            border: '1px solid #ccc',
            marginRight: '10px',
          }}
        >
          <option value="">Select Priority</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>
        <input
          type="text"
          value={newTime}
          onChange={(e) => setNewTime(e.target.value)}
          placeholder="Time Left (minutes)"
          style={{
            padding: '8px',
            borderRadius: '4px',
            border: '1px solid #ccc',
            marginRight: '10px',
          }}
        />
        <button
          onClick={handleAddTask}
          style={{
            padding: '8px 16px',
            backgroundColor: '#4e2a84',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Add Task
        </button>
      </div>

      {/* Focus Task Info (if any) */}
      {currentFocus && (
        <div
          style={{
            backgroundColor: 'rgba(78, 42, 132, 0.2)',
            padding: '10px',
            marginBottom: '15px',
            borderRadius: '8px',
            border: '1px solid rgba(78, 42, 132, 0.5)',
          }}
        >
          <p style={{ color: 'white', margin: 0 }}>
            <strong>Currently Focusing On:</strong>{' '}
            {tasks.find((t) => t.id === currentFocus)?.title}
          </p>
        </div>
      )}

      {/* Task List */}
      {sortedTasks.map((task) => {
        const isEditing = editingTaskId === task.id;
        const circleSize =
          task.priority === 'High'
            ? 70
            : task.priority === 'Medium'
            ? 60
            : 50;

        return (
          <div
            key={task.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '20px',
              border: '1px solid #fff',
              borderRadius: '8px',
              padding: '15px',
              backgroundColor:
                currentFocus === task.id
                  ? 'rgba(78, 42, 132, 0.3)'
                  : 'rgba(255, 255, 255, 0.1)',
              justifyContent: 'space-between',
              maxWidth: '400px',
              margin: '0 auto',
              height: isEditing ? 'auto' : '90px',
            }}
          >
            {/* Circle */}
            <div
              style={{
                width: `${circleSize}px`,
                height: `${circleSize}px`,
                borderRadius: '50%',
                backgroundColor: getPriorityColor(task.priority),
                marginRight: '20px',
              }}
            />

            {/* Normal View (not editing) */}
            {!isEditing && (
              <>
                <div style={{ flex: 1 }}>
                  <strong style={{ color: 'white', fontSize: '1.3em' }}>
                    {task.title}
                  </strong>
                  <br />
                  <span style={{ color: 'white', fontSize: '1.1em' }}>
                    Priority: {task.priority}
                  </span>
                  <br />
                  <span style={{ color: 'white', fontSize: '1.1em' }}>
                    {task.timeLeft > 0
                      ? `Time Left: ${formatTime(task.timeLeft)}`
                      : 'Time Left: Not specified'}
                  </span>
                </div>

                {/* Focus Button */}
                <button
                  onClick={() => handleSetFocus(task.id)}
                  style={{
                    marginRight: '10px',
                    padding: '8px 16px',
                    backgroundColor:
                      currentFocus === task.id ? '#8e5bd4' : '#4e2a84',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  {currentFocus === task.id ? 'Unfocus' : 'Focus'}
                </button>

                {/* "Done?" label + Completion Checkbox */}
                <label
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    marginLeft: '15px',
                    cursor: 'pointer',
                    color: 'white',
                  }}
                >
                  <span style={{ fontSize: '0.8rem', marginBottom: '5px' }}>
                    Done?
                  </span>
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={() => handleToggleComplete(task.id)}
                    style={{ cursor: 'pointer' }}
                  />
                </label>

                {/* Edit Button */}
                <button
                  onClick={() => startEditing(task)}
                  style={{
                    marginLeft: '10px',
                    padding: '8px 16px',
                    backgroundColor: '#4e2a84',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  Edit
                </button>
              </>
            )}

            {/* Edit Mode */}
            {isEditing && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  width: '100%',
                  marginLeft: '20px',
                }}
              >
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  style={{
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #ccc',
                  }}
                />
                <select
                  value={editPriority}
                  onChange={(e) => setEditPriority(e.target.value)}
                  style={{
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #ccc',
                  }}
                >
                  <option value="">Select Priority</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
                <input
                  type="text"
                  value={editTime}
                  onChange={(e) => setEditTime(e.target.value)}
                  placeholder="Time (min)"
                  style={{
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #ccc',
                  }}
                />
                <button
                  onClick={() => saveEdit(task.id)}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#4e2a84',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    alignSelf: 'flex-start',
                  }}
                >
                  Save
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
