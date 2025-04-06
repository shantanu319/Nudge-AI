// Service worker initialization
self.window = self;
self.document = null;

// Debug logging
console.log('🚀 Service worker starting...');

// Import modules
// Google Calendar integration (commented out until Chrome Web Store approval)
// import { fetchCalendarEvents, getUserCalendarStatus, getCalendarContextForAI, startPeriodicCalendarRefresh } from './calendar.js';

// Shared state
const ACTIVE_NOTIFICATIONS = new Map();
const GEMINI_CACHE = new Map();
const CACHE_DURATION = 12 * 60 * 60 * 1000;

// Notifications Module
async function sendNotification(title, message, context = {}) {
  console.log('🔔 Preparing to send notification:', { title, message });

  try {
    // Get the active tab using chrome.tabs API
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab) {
      console.log('❌ No active tab found for notification');
      return;
    }

    const notificationId = `gemini-notif-${Date.now()}-${Math.random()}`;
    console.log('📝 Creating notification with ID:', notificationId);

    const url = new URL(tab.url);
    ACTIVE_NOTIFICATIONS.set(notificationId, {
      ...context,
      url: url.hostname,
      tabId: tab.id,
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
        console.error('❌ Notification creation failed:', chrome.runtime.lastError);
        ACTIVE_NOTIFICATIONS.delete(notificationId);
      } else {
        console.log('✅ Notification created successfully:', createdId);
      }
    });
  } catch (error) {
    console.error('❌ Error creating notification:', error);
  }
}

