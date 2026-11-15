/**
 * OUTPOST: MARS — Official Game Logo PNG Generator
 *
 * Deterministically generates high-resolution, pixel-perfect PNG assets
 * from the game's vector and SVG brand definitions:
 * - logo.png: Primary horizontal logo (transparent background)
 * - logo-dark.png: Primary horizontal logo (dark mission space HUD background)
 * - logo-emblem.png: Circular game emblem (transparent background)
 * - logo-badge.png: Circular emblem badge with deep space glow
 * - logo-stacked.png: Square / cover hero logo (emblem + title + subtitle)
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { execSync } = require('child_process');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const TEMP_PROFILE = 'C:\\Users\\ankit\\AppData\\Local\\Temp\\chrome_logo_generator';

const publicDir = path.join(__dirname, '..', 'public');
const distDir = path.join(__dirname, '..', 'dist');
const brainDir = 'C:\\Users\\ankit\\.gemini\\antigravity\\brain\\89c30830-20da-42aa-a51d-f64f1e93cdbe';

// Load SVG assets
const faviconSvgRaw = fs.readFileSync(path.join(publicDir, 'favicon.svg'), 'utf8');

// CRC32 table
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c >>> 0;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(12 + len);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);
  const typeAndData = chunk.subarray(4, 8 + len);
  const c = crc32(typeAndData);
  chunk.writeUInt32BE(c, 8 + len);
  return chunk;
}

function encodePNG(width, height, rgbaBuffer) {
  const header = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 6;
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;
  const ihdrChunk = createChunk('IHDR', ihdrData);

  const stride = width * 4;
  const filtered = Buffer.alloc(height * (stride + 1));
  for (let y = 0; y < height; y++) {
    filtered[y * (stride + 1)] = 0;
    rgbaBuffer.copy(filtered, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  const compressed = zlib.deflateSync(filtered, { level: 9 });
  const idatChunk = createChunk('IDAT', compressed);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));
  return Buffer.concat([header, ihdrChunk, idatChunk, iendChunk]);
}

function decodePNG(buf) {
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  let pos = 8;
  const idatChunks = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    if (type === 'IDAT') idatChunks.push(buf.subarray(pos + 8, pos + 8 + len));
    pos += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(idatChunks));
  const bpp = 4;
  const stride = 1 + width * bpp;
  const rgba = Buffer.alloc(width * height * bpp);

  for (let y = 0; y < height; y++) {
    const filter = raw[y * stride];
    const rowIn = y * stride + 1;
    const rowOut = y * width * bpp;
    const prevRowOut = (y - 1) * width * bpp;

    for (let i = 0; i < width * bpp; i++) {
      const x = raw[rowIn + i];
      const a = (i >= bpp) ? rgba[rowOut + i - bpp] : 0;
      const b = (y > 0) ? rgba[prevRowOut + i] : 0;
      const c = (y > 0 && i >= bpp) ? rgba[prevRowOut + i - bpp] : 0;

      let val = 0;
      if (filter === 0) val = x;
      else if (filter === 1) val = (x + a) & 0xff;
      else if (filter === 2) val = (x + b) & 0xff;
      else if (filter === 3) val = (x + Math.floor((a + b) / 2)) & 0xff;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        const pr = (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c);
        val = (x + pr) & 0xff;
      }
      rgba[rowOut + i] = val;
    }
  }
  return { width, height, rgba };
}

function trimAndPad(decoded, pad = 20) {
  const { width, height, rgba } = decoded;
  let minX = width, maxX = 0, minY = height, maxY = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const a = rgba[(y * width + x) * 4 + 3];
      if (a > 8) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < minX || maxY < minY) {
    return decoded; // empty
  }

  const cropX0 = Math.max(0, minX - pad);
  const cropY0 = Math.max(0, minY - pad);
  const cropX1 = Math.min(width - 1, maxX + pad);
  const cropY1 = Math.min(height - 1, maxY + pad);

  const newW = cropX1 - cropX0 + 1;
  const newH = cropY1 - cropY0 + 1;
  const croppedRgba = Buffer.alloc(newW * newH * 4);

  for (let y = 0; y < newH; y++) {
    const srcY = cropY0 + y;
    const srcOffset = (srcY * width + cropX0) * 4;
    const destOffset = (y * newW) * 4;
    rgba.copy(croppedRgba, destOffset, srcOffset, srcOffset + newW * 4);
  }

  return { width: newW, height: newH, rgba: croppedRgba };
}

function renderHtmlScreenshot({ html, width, height, scale = 2 }) {
  const tempHtmlPath = path.join(__dirname, '..', 'scratch', `temp-render-${Date.now()}.html`);
  const tempOutPath = path.join(__dirname, '..', 'scratch', `temp-out-${Date.now()}.png`);

  fs.writeFileSync(tempHtmlPath, html, 'utf8');
  const fileUrl = 'file:///' + tempHtmlPath.replace(/\\/g, '/');

  const cmd = `"${CHROME}" --headless --disable-gpu --no-sandbox --user-data-dir="${TEMP_PROFILE}" --default-background-color=00000000 --virtual-time-budget=3000 --force-device-scale-factor=${scale} --window-size=${width},${height} --screenshot="${tempOutPath}" "${fileUrl}"`;

  execSync(cmd, { stdio: 'pipe' });

  const rawPng = fs.readFileSync(tempOutPath);
  try { fs.unlinkSync(tempHtmlPath); } catch (_) {}
  try { fs.unlinkSync(tempOutPath); } catch (_) {}

  return decodePNG(rawPng);
}

function saveAsset(filename, pngBuffer) {
  const targets = [
    path.join(publicDir, filename),
    path.join(distDir, filename),
    path.join(brainDir, filename)
  ];

  for (const t of targets) {
    try {
      fs.mkdirSync(path.dirname(t), { recursive: true });
      fs.writeFileSync(t, pngBuffer);
      console.log(`Saved ${filename} -> ${t} (${pngBuffer.length} bytes)`);
    } catch (e) {
      console.warn(`Could not write to ${t}:`, e.message);
    }
  }
}

async function run() {
  console.log('--- Generating Official OUTPOST: MARS PNG Logos ---');

  // 1. PRIMARY HORIZONTAL LOGO (Transparent)
  console.log('\n[1/5] Rendering Primary Horizontal Logo (Transparent)...');
  const htmlLogo = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@600;700;800&family=Rajdhani:wght@600;700;800&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: 820px;
      height: 240px;
      background: transparent;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: 'Rajdhani', sans-serif;
    }
    .logo-container {
      display: flex;
      align-items: center;
      gap: 30px;
      padding: 16px 32px;
      position: relative;
    }
    .emblem {
      width: 136px;
      height: 136px;
      flex-shrink: 0;
      filter: drop-shadow(0 0 24px rgba(255, 107, 53, 0.45));
    }
    .emblem svg {
      width: 100%;
      height: 100%;
      display: block;
    }
    .text-group {
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
    .title {
      font-size: 58px;
      font-weight: 800;
      letter-spacing: 5.5px;
      color: #f8fafc;
      text-transform: uppercase;
      line-height: 1;
      text-shadow: 0 4px 18px rgba(0,0,0,0.65);
    }
    .title .colon {
      color: #ff6b35;
    }
    .title .mars {
      color: #ff8552;
      background: linear-gradient(135deg, #ff8552 0%, #ff6b35 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .subtitle {
      margin-top: 10px;
      font-family: 'Inter', sans-serif;
      font-size: 15px;
      font-weight: 700;
      letter-spacing: 3.5px;
      color: #38bdf8;
      text-transform: uppercase;
      display: flex;
      align-items: center;
      gap: 12px;
      opacity: 0.95;
    }
    .bullet {
      color: #64748b;
      font-size: 11px;
    }
    .corner-tl {
      position: absolute;
      top: 0;
      left: 0;
      width: 20px;
      height: 20px;
      border-top: 2.5px solid #38bdf8;
      border-left: 2.5px solid #38bdf8;
      opacity: 0.75;
    }
    .corner-br {
      position: absolute;
      bottom: 0;
      right: 0;
      width: 20px;
      height: 20px;
      border-bottom: 2.5px solid #38bdf8;
      border-right: 2.5px solid #38bdf8;
      opacity: 0.75;
    }
  </style>
</head>
<body>
  <div class="logo-container">
    <div class="corner-tl"></div>
    <div class="emblem">${faviconSvgRaw}</div>
    <div class="text-group">
      <div class="title">OUTPOST<span class="colon">:</span> <span class="mars">MARS</span></div>
      <div class="subtitle">
        <span>NASA MISSION CONTROL</span>
        <span class="bullet">&#9679;</span>
        <span>JEZERO CRATER</span>
      </div>
    </div>
    <div class="corner-br"></div>
  </div>
</body>
</html>`;

  const rawLogo = renderHtmlScreenshot({ html: htmlLogo, width: 820, height: 240, scale: 2 });
  const trimmedLogo = trimAndPad(rawLogo, 24);
  const pngLogoBuf = encodePNG(trimmedLogo.width, trimmedLogo.height, trimmedLogo.rgba);
  saveAsset('logo.png', pngLogoBuf);
  saveAsset('logo-transparent.png', pngLogoBuf);

  // 2. PRIMARY HORIZONTAL LOGO (Dark Space HUD Theme)
  console.log('\n[2/5] Rendering Primary Horizontal Logo (Dark HUD Space Theme)...');
  const htmlLogoDark = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@600;700;800&family=Rajdhani:wght@600;700;800&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: 860px;
      height: 250px;
      background: transparent;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: 'Rajdhani', sans-serif;
    }
    .hud-card {
      width: 820px;
      height: 210px;
      background: radial-gradient(ellipse at 15% 50%, rgba(255, 107, 53, 0.16) 0%, rgba(7, 11, 18, 0) 65%),
                  radial-gradient(ellipse at 85% 50%, rgba(56, 189, 248, 0.12) 0%, rgba(7, 11, 18, 0) 60%),
                  #070b12;
      border: 1.5px solid rgba(56, 189, 248, 0.35);
      border-radius: 12px;
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.7), 0 0 25px rgba(255, 107, 53, 0.15);
      display: flex;
      align-items: center;
      padding: 0 40px;
      gap: 32px;
      position: relative;
    }
    .emblem {
      width: 140px;
      height: 140px;
      flex-shrink: 0;
      filter: drop-shadow(0 0 24px rgba(255, 107, 53, 0.5));
    }
    .emblem svg {
      width: 100%;
      height: 100%;
    }
    .text-group {
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
    .title {
      font-size: 56px;
      font-weight: 800;
      letter-spacing: 5px;
      color: #f8fafc;
      text-transform: uppercase;
      line-height: 1;
    }
    .title .colon {
      color: #ff6b35;
    }
    .title .mars {
      color: #ff8552;
      background: linear-gradient(135deg, #ff8552 0%, #ff6b35 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .subtitle {
      margin-top: 10px;
      font-family: 'Inter', sans-serif;
      font-size: 14px;
      font-weight: 700;
      letter-spacing: 3.5px;
      color: #38bdf8;
      text-transform: uppercase;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .bullet {
      color: #64748b;
      font-size: 10px;
    }
    .mission-badge {
      margin-top: 12px;
      align-self: flex-start;
      font-family: 'Rajdhani', sans-serif;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 2px;
      padding: 3px 10px;
      background: rgba(255, 107, 53, 0.15);
      border: 1px solid rgba(255, 107, 53, 0.45);
      border-radius: 4px;
      color: #fdba74;
    }
    .corner-tl {
      position: absolute;
      top: 6px;
      left: 6px;
      width: 14px;
      height: 14px;
      border-top: 2px solid #38bdf8;
      border-left: 2px solid #38bdf8;
    }
    .corner-br {
      position: absolute;
      bottom: 6px;
      right: 6px;
      width: 14px;
      height: 14px;
      border-bottom: 2px solid #38bdf8;
      border-right: 2px solid #38bdf8;
    }
  </style>
</head>
<body>
  <div class="hud-card">
    <div class="corner-tl"></div>
    <div class="emblem">${faviconSvgRaw}</div>
    <div class="text-group">
      <div class="title">OUTPOST<span class="colon">:</span> <span class="mars">MARS</span></div>
      <div class="subtitle">
        <span>NASA MISSION CONTROL</span>
        <span class="bullet">&#9679;</span>
        <span>JEZERO CRATER</span>
      </div>
      <div class="mission-badge">SPACE WEATHER EXPEDITION</div>
    </div>
    <div class="corner-br"></div>
  </div>
</body>
</html>`;

  const rawLogoDark = renderHtmlScreenshot({ html: htmlLogoDark, width: 860, height: 250, scale: 2 });
  const trimmedLogoDark = trimAndPad(rawLogoDark, 8);
  const pngLogoDarkBuf = encodePNG(trimmedLogoDark.width, trimmedLogoDark.height, trimmedLogoDark.rgba);
  saveAsset('logo-dark.png', pngLogoDarkBuf);

  // 3. CIRCULAR EMBLEM (Transparent)
  console.log('\n[3/5] Rendering Circular Emblem (Transparent)...');
  const htmlEmblem = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: 512px;
      height: 512px;
      background: transparent;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    svg {
      width: 480px;
      height: 480px;
      display: block;
      filter: drop-shadow(0 0 25px rgba(255, 107, 53, 0.45));
    }
  </style>
</head>
<body>
  ${faviconSvgRaw}
</body>
</html>`;

  const rawEmblem = renderHtmlScreenshot({ html: htmlEmblem, width: 512, height: 512, scale: 2 });
  const trimmedEmblem = trimAndPad(rawEmblem, 16);
  const pngEmblemBuf = encodePNG(trimmedEmblem.width, trimmedEmblem.height, trimmedEmblem.rgba);
  saveAsset('logo-emblem.png', pngEmblemBuf);
  saveAsset('logo-icon.png', pngEmblemBuf);

  // 4. CIRCULAR BADGE WITH DEEP SPACE GLOW
  console.log('\n[4/5] Rendering Circular Badge with Outer Glow...');
  const htmlBadge = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: 512px;
      height: 512px;
      background: transparent;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .badge-bg {
      width: 480px;
      height: 480px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(255, 107, 53, 0.2) 0%, rgba(14, 165, 233, 0.12) 65%, rgba(7, 11, 18, 0) 72%);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    svg {
      width: 430px;
      height: 430px;
      display: block;
      filter: drop-shadow(0 14px 35px rgba(0, 0, 0, 0.8)) drop-shadow(0 0 25px rgba(255, 107, 53, 0.3));
    }
  </style>
</head>
<body>
  <div class="badge-bg">
    ${faviconSvgRaw}
  </div>
</body>
</html>`;

  const rawBadge = renderHtmlScreenshot({ html: htmlBadge, width: 512, height: 512, scale: 2 });
  const trimmedBadge = trimAndPad(rawBadge, 16);
  const pngBadgeBuf = encodePNG(trimmedBadge.width, trimmedBadge.height, trimmedBadge.rgba);
  saveAsset('logo-badge.png', pngBadgeBuf);

  // 5. STACKED HERO GAME COVER LOGO (Square 1024x1024)
  console.log('\n[5/5] Rendering Stacked Hero Cover Logo...');
  const htmlStacked = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@700;800&family=Rajdhani:wght@700;800&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: 600px;
      height: 600px;
      background: transparent;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      font-family: 'Rajdhani', sans-serif;
    }
    .emblem-wrap {
      width: 270px;
      height: 270px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 24px;
      filter: drop-shadow(0 0 30px rgba(255, 107, 53, 0.45));
    }
    .emblem-wrap svg {
      width: 100%;
      height: 100%;
    }
    .title {
      font-size: 58px;
      font-weight: 800;
      letter-spacing: 6px;
      color: #f8fafc;
      text-transform: uppercase;
      text-align: center;
      line-height: 1;
      text-shadow: 0 4px 20px rgba(0,0,0,0.8), 0 0 30px rgba(255, 107, 53, 0.35);
    }
    .title .colon {
      color: #ff6b35;
    }
    .title .mars {
      color: #ff8552;
      background: linear-gradient(135deg, #ff8552 0%, #ff6b35 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .subtitle {
      margin-top: 14px;
      font-family: 'Inter', sans-serif;
      font-size: 13.5px;
      font-weight: 700;
      letter-spacing: 4px;
      color: #38bdf8;
      text-transform: uppercase;
      text-align: center;
      display: flex;
      align-items: center;
      gap: 10px;
      opacity: 0.95;
    }
    .bullet {
      color: #64748b;
      font-size: 10px;
    }
    .badge-bar {
      margin-top: 20px;
      padding: 5px 16px;
      background: rgba(255, 107, 53, 0.14);
      border: 1.2px solid rgba(255, 107, 53, 0.5);
      border-radius: 4px;
      color: #fdba74;
      font-family: 'Rajdhani', sans-serif;
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 2.5px;
      text-transform: uppercase;
    }
  </style>
</head>
<body>
  <div class="emblem-wrap">
    ${faviconSvgRaw}
  </div>
  <div class="title">
    OUTPOST<span class="colon">:</span> <span class="mars">MARS</span>
  </div>
  <div class="subtitle">
    <span>NASA MISSION CONTROL</span>
    <span class="bullet">&#9679;</span>
    <span>JEZERO CRATER</span>
  </div>
  <div class="badge-bar">SPACE WEATHER EXPEDITION</div>
</body>
</html>`;

  const rawStacked = renderHtmlScreenshot({ html: htmlStacked, width: 600, height: 600, scale: 2 });
  const trimmedStacked = trimAndPad(rawStacked, 20);
  const pngStackedBuf = encodePNG(trimmedStacked.width, trimmedStacked.height, trimmedStacked.rgba);
  saveAsset('logo-stacked.png', pngStackedBuf);

  console.log('\nAll OUTPOST: MARS logos generated and saved successfully in PNG format!');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
