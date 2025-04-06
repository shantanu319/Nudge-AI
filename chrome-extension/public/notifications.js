// filepath: /Users/Lucas/Desktop/Dev/wildhacks2025/chrome-extension/public/notifications.js
import { blockWebsite } from './blockUtils.js';

/**
 * Sends a notification to the user.
 * @param {string} title - The title of the notification.
 * @param {string} message - The message body of the notification.
 * @param {Array} [buttons] - Optional action buttons for the notification.
 * @param {Function} [callback] - Optional callback for when the notification is created.
 */
export function sendNotification(title, message, buttons = [], callback) {
    chrome.notifications.create('distracting-site', {
        title,
        message,
        type: 'basic',
        iconUrl: 'icon.jpg',
        buttons,
    }, (notificationId) => {
        if (chrome.runtime.lastError) {
            console.error('Notification error:', chrome.runtime.lastError.message);
        } else {
            console.log('Notification created with ID:', notificationId);
        }
        if (callback) callback(notificationId);
    });
}

/**
 * Handles notification button clicks.
 */
export function handleNotificationClicks() {
    chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
        if (notificationId === 'distracting-site') {
            console.log(`Button clicked: ${buttonIndex}`);

            // Clear the notification immediately
            chrome.notifications.clear(notificationId);

            if (buttonIndex === 0) { // "Block" button clicked
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    if (tabs.length > 0) {
                        const url = new URL(tabs[0].url).hostname;
                        blockWebsite(url); // Call the blockWebsite function
                        console.log(`Blocked site: ${url}`);
                    } else {
                        console.error('No active tab found to block.');
                    }
                });
            }
        }
    });

    chrome.notifications.onClicked.addListener((notificationId) => {
        console.log(`Notification clicked: ${notificationId}`);
        chrome.notifications.clear(notificationId); // Clear notification on click
    });

    chrome.notifications.onClosed.addListener((notificationId, byUser) => {
        console.log(`Notification closed: ${notificationId}, by user: ${byUser}`);
    });
}
