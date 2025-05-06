// Service worker initialization
self.window = self;
self.document = null;

// Shared state
const ACTIVE_NOTIFICATIONS = new Map();
const GEMINI_CACHE = new Map();
const CACHE_DURATION = 12 * 60 * 60 * 1000; // 12 hours in ms

// Notifications Module
async function sendNotification(title, message, context = {}) {
  // Prepare to send notification

  try {
    // Get the active tab
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs || tabs.length === 0) {
      console.warn('No active tab found');
      return;
    }
    
    const settings = await getStoredSettings();
    const isTestMode = settings.testMode || false;
    
    if (isTestMode) {
      console.log(`🧪 TEST MODE: Active tab - ${tabs[0].url}`);
    }
    
    const notificationId = `gemini-notif-${Date.now()}-${Math.random()}`;
    // Create notification with unique ID

    const url = new URL(tabs[0].url);
    ACTIVE_NOTIFICATIONS.set(notificationId, {
      ...context,
      url: url.hostname,
      tabId: tabs[0].id,
      messageVersion: context.messageVersion || 'default'
    });

    chrome.notifications.create(notificationId, {
      type: 'basic',
      iconUrl: "icon.jpg",
      title,
      message,
      buttons: [{ title: 'Block' }],
    }, (createdId) => {
      if (chrome.runtime.lastError) {
        ACTIVE_NOTIFICATIONS.delete(notificationId);
      }
    });
  } catch (error) {
    console.error('❌ Error creating notification:', error);
  }
}

