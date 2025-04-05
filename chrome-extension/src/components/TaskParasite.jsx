import React, { useEffect, useState } from 'react';

/********************************************************
 * Generate a unique global ID (not shown in UI)
 ********************************************************/
function getGlobalTaskId() {
  return 'task-' + Date.now() + '-' + Math.floor(Math.random() * 100000);
}

/********************************************************
 * Return how many minutes have passed since 00:00 (midnight).
 ********************************************************/
function getMinutesSinceMidnight(dateObj) {
  const hours = dateObj.getHours();
  const minutes = dateObj.getMinutes();
  return hours * 60 + minutes; 
}

/********************************************************
 * We have 1440 minutes in a day (00:00 -> 24:00).
 ********************************************************/
function totalMinutesInDay() {
  return 24 * 60; // 1440
}

/********************************************************
 * Priority numeric for sorting: High > Medium > Low
 ********************************************************/
function priorityValue(p) {
  if (p === 'High') return 3;
  if (p === 'Medium') return 2;
  if (p === 'Low') return 1;
  return 0;
}

/********************************************************
 * Color logic per priority:
 * - High: darkest purple
 * - Medium: medium purple
 * - Low: lightest purple
 ********************************************************/
function getPriorityColor(priority) {
  // Base #4E2A84 => ~hsl(262, 52%, ?)
  if (priority === 'High') {
    return 'hsl(262, 52%, 29%)'; // darkest
  } else if (priority === 'Medium') {
    return 'hsl(262, 52%, 44%)'; // middle
  } else {
    return 'hsl(262, 52%, 59%)'; // lightest
  }
}

/********************************************************
 * Growth Range per Priority:
 *   - High: grows from 60px -> 140px
 *   - Medium: grows from 40px -> 100px
 *   - Low: grows from 20px -> 60px
 ********************************************************/
function getSizeRangeForPriority(priority) {
  switch (priority) {
    case 'High':
      return { min: 60, max: 140 };
    case 'Medium':
      return { min: 40, max: 100 };
    case 'Low':
      return { min: 20, max: 60 };
    default:
      return { min: 20, max: 60 };
  }
}

export default function TaskParasite() {
  // =========== STATE ===========
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [filter, setFilter] = useState('All');

  // Current time (minutes from midnight)
  const [timeNow, setTimeNow] = useState(getMinutesSinceMidnight(new Date()));

  // For editing a task:
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editPriority, setEditPriority] = useState('Medium');

  /********************************************************
   * 1) Update time every minute
   ********************************************************/
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeNow(getMinutesSinceMidnight(new Date()));
    }, 60_000); // update once per minute

    return () => clearInterval(timer);
  }, []);

  /********************************************************
   * 2) Load tasks on mount
   ********************************************************/
  useEffect(() => {
    chrome.storage.local.get(['parasiteTasks'], (res) => {
      if (res.parasiteTasks) {
        setTasks(res.parasiteTasks);
      }
    });
  }, []);

  /********************************************************
   * 3) Save tasks whenever they change
   ********************************************************/
  useEffect(() => {
    chrome.storage.local.set({ parasiteTasks: tasks });
  }, [tasks]);

  /********************************************************
   * 4) Adding a new task
   ********************************************************/
  const handleAddTask = (e) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;

    const newTask = {
      id: Date.now(),
      globalId: getGlobalTaskId(), // not shown in UI
      title: trimmed,
      priority,
    };

    setTasks([...tasks, newTask]);
    setTitle('');
    setPriority('Medium');
  };

  /********************************************************
   * 5) Remove a task
   ********************************************************/
  const handleRemoveTask = (taskId) => {
    setTasks(tasks.filter((t) => t.id !== taskId));
  };

  /********************************************************
   * 6) SORT + FILTER
   ********************************************************/
  const sortedTasks = [...tasks].sort((a, b) => priorityValue(b.priority) - priorityValue(a.priority));
  const displayedTasks = sortedTasks.filter((task) => {
    if (filter === 'All') return true;
    return task.priority === filter;
  });

  /********************************************************
   * 7) Circle size logic
   ********************************************************/
  const totalDayMinutes = totalMinutesInDay(); // 1440
  const dayRatio = Math.min(timeNow / totalDayMinutes, 1); // 0..1

  /********************************************************
   * 8) EDITING LOGIC
   ********************************************************/
  // Start editing a specific task
  const startEditing = (task) => {
    setEditingTaskId(task.id);
    setEditTitle(task.title);
    setEditPriority(task.priority);
  };

  // Save changes
  const saveEdit = (taskId) => {
    const trimmed = editTitle.trim();
    if (!trimmed) {
      // If empty, ignore or remove the task. We'll just do nothing here
      return;
    }

    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, title: trimmed, priority: editPriority } : t
      )
    );
    setEditingTaskId(null);
  };

  const cancelEdit = () => {
    setEditingTaskId(null);
  };

  /********************************************************
   * RENDER
   ********************************************************/
  return (
    <div style={{ marginBottom: '1rem' }}>
      {/* ADD TASK FORM */}
      <form onSubmit={handleAddTask} style={{ marginBottom: '1rem' }}>
        <input
          type="text"
          placeholder="Task..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{ marginRight: '0.5rem' }}
        />
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          style={{ marginRight: '0.5rem' }}
        >
          <option>High</option>
          <option>Medium</option>
          <option>Low</option>
        </select>
        <button type="submit">Add Task</button>
      </form>

      {/* FILTER DROPDOWN */}
      <div style={{ marginBottom: '1rem' }}>
        <label>Filter: </label>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ marginLeft: '0.5rem' }}>
          <option value="All">All</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>
      </div>

      {/* TASK LIST */}
      {displayedTasks.map((task) => {
        // Circle size based on time of day + priority range
        const { min, max } = getSizeRangeForPriority(task.priority);
        const circleSize = min + (max - min) * dayRatio;

        const circleStyle = {
          width: `${circleSize}px`,
          height: `${circleSize}px`,
          borderRadius: '50%',
          marginRight: '0.75rem',
          backgroundColor: getPriorityColor(task.priority),
          transition: 'width 0.5s, height 0.5s',
        };

        const isEditing = editingTaskId === task.id;

        // If editing, show the inline form
        if (isEditing) {
          return (
            <div
              key={task.id}
              style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}
            >
              {/* Circle is based on the "editPriority" if we want it to update live */}
              <div
                style={{
                  ...circleStyle,
                  backgroundColor: getPriorityColor(editPriority),
                }}
              />
              <div style={{ flex: 1 }}>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  style={{ marginBottom: '0.25rem' }}
                />
                <br />
                <select
                  value={editPriority}
                  onChange={(e) => setEditPriority(e.target.value)}
                >
                  <option>High</option>
                  <option>Medium</option>
                  <option>Low</option>
                </select>
              </div>
              <div>
                <button onClick={() => saveEdit(task.id)} style={{ marginRight: '0.5rem' }}>
                  Save
                </button>
                <button onClick={cancelEdit}>Cancel</button>
              </div>
            </div>
          );
        }

        // Otherwise, show normal display
        return (
          <div
            key={task.id}
            style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}
          >
            <div style={circleStyle} />
            <div style={{ flex: 1 }}>
              <strong>{task.title}</strong>
              <br />
              Priority: {task.priority}
            </div>
            <button onClick={() => startEditing(task)} style={{ marginRight: '0.5rem' }}>
              Edit
            </button>
            <button onClick={() => handleRemoveTask(task.id)}>Remove</button>
          </div>
        );
      })}
    </div>
  );
}