async function generateGeminiMessage(context) {
  console.log('🤖 Generating Gemini notification for:', context.url);
  const { url, productivityScore, taskContext, interventionStyle, geminiApiKey } = context;
  const domain = new URL(url).hostname;
  const cacheKey = `${domain}-${productivityScore}-${Math.floor(Date.now() / CACHE_DURATION)}`;

  if (GEMINI_CACHE.has(cacheKey)) {
    console.log('🎯 Using cached Gemini message for:', domain);
    return GEMINI_CACHE.get(cacheKey);
  }

  if (!geminiApiKey) {
    console.log('⚠️ No Gemini API key provided');
    return null;
  }

  try {
    console.log('🌐 Sending request to Gemini API...');
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
      console.error('❌ Gemini API error:', response.status, response.statusText);
      throw new Error(`API error: ${response.status}`);
    }

    console.log('✅ Received Gemini API response');
    const data = await response.json();
    const message = data.candidates[0].content.parts[0].text.trim();

    console.log('💬 Generated message:', message.substring(0, 50) + '...');
    GEMINI_CACHE.set(cacheKey, message);
    if (GEMINI_CACHE.size > 50) {
      console.log('🧹 Cleaning up Gemini cache');
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
const MIN_CAPTURE_INTERVAL = 500; // Minimum 500ms between captures

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

// Load existing stats
chrome.storage.local.get(['productivityStats'], (data) => {
  if (data.productivityStats) {
    productivityStats = data.productivityStats;
    console.log('📊 Loaded existing productivity stats:', productivityStats);
  }
});

// Update analytics
function updateAnalytics(url, domain, isProductive, timeSpent) {
  // Update productivity stats
  if (isProductive !== undefined) {
    productivityStats[isProductive ? 'productive' : 'unproductive']++;
    chrome.storage.local.set({ productivityStats });
    console.log('📊 Updated productivity stats:', productivityStats);
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
  console.log('📊 Updated domain usage:', domainUsage);
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
      console.log(`Updated time for ${lastActiveTab}: ${lastTracking.totalTime}s`);
    }
  }

  // Get or create tracking for current domain
  const tracking = siteTracking.get(domain) || {
    totalTime: 0,
    category: getSiteCategory(tab.url),
    url: tab.url,
    firstSeen: currentTime,
    lastUpdate: currentTime
  };

  // If this is a periodic update of the current tab
  if (isPeriodicUpdate && domain === lastActiveTab) {
    const timeToAdd = Math.floor((currentTime - lastActiveTime) / 1000); // Convert to seconds
    if (timeToAdd > 0) {
      tracking.totalTime += timeToAdd;
      tracking.lastUpdate = currentTime;
      siteTracking.set(domain, tracking);
      console.log(`Updated time for current domain ${domain}: ${tracking.totalTime}s`);
    }
  }

  // Update last active state
  lastActiveTab = domain;
  lastActiveTime = currentTime;

  // Prepare domain usage data
  const domainUsage = {};
  for (const [trackedDomain, data] of siteTracking.entries()) {
    domainUsage[trackedDomain] = {
      totalTime: data.totalTime,
      category: data.category,
      lastVisit: data.lastUpdate,
      url: data.url
    };
  }

  // Save to storage and trigger update
  chrome.storage.local.set({ timeSpent: domainUsage }, () => {
    if (chrome.runtime.lastError) {
      console.error('Error saving to storage:', chrome.runtime.lastError);
    } else {
      console.log('Successfully updated storage with domain usage:', domainUsage);
    }
  });
}

function getNotificationContext(domain) {
  const history = notificationHistory.get(domain) || {
    lastNotification: 0,
    dismissals: 0,
    lastDismissalReset: Date.now()
  };

  // Reset dismissals weekly
  if (Date.now() - history.lastDismissalReset > 7 * 24 * 60 * 60 * 1000) {
    history.dismissals = 0;
    history.lastDismissalReset = Date.now();
  }

  return history;
}

// Server health check function
async function checkServerHealth() {
  try {
    const healthCheck = await fetch('http://localhost:3001/health');
    if (!healthCheck.ok) {
      console.error('❌ Server health check failed:', healthCheck.status);
      console.log('🔄 Will retry in 10 seconds...');
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
const CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes in milliseconds

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
    'enableCalendarIntegration'
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
        enableCalendarIntegration: true // Enable calendar integration by default
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
        enableCalendarIntegration: result.enableCalendarIntegration ?? true
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
    
    // Initialize Google Calendar integration if enabled (currently disabled)
    /*
    if (settings.enableCalendarIntegration) {
      console.log('📅 Initializing Google Calendar integration...');
      startPeriodicCalendarRefresh();
    }
    */
    
    // Start screenshot timer
    startScreenshotTimer(settings);
    console.log('✅ Extension initialized successfully');
  });
}

// Start screenshot timer
function startScreenshotTimer(settings) {
  console.log('⏰ Starting screenshot timer...');
  console.log('Current settings:', settings);

  if (screenshotTimer) {
    console.log('🔄 Clearing existing timer');
    clearInterval(screenshotTimer);
  }

  if (!settings.active) {
    console.log('⏸️ Extension is not active, timer not started');
    return;
  }

  console.log(`⏱️ Setting timer interval to 5 minutes (${CHECK_INTERVAL}ms)`);

  // Take initial screenshot after a short delay
  console.log('📸 Scheduling initial screenshot...');
  setTimeout(captureAndAnalyze, 5000);

  // Set up regular interval
  screenshotTimer = setInterval(() => {
    console.log('⏰ Timer triggered, capturing screenshot...');
    captureAndAnalyze();
  }, CHECK_INTERVAL);

  console.log('✅ Screenshot timer started successfully');
}

async function captureAndAnalyze() {
  if (!isActive) {
    console.log('🔴 Extension is not active, skipping analysis');
    return;
  }

  console.log('🟢 Starting screenshot capture and analysis...');

  // Check calendar status first if integration is enabled
  // (Google Calendar integration currently disabled)
  /*
  let calendarStatus = { isBusy: false, currentEvent: null };
  let calendarContext = "";
  
  if (settings.enableCalendarIntegration) {
    try {
      calendarStatus = await getUserCalendarStatus();
      calendarContext = await getCalendarContextForAI();
      
      console.log('📅 Calendar status:', { 
        isBusy: calendarStatus.isBusy,
        currentEvent: calendarStatus.currentEvent?.summary || 'None',
        totalEvents: calendarStatus.totalEvents
      });
      
      // If the user is in a meeting, potentially reduce notification frequency
      if (calendarStatus.isBusy && calendarStatus.currentEvent) {
        console.log('📅 User is currently busy according to calendar');
      }
    } catch (error) {
      console.error('❌ Error getting calendar status:', error);
      // Continue without calendar context if there's an error
    }
  }
  */
  
  // Set default values since calendar integration is disabled
  const calendarStatus = { isBusy: false };
  const calendarContext = "";

  try {
    // Check if enough time has passed since last capture
    const now = Date.now();
    const timeSinceLastCapture = now - lastCaptureTime;
    if (timeSinceLastCapture < MIN_CAPTURE_INTERVAL) {
      const waitTime = MIN_CAPTURE_INTERVAL - timeSinceLastCapture;
      console.log(`⏳ Waiting ${waitTime}ms before next capture...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    // Check server health before proceeding
    const serverRunning = await checkServerHealth();
    if (!serverRunning) {
      console.error('❌ Server is not running');
      return;
    }
    console.log('✅ Server is running');

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    console.log('📑 Current tab:', {
      url: tab?.url,
      title: tab?.title,
      id: tab?.id
    });

    if (!tab || !tab.url) {
      console.log('⚠️ No active tab found, retrying in 5 seconds...');
      setTimeout(captureAndAnalyze, 5000);
      return;
    }

    if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
      console.log('⚠️ Chrome internal page, skipping analysis:', tab.url);
      return;
    }

    const currentDomain = new URL(tab.url).hostname;
    console.log('📸 Capturing screenshot for:', currentDomain);

    // Update site tracking
    const tracking = updateSiteTracking(tab, true);
    const notifContext = getNotificationContext(currentDomain);

    // Don't analyze if we just started tracking this site (wait at least 30 seconds)
    if (Date.now() - tracking.firstSeen < 30000) {
      console.log('🕐 Site recently opened, waiting before first analysis...');
      return;
    }

    // Log current tracking status
    console.log('📊 Current site tracking:', {
      domain: currentDomain,
      timeSpent: tracking.totalTime,
      timeSinceFirstSeen: Math.floor((Date.now() - tracking.firstSeen) / 60000),
      category: tracking.category
    });

    // Get battery status if available
    let batteryStatus = 'unknown';
    try {
      if ('getBattery' in navigator) {
        const battery = await navigator.getBattery();
        batteryStatus = battery.charging ? 'charging' : `${Math.round(battery.level * 100)}%`;
      }
    } catch (error) {
      console.log('⚠️ Battery status not available');
    }

    const screenshotUrl = await chrome.tabs.captureVisibleTab(null, {
      format: 'jpeg',
      quality: 85
    });
    lastCaptureTime = Date.now(); // Update last capture time

    if (!screenshotUrl || !screenshotUrl.startsWith('data:image/jpeg;base64,')) {
      throw new Error('Invalid screenshot data');
    }

    console.log('🌐 Sending analysis request to server...');

    // Prepare task context
    let taskContext = '';
    if (userTasks.length > 0 || parasiteTasks.length > 0) {
      taskContext = 'Active tasks:\n';
      if (userTasks.length > 0) {
        taskContext += userTasks.filter(t => !t.completed).map(t => `- ${t.title}`).join('\n') + '\n';
      }
      if (parasiteTasks.length > 0) {
        taskContext += 'Priority tasks:\n';
        taskContext += parasiteTasks.filter(t => !t.completed).map(t => `- ${t.title}`).join('\n') + '\n';
      }
      if (currentFocusTask) {
        taskContext += `Focus task: ${currentFocusTask}\n`;
      }
    }
    
    // Add calendar context if available (calendar integration currently disabled)
    /*
    if (calendarContext) {
      taskContext += '\nCalendar context:\n' + calendarContext;
    }
    */

    // Known entertainment domains
    const entertainmentDomains = [
      'youtube.com',
      'netflix.com',
      'twitch.tv',
      'instagram.com',
      'facebook.com',
      'twitter.com',
      'tiktok.com',
      'reddit.com',
      'slither.io',
      'games',
      'gaming'
    ];

    // Check if current domain is entertainment
    const isEntertainment = entertainmentDomains.some(domain =>
      currentDomain.includes(domain) || tab.url.includes(domain)
    );

    console.log('Request data:', {
      url: tab.url,
      title: tab.title,
      threshold: settings.threshold,
      taskContext,
      hasTasks: userTasks.length > 0 || parasiteTasks.length > 0,
      interventionStyle: settings.interventionStyle,
      isEntertainment
    });

    try {
      // Send to server for analysis
      const response = await fetch('http://localhost:3001/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: screenshotUrl,
          url: tab.url,
          title: tab.title,
          threshold: settings.threshold,
          taskContext,
          hasTasks: userTasks.length > 0 || parasiteTasks.length > 0,
          interventionStyle: settings.interventionStyle,
          isEntertainment: tracking.category !== 'PRODUCTIVITY',
          siteCategory: tracking.category,
          timeSpent: tracking.totalTime,
          timeOfDay: new Date().toLocaleTimeString(),
          lastNotificationTime: notifContext.lastNotification,
          previousDismissals: notifContext.dismissals,
          batteryStatus,
          timeSinceFirstSeen: Math.floor((Date.now() - tracking.firstSeen) / 60000)
          // Calendar integration disabled
          // calendarStatus: calendarStatus.isBusy ? 'BUSY' : 'FREE',
          // currentEvent: calendarStatus.currentEvent?.summary || null,
          // nextEvent: calendarStatus.nextEvent?.summary || null
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('📈 Analysis result:', {
        productivityScore: result.productivityScore,
        shouldNotify: result.shouldNotify,
        reason: result.reason
      });

      // Update analytics with the result
      updateAnalytics(
        tab.url,
        currentDomain,
        result.productivityScore >= settings.threshold,
        tracking.totalTime
      );

      // Store analysis result in history
      const currentAnalysis = {
        timestamp: Date.now(),
        url: tab.url,
        domain: currentDomain,
        unproductive: result.unproductive,
        productivityScore: result.productivityScore,
        message: result.message
      };

      recentAnalyses.set(currentDomain, currentAnalysis);

      // Trim history if needed
      if (recentAnalyses.size > MAX_HISTORY_SIZE) {
        const oldestKey = Array.from(recentAnalyses.keys())[0];
        recentAnalyses.delete(oldestKey);
      }

      // Handle notification if needed
      if (result.shouldNotify) {
        console.log('🔔 Notification needed:', result.reason);

        // Verify time spent matches
        if (result.timeSpent !== tracking.totalTime) {
          console.log('⚠️ Time mismatch detected:', {
            serverTime: result.timeSpent,
            localTime: tracking.totalTime
          });
        }
        
        // Check calendar status before sending notification (calendar integration disabled)
        /*
        let shouldSuppressNotification = false;
        
        if (settings.enableCalendarIntegration && calendarStatus.isBusy) {
          // If user is in an important meeting, we might want to suppress notifications
          if (calendarStatus.currentEvent && 
              !calendarStatus.currentEvent.summary?.toLowerCase().includes('break')) {
            console.log('📅 Suppressing notification due to calendar event:', 
                       calendarStatus.currentEvent?.summary);
            shouldSuppressNotification = true;
          }
        }
        
        if (!shouldSuppressNotification) {
        */
        // Calendar integration disabled - always show notifications when needed
          const notificationContext = {
            url: tab.url,
            domain: currentDomain,
            timeSpent: tracking.totalTime,
            category: tracking.category,
            suggestedBlockDuration: result.suggestedBlockDuration
            // calendarBusy: calendarStatus.isBusy (calendar integration disabled)
          };

          await sendNotification(
            'Focus Guardian',
            result.notificationMessage,
            notificationContext
          );
        /* Calendar integration disabled
        } else {
          console.log('🔕 Notification suppressed due to calendar status');
        }
        */

        // Update notification history
        notifContext.lastNotification = Date.now();
        notificationHistory.set(currentDomain, notifContext);
      }
    } catch (error) {
      console.error('❌ Analysis error:', error);
      // Log more details about the error
      if (error.message.includes('fetch')) {
        console.log('🔄 Server connection error, will retry in 10 seconds...');
        setTimeout(captureAndAnalyze, 10000);
      } else {
        console.error('Error details:', {
          message: error.message,
          stack: error.stack,
          cause: error.cause
        });
      }
    }
  } catch (error) {
    if (error.message.includes('MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND')) {
      console.log('⏳ Rate limit hit, will retry in 1 second...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      return captureAndAnalyze(); // Retry after delay
    } else {
      console.error('❌ Screenshot capture failed:', error);
    }
  }
}

// Initialize extension when service worker starts
chrome.runtime.onStartup.addListener(() => {
  console.log('🔄 Service worker starting up, initializing...');
  initializeExtension();
});

// Also initialize on installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('📦 Extension installed/updated, initializing...');
  initializeExtension();
});

// Handle messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  /* Google Calendar integration (disabled until Chrome Web Store approval)
  if (request.action === 'refreshCalendar') {
    console.log('🔄 Manual calendar refresh requested');
    fetchCalendarEvents(true) // force refresh
      .then(events => {
        console.log(`📅 Calendar refreshed, ${events.length} events found`);
        sendResponse({ success: true, count: events.length });
      })
      .catch(error => {
        console.error('❌ Calendar refresh failed:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Keep connection open for async response
  }
  */
});

// Initialize immediately for development
initializeExtension();

// Debug logging
console.log('🚀 Background script loaded');

// Log successful initialization
console.log("✅ Service worker initialized successfully");

// Initialize domain tracking
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    updateSiteTracking(tab);
  } catch (error) {
    console.error('Error handling tab activation:', error);
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    updateSiteTracking(tab);
  }
});

// Update domain tracking every second for the active tab
setInterval(async () => {
  try {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (activeTab) {
      updateSiteTracking(activeTab, true); // true flag indicates it's a periodic update
    }
  } catch (error) {
    console.error('Error in tracking interval:', error);
  }
}, 1000); // Update every second
