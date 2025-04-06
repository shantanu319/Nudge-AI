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
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
// Get API key from environment variables
const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  console.error('❌ GEMINI_API_KEY not found in environment variables');
  console.error('Please create a .env file in the server directory with your API key');
  process.exit(1);
}

console.log('✅ API Key configured successfully');

/**
 * Returns a description of the intervention style for the Gemini prompt
 * @param {string} style - The intervention style
 * @returns {string} - A description of how to evaluate productivity
 */
function getInterventionStyleDescription(style) {
  switch (style) {
    case 'drill_sergeant':
      return 'very strict productivity evaluation, flag even minor distractions';
    case 'vigilant_mentor':
      return 'strict productivity evaluation with minimal tolerance for distractions';
    case 'steady_coach':
      return 'balanced productivity evaluation, moderate tolerance for brief distractions';
    case 'patient_guide':
      return 'lenient productivity evaluation, higher tolerance for distractions';
    case 'zen_observer':
      return 'very lenient productivity evaluation, only flag significant distractions';
    default:
      return 'balanced productivity evaluation';
  }
}



// Endpoint to receive screenshot data
app.post('/analyze', async (req, res) => {
  try {
    const { image, url, title, threshold } = req.body;

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
    const { taskContext, hasTasks, interventionStyle, isEntertainment, timeSpent, timeOfDay, lastNotificationTime, previousDismissals, batteryStatus, siteCategory, timeSinceFirstSeen } = req.body;

    // Don't notify if we just started tracking
    if (timeSinceFirstSeen < 1) { // Less than 1 minute
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
- Battery status: ${batteryStatus || 'unknown'}
${hasTasks ? `- Active tasks:\n${taskContext}\n` : '- No active tasks'}
- Focus style: ${interventionStyle ? `${interventionStyle.replace('_', ' ')} (${getInterventionStyleDescription(interventionStyle)})` : 'default'}

Thresholds by category (standard | off-peak):
- Streaming: 60min | 90min
- Gaming: 15min | 30min
- Social Media: 20min | 40min
- News/Forums: 30min | 45min
- Shopping: 25min | 40min
- Productivity: no limit

Context Modifiers:
- Work hours (9am-5pm): -30% time
- Charging: +50% time
- Previous dismissals: +5min per dismiss

Important Rules:
1. DO NOT send notifications if time_spent is 0 or if site was just opened
2. First notification at 50% of threshold
3. Final notification at 100% of threshold
4. Minimum 5 minutes between notifications
5. Consider work hours and battery status when calculating thresholds

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
        temperature: 0.4,
        maxOutputTokens: 150
      }
    };

    // Log request details for debugging
    console.log('🌐 Sending request to Gemini API...');
    console.log('📝 Request payload structure:', {
      ...payload,
      contents: [{
        ...payload.contents[0],
        parts: [
          payload.contents[0].parts[0],
          { ...payload.contents[0].parts[1], inline_data: { ...payload.contents[0].parts[1].inline_data, data: '[REDACTED]' } }
        ]
      }]
    });

    // Call the Gemini API
    let result;
    try {
      // Make sure API key is appended to URL
      const apiUrl = `${GEMINI_API_URL}?key=${API_KEY}`;
      console.log('Using API URL:', apiUrl.replace(API_KEY, 'REDACTED'));

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      console.log(`🔄 Gemini API response status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        // Get error details from response
        const errorText = await response.text();
        console.error('Gemini API Error details:', errorText);
        throw new Error(`Gemini API returned status ${response.status}: ${response.statusText}`);
      }

      result = await response.json();
      console.log('✅ Successfully received Gemini API response data');

      // Check if we got a proper response structure
      if (!result.candidates || !result.candidates.length) {
        console.error('❌ Unexpected Gemini API response format:', JSON.stringify(result).substring(0, 300));
        throw new Error('Invalid response format from Gemini API');
      }

      // Log the API response for debugging
      console.log('✅ Gemini API received and processed screenshot');
      console.log(`🖼️ Screenshot from: ${url} (${title})`);

      // Always log partial response for debugging
      if (result.candidates && result.candidates[0] && result.candidates[0].content.parts[0].text) {
        console.log('📊 Gemini response preview:');
        console.log(result.candidates[0].content.parts[0].text.substring(0, 300) + '...');
      } else {
        console.error('⚠️ Unexpected Gemini response structure:', JSON.stringify(result).substring(0, 300));
      }
    } catch (apiError) {
      console.error('❌ Gemini API Error:', apiError.message);
      throw apiError; // Re-throw to be caught by the outer try-catch
    }

    // Extract the analysis from the response
    let analysis = {};
    console.log('🔍 Processing Gemini response...');

    try {
      if (result.candidates && result.candidates[0].content.parts[0].text) {
        const responseText = result.candidates[0].content.parts[0].text;
        console.log('Raw Gemini response:', responseText.substring(0, 300) + '...');

        // Try to extract JSON from the response
        const jsonMatch = responseText.match(/\{[\s\S]*?\}/);

        if (jsonMatch) {
          try {
            analysis = JSON.parse(jsonMatch[0]);
            console.log('Successfully parsed JSON response:', analysis);

            // Validate and fix the notification message if needed
            if (analysis.shouldNotify && analysis.notificationMessage) {
              // Extract time mentioned in message (if any)
              const messageTimeMatch = analysis.notificationMessage.match(/(\d+)\s*minutes?/i);
              if (messageTimeMatch && parseInt(messageTimeMatch[1]) !== timeSpent) {
                // Replace incorrect time with actual time spent
                analysis.notificationMessage = analysis.notificationMessage.replace(
                  /\d+\s*minutes?/i,
                  `${timeSpent} minute${timeSpent === 1 ? '' : 's'}`
                );
                console.log('Fixed time in notification message:', analysis.notificationMessage);
              }
            }
          } catch (jsonError) {
            console.error('Error parsing JSON:', jsonError);
            // Fallback to regex extraction
            const scoreMatch = responseText.match(/productivityScore"?\s*:\s*(\d+)/);
            const messageMatch = responseText.match(/message"?\s*:\s*"([^"]*)"/);

            analysis = {
              productivityScore: scoreMatch ? parseInt(scoreMatch[1]) : 50,
              message: messageMatch ? messageMatch[1] : 'Consider refocusing on your tasks.'
            };
            console.log('Extracted via regex:', analysis);
          }
        } else {
          // Direct score extraction without JSON
          console.log('No JSON found, trying manual extraction');
          // Try different regex patterns
          let scoreMatch = responseText.match(/productivityScore"?\s*:\s*(\d+)/) ||
            responseText.match(/productivity\s*score\s*[=:]\s*(\d+)/i) ||
            responseText.match(/\b(\d{1,2}|100)\s*\/\s*100\b/) ||
            responseText.match(/\bscore\s*:\s*(\d+)\b/i);

          let messageMatch = responseText.match(/message"?\s*:\s*"([^"]*)"/) ||
            responseText.match(/message[:\.]\s*(.+?)(?:\.|\n)/);

          // If no clear score found, estimate from text sentiment
          let score = 50; // Default score
          if (scoreMatch && scoreMatch[1]) {
            score = parseInt(scoreMatch[1]);
          } else if (responseText.toLowerCase().includes('unproductive') ||
            responseText.toLowerCase().includes('distract')) {
            score = 30; // Likely unproductive
          } else if (responseText.toLowerCase().includes('productive') ||
            responseText.toLowerCase().includes('work')) {
            score = 70; // Likely productive
          }

          analysis = {
            productivityScore: score,
            message: messageMatch ? messageMatch[1] : 'Consider checking your focus.'
          };
          console.log('Manually extracted:', analysis);
        }
      }
    } catch (error) {
      console.error('Error parsing Gemini response:', error);
      // Provide default analysis
      analysis = {
        productivityScore: 50,
        message: 'Consider checking your current focus and priorities.'
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
    return res.json({
      unproductive: analysis.productivityScore < threshold,
      productivityScore: analysis.productivityScore,
      shouldNotify: analysis.shouldNotify || false,
      notificationMessage: analysis.notificationMessage || '',
      suggestedBlockDuration: analysis.suggestedBlockDuration || 30,
      reason: analysis.reason || '',
      timeSpent,
      processed: true,
      timestamp: new Date().toISOString()
    });
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
