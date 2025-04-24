# Productivity Nudge Chrome Extension

A Chrome extension that periodically takes screenshots, processes them with the Google Gemini, then uses notifications and dynamic website blocking to keep you on task.
Devpost: https://devpost.com/software/nudge-ai?ref_content=my-projects-tab&ref_feature=my_projects

## Project Structure

- **chrome-extension/**: Frontend (Chrome extension with React)
- **server/**: Backend (Node.js/Express server for API integration)

## Features

- Periodically captures screenshots of your browser
- Analyzes screenshot content using Google Gemini API
- Sends notifications when unproductive behavior is detected
- Displays productivity statistics in a React-based popup

## Setup Instructions

### Frontend (Chrome Extension)

1. Navigate to the `chrome-extension` directory
2. Install dependencies: `npm install`
3. Build the extension: `npm run build`
4. Load the extension in Chrome:
   - Go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the `build` folder

### Backend (Server)

1. Navigate to the `server` directory
2. Install dependencies: `npm install`
3. Create a `.env` file with your Google Gemini API key
4. Start the server: `npm start`

## Configuration

You can configure the extension settings via the popup interface, including:
- Screenshot capture frequency
- Productivity threshold settings
- Notification preferences

## Development

This project was created for WildHacks 2025.
