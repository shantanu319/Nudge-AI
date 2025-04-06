import { sendNotification } from './notifications.js';

let currentRules = [];
let settings = {
  interval: 1,  // screenshot interval, in minutes
  threshold: 50 // unproductive threshold (%)
};
let isActive = true;

// For screenshots at intervals
let screenshotTimer = null;

// Variables for handling tasks
let userTasks = [];
let currentFocusTask = null;
let parasiteTasks = [];
let currentFocusParasite = null;

// Message handling
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Dynamic website blocking
  if (request.action === 'updateBlockedSites') {
    const removeIds = currentRules.map(rule => rule.id);

    chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: removeIds,
      addRules: request.rules
    }, () => {
      currentRules = request.rules;
      chrome.storage.local.set({ blockedRules: request.rules });
    });
  }

  // Productivity features
  if (request.action === 'updateSettings') {
    settings = request.settings;
    startScreenshotTimer();
  } else if (request.action === 'toggleActive') {
    isActive = request.isActive;
    startScreenshotTimer();
  } else if (request.action === 'updateTasks') {
    userTasks = request.tasks;
    console.log('Tasks updated:', userTasks);
  } else if (request.action === 'updateCurrentFocus') {
    currentFocusTask = request.currentFocus;
    console.log('Current focus task updated:', currentFocusTask);
  } else if (request.action === 'updateParasiteTasks') {
    parasiteTasks = request.tasks;
    console.log('Parasite tasks updated:', parasiteTasks);
  } else if (request.action === 'updateCurrentFocusParasite') {
    currentFocusParasite = request.currentFocus;
    console.log('Current focus parasite task updated:', currentFocusParasite);
  }
});

// Initialization
chrome.storage.local.get([
  'settings',
  'isActive',
  'productivityStats',
  'blockedRules',
  'tasks',
  'currentFocus',
  'parasiteTasks',
  'currentFocusParasite'
], (result) => {
  // Load settings
  settings = result.settings || settings;
  isActive = result.isActive ?? isActive;

  // Initialize stats
  if (!result.productivityStats) {
    chrome.storage.local.set({ productivityStats: { productive: 0, unproductive: 0 } });
  }

  // Restore blocked sites
  if (result.blockedRules) {
    currentRules = result.blockedRules;
    chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: currentRules.map(r => r.id),
      addRules: currentRules
    });
  }

  // Initialize tasks data from storage
  if (result.tasks) {
    userTasks = result.tasks;
  }
  if (result.currentFocus) {
    currentFocusTask = result.currentFocus;
  }

  // Initialize parasite tasks
  if (result.parasiteTasks) {
    parasiteTasks = result.parasiteTasks;
  }
  if (result.currentFocusParasite) {
    currentFocusParasite = result.currentFocusParasite;
  }

  startScreenshotTimer();
});

// Timer management
// For domain-time tracking:
let timeSpent = {};         // { 'www.example.com': totalMs, ... }
let currentDomain = null;   // The domain we're currently on
let domainStartTime = null; // Timestamp (ms) when we started currentDomain

/********************************************************
 * 2) INITIALIZE FROM CHROME STORAGE
 ********************************************************/
chrome.storage.local.get(
  ['settings', 'isActive', 'productivityStats', 'timeSpent'],
  (result) => {
    // Load settings or create defaults
    if (result.settings) {
      settings = result.settings;
    } else {
      chrome.storage.local.set({ settings });
    }

    // Load or default the active state
    if (result.isActive !== undefined) {
      isActive = result.isActive;
    } else {
      chrome.storage.local.set({ isActive });
    }

    // Initialize productivityStats if missing
    if (!result.productivityStats) {
      chrome.storage.local.set({
        productivityStats: { productive: 0, unproductive: 0 },
      });
    }

    // Load or initialize timeSpent
    if (result.timeSpent) {
      timeSpent = result.timeSpent;
    } else {
      timeSpent = {};
      chrome.storage.local.set({ timeSpent });
    }

    // Start the periodic screenshot timer
    startScreenshotTimer();

    // Start the "real-time" domain usage tracking (1s interval)
    startDomainTrackingTimer();
  }
);

