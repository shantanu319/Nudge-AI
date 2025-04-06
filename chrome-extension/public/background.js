import { sendNotification } from './notifications.js';

let currentRules = [];
let settings = {
  interval: 1,  // screenshot interval, in minutes
  threshold: 50, // unproductive threshold (%)
  interventionStyle: 'drill_sergeant' // Default to most aggressive intervention style
};
let isActive = true;

// For screenshots at intervals
let screenshotTimer = null;

// Variables for handling tasks
let userTasks = [];
let currentFocusTask = null;
let parasiteTasks = [];
let currentFocusParasite = null;

// Variables for smart intervention
let recentAnalyses = new Map(); // Store recent analyses by domain
const MAX_HISTORY_SIZE = 20; // Increased to handle more history per domain

// Intervention style thresholds - consecutive unproductive screenshots needed
const INTERVENTION_THRESHOLDS = {
  drill_sergeant: 1,  // Every screenshot
  vigilant_mentor: 2, // Every 2 screenshots
  steady_coach: 4,    // Every 4 screenshots
  patient_guide: 7,   // Every 7 screenshots
  zen_observer: 10    // Every 10 screenshots
};

// Single message listener for all actions
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Received message:', request.action);

  switch (request.action) {
    case 'updateSettings':
      console.log('Updating settings:', request.settings);
      settings = request.settings;
      chrome.storage.local.set({ settings });
      startScreenshotTimer();
      break;

    case 'toggleActive':
      console.log('Toggling active state:', request.isActive);
      isActive = request.isActive;
      chrome.storage.local.set({ isActive });
      startScreenshotTimer();
      break;

    case 'updateTasks':
      userTasks = request.tasks;
      console.log('Tasks updated:', userTasks);
      break;

    case 'updateCurrentFocus':
      currentFocusTask = request.currentFocus;
      console.log('Current focus task updated:', currentFocusTask);
      break;

    case 'updateParasiteTasks':
      parasiteTasks = request.tasks;
      console.log('Parasite tasks updated:', parasiteTasks);
      break;

    case 'updateCurrentFocusParasite':
      currentFocusParasite = request.currentFocus;
      console.log('Current focus parasite task updated:', currentFocusParasite);
      break;
  }
});

// Single initialization block
chrome.storage.local.get([
  'settings',
  'isActive',
  'productivityStats',
  'blockedRules',
  'tasks',
  'currentFocus',
  'parasiteTasks',
  'currentFocusParasite',
  'recentAnalysesByDomain'
], (result) => {
  console.log('Initializing from storage:', result);

  // Load settings with defaults
  settings = {
    interval: 1,
    threshold: 50,
    interventionStyle: 'drill_sergeant',
    ...result.settings
  };

  // Load active state
  isActive = result.isActive ?? true;

  // Initialize or load recent analyses
  if (result.recentAnalysesByDomain) {
    recentAnalyses = new Map(Object.entries(result.recentAnalysesByDomain));
  }

  // Load other state
  if (result.blockedRules) {
    currentRules = result.blockedRules;
    chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: currentRules.map(r => r.id),
      addRules: currentRules
    });
  }

  // Initialize tasks
  userTasks = result.tasks || [];
  currentFocusTask = result.currentFocus || null;
  parasiteTasks = result.parasiteTasks || [];
  currentFocusParasite = result.currentFocusParasite || null;

  // Initialize productivity stats if missing
  if (!result.productivityStats) {
    chrome.storage.local.set({ productivityStats: { productive: 0, unproductive: 0 } });
  }

  // Start timers
  startScreenshotTimer();
  startDomainTrackingTimer();

  console.log('Background script initialized with settings:', settings);
});

/**
 * Determines if a notification should be shown based on intervention style and recent analyses
 * @param {string} currentUrl - The URL of the current tab
 * @returns {boolean} - Whether a notification should be shown
 */
