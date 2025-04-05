import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Initialize environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Get directory name in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increase limit for image data

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Google Gemini API endpoint
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent';
// Add your API key directly here
const API_KEY = 'AIzaSyDIJmvCa8bkonKAWrgodywFa4INAWMADwM'; // Replace with your actual API key

// Helper function to log data for debugging
function logData(data, fileName) {
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  const logPath = path.join(logsDir, `${fileName}-${timestamp}.json`);
  fs.writeFileSync(logPath, JSON.stringify(data, null, 2));
}

// Endpoint to receive screenshot data
app.post('/analyze', async (req, res) => {
  try {
    const { image, url, title, threshold } = req.body;
    
    if (!image) {
      return res.status(400).json({ error: 'No image provided' });
    }
    
    console.log(`Analyzing screenshot from: ${title} (${url})`);
    
    // If API key is not set, return mock data for development
    if (!API_KEY) {
      console.warn('No API key found. Using mock data. Set GEMINI_API_KEY in .env file.');
      const mockResult = Math.random() > 0.7;
      return res.json({ 
        unproductive: mockResult,
        message: mockResult ? 'This looks like an unproductive site.' : 'Continuing productive work.'
      });
    }
    
    // Extract base64 data from data URL
    const base64Data = image.split(',')[1];
    
    // Prepare request to Gemini API
    const payload = {
      contents: [{
        parts: [
          {
            text: `Analyze this screenshot and determine if the user is engaging in productive or unproductive behavior. 
            The user is currently on ${url} with the page title "${title}".
            Consider the following:
            1. Is this website typically used for professional work, education, or productive tasks?
            2. Does the content visible suggest the user is working or being distracted?
            3. Based on your analysis, would nudging the user to refocus be appropriate?
            
            Rate the productivity on a scale of 0-100, where 0 is completely unproductive and 100 is highly productive.
            Then provide a short, supportive message if the user should refocus.
            
            Response format:
            {
              "productivityScore": [0-100],
              "analysis": "[brief explanation]",
              "message": "[supportive message if score < ${threshold}, otherwise empty]"
            }`
          },
          {
            inline_data: {
              mime_type: "image/jpeg",
              data: base64Data
            }
          }
        ]
      }],
      generationConfig: {
        temperature: 0.2,
        topK: 32,
        topP: 0.95,
        maxOutputTokens: 1024,
      }
    };
    
    // Call the Gemini API
    const response = await fetch(`${GEMINI_API_URL}?key=${API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    const result = await response.json();
    
    // Log the API response for debugging (in development)
    // logData(result, 'gemini-response');
    
    // Extract the analysis from the response
    let analysis = {};
    
    try {
      if (result.candidates && result.candidates[0].content.parts[0].text) {
        const responseText = result.candidates[0].content.parts[0].text;
        
        // Try to extract JSON from the response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        
        if (jsonMatch) {
          analysis = JSON.parse(jsonMatch[0]);
        } else {
          // If no JSON format, try to extract the score
          const scoreMatch = responseText.match(/productivityScore"?\s*:\s*(\d+)/);
          const messageMatch = responseText.match(/message"?\s*:\s*"([^"]*)"/);
          
          analysis = {
            productivityScore: scoreMatch ? parseInt(scoreMatch[1]) : 50,
            message: messageMatch ? messageMatch[1] : 'Consider refocusing on your tasks.'
          };
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
    
    // Determine if the behavior is unproductive based on threshold
    const unproductive = analysis.productivityScore < threshold;
    
    console.log(`Analysis result: Score ${analysis.productivityScore}, Unproductive: ${unproductive}`);
    
    // Return the result to the extension
    return res.json({
      unproductive,
      productivityScore: analysis.productivityScore,
      message: unproductive ? analysis.message : ''
    });
  } catch (error) {
    console.error('Error analyzing image:', error);
    res.status(500).json({ error: 'Internal server error' });
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