/********************************************************
 * 3) PERIODIC SCREENSHOT CAPTURE (EVERY N MINUTES)
 ********************************************************/
function startScreenshotTimer() {
  // Clear existing timer if any
  if (screenshotTimer) {
    clearInterval(screenshotTimer);
  }
  if (!isActive) {
    console.log('Extension is inactive. Not starting screenshot timer.');
    return;
  }

  const intervalMs = settings.interval * 60 * 1000;
  screenshotTimer = setInterval(captureAndAnalyze, intervalMs);
  console.log(`Screenshot timer started: every ${settings.interval} minute(s).`);
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'updateSettings') {
    settings = message.settings;
    console.log('Settings updated:', settings);
    startScreenshotTimer(); // Restart timer with new settings
  } else if (message.action === 'toggleActive') {
    isActive = message.isActive;
    console.log('Active state changed:', isActive);
    startScreenshotTimer(); // Start or stop timer based on active state
  } else if (message.action === 'updateTasks') {
    userTasks = message.tasks;
    console.log('Tasks updated:', userTasks);
  } else if (message.action === 'updateCurrentFocus') {
    currentFocusTask = message.currentFocus;
    console.log('Current focus task updated:', currentFocusTask);
  }
});

async function captureAndAnalyze() {
  if (!isActive) {
    console.log('Extension is inactive. Skipping capture and analysis.');
    return;
  }

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    console.log('Active tab:', tab);

    if (!tab || tab.url.startsWith('chrome://')) {
      console.log('No valid tab or tab is a Chrome internal page. Skipping.');
      return;
    }

    chrome.tabs.captureVisibleTab(null, { format: 'jpeg', quality: 50 }, async (dataUrl) => {
      if (chrome.runtime.lastError) {
        console.error('Screenshot error:', chrome.runtime.lastError);
        return;
      }

      console.log('Screenshot captured successfully.');

      try {
        // Combine tasks from both sources
        const allTasks = [...userTasks, ...parasiteTasks];

        // Prepare task-related data for the analysis
        let taskContext = '';
        const activeTasks = allTasks.filter(task => !task.completed);

        // Check for focus tasks from either source
        const focusedTask = userTasks.find(task => task.id === currentFocusTask) ||
          parasiteTasks.find(task => task.id === currentFocusParasite);

        // Format parasite tasks with priority info
        const parasiteActiveTasks = parasiteTasks.filter(task => !task.completed);

        if (activeTasks.length > 0) {
          // Start with regular tasks
          if (userTasks.filter(task => !task.completed).length > 0) {
            taskContext += `Active tasks:\n${userTasks.filter(task => !task.completed).map(t => `- ${t.title}`).join('\n')}\n\n`;
          }

          // Add parasite tasks with priority
          if (parasiteActiveTasks.length > 0) {
            taskContext += `Active tasks with priority:\n${parasiteActiveTasks.map(t => `- ${t.title} (Priority: ${t.priority})`).join('\n')}\n\n`;
          }

          if (focusedTask) {
            taskContext += `Current focus task: ${focusedTask.title}${focusedTask.priority ? ` (Priority: ${focusedTask.priority})` : ''}\n\n`;
          }

          taskContext += `When analyzing the screenshot, determine if the content is relevant to these tasks, especially the focus task if present.\n`;
          taskContext += `Higher priority tasks should be weighted more heavily in your analysis.\n`;
        }

        const response = await fetch('http://localhost:3001/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image: dataUrl,
            url: tab.url,
            title: tab.title,
            threshold: settings.threshold,
            taskContext: taskContext,
            hasTasks: activeTasks.length > 0
          }),
        });

        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            // Authentication error - token might be expired
            console.error('Authentication error:', response.status);
            chrome.storage.local.remove('auth0_token', () => {
              console.log('Expired token removed');
            });
            chrome.notifications.create('', {
              title: 'Authentication Error',
              message: 'Please log in again to continue using Productivity Nudge',
              iconUrl: 'icon48.png',
              type: 'basic'
            });
            return;
          }

          // Handle other API errors
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`API error: ${response.status} - ${errorData.error || 'Unknown error'}`);
        }

        console.log('Response received from backend:', response);

        if (!response.ok) {
          console.error('Backend returned an error:', response.status, response.statusText);
          return;
        }

        const result = await response.json();
        console.log('Analysis result:', result);

        // Update productivity stats
        chrome.storage.local.get(['productivityStats'], (data) => {
          const stats = data.productivityStats || { productive: 0, unproductive: 0 };
          console.log('Current stats:', stats);

          if (result.unproductive) {
            stats.unproductive++;
            console.log('Unproductive site detected. Updating stats.');

            // Send notification
            sendNotification(
              'Distracting Site Detected',
              `You're on a distracting site: ${tab.url}. Would you like to block it?`,
              [
                { title: 'Block' }
              ]
            );

            console.log('Notification sent for unproductive site.');
          } else {
            stats.productive++;
            console.log('Productive site detected. Updating stats.');
          }

          chrome.storage.local.set({ productivityStats: stats });
        });
      } catch (err) {
        console.error('Error sending screenshot to backend:', err.message);
      }
    });
  } catch (error) {
    console.error('Capture error:', error);
  }
}
// Initial capture
setTimeout(captureAndAnalyze, 5000);

