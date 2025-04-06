// Background script for the extension
console.log('Nudge background script loaded');

// Listen for installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed');
});

// Add any background script functionality here 