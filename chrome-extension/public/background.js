// Service worker initialization
self.window = self;
self.document = null;

// Debug logging
console.log('🚀 Service worker starting...');

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
    chrome.runtime.sendMessage({
      action: 'blockSite',
      url: notificationInfo.url
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
      startScreenshotTimer(); // Restart timer with new interval
      break;
    case 'toggleActive':
      console.log('🔄 Toggling active state:', request.isActive);
      isActive = request.isActive;
      startScreenshotTimer(); // Restart or stop timer based on active state
      break;
    case 'blockSite':
      if (request.url) {
        console.log('🚫 Blocking site:', request.url);
        // Handle site blocking
      }
      break;
    default:
      console.log('⚠️ Unknown message action:', request.action);
  }
});

function startScreenshotTimer() {
  console.log('⏰ Starting screenshot timer...');
  console.log('Current settings:', {
    interval: settings.interval,
    isActive: isActive
  });

  if (screenshotTimer) {
    console.log('🔄 Clearing existing timer');
    clearInterval(screenshotTimer);
    screenshotTimer = null;
  }

  if (!isActive) {
    console.log('🔴 Extension is not active, not starting timer');
    return;
  }

  const intervalMs = settings.interval * 60 * 1000;
  console.log(`⏱️ Setting timer interval to ${settings.interval} minutes (${intervalMs}ms)`);

  // Take first screenshot with a slight delay to avoid chrome:// pages
  console.log('📸 Scheduling initial screenshot...');
  setTimeout(() => {
    console.log('Taking delayed initial screenshot...');
    captureAndAnalyze();
  }, 2000);

  screenshotTimer = setInterval(() => {
    console.log('⏰ Timer triggered, capturing screenshot...');
    captureAndAnalyze();
  }, intervalMs);

  console.log('✅ Screenshot timer started successfully');
}

async function captureAndAnalyze() {
  if (!isActive) {
    console.log('🔴 Extension is not active, skipping analysis');
    return;
  }

  console.log('🟢 Starting screenshot capture and analysis...');

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
          isEntertainment
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('📈 Analysis result:', {
        unproductive: result.unproductive,
        productivityScore: result.productivityScore,
        message: result.message
      });

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

      // Check if notification is needed
      if (result.unproductive || result.productivityScore < settings.threshold) {
        console.log('⚠️ Low productivity detected, preparing notification...');
        const notificationContext = {
          url: tab.url,
          tabTitle: tab.title,
          productivityScore: result.productivityScore,
          taskContext: taskContext,
          interventionStyle: settings.interventionStyle,
          geminiApiKey: settings.geminiApiKey
        };

        let message = result.message || `Productivity: ${result.productivityScore}%`;
        if (settings.useGemini && settings.geminiApiKey) {
          const geminiMessage = await generateGeminiMessage(notificationContext);
          if (geminiMessage) {
            message = geminiMessage;
          }
        }

        await sendNotification(
          'Productivity Alert',
          message,
          notificationContext
        );
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

// Initialize extension
async function initializeExtension() {
  console.log('🔄 Initializing extension...');

  try {
    // Load settings from storage
    const data = await chrome.storage.local.get(['settings', 'isActive']);
    console.log('📦 Loaded data from storage:', data);

    if (data.settings) {
      settings = { ...settings, ...data.settings };
      console.log('⚙️ Updated settings:', settings);
    }

    if (typeof data.isActive !== 'undefined') {
      isActive = data.isActive;
      console.log('🔄 Updated active state:', isActive);
    }

    // Start the screenshot timer
    startScreenshotTimer();

    console.log('✅ Extension initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing extension:', error);
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

// Initialize immediately for development
initializeExtension();

// Debug logging
console.log('🚀 Background script loaded');

// Log successful initialization
console.log("✅ Service worker initialized successfully");
