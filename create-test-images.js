const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

// Create test images of different sizes and formats
function createTestImage(width, height, filename, format = 'png') {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  
  // Create a colorful gradient background
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#ff6b6b');
  gradient.addColorStop(0.25, '#4ecdc4');
  gradient.addColorStop(0.5, '#45b7d1');
  gradient.addColorStop(0.75, '#96ceb4');
  gradient.addColorStop(1, '#feca57');
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  
  // Add some texture patterns
  ctx.fillStyle = '#ffffff';
  ctx.globalAlpha = 0.1;
  for (let i = 0; i < 100; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const radius = Math.random() * 20 + 5;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  
  // Add some geometric shapes
  ctx.globalAlpha = 0.3;
  ctx.fillStyle = '#000000';
  for (let i = 0; i < 20; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const size = Math.random() * 50 + 10;
    ctx.fillRect(x, y, size, size);
  }
  
  // Add text overlay to simulate content
  ctx.globalAlpha = 0.8;
  ctx.fillStyle = '#333333';
  ctx.font = `${Math.max(16, width / 40)}px Arial`;
  ctx.fillText(`Test Image ${width}x${height}`, 20, 40);
  ctx.fillText('Sample content for watermark removal testing', 20, 80);
  
  // Add a simulated watermark area in the center
  const watermarkX = width * 0.4;
  const watermarkY = height * 0.4;
  const watermarkW = width * 0.2;
  const watermarkH = height * 0.2;
  
  ctx.globalAlpha = 0.6;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(watermarkX, watermarkY, watermarkW, watermarkH);
  ctx.fillStyle = '#000000';
  ctx.font = `${Math.max(12, width / 60)}px Arial`;
  ctx.fillText('WATERMARK', watermarkX + 10, watermarkY + watermarkH / 2);
  
  // Save the image
  const buffer = format === 'jpg' ? canvas.toBuffer('image/jpeg', { quality: 0.9 }) : canvas.toBuffer('image/png');
  fs.writeFileSync(filename, buffer);
  console.log(`Created ${filename} (${width}x${height}, ${format.toUpperCase()})`);
}

// Create test images directory if it doesn't exist
const testDir = path.join(__dirname, 'test-images');
if (!fs.existsSync(testDir)) {
  fs.mkdirSync(testDir, { recursive: true });
}

// Create images of different sizes and formats
const images = [
  { width: 300, height: 200, name: 'small-test-image.png', format: 'png' },
  { width: 300, height: 200, name: 'small-test-image.jpg', format: 'jpg' },
  { width: 800, height: 600, name: 'medium-test-image.png', format: 'png' },
  { width: 800, height: 600, name: 'medium-test-image.jpg', format: 'jpg' },
  { width: 1920, height: 1080, name: 'large-test-image.png', format: 'png' },
  { width: 1920, height: 1080, name: 'large-test-image.jpg', format: 'jpg' }
];

images.forEach(img => {
  const filepath = path.join(testDir, img.name);
  createTestImage(img.width, img.height, filepath, img.format);
});

console.log('\nTest images created successfully!');
console.log('Available test images:');
images.forEach(img => {
  const filepath = path.join(testDir, img.name);
  const stats = fs.statSync(filepath);
  console.log(`- ${img.name}: ${img.width}x${img.height} (${Math.round(stats.size / 1024)}KB)`);
});