async function generateGeminiMessage(context) {
  const { url, productivityScore, taskContext, interventionStyle, geminiApiKey } = context;
  const domain = new URL(url).hostname;
  const cacheKey = `${domain}-${productivityScore}-${Math.floor(Date.now() / CACHE_DURATION)}`;

  if (GEMINI_CACHE.has(cacheKey)) {
    return GEMINI_CACHE.get(cacheKey);
  }

  if (!geminiApiKey) {
    return null;
  }

  try {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${geminiApiKey}`
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `As a productivity assistant, create a 140-character max message for someone on ${url} (${context.tabTitle}) with ${productivityScore}% productivity score. Tasks: ${taskContext || 'none'}. Style: ${interventionStyle}. Time: ${new Date().toLocaleTimeString()}. Be creative and non-repetitive.`
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 60,
        }
      })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const message = data.candidates[0].content.parts[0].text.trim();

    GEMINI_CACHE.set(cacheKey, message);
    if (GEMINI_CACHE.size > 50) {
      GEMINI_CACHE.delete(GEMINI_CACHE.keys().next().value);
    }

    return message;
  } catch (error) {
    console.error('❌ Gemini Error:', error);
    return null;
  }
}

// Handle notification button clicks
chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
  const notificationInfo = ACTIVE_NOTIFICATIONS.get(notificationId);
  if (!notificationInfo) return;

  if (buttonIndex === 0) { // Block button
    const domain = new URL(notificationInfo.url).hostname;
    const history = getNotificationContext(domain);
    history.dismissals++;
    notificationHistory.set(domain, history);

    chrome.runtime.sendMessage({
      action: 'blockSite',
      url: notificationInfo.url,
      duration: notificationInfo.suggestedBlockDuration
    });
  }

  ACTIVE_NOTIFICATIONS.delete(notificationId);
  chrome.notifications.clear(notificationId);
});

// Clean up notifications when closed
chrome.notifications.onClosed.addListener((notificationId) => {
  ACTIVE_NOTIFICATIONS.delete(notificationId);
});

// Initialize module
console.log('📢 Notifications module loaded successfully');

// Background Script
let currentRules = [];
let settings = {
  interval: 1, // screenshot interval, in minutes
  threshold: 50, // unproductive threshold (%)
  interventionStyle: 'drill_sergeant', // Default intervention style
  useGemini: true, // Whether to use Gemini for notifications
  geminiApiKey: '' // API key for Gemini
};
let isActive = true;
let screenshotTimer = null;
let userTasks = [];
let currentFocusTask = null;
let parasiteTasks = [];
let currentFocusParasite = null;
let recentAnalyses = new Map();
const MAX_HISTORY_SIZE = 20;
const INTERVENTION_THRESHOLDS = {
  drill_sergeant: 1,
  vigilant_mentor: 2,
  steady_coach: 4,
  patient_guide: 7,
  zen_observer: 10
};

// Rate limiting for screenshot capture
let lastCaptureTime = 0;
const MIN_CAPTURE_INTERVAL = 1000; // Minimum 1s between captures for better performance

// Site tracking
let siteTracking = new Map();
let lastActiveTab = null;
let lastActiveTime = Date.now();
const notificationHistory = new Map();
const SITE_CATEGORIES = {
  STREAMING: ['youtube.com', 'netflix.com', 'hulu.com', 'twitch.tv', 'disney.com', 'hbomax.com'],
  GAMING: ['games', 'gaming', 'steam', 'roblox', 'minecraft', 'slither.io'],
  SOCIAL_MEDIA: ['facebook.com', 'instagram.com', 'twitter.com', 'tiktok.com', 'snapchat.com', 'linkedin.com'],
  NEWS_FORUMS: ['reddit.com', 'news', 'forum', 'discussion'],
  SHOPPING: ['amazon.com', 'ebay.com', 'shopping', 'store', 'shop'],
  PRODUCTIVITY: ['github.com', 'docs.google.com', 'notion.so', 'trello.com', 'asana.com']
};

// Analytics tracking
let productivityStats = {
  productive: 0,
  unproductive: 0
};

// Load existing stats only once on initialization
chrome.storage.local.get(['productivityStats'], (data) => {
  if (data.productivityStats) {
    productivityStats = data.productivityStats;
  }
});

// Update analytics silently
function updateAnalytics(url, domain, isProductive, timeSpent) {
  // Update productivity stats
  if (isProductive !== undefined) {
    productivityStats[isProductive ? 'productive' : 'unproductive']++;
    chrome.storage.local.set({ productivityStats });
  }

  // Update domain usage
  const domainUsage = {};
  for (const [trackedDomain, tracking] of siteTracking.entries()) {
    domainUsage[trackedDomain] = {
      totalTime: tracking.totalTime,
      category: tracking.category,
      lastVisit: tracking.lastUpdate,
      url: tracking.url
    };
  }
  chrome.storage.local.set({ timeSpent: domainUsage });
}

function getSiteCategory(urlOrDomain) {
  let domain;
  try {
    // If it's a full URL, extract the hostname
    if (urlOrDomain.startsWith('http://') || urlOrDomain.startsWith('https://')) {
      domain = new URL(urlOrDomain).hostname.toLowerCase();
    } else {
      // If it's just a domain, use it directly
      domain = urlOrDomain.toLowerCase();
    }

    for (const [category, domains] of Object.entries(SITE_CATEGORIES)) {
      if (domains.some(d => domain.includes(d))) {
        return category;
      }
    }
    return 'OTHER';
  } catch (error) {
    console.warn('Invalid URL or domain:', urlOrDomain);
    return 'OTHER';
  }
}

function updateSiteTracking(tab, isPeriodicUpdate = false) {
  if (!tab?.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
    return;
  }

  let domain;
  try {
    domain = new URL(tab.url).hostname;
  } catch (error) {
    console.warn('Invalid tab URL:', tab.url);
    return;
  }

  const currentTime = Date.now();
  const today = new Date().toISOString().split('T')[0];

  // If we have a last active tab and we're switching tabs, update its time
  if (lastActiveTab && lastActiveTab !== domain) {
    const lastTracking = siteTracking.get(lastActiveTab) || {
      totalTime: 0,
      category: getSiteCategory(lastActiveTab),
      url: '',
      firstSeen: currentTime
    };
    const timeToAdd = Math.floor((currentTime - lastActiveTime) / 1000); // Convert to seconds
    if (timeToAdd > 0) {
      lastTracking.totalTime += timeToAdd;
      siteTracking.set(lastActiveTab, lastTracking);
    }
  }

  // Get or create tracking for current domain
  const tracking = siteTracking.get(domain) || {
    totalTime: 0,
    category: getSiteCategory(tab.url),
    url: tab.url,
    firstSeen: currentTime,
    lastUpdate: currentTime,
    dailyTime: {}
  };

  // Track daily time
  if (!tracking.dailyTime[today]) {
    tracking.dailyTime[today] = 0;
  }

  // If this is a periodic update of the current tab
  if (isPeriodicUpdate && domain === lastActiveTab) {
    const timeToAdd = Math.floor((currentTime - lastActiveTime) / 1000); // Convert to seconds
    if (timeToAdd > 0) {
      tracking.totalTime += timeToAdd;
      tracking.dailyTime[today] += timeToAdd;
      tracking.lastUpdate = currentTime;
      siteTracking.set(domain, tracking);
    }
  }

  // Update last active state
  lastActiveTab = domain;
  lastActiveTime = currentTime;

  // Prepare domain usage data
  const domainUsage = {};
  const dailyUsage = {};
  const weeklyUsage = {};

  for (const [trackedDomain, tracking] of siteTracking.entries()) {
    domainUsage[trackedDomain] = {
      totalTime: tracking.totalTime,
      category: tracking.category,
      lastVisit: tracking.lastUpdate,
      url: tracking.url
    };

    // Daily usage calculation
    const sortedDailyTimes = Object.entries(tracking.dailyTime || {})
      .sort((a, b) => new Date(b[0]) - new Date(a[0]))
      .slice(0, 7); // Get last 7 days

    sortedDailyTimes.forEach(([date, time]) => {
      if (!dailyUsage[trackedDomain]) {
        dailyUsage[trackedDomain] = {};
      }
      dailyUsage[trackedDomain][date] = time;
    });

    // Weekly usage calculation
    const weeklyTime = sortedDailyTimes.reduce((total, [_, time]) => total + time, 0);
    if (weeklyTime > 0) {
      weeklyUsage[trackedDomain] = {
        totalTime: weeklyTime,
        category: tracking.category
      };
    }
  }

  // Save to storage and trigger update
  chrome.storage.local.set({ 
    timeSpent: domainUsage,
    dailyUsage: dailyUsage,
    weeklyUsage: weeklyUsage 
  }, () => {
    if (chrome.runtime.lastError) {
      console.error('Error saving to storage:', chrome.runtime.lastError);
    }
  });
}

function getNotificationContext(domain) {
  if (!notificationHistory.has(domain)) {
    notificationHistory.set(domain, {
      dismissals: 0,
      lastNotification: null,
      lastDismissalReset: Date.now()
    });
  }

  const history = notificationHistory.get(domain);
  
  // Reset dismissals weekly
  if (Date.now() - history.lastDismissalReset > 7 * 24 * 60 * 60 * 1000) {
    history.dismissals = 0;
    history.lastDismissalReset = Date.now();
  }
  
  return history;
}

// Get formatted task context for notifications
function getTaskContext() {
  // Format user tasks for context
  let taskContext = '';
  
  if (userTasks && userTasks.length > 0) {
    const activeTasks = userTasks.filter(task => !task.completed).slice(0, 3);
    if (activeTasks.length > 0) {
      taskContext = activeTasks.map(task => `- ${task.text}`).join('\n');
    }
  }
  
  // Add focus task if available
  if (currentFocusTask) {
    taskContext = `FOCUS: ${currentFocusTask.text}\n${taskContext}`;
  }
  
  return taskContext || 'No active tasks';
}

// Server health check function
async function checkServerHealth() {
  try {
    const healthCheck = await fetch('http://localhost:3001/health');
    if (!healthCheck.ok) {
      console.error('❌ Server health check failed:', healthCheck.status);
      setTimeout(captureAndAnalyze, 10000);
      return false;
    }
    return true;
  } catch (error) {
    console.error('❌ Server is not running:', error.message);
    console.log('🔄 Will retry in 10 seconds...');
    setTimeout(captureAndAnalyze, 10000);
    return false;
  }
}

// Message handling
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('📨 Received message:', request);

  switch (request.action) {
    case 'updateSettings':
      console.log('⚙️ Updating settings:', request.settings);
      settings = { ...settings, ...request.settings };
      startScreenshotTimer(settings); // Restart timer with new interval
      break;
    case 'toggleActive':
      console.log('🔄 Toggling active state:', request.isActive);
      isActive = request.isActive;
      
      // When toggling active state, we just pause/resume the timer
      // without resetting any analytics data
      if (!isActive) {
        console.log('⏸️ Extension disabled - pausing activity monitoring');
        // Stop any scheduled screenshot timer, but keep all analytics data intact
        if (screenshotTimer) {
          clearInterval(screenshotTimer);
          screenshotTimer = null;
        }
      } else {
        console.log('▶️ Extension enabled - resuming activity monitoring');
        // Timer will be restarted below
      }
      
      startScreenshotTimer(settings); // Restart or stop timer based on active state
      break;

    case 'blockSite':
      if (request.url) {
        console.log('🚫 Blocking site:', request.url);
        // Handle site blocking
      }
      break;
    case 'resetStats':
      productivityStats = { productive: 0, unproductive: 0 };
      chrome.storage.local.set({ productivityStats });
      console.log('📊 Reset productivity stats');
      sendResponse({ success: true });
      break;
    default:
      console.log('⚠️ Unknown message action:', request.action);
  }
});

// Constants
const NORMAL_CHECK_INTERVAL = 10 * 1000; // 10 seconds in milliseconds
const TEST_CHECK_INTERVAL = 30 * 1000; // 30 seconds in milliseconds
let CHECK_INTERVAL = NORMAL_CHECK_INTERVAL; // Default to normal interval

// Initialize extension
function initializeExtension() {
  console.log('🔧 Initializing extension...');
  
  // Load extension settings
  chrome.storage.local.get([
    'active',
    'captureInterval',
    'threshold',
    'interventionStyle',
    'serverUrl',
    'serverKey',
    'enableCalendarIntegration',
    'testMode'
  ], (result) => {
    // Default settings if nothing is stored
    if (Object.keys(result).length === 0) {
      console.log('⚙️ Initializing with default settings');
      settings = {
        active: true,
        captureInterval: 10, // seconds
        threshold: 0.7, // 0-1 productivity threshold
        interventionStyle: 'Medium', // Notification style
        serverUrl: 'http://localhost:3001',
        serverKey: '',
        enableCalendarIntegration: true, // Enable calendar integration by default
        testMode: false // Test mode disabled by default
      };
      
      // Save default settings
      chrome.storage.local.set(settings);
    } else {
      console.log('⚙️ Loaded saved settings:', result);
      settings = {
        active: result.active ?? true,
        captureInterval: result.captureInterval ?? 10,
        threshold: result.threshold ?? 0.7,
        interventionStyle: result.interventionStyle ?? 'Medium',
        serverUrl: result.serverUrl ?? 'http://localhost:3001',
        serverKey: result.serverKey ?? '',
        enableCalendarIntegration: result.enableCalendarIntegration ?? true,
        testMode: result.testMode ?? false
      };
    }

    // Update global state
    isActive = settings.active;
    
    // Load saved tasks
    chrome.storage.local.get(['tasks', 'parasiteTasks', 'focusTask'], (taskStore) => {
      if (taskStore.tasks && Array.isArray(taskStore.tasks)) {
        userTasks = taskStore.tasks;
      }
      
      if (taskStore.parasiteTasks && Array.isArray(taskStore.parasiteTasks)) {
        parasiteTasks = taskStore.parasiteTasks;
      }
      
      if (taskStore.focusTask) {
        currentFocusTask = taskStore.focusTask;
      }
      
      console.log('📋 Loaded tasks:', { 
        userTasks: userTasks.length,
        parasiteTasks: parasiteTasks.length, 
        focusTask: currentFocusTask
      });
    });
    
    // Start screenshot timer
    startScreenshotTimer(settings);
    console.log('✅ Extension initialized successfully');
  });
}

// Start screenshot timer
function startScreenshotTimer(settings) {
  // Start screenshot timer with current settings

  if (screenshotTimer) {
    // Clear existing timer
    clearInterval(screenshotTimer);
  }

  if (!settings.active) {
    return; // Extension not active
  }
  
  // Set the interval based on test mode
  if (settings.testMode) {
    CHECK_INTERVAL = TEST_CHECK_INTERVAL;
    console.log(`🧪 Test mode active: Setting timer interval to 30 seconds (${CHECK_INTERVAL}ms)`);
  } else {
    CHECK_INTERVAL = NORMAL_CHECK_INTERVAL;
    console.log(`⏱️ Setting timer interval to 10 seconds (${CHECK_INTERVAL}ms)`);
  }

  // Take initial screenshot after a short delay
  setTimeout(captureAndAnalyze, 5000);

  // Set up regular interval
  screenshotTimer = setInterval(captureAndAnalyze, CHECK_INTERVAL);
}

async function captureAndAnalyze() {
  if (!isActive) {
    console.log('🔴 Extension is not active, skipping analysis');
    return;
  }

  // Get current settings to check test mode
  const settings = await getStoredSettings();
  const isTestMode = settings.testMode || false;
  
  if (isTestMode) {
    console.log('🧪 TEST MODE: Screenshot capture triggered at ' + new Date().toISOString());
  }
  
  // Starting screenshot capture and analysis
  
  // Set default values since calendar integration is disabled
  const calendarStatus = { isBusy: false };
  const calendarContext = "";

  try {
    // Check if test mode is enabled
    if (!isTestMode) {
      // Only apply minimum capture interval in normal mode
      const now = Date.now();
      const timeSinceLastCapture = now - lastCaptureTime;
      if (timeSinceLastCapture < MIN_CAPTURE_INTERVAL) {
        const waitTime = MIN_CAPTURE_INTERVAL - timeSinceLastCapture;
        // Wait before next capture
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    } else {
      console.log('🧪 TEST MODE: Bypassing minimum capture interval check');
      console.log('🧪 TEST MODE: Last capture time: ' + new Date(lastCaptureTime).toISOString());
      console.log('🧪 TEST MODE: Current time: ' + new Date().toISOString());
      console.log('🧪 TEST MODE: Time since last capture: ' + (Date.now() - lastCaptureTime) + 'ms');
    }

    // Get the active tab
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs || tabs.length === 0) {
      console.warn('No active tab found');
      return;
    }
    
    if (isTestMode) {
      console.log(`🧪 TEST MODE: Active tab - ${tabs[0].url}`);
    }

    // Capture screenshot
    const screenshot = await chrome.tabs.captureVisibleTab();
    const captureTime = Date.now();
    lastCaptureTime = captureTime;

    // Get the active tab URL and title
    const tab = tabs[0];
    const url = tab.url;
    const title = tab.title;
    
    if (isTestMode) {
      console.log(`🧪 TEST MODE: Screenshot captured at ${new Date(captureTime).toISOString()}`);
      console.log(`🧪 TEST MODE: URL: ${url}`);
      console.log(`🧪 TEST MODE: Title: ${title}`);
    }

    // Send to server for analysis
    const domain = new URL(url).hostname;
    const timeSpent = getTimeSpentOnDomain(url);
    
    if (isTestMode) {
      console.log(`🧪 TEST MODE: Sending screenshot to server at ${settings.serverUrl}/analyze`);
      console.log(`🧪 TEST MODE: Threshold: ${settings.threshold * 100}`);
      console.log(`🧪 TEST MODE: Time spent on domain: ${timeSpent}s`);
      console.log(`🧪 TEST MODE: Domain: ${domain}`);
    }
    
    const response = await fetch(`${settings.serverUrl}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        image: screenshot,
        url: url,
        title: title,
        threshold: settings.threshold * 100, // Convert from 0-1 to 0-100
        timeSpent: timeSpent,
        interventionStyle: settings.interventionStyle
      })
    });
    
    if (isTestMode) {
      console.log(`🧪 TEST MODE: Server response status: ${response.status}`);
    }

    // Process response
    const result = await response.json();
    
    if (isTestMode) {
      console.log('🧪 TEST MODE: Server analysis results:');
      console.log(`🧪 TEST MODE: Productivity score: ${result.productivityScore}`);
      console.log(`🧪 TEST MODE: Should notify: ${result.shouldNotify}`);
      if (result.notificationMessage) {
        console.log(`🧪 TEST MODE: Notification message: ${result.notificationMessage}`);
      }
      console.log(`🧪 TEST MODE: Suggested block duration: ${result.suggestedBlockDuration} minutes`);
    }

    // Update analytics
    updateAnalytics(
      url,
      domain,
      result.productivityScore >= settings.threshold * 100,
      timeSpent
    );

    // Handle notification
    if (result.shouldNotify) {
      const notificationMessage = result.notificationMessage || await generateGeminiMessage({
        url: url,
        productivityScore: result.productivityScore,
        taskContext: getTaskContext(),
        interventionStyle: settings.interventionStyle,
        geminiApiKey: settings.geminiApiKey
      });
      sendNotification(getCurrentTabTitle(), notificationMessage, {
        suggestedBlockDuration: result.suggestedBlockDuration,
        messageVersion: 'test'
      });
    }
  } catch (error) {
    if (isTestMode) {
      console.error('🧪 TEST MODE ERROR: Error during capture and analysis:');
      console.error('🧪 TEST MODE ERROR:', error.message);
      console.error('🧪 TEST MODE ERROR: Stack trace:', error.stack);
    } else {
      console.error('❌ Error during capture and analysis:', error);
    }
  }
}
