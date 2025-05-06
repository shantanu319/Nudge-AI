// Content script for the extension
console.log('Nudge content script loaded');

// Listener for messages from background script or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('📨 Content script received message:', request.action);
  
  // Handle messages here if needed
  sendResponse({ status: 'received' });
  return true;
});

// Initialize content script
document.addEventListener('DOMContentLoaded', () => {
  // Initialize content script
}); 