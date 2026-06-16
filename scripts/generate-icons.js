import { existsSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import sharp from 'sharp';
import { execSync } from 'child_process';

// Ensure the required packages are installed
function ensureDependencies() {
  try {
    require.resolve('sharp');
  } catch (e) {
    console.log('Installing sharp...');
    execSync('npm install sharp --save-dev', { stdio: 'inherit' });
  }
}

async function generateIcons() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const publicDir = join(__dirname, '..', 'public');
  const iconsDir = join(publicDir, 'icons');
  const faviconPath = join(publicDir, 'favicon.ico');

  // Create icons directory if it doesn't exist
  if (!existsSync(iconsDir)) {
    mkdirSync(iconsDir, { recursive: true });
  }

  // Define the required icons and their sizes
  const icons = [
    { name: 'logo192.png', size: 192 },
    { name: 'logo512.png', size: 512 },
    { name: 'apple-touch-icon.png', size: 180 },
    { name: 'android-chrome-192x192.png', size: 192 },
    { name: 'android-chrome-512x512.png', size: 512 },
    { name: 'launch-screen.png', size: 1242, height: 2436 } // iPhone X dimensions
  ];

  try {
    // Generate each icon
    for (const icon of icons) {
      const outputPath = join(publicDir, icon.name);
      
      await sharp(faviconPath)
        .resize(icon.size, icon.height || icon.size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 }
        })
        .toFile(outputPath);
      
      console.log(`Generated: ${icon.name}`);
    }

    // Create a simple launch screen background
    const launchScreenPath = join(publicDir, 'launch-screen.png');
    await sharp({
      create: {
        width: 1242,
        height: 2436,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      }
    })
    .composite([
      {
        input: faviconPath,
        gravity: 'center',
        blend: 'over'
      }
    ])
    .toFile(launchScreenPath);

    console.log('All icons generated successfully!');
  } catch (error) {
    console.error('Error generating icons:', error);
    process.exit(1);
  }
}

// Run the script
ensureDependencies();
generateIcons().catch(console.error);
