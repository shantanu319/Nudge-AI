// Default settings
let settings = {
  interval: 5,  // Default: 5 minutes
  threshold: 50  // Default: 50% threshold for unproductive
};

let isActive = true;
let screenshotTimer = null;

// Initialize from storage
chrome.storage.local.get(['settings', 'isActive', 'productivityStats'], (result) => {
  if (result.settings) {
    settings = result.settings;
  } else {
    // Save default settings if none exist
    chrome.storage.local.set({ settings });
  }
  
  if (result.isActive !== undefined) {
    isActive = result.isActive;
  } else {
    // Save default active state if none exists
    chrome.storage.local.set({ isActive });
  }
  
  if (!result.productivityStats) {
    // Initialize stats if they don't exist
    chrome.storage.local.set({ productivityStats: { productive: 0, unproductive: 0 } });
  }
  
  // Start the screenshot timer with current settings
  startScreenshotTimer();
});

// Function to start or restart the screenshot timer with current settings
function startScreenshotTimer() {
  // Clear any existing timer
  if (screenshotTimer) {
    clearInterval(screenshotTimer);
  }
  
  // Only start a new timer if the extension is active
  if (isActive) {
    const intervalMs = settings.interval * 60 * 1000;
    screenshotTimer = setInterval(captureAndAnalyze, intervalMs);
    console.log(`Screenshot timer started with interval: ${settings.interval} minutes`);
  } else {
    console.log('Screenshot timer not started because extension is inactive');
  }
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
  }
});

async function captureAndAnalyze() {
  if (!isActive) return;
  
  try {
    // Get the current active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab) {
      console.log('No active tab found');
      return;
    }
    
    // Skip chrome:// and extension:// pages
    if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
      console.log('Skipping screenshot for', tab.url);
      return;
    }
    
    console.log('Capturing screenshot of:', tab.url);
    
    // Capture the visible tab
    chrome.tabs.captureVisibleTab(null, { format: 'jpeg', quality: 50 }, async (dataUrl) => {
      if (chrome.runtime.lastError) {
        console.error("Screenshot error:", chrome.runtime.lastError);
        return;
      }

      // Send screenshot data to backend for analysis
      try {
        const response = await fetch('http://localhost:3000/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            image: dataUrl,
            url: tab.url,
            title: tab.title,
            threshold: settings.threshold
          })
        });
        
        const result = await response.json();

        // Update stats based on analysis result
        chrome.storage.local.get(['productivityStats'], (data) => {
          const stats = data.productivityStats || { productive: 0, unproductive: 0 };
          
          if (result.unproductive) {
            stats.unproductive++;
            
            // Create a notification if unproductive
            chrome.notifications.create('', {
              title: 'Time to refocus!',
              message: result.message || 'Your current activity seems unproductive. Consider switching tasks.',
              iconUrl: 'icon48.png',
              type: 'basic'
            });
          } else {
            stats.productive++;
          }
          
          // Save updated stats
          chrome.storage.local.set({ productivityStats: stats });
        });
      } catch (error) {
        console.error('Error sending to backend:', error.message);
      }
    });
  } catch (error) {
    console.error('Error during screenshot capture:', error);
  }
}

// Run once on startup to capture initial state
setTimeout(captureAndAnalyze, 5000);
