import React from 'react';

export default function FocusIndicator({ focusedTask }) {
    if (!focusedTask) return null;

    return (
        <div
            style={{
                backgroundColor: 'rgba(78, 42, 132, 0.2)',
                padding: '10px',
                marginBottom: '15px',
                borderRadius: '8px',
                border: '1px solid rgba(78, 42, 132, 0.5)'
            }}
        >
            <p style={{ color: 'white', margin: 0 }}>
                <strong>Currently Focusing On:</strong> {focusedTask.title}
            </p>
        </div>
    );
} 