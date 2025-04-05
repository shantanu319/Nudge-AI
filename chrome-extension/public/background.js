let currentRules = [];
let settings = {
  interval: 5,  // Default: 5 minutes
  threshold: 50  // Default: 50% threshold for unproductive
};
let isActive = true;
let screenshotTimer = null;

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
  }
});

// Initialization
chrome.storage.local.get([
  'settings',
  'isActive',
  'productivityStats',
  'blockedRules'
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

  startScreenshotTimer();
});

// Timer management
function startScreenshotTimer() {
  if (screenshotTimer) clearInterval(screenshotTimer);

  if (isActive) {
    const intervalMs = settings.interval * 60 * 1000;
    screenshotTimer = setInterval(captureAndAnalyze, intervalMs);
    console.log(`Screenshot timer started: ${settings.interval} minutes`);
  }
}

// Core analysis function
async function captureAndAnalyze() {
  if (!isActive) return;

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Skip blocked sites
    if (tab.url && currentRules.some(rule =>
      new URL(tab.url).hostname.includes(
        rule.condition.urlFilter.replace('||', '')
      )
    )) {
      console.log('Skipping analysis on blocked site');
      return;
    }

    if (!tab || tab.url.startsWith('chrome://')) return;

    chrome.tabs.captureVisibleTab(null, { format: 'jpeg', quality: 50 }, async (dataUrl) => {
      if (chrome.runtime.lastError) return;

      try {
        const response = await fetch('http://localhost:3001/analyze', {
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
        chrome.storage.local.get(['productivityStats'], (data) => {
          const stats = data.productivityStats || { productive: 0, unproductive: 0 };
          result.unproductive ? stats.unproductive++ : stats.productive++;

          if (result.unproductive) {
            chrome.notifications.create('', {
              title: 'Time to refocus!',
              message: result.message || 'Consider switching tasks',
              iconUrl: 'icon48.png',
              type: 'basic'
            });
          }

          chrome.storage.local.set({ productivityStats: stats });
        });
      } catch (error) {
        console.error('Analysis error:', error);
      }
    });
  } catch (error) {
    console.error('Capture error:', error);
  }
}

// Initial capture
setTimeout(captureAndAnalyze, 5000);
