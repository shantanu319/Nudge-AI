import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import fetch from 'node-fetch';
// import fs from 'fs';

// Initialize environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// // Middleware
app.use(cors({
  origin: '*', // Allows all origins for Chrome extension
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '50mb' })); // Increase limit for image data

// Google Gemini API endpoint (using the latest recommended model for vision)
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
// Get API key from environment variables
const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  console.error('❌ GEMINI_API_KEY not found in environment variables');
  console.error('Please create a .env file in the server directory with your API key');
  process.exit(1);
}

// Setup response cache to avoid repeated API calls for similar screenshots
const responseCache = new Map();
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes in milliseconds
const CACHE_MAX_SIZE = 20; // Maximum number of cached responses

/**
 * Returns a description of the intervention style for the Gemini prompt
 * @param {string} style - The intervention style
 * @returns {string} - A description of how to evaluate productivity
 */
function getInterventionStyleDescription(style) {
  switch (style) {
    case 'drill_sergeant':
      return 'very strict monitoring with short time limits';
    case 'vigilant_mentor':
      return 'strict monitoring with moderate time limits';
    case 'steady_coach':
      return 'balanced monitoring with standard time limits';
    case 'patient_guide':
      return 'lenient monitoring with relaxed time limits';
    case 'zen_observer':
      return 'very lenient monitoring with extended time limits';
    default:
      return 'balanced monitoring';
  }
}


// Clean up expired cache entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of responseCache.entries()) {
    if (now - entry.timestamp > CACHE_EXPIRY) {
      responseCache.delete(key);
    }
  }
}, 60000); // Check every minute

