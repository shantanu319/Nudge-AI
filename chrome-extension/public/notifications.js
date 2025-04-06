// notifications.js - Final Working Solution
import { blockWebsite } from './blockUtils.js';

const ACTIVE_NOTIFICATIONS = new Map();

export function sendNotification(title, message) {
    chrome.windows.getCurrent({ populate: true }, (window) => {
        const tab = window.tabs.find(t => t.active);
        if (!tab) return;

        const notificationId = `distract-notif-${Date.now()}-${Math.random()}`;
        const targetUrl = new URL(tab.url).hostname;

        // Store context before creation
        ACTIVE_NOTIFICATIONS.set(notificationId, {
            url: targetUrl,
            tabId: tab.id,
            windowId: window.id
        });

        chrome.notifications.create(notificationId, {
            type: 'basic',
            iconUrl: "icon.jpg",
            title,
            message,
            buttons: [{ title: 'Block' }],
        }, () => {
            if (chrome.runtime.lastError) {
                console.error('Notification failed:', chrome.runtime.lastError);
                ACTIVE_NOTIFICATIONS.delete(notificationId);
            }
        });
    });
}
// Unified handler for all notification interactions
const handleInteraction = (notificationId, actionType) => {
    if (!ACTIVE_NOTIFICATIONS.has(notificationId)) return;

    const context = ACTIVE_NOTIFICATIONS.get(notificationId);
    ACTIVE_NOTIFICATIONS.delete(notificationId);

    // Immediate cleanup
    chrome.notifications.clear(notificationId);
    console.log("ACTION");
    if (actionType === 'block') {
        // Block the website and close the tab
        console.log("BLOCKING");
        blockWebsite(context.url);
        chrome.tabs.remove(context.tabId);
    }
};

// Listener for button clicks
chrome.notifications.onButtonClicked.addListener((id, btnIdx) => {
    console.log("click!");
    if (btnIdx === 0) {
        handleInteraction(id, 'block'); // Block button
    }
});

// Listener for notification clicks (dismiss)
chrome.notifications.onClicked.addListener((id) => {
    chrome.notifications.clear(id); // Dismiss notification
});

// Listener for notification close
chrome.notifications.onClosed.addListener((id) => {
    ACTIVE_NOTIFICATIONS.delete(id); // Cleanup
});