/********************************************************
 * 4) REAL-TIME DOMAIN USAGE TRACKING (1-SECOND INTERVAL)
 ********************************************************/
function startDomainTrackingTimer() {
  // Every second, increment time for the *current* domain
  setInterval(() => {
    if (!isActive || !currentDomain) return;

    const now = Date.now();
    const elapsed = now - domainStartTime; // ms
    timeSpent[currentDomain] = (timeSpent[currentDomain] || 0) + elapsed;

    // Reset the start time to "now" so next second picks up from here
    domainStartTime = now;

    // Save to storage so the popup can see up-to-date data
    chrome.storage.local.set({ timeSpent });
  }, 1000);
}

/********************************************************
 * 5) DETECT DOMAIN CHANGES
 ********************************************************/
// Whenever user switches tabs
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  // We finalize the old domain's partial second right now
  finalizeCurrentDomain();

  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    const domain = getDomain(tab.url);
    if (domain) {
      startTimingDomain(domain);
    }
  } catch (err) {
    console.error('Error in onActivated:', err);
  }
});

// Whenever user navigates within the same tab
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url) {
    finalizeCurrentDomain();
    const domain = getDomain(changeInfo.url);
    if (domain) {
      startTimingDomain(domain);
    }
  }
});

/** Helper to parse domain name from URL */
function getDomain(urlString) {
  try {
    return new URL(urlString).hostname; // e.g. "www.reddit.com"
  } catch {
    return null;
  }
}

/** Called right before switching to another domain. */
function finalizeCurrentDomain() {
  if (!currentDomain || domainStartTime === null) {
    return;
  }
  // The last partial second
  const now = Date.now();
  const elapsed = now - domainStartTime;
  timeSpent[currentDomain] = (timeSpent[currentDomain] || 0) + elapsed;

  // Reset
  currentDomain = null;
  domainStartTime = null;
  chrome.storage.local.set({ timeSpent });
}

/** Called whenever a new domain starts. */
function startTimingDomain(domain) {
  currentDomain = domain;
  domainStartTime = Date.now();
}

/********************************************************
 * 6) LISTEN FOR MESSAGES FROM POPUP (SETTINGS, ETC.)
 ********************************************************/
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'updateSettings') {
    // Update local settings + restart screenshot timer
    settings = message.settings;
    chrome.storage.local.set({ settings });
    startScreenshotTimer();
  } else if (message.action === 'toggleActive') {
    // Pause or resume extension
    isActive = message.isActive;
    chrome.storage.local.set({ isActive });
    if (!isActive) {
      finalizeCurrentDomain();
      // stop screenshot timer
      if (screenshotTimer) clearInterval(screenshotTimer);
      console.log('Extension paused, domain tracking & screenshots stopped.');
    } else {
      startTimingDomain(currentDomain); // If you want to resume same domain
      startScreenshotTimer();
    }
  }
});