// Endpoint to receive screenshot data
app.post('/analyze', async (req, res) => {
  try {
    const { image, url, title, threshold } = req.body;
    
    // Generate a cache key based on URL and a time window (every 3 minutes)
    const timeWindow = Math.floor(Date.now() / (3 * 60 * 1000));
    const cacheKey = `${url}-${timeWindow}`;
    
    // Check cache first
    if (responseCache.has(cacheKey)) {
      return res.json(responseCache.get(cacheKey).data);
    }

    if (!image) {
      return res.status(400).json({ error: 'No image provided' });
    }

    console.log(`Analyzing screenshot from: ${title} (${url})`);

    // If API key is not set, return an error
    if (!API_KEY) {
      console.error('No API key found. Set GEMINI_API_KEY in .env file.');
      return res.status(500).json({ error: 'API key not configured' });
    }

    // Extract base64 data from data URL
    const base64Data = image.split(',')[1];

    if (!base64Data) {
      console.error('❌ Invalid image data: No base64 content found');
      return res.status(400).json({ error: 'Invalid image data format' });
    }

    // Validate base64 data
    try {
      const buffer = Buffer.from(base64Data, 'base64');
      if (buffer.length === 0) {
        console.error('❌ Invalid image data: Empty buffer after base64 decode');
        return res.status(400).json({ error: 'Invalid image data' });
      }
      console.log(`📊 Image size: ${(buffer.length / 1024).toFixed(2)}KB`);
    } catch (error) {
      console.error('❌ Invalid base64 data:', error);
      return res.status(400).json({ error: 'Invalid image encoding' });
    }

    // Get task information from request if available
    const {
      taskContext,
      hasTasks,
      interventionStyle,
      isEntertainment,
      timeSpent,
      timeOfDay,
      lastNotificationTime,
      previousDismissals,
      siteCategory,
      timeSinceFirstSeen
    } = req.body;

    // Don't notify if we just started tracking
    if (timeSinceFirstSeen < 0.1) { // Less than 1 minute
      console.log('Site recently opened, skipping notification');
      return res.json({
        productivityScore: 50,
        shouldNotify: false,
        notificationMessage: '',
        suggestedBlockDuration: 0,
        reason: 'Site recently opened',
        processed: true,
        timestamp: new Date().toISOString()
      });
    }

    // Prepare request to Gemini API
    const payload = {
      contents: [{
        parts: [
          {
            text: `As a smart productivity assistant, analyze this screenshot and context to determine if a notification is needed and craft an appropriate message.

Site Info:
- URL: ${url}
- Title: ${title}
- Category: ${siteCategory || (isEntertainment ? 'entertainment' : 'unknown')}
- Time spent: ${timeSpent || '0'} minutes
- Time since first opened: ${timeSinceFirstSeen} minutes
- Previous dismissals: ${previousDismissals || 0} in the last week

Context:
- Time of day: ${timeOfDay || new Date().toLocaleTimeString()}
- Last notification: ${lastNotificationTime ? `${Math.floor((Date.now() - lastNotificationTime) / 60000)} minutes ago` : 'never'}
${hasTasks ? `- Active tasks:\n${taskContext}\n` : '- No active tasks'}
- Focus style: ${interventionStyle ? `${interventionStyle.replace('_', ' ')} (${getInterventionStyleDescription(interventionStyle)})` : 'default'}

Important Rules:
1. DO NOT send notifications if time_spent is 0 or if site was just opened
2. DO NOT send notifications during meetings unless it's a very long entertainment session
3. Be more lenient right before scheduled meetings (within 15 minutes)
4. Message tone should match the intervention style:
   - Drill Sergeant: Direct and urgent
   - Vigilant Mentor: Firm but supportive
   - Steady Coach: Balanced and encouraging
   - Patient Guide: Gentle and understanding
   - Zen Observer: Very mild suggestions

Based on this context, determine:
1. Should we send a notification now?
2. If yes, what's the appropriate message and block duration?
3. What's the current productivity score?

Return ONLY a JSON object:
{
  "productivityScore": number 0-100,
  "shouldNotify": boolean,
  "notificationMessage": string (if shouldNotify),
  "suggestedBlockDuration": number (minutes, if shouldNotify),
  "reason": string (brief explanation of decision)
}`
          },
          {
            inline_data: {
              mime_type: 'image/jpeg',
              data: base64Data
            }
          }
        ]
      }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 300
      }
    };

    try {
      // Make sure API key is appended to URL
      const apiUrl = `${GEMINI_API_URL}?key=${API_KEY}`;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        // Get error details from response
        const errorText = await response.text();
        throw new Error(`API request failed with status ${response.status}`);
      }

      const data = await response.json();

      // Extract parts from the response
      if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
        throw new Error('Invalid API response format');
      }

      // Extract the analysis from the response
      let analysis = {};
      const responseContent = data.candidates[0].content.parts[0].text;

      // Try to extract JSON from the response
      const jsonMatch = responseContent.match(/\{[\s\S]*?\}/);

      if (jsonMatch) {
        try {
          analysis = JSON.parse(jsonMatch[0]);
        } catch (jsonError) {
          console.error('Error parsing JSON:', jsonError);
          // Fallback to regex extraction
          const scoreMatch = responseContent.match(/productivityScore"?\s*:\s*(\d+)/);
          const messageMatch = responseContent.match(/message"?\s*:\s*"([^"]*)"/);

          analysis = {
            productivityScore: scoreMatch ? parseInt(scoreMatch[1]) : 50,
            message: messageMatch ? messageMatch[1] : 'Consider refocusing on your tasks.'
          };
        }
      } else {
        // Direct score extraction without JSON
        console.log('No JSON found, trying manual extraction');
        // Try different regex patterns
        let scoreMatch = responseContent.match(/productivityScore"?\s*:\s*(\d+)/) ||
          responseContent.match(/productivity\s*score\s*[=:]\s*(\d+)/i) ||
          responseContent.match(/\b(\d{1,2}|100)\s*\/\s*100\b/) ||
          responseContent.match(/\bscore\s*:\s*(\d+)\b/i);

        let messageMatch = responseContent.match(/message"?\s*:\s*"([^"]*)"/) ||
          responseContent.match(/message[:\.]\s*(.+?)(?:\.|\n)/);

        // If no clear score found, estimate from text sentiment
        let score = 50; // Default score
        if (scoreMatch && scoreMatch[1]) {
          score = parseInt(scoreMatch[1]);
        } else if (responseContent.toLowerCase().includes('unproductive') ||
          responseContent.toLowerCase().includes('distract')) {
          score = 30; // Likely unproductive
        } else if (responseContent.toLowerCase().includes('productive') ||
          responseContent.toLowerCase().includes('work')) {
          score = 70; // Likely productive
        }

        analysis = {
          productivityScore: score,
          message: messageMatch ? messageMatch[1] : 'Consider checking your focus.'
        };
      }

      // Set a default productivity score if undefined
      if (analysis.productivityScore === undefined) {
        console.warn('Productivity score was undefined, using default of 50');
        analysis.productivityScore = 50;
      }

      // Make sure the score is a number between 0-100
      analysis.productivityScore = Math.max(-1, Math.min(100, parseInt(analysis.productivityScore) || 50));

      // Determine if the behavior is unproductive based on threshold
      const unproductive = analysis.productivityScore < threshold;

      console.log(`📋 Analysis complete - Score: ${analysis.productivityScore}, Unproductive: ${unproductive}`);
      if (unproductive) {
        console.log(`📝 Feedback: "${analysis.message || 'Consider refocusing'}"`);
      }

      // Return the result to the extension with a confirmation flag
      const result = {
        productivityScore: analysis.productivityScore,
        shouldNotify: analysis.shouldNotify || false,
        reason: analysis.reason || '',
        notificationMessage: analysis.notificationMessage || '',
        suggestedBlockDuration: analysis.suggestedBlockDuration || 30
      };

      // Cache the result
      if (responseCache.size >= CACHE_MAX_SIZE) {
        // Remove oldest entry
        const oldestKey = responseCache.keys().next().value;
        responseCache.delete(oldestKey);
      }
      
      responseCache.set(cacheKey, {
        timestamp: Date.now(),
        data: result
      });

      res.json(result);
    } catch (apiError) {
      console.error('❌ Gemini API Error:', apiError.message);
      throw apiError; // Re-throw to be caught by the outer try-catch
    }
  } catch (error) {
    console.error('❌ Error analyzing image:', error.message);
    console.error('Error details:', error.stack || error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Simple health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API Key ${API_KEY ? 'is' : 'is NOT'} configured`);
});
