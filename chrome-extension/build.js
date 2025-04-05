// filepath: /Users/Lucas/Desktop/Dev/wildhacks2025/chrome-extension/build.js
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

// Build React app using Vite
console.log('Building React app with Vite...');
execSync('npx vite build', { stdio: 'inherit' });

console.log('Build completed successfully!');