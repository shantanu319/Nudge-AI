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

export default function TaskItem({ task, isFocused, onToggleComplete, onSetFocus, onUpdateTask }) {
    const [isEditing, setIsEditing] = useState(false);
    const [editTitle, setEditTitle] = useState(task.title);
    const [editPriority, setEditPriority] = useState(task.priority);

    const circleSize = task.priority === 'High' ? 70 : task.priority === 'Medium' ? 60 : 50;

    const handleSaveEdit = () => {
        onUpdateTask(task.id, {
            title: editTitle,
            priority: editPriority
        });
        setIsEditing(false);
    };

    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '20px',
                border: '1px solid #fff',
                borderRadius: '8px',
                padding: '15px',
                backgroundColor: isFocused ? 'rgba(78, 42, 132, 0.3)' : 'rgba(255, 255, 255, 0.1)',
            }}
        >
            {/* Priority Circle */}
            <div
                style={{
                    width: circleSize,
                    height: circleSize,
                    borderRadius: '50%',
                    backgroundColor: getPriorityColor(task.priority),
                    marginRight: '15px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 'bold',
                }}
            >
                {task.priority[0]}
            </div>

            {/* Task Content */}
            <div style={{ flex: 1 }}>
                {isEditing ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
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
                            <option value="High">High</option>
                            <option value="Medium">Medium</option>
                            <option value="Low">Low</option>
                        </select>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                onClick={handleSaveEdit}
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
                            <button
                                onClick={() => setIsEditing(false)}
                                style={{
                                    padding: '8px 16px',
                                    backgroundColor: '#666',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                }}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        <h3 style={{ margin: '0 0 5px 0', color: 'white' }}>{task.title}</h3>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                onClick={() => onSetFocus(task.id)}
                                style={{
                                    padding: '6px 12px',
                                    backgroundColor: isFocused ? '#4e2a84' : 'transparent',
                                    color: 'white',
                                    border: '1px solid #4e2a84',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                }}
                            >
                                {isFocused ? 'Unfocus' : 'Focus'}
                            </button>
                            <button
                                onClick={() => setIsEditing(true)}
                                style={{
                                    padding: '6px 12px',
                                    backgroundColor: 'transparent',
                                    color: 'white',
                                    border: '1px solid #4e2a84',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                }}
                            >
                                Edit
                            </button>
                        </div>
                    </>
                )}
            </div>

            {/* Complete Toggle */}
            <label
                style={{
                    position: 'relative',
                    display: 'inline-block',
                    width: '60px',
                    height: '34px',
                }}
            >
                <input
                    type="checkbox"
                    checked={false}
                    onChange={() => onToggleComplete(task.id)}
                    style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span
                    style={{
                        position: 'absolute',
                        cursor: 'pointer',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: '#ccc',
                        transition: '.4s',
                        borderRadius: '34px',
                    }}
                >
                    <span
                        style={{
                            position: 'absolute',
                            content: '""',
                            height: '26px',
                            width: '26px',
                            left: '4px',
                            bottom: '4px',
                            backgroundColor: 'white',
                            transition: '.4s',
                            borderRadius: '50%',
                        }}
                    />
                </span>
            </label>
        </div>
    );
} 