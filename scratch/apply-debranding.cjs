const fs = require('fs');
const path = require('path');
const { decodePNG, encodePNG } = require('./png-utils.cjs');

console.log('=== Applying NASA Branding Removal ===');

// 1. Update public/assets/environment/props/prop-flag-nasa.png
console.log('1. Updating public/assets/environment/props/prop-flag-nasa.png...');
const flagData = fs.readFileSync('scratch/flag-v5.png');
fs.writeFileSync('public/assets/environment/props/prop-flag-nasa.png', flagData);
console.log('   ✓ Updated prop-flag-nasa.png');

// 2. Update public/assets/buildings/habitat.png
console.log('2. Updating public/assets/buildings/habitat.png...');
const habData = fs.readFileSync('scratch/habitat-preview-v2.png');
fs.writeFileSync('public/assets/buildings/habitat.png', habData);
console.log('   ✓ Updated habitat.png');

// 3. Update public/assets/environment/sprite-sheets/environmental-props.png
console.log('3. Updating public/assets/environment/sprite-sheets/environmental-props.png...');
const sheet = decodePNG('public/assets/environment/sprite-sheets/environmental-props.png');
const flag = decodePNG('public/assets/environment/props/prop-flag-nasa.png');

// Copy 232x340 flag into sheet at (1918, 183)
const startX = 1918;
const startY = 183;
for (let y = 0; y < flag.height; y++) {
  for (let x = 0; x < flag.width; x++) {
    const fIdx = (y * flag.width + x) * 4;
    const sIdx = ((startY + y) * sheet.width + (startX + x)) * 4;
    sheet.raw[sIdx] = flag.raw[fIdx];
    sheet.raw[sIdx + 1] = flag.raw[fIdx + 1];
    sheet.raw[sIdx + 2] = flag.raw[fIdx + 2];
    sheet.raw[sIdx + 3] = flag.raw[fIdx + 3];
  }
}
fs.writeFileSync(
  'public/assets/environment/sprite-sheets/environmental-props.png',
  encodePNG(sheet.width, sheet.height, sheet.raw)
);
console.log('   ✓ Updated environmental-props.png sprite sheet');

console.log('=== All assets successfully updated! ===');
