const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function generateIcons() {
  const svgBuffer = fs.readFileSync('favicon.svg');

  // Create build directory if it doesn't exist
  if (!fs.existsSync('build')) {
    fs.mkdirSync('build', { recursive: true });
  }

  console.log('Generating icons from favicon.svg...');

  // Generate different sizes for Windows
  const sizes = [16, 24, 32, 48, 64, 128, 256, 512, 1024];

  for (const size of sizes) {
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(path.join('build', `icon_${size}x${size}.png`));
    console.log(`✓ Generated ${size}x${size} icon`);
  }

  // Generate main icon (256x256 for Windows)
  await sharp(svgBuffer)
    .resize(256, 256)
    .png()
    .toFile('build/icon.png');
  console.log('✓ Generated build/icon.png (256x256)');

  // Copy to public for web use
  if (!fs.existsSync('public')) {
    fs.mkdirSync('public', { recursive: true });
  }

  await sharp(svgBuffer)
    .resize(256, 256)
    .png()
    .toFile('public/icon.png');
  console.log('✓ Generated public/icon.png (256x256)');

  console.log('\n✅ Icon generation complete!');
  console.log('Icons saved in build/ directory');
}

generateIcons().catch(console.error);
