const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Ensure build directory exists
const buildDir = path.join(__dirname, 'build');
if (fs.existsSync(buildDir)) {
  fs.rmSync(buildDir, { recursive: true });
}
fs.mkdirSync(buildDir);

// First run Vite build for the popup
console.log('Building popup with Vite...');
try {
  execSync('npx vite build', { stdio: 'inherit' });
} catch (error) {
  console.error('Popup build failed:', error);
  process.exit(1);
}

console.log('Copying manifest.json...');
fs.copyFileSync(
  path.join(__dirname, 'manifest.json'),
  path.join(buildDir, 'manifest.json')
);

// Process and write background script
console.log('Processing background script...');
const backgroundPath = path.join(__dirname, 'public', 'background.js');
const backgroundContent = fs.readFileSync(backgroundPath, 'utf8');

// Write the background script
console.log('Writing background script...');
fs.writeFileSync(
  path.join(buildDir, 'background.js'),
  backgroundContent
);

// Copy other public files (except JS)
console.log('Copying public files...');
const publicDir = path.join(__dirname, 'public');
fs.readdirSync(publicDir).forEach(file => {
  const sourcePath = path.join(publicDir, file);
  const targetPath = path.join(buildDir, file);

  if (fs.statSync(sourcePath).isFile() && !file.endsWith('.js')) {
    fs.copyFileSync(sourcePath, targetPath);
  }
});

// Copy static assets from src if they exist
const srcAssetsDir = path.join(__dirname, 'src', 'assets');
if (fs.existsSync(srcAssetsDir)) {
  console.log('Copying src assets...');
  const buildAssetsDir = path.join(buildDir, 'assets');
  if (!fs.existsSync(buildAssetsDir)) {
    fs.mkdirSync(buildAssetsDir);
  }
  fs.readdirSync(srcAssetsDir).forEach(file => {
    fs.copyFileSync(
      path.join(srcAssetsDir, file),
      path.join(buildAssetsDir, file)
    );
  });
}

console.log('Build completed successfully!');