function determineIfShouldNotify(currentUrl) {
  // Ensure settings.interventionStyle exists and is valid
  if (!settings.interventionStyle || !INTERVENTION_THRESHOLDS[settings.interventionStyle]) {
    settings.interventionStyle = 'drill_sergeant';
    chrome.storage.local.set({ settings });
  }

  const threshold = INTERVENTION_THRESHOLDS[settings.interventionStyle] || 1;
  const currentDomain = new URL(currentUrl).hostname;

  // Get domain's analysis history
  const domainAnalyses = recentAnalyses.get(currentDomain) || [];

  // Count total unproductive instances in the recent history
  const unproductiveCount = domainAnalyses.filter(analysis => analysis.unproductive).length;

  // Log the current intervention status
  const styleName = settings.interventionStyle.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
  console.log(`${styleName} mode: ${unproductiveCount}/${threshold} unproductive instances on ${currentDomain}`);

  return unproductiveCount >= threshold;
}

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
  // Clear any existing timer
  if (screenshotTimer) {
    clearInterval(screenshotTimer);
    screenshotTimer = null;
  }

  if (!isActive) {
    console.log('Extension is inactive. Not starting screenshot timer.');
    return;
  }

  const intervalMs = settings.interval * 60 * 1000;
  screenshotTimer = setInterval(captureAndAnalyze, intervalMs);
  console.log(`Screenshot timer started: every ${settings.interval} minute(s).`);

  // Do initial capture
  captureAndAnalyze();
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
  console.log('Starting captureAndAnalyze, isActive:', isActive);

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

    const currentDomain = new URL(tab.url).hostname;
    console.log('Current domain:', currentDomain);

    chrome.tabs.captureVisibleTab(null, { format: 'jpeg', quality: 50 }, async (dataUrl) => {
      if (chrome.runtime.lastError) {
        console.error('Screenshot error:', chrome.runtime.lastError);
        return;
      }

      console.log('Screenshot captured successfully.');

      try {
        // Combine tasks from both sources
        const allTasks = [...userTasks, ...parasiteTasks];
        console.log('Active tasks:', allTasks.filter(task => !task.completed));

        // Prepare task-related data for the analysis
        let taskContext = '';
        const activeTasks = allTasks.filter(task => !task.completed);

        // Check for focus tasks from either source
        const focusedTask = userTasks.find(task => task.id === currentFocusTask) ||
          parasiteTasks.find(task => task.id === currentFocusParasite);

        if (focusedTask) {
          console.log('Current focus task:', focusedTask);
        }

        if (activeTasks.length > 0) {
          // Start with regular tasks
          if (userTasks.filter(task => !task.completed).length > 0) {
            taskContext += `Active tasks:\n${userTasks.filter(task => !task.completed).map(t => `- ${t.title}`).join('\n')}\n\n`;
          }

          // Add parasite tasks with priority
          const parasiteActiveTasks = parasiteTasks.filter(task => !task.completed);
          if (parasiteActiveTasks.length > 0) {
            taskContext += `Active tasks with priority:\n${parasiteActiveTasks.map(t => `- ${t.title} (Priority: ${t.priority})`).join('\n')}\n\n`;
          }

          if (focusedTask) {
            taskContext += `Current focus task: ${focusedTask.title}${focusedTask.priority ? ` (Priority: ${focusedTask.priority})` : ''}\n\n`;
          }
        }

        console.log('Sending analysis request to backend...');
        const response = await fetch('http://localhost:3001/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image: dataUrl,
            url: tab.url,
            title: tab.title,
            threshold: settings.threshold,
            taskContext: taskContext,
            hasTasks: activeTasks.length > 0,
            interventionStyle: settings.interventionStyle
          }),
        });

        if (!response.ok) {
          console.error('Backend returned an error:', response.status, response.statusText);
          return;
        }

        const result = await response.json();
        console.log('Analysis result:', result);

        // When adding new analysis
        const currentAnalysis = {
          timestamp: new Date().getTime(),
          url: tab.url,
          domain: currentDomain,
          unproductive: result.unproductive,
          productivityScore: result.productivityScore,
          message: result.message
        };

        // Update domain's analysis history
        const domainAnalyses = recentAnalyses.get(currentDomain) || [];
        domainAnalyses.unshift(currentAnalysis);

        // Maintain max size per domain
        if (domainAnalyses.length > MAX_HISTORY_SIZE) {
          domainAnalyses.pop();
        }

        recentAnalyses.set(currentDomain, domainAnalyses);

        // Save to storage
        const recentAnalysesByDomain = Object.fromEntries(recentAnalyses);
        chrome.storage.local.set({ recentAnalysesByDomain });

        // Check if should notify
        if (result.unproductive) {
          console.log('Unproductive site detected. Checking if should notify...');
          const shouldNotify = determineIfShouldNotify(tab.url);
          console.log('Should notify:', shouldNotify);

          if (shouldNotify) {
            sendNotification(
              'Distracting Site Detected',
              `You're on a distracting site: ${tab.url}. Would you like to block it?`
            );
            console.log('Notification sent for unproductive site.');
          } else {
            console.log('Unproductive site detected but notification suppressed based on intervention style.');
          }
        } else {
          console.log('Productive site detected.');
        }
      } catch (err) {
        console.error('Error in analysis process:', err);
      }
    });
  } catch (error) {
    console.error('Capture error:', error);
  }
}

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

// Listener for notification clicks (dismiss)
chrome.notifications.onClicked.addListener((id) => {
  chrome.notifications.clear(id); // Dismiss notification
});

// Listener for notification close
chrome.notifications.onClosed.addListener((id) => {
  ACTIVE_NOTIFICATIONS.delete(id); // Cleanup
});

// Unified handler for all notification interactions
const handleInteraction = async (notificationId, actionType) => {
  if (!ACTIVE_NOTIFICATIONS.has(notificationId)) return;

  const context = ACTIVE_NOTIFICATIONS.get(notificationId);
  ACTIVE_NOTIFICATIONS.delete(notificationId);

  // Immediate cleanup
  chrome.notifications.clear(notificationId);
  console.log("ACTION");
  if (actionType === 'block') {
    // Block the website and close the tab
    console.log("BLOCKING");
    try {
      await blockWebsite(context.url);
      chrome.tabs.remove(context.tabId);
    } catch (error) {
      console.error('Error blocking website:', error);
    }
  }
};
