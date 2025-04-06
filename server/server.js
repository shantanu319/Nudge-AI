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
// Add your API key directly here
const API_KEY = 'AIzaSyDIJmvCa8bkonKAWrgodywFa4INAWMADwM'; //

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

    // Get task information from request if available
    const { taskContext, hasTasks, interventionStyle } = req.body;

    // Prepare request to Gemini API
    const payload = {
      contents: [
        {
          parts: [
            {
              text: `Analyze this screenshot from ${title} (${url}) and determine if the user is being productive or distracted. Provide a productivity score between 0-100 where higher means more productive.\n\n${hasTasks ? `The user has the following tasks to work on:\n${taskContext}\n` : ''}${interventionStyle ? `User has selected "${interventionStyle.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}" focus guardian style (${getInterventionStyleDescription(interventionStyle)}).\n\n` : ''}Use these criteria:\n
              1. Is this work/study related content?\n
              2. Is this something that might be distracting the user from work?\n${hasTasks ? `              3. Is the content relevant to any of the user's tasks, especially the focus task?\n              4. For tasks with higher intensity/priority or less time remaining, content relevance is more important.\n` : ''}
              ${!hasTasks ? '3' : '5'}. Does this appear to be social media, entertainment, or games?\n
              A score below ${threshold || 50} is considered unproductive.\n${hasTasks ? '\nConsider both general productivity AND specific task relevance in your assessment. Content that directly relates to active tasks should receive a higher score, with more weight given to urgent (less time left) and important (higher intensity) tasks.\n' : ''}\n
              Return ONLY a JSON object with these fields:\n
              {\n
                "productivityScore": number between 0-100,\n
                "unproductive": boolean based on threshold,\n${hasTasks ? '                "relevantTasks": array of task titles that this content is relevant to,\n' : ''}
                "message": a one-line message ${hasTasks ? 'explaining the relevance to tasks or ' : ''}if unproductive, explaining why\n
              }\n`
            },
            {
              inline_data: {
                mime_type: 'image/jpeg',
                data: base64Data
              }
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 100
      }
    };

    // Call the Gemini API
    console.log('🌐 Sending request to Gemini API...');

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
      unproductive,
      productivityScore: analysis.productivityScore,
      message: unproductive ? analysis.message : '',
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
