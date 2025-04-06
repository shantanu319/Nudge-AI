// notifications.js - Gemini Integrated
console.log('📢 Notifications module loading...');

const ACTIVE_NOTIFICATIONS = new Map();
const GEMINI_CACHE = new Map();
const CACHE_DURATION = 12 * 60 * 60 * 1000; // 12-hour cache

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
