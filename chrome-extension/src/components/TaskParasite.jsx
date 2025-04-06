import React, { useState } from 'react';


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
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editPriority, setEditPriority] = useState('Medium');


  // Function to handle adding a new task
  const handleAddTask = () => {
    const trimmed = newTask.trim();
    if (trimmed) {
      const newTaskObject = {
        id: Date.now(),
        title: trimmed,
        priority: newPriority,
        completed: false, // newly created tasks are incomplete
      };
      setTasks((prev) => [...prev, newTaskObject]);
      setNewTask('');
    }
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
  };


  // Function to save edited task
  const saveEdit = (taskId) => {
    const updatedTasks = tasks.map((task) =>
      task.id === taskId
        ? { ...task, title: editTitle, priority: editPriority }
        : task
    );
    setTasks(updatedTasks);
    setEditingTaskId(null); // Close edit mode
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
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>
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


      {/* Task List */}
      {sortedTasks.map((task) => {
        const circleSize =
          task.priority === 'High'
            ? 60
            : task.priority === 'Medium'
            ? 50
            : 40;
        return (
          <div
            key={task.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '20px', // Added margin between task cards
              border: '1px solid #fff',
              borderRadius: '8px',
              padding: '15px',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              justifyContent: 'space-between',
              maxWidth: '400px',
              margin: '0 auto',
            }}
          >
            {/* Circle */}
            <div
              style={{
                width: `${circleSize}px`,
                height: `${circleSize}px`,
                borderRadius: '50%',
                backgroundColor: getPriorityColor(task.priority),
                marginRight: '15px',
              }}
            />


            {/* Task Title and Priority */}
            <div style={{ flex: 1 }}>
              <strong style={{ color: 'white', fontSize: '1.1em' }}>
                {task.title}
              </strong>
              <br />
              <span style={{ color: 'white', fontSize: '1em' }}>
                Priority: {task.priority}
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
