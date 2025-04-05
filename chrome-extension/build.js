// Simple build script for Chrome Extension
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Ensure build directory exists
const buildDir = path.join(__dirname, 'build');
if (!fs.existsSync(buildDir)) {
  fs.mkdirSync(buildDir);
}

// Copy manifest.json to build directory
console.log('Copying manifest.json...');
fs.copyFileSync(
  path.join(__dirname, 'public', 'manifest.json'),
  path.join(buildDir, 'manifest.json')
);

// Copy background.js to build directory
console.log('Copying background.js...');
fs.copyFileSync(
  path.join(__dirname, 'public', 'background.js'),
  path.join(buildDir, 'background.js')
);

// Copy icon files to build directory
console.log('Copying icon files...');
['icon16.png', 'icon48.png', 'icon128.png'].forEach(icon => {
  fs.copyFileSync(
    path.join(__dirname, 'public', icon),
    path.join(buildDir, icon)
  );
});

// Copy index.html to build directory
console.log('Copying index.html...');
fs.copyFileSync(
  path.join(__dirname, 'public', 'index.html'),
  path.join(buildDir, 'index.html')
);

// Create a simple popup.js for the extension
console.log('Creating popup.js...');
const popupJs = `
document.addEventListener('DOMContentLoaded', function() {
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = \`
      <div style="padding: 20px; min-width: 300px;">
        <h2>Productivity Nudge</h2>
        <p>This extension is monitoring your productivity.</p>
        <div>
          <p><strong>Status:</strong> Active</p>
          <button id="toggleBtn">Pause</button>
        </div>
        <div style="margin-top: 15px;">
          <h3>Settings</h3>
          <div>
            <label for="interval">Check Interval (minutes):</label>
            <select id="interval">
              <option value="1">1</option>
              <option value="3">3</option>
              <option value="5" selected>5</option>
              <option value="10">10</option>
              <option value="15">15</option>
              <option value="30">30</option>
            </select>
          </div>
          <div style="margin-top: 10px;">
            <label for="threshold">Productivity Threshold:</label>
            <input type="range" id="threshold" min="10" max="90" value="50">
            <span id="thresholdValue">50%</span>
          </div>
          <button id="saveBtn" style="margin-top: 10px;">Save Settings</button>
        </div>
      </div>
    \`;

    // Add event listeners
    const toggleBtn = document.getElementById('toggleBtn');
    const saveBtn = document.getElementById('saveBtn');
    const thresholdInput = document.getElementById('threshold');
    const thresholdValue = document.getElementById('thresholdValue');

    // Update threshold value display
    thresholdInput.addEventListener('input', function() {
      thresholdValue.textContent = this.value + '%';
    });

    // Toggle active state
    toggleBtn.addEventListener('click', function() {
      const isActive = toggleBtn.textContent === 'Pause';
      toggleBtn.textContent = isActive ? 'Resume' : 'Pause';
      chrome.runtime.sendMessage({ 
        action: 'toggleActive', 
        isActive: !isActive
      });
    });

    // Save settings
    saveBtn.addEventListener('click', function() {
      const interval = document.getElementById('interval').value;
      const threshold = document.getElementById('threshold').value;
      chrome.runtime.sendMessage({ 
        action: 'updateSettings', 
        settings: {
          interval: Number(interval),
          threshold: Number(threshold)
        }
      });
      alert('Settings saved!');
    });
  }
});
`;

fs.writeFileSync(path.join(buildDir, 'popup.js'), popupJs);

// Create a simple styles.css file
console.log('Creating styles.css...');
const css = `
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  margin: 0;
  padding: 0;
  color: #333;
  background-color: #f7f7f7;
}

h2, h3 {
  margin-top: 0;
}

button {
  background-color: #4285f4;
  color: white;
  border: none;
  padding: 5px 10px;
  border-radius: 4px;
  cursor: pointer;
}

button:hover {
  background-color: #3367d6;
}

select, input {
  padding: 5px;
  border-radius: 4px;
  border: 1px solid #ccc;
}
`;

fs.writeFileSync(path.join(buildDir, 'styles.css'), css);

// Update the index.html file to include popup.js and styles.css
console.log('Updating index.html...');
const htmlContent = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Productivity Nudge</title>
    <link rel="stylesheet" href="styles.css">
  </head>
  <body>
    <div id="root"></div>
    <script src="popup.js"></script>
  </body>
</html>`;

fs.writeFileSync(path.join(buildDir, 'index.html'), htmlContent);

console.log('Build completed successfully!');
