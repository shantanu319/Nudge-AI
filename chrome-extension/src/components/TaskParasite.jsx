import React, { useState, useEffect } from 'react';

// Helper function to get priority color
function getPriorityColor(priority) {
  if (priority === 'High') {
    return 'hsl(262, 52%, 29%)'; // Darkest purple
  } else if (priority === 'Medium') {
    return 'hsl(262, 52%, 50%)'; // Medium purple
  } else {
    return 'hsl(262, 52%, 70%)'; // Lightest purple
  }
}

export default function TaskParasite() {
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState('');
  const [newPriority, setNewPriority] = useState('Medium');
  const [newTime, setNewTime] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editPriority, setEditPriority] = useState('Medium');
  const [editTime, setEditTime] = useState('');

  // Load tasks from chrome storage when the component mounts
  useEffect(() => {
    chrome.storage.local.get('tasks', (result) => {
      if (result.tasks) {
        setTasks(result.tasks); // Set tasks from storage if available
      }
    });
  }, []);

  // Save tasks to chrome storage whenever the tasks change
  useEffect(() => {
    chrome.storage.local.set({ tasks });
  }, [tasks]);

  // Function to handle adding a new task
  const handleAddTask = () => {
    const trimmed = newTask.trim();
    if (!trimmed) {
      setErrorMessage("Task title cannot be empty.");
      return;
    }

    // Validate time
    if (newTime && !/^\d+$/.test(newTime)) {
      setErrorMessage("Please enter a valid positive number for Time Left.");
      return;
    }

    let timeInSeconds = 0;
    if (newTime) {
      const minutes = parseInt(newTime);
      timeInSeconds = minutes * 60;
    }

    const newTaskObject = {
      id: Date.now(),
      title: trimmed,
      priority: newPriority,
      timeLeft: timeInSeconds, // Store time in seconds
      completed: false,
    };

    setTasks((prev) => [...prev, newTaskObject]);
    setNewTask('');
    setNewTime('');
    setErrorMessage('');
  };

  // Function to mark task as completed (using slider toggle) and delete task
  const handleToggleComplete = (taskId) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId)); // Remove task when checked
  };

  // Function to start editing a task
  const startEditing = (task) => {
    setEditingTaskId(task.id);
    setEditTitle(task.title);
    setEditPriority(task.priority);
    setEditTime(formatTime(task.timeLeft));
  };

  // Function to save edited task
  const saveEdit = (taskId) => {
    const updatedTasks = tasks.map((task) =>
      task.id === taskId
        ? { ...task, title: editTitle, priority: editPriority, timeLeft: parseTime(editTime) }
        : task
    );
    setTasks(updatedTasks);
    setEditingTaskId(null); // Close edit mode
  };

  // Format time (seconds) into "mm:ss"
  const formatTime = (timeInSeconds) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = timeInSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  // Convert "mm:ss" string into seconds
  const parseTime = (timeString) => {
    const [minutes] = timeString.split(':').map((num) => parseInt(num));
    return minutes * 60;
  };

  // Countdown logic to decrement time left
  useEffect(() => {
    const interval = setInterval(() => {
      setTasks((prevTasks) => {
        return prevTasks.map((task) => {
          if (task.timeLeft > 0) {
            return { ...task, timeLeft: task.timeLeft - 1 };
          }
          return task;
        });
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

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

      {errorMessage && (
        <div style={{ color: 'red', marginBottom: '15px' }}>
          <strong>{errorMessage}</strong>
        </div>
      )}

      {/* Task List */}
      {sortedTasks.map((task) => {
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
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              justifyContent: 'flex-start',
              maxWidth: '450px',
              margin: '0 auto',
              height: '90px', // Fixed height to align text properly
            }}
          >
            {/* Circle */}
            <div
              style={{
                width: `${circleSize}px`,
                height: `${circleSize}px`,
                borderRadius: '50%',
                backgroundColor: getPriorityColor(task.priority),
                marginRight: '20px', // Adjust margin for consistent positioning
              }}
            />

            {/* Task Title, Priority, Time Left */}
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

            {/* Completion Toggle (Checkbox) */}
            <input
              type="checkbox"
              checked={task.completed}
              onChange={() => handleToggleComplete(task.id)} // Delete task when checked
              style={{ marginLeft: '15px', cursor: 'pointer' }}
            />

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

            {/* Edit Form */}
            {editingTaskId === task.id && (
              <div style={{ marginLeft: '20px' }}>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  style={{
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #ccc',
                    marginBottom: '10px',
                  }}
                />
                <select
                  value={editPriority}
                  onChange={(e) => setEditPriority(e.target.value)}
                  style={{
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #ccc',
                    marginRight: '10px',
                  }}
                >
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
                <input
                  type="text"
                  value={editTime}
                  onChange={(e) => setEditTime(e.target.value)}
                  style={{
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #ccc',
                    marginBottom: '10px',
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
