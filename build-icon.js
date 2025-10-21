// Simple SVG to PNG converter for icon
const fs = require('fs');
const path = require('path');

// Read SVG content
const svgContent = fs.readFileSync('favicon.svg', 'utf8');

// For now, we'll just copy the SVG to public and note that manual conversion is needed
// In production, you would use a proper SVG-to-PNG converter

console.log('SVG icon found. To create proper PNG icons for Windows:');
console.log('1. Use an online tool like https://cloudconvert.com/svg-to-png');
console.log('2. Convert favicon.svg to 256x256 PNG');
console.log('3. Save as public/icon.png');
console.log('');
console.log('Alternatively, install electron-icon-builder:');
console.log('npm install --save-dev electron-icon-builder');
console.log('Then run: npx electron-icon-builder --input=./favicon.svg --output=./public');
