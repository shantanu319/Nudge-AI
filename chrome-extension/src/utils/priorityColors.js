export const getPriorityColor = (priority) => {
    switch (priority) {
        case 'high':
            return '#ff4444'; // Red
        case 'medium':
            return '#ffbb33'; // Yellow
        case 'low':
            return '#00C851'; // Green
        default:
            return '#2BBBAD'; // Default teal
    }
}; 