/**
 * OUTPOST: MARS — Environmental Asset Sheet Extractor (Phase 04.2 Task 02)
 *
 * Deterministically extracts individual environmental sprite variations from:
 * - rock-piles.png (5 rock piles)
 * - Rock-Scatter.png (5 rock scatter variations)
 * - Stone-Scatter.png (6 stone scatter variations)
 * - rock slabs.png (5 rock slabs)
 * - soil-texture.png (5 soil patches)
 *
 * Destination: public/assets/environment/derived/
 * Keeps original source sheets 100% untouched.
 * Preserves all soft translucent alpha edges and eliminates isolated edge noise.
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Standard CRC32 table for PNG chunk generation
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

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // 8-bit depth
  ihdrData[9] = 6; // color type 6: RGBA
  ihdrData[10] = 0; // default compression
  ihdrData[11] = 0; // default filter method
  ihdrData[12] = 0; // no interlace
  const ihdrChunk = createChunk('IHDR', ihdrData);

  // Scanlines with filter byte 0 (None)
  const stride = width * 4;
  const filtered = Buffer.alloc(height * (stride + 1));
  for (let y = 0; y < height; y++) {
    filtered[y * (stride + 1)] = 0; // Filter 0: None
    rgbaBuffer.copy(filtered, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  const compressed = zlib.deflateSync(filtered, { level: 9 });
  const idatChunk = createChunk('IDAT', compressed);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([header, ihdrChunk, idatChunk, iendChunk]);
}

function decodePNG(filePath) {
  const buf = fs.readFileSync(filePath);
  let pos = 8, width = 0, height = 0;
  const idatChunks = [];
  while (pos < buf.length) {
    const length = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    if (type === 'IHDR') {
      width = buf.readUInt32BE(pos + 8);
      height = buf.readUInt32BE(pos + 12);
    } else if (type === 'IDAT') {
      idatChunks.push(buf.subarray(pos + 8, pos + 8 + length));
    } else if (type === 'IEND') break;
    pos += 12 + length;
  }
  const decompressed = zlib.inflateSync(Buffer.concat(idatChunks));
  const bpp = 4;
  const stride = width * bpp;
  const raw = Buffer.alloc(width * height * bpp);

  let srcPos = 0;
  for (let y = 0; y < height; y++) {
    const filter = decompressed[srcPos++];
    const rowStart = y * stride;
    const prevRowStart = (y - 1) * stride;

    for (let x = 0; x < stride; x++) {
      const b = decompressed[srcPos++];
      const aVal = x >= bpp ? raw[rowStart + x - bpp] : 0;
      const bVal = y > 0 ? raw[prevRowStart + x] : 0;
      const cVal = (y > 0 && x >= bpp) ? raw[prevRowStart + x - bpp] : 0;

      let val = 0;
      if (filter === 0) val = b;
      else if (filter === 1) val = (b + aVal) & 0xff;
      else if (filter === 2) val = (b + bVal) & 0xff;
      else if (filter === 3) val = (b + Math.floor((aVal + bVal) / 2)) & 0xff;
      else if (filter === 4) {
        const p = aVal + bVal - cVal;
        const pa = Math.abs(p - aVal);
        const pb = Math.abs(p - bVal);
        const pc = Math.abs(p - cVal);
        let pr = 0;
        if (pa <= pb && pa <= pc) pr = aVal;
        else if (pb <= pc) pr = bVal;
        else pr = cVal;
        val = (b + pr) & 0xff;
      }
      raw[rowStart + x] = val;
    }
  }
  return { width, height, raw };
}

const SHEETS = [
  { file: 'rock-piles.png', prefix: 'rock-pile', expectedCount: 5, targetFolder: 'rocks' },
  { file: 'rock-scatter.png', prefix: 'rock-scatter', expectedCount: 5, targetFolder: 'rocks' },
  { file: 'stone-scatter.png', prefix: 'stone-scatter', expectedCount: 6, targetFolder: 'rocks' },
  { file: 'rock-slabs.png', prefix: 'rock-slab', expectedCount: 5, targetFolder: 'rocks' },
  { file: 'soil-texture.png', prefix: 'soil-patch', expectedCount: 5, targetFolder: 'terrain' },
];

function extractSheets() {
  const rootDir = path.resolve(__dirname, '..');
  const envDir = path.join(rootDir, 'public', 'assets', 'environment');
  const sheetsDir = path.join(envDir, 'sprite-sheets');

  console.log('[Extractor] OUTPOST: MARS Environmental Sheet Extractor starting...');
  console.log(`[Extractor] Source directory: ${sheetsDir}`);

  let totalExtracted = 0;
  const manifest = [];

  for (const sheetConfig of SHEETS) {
    const sheetPath = path.join(sheetsDir, sheetConfig.file);
    if (!fs.existsSync(sheetPath)) {
      throw new Error(`[Extractor] Source sheet not found: ${sheetPath}`);
    }

    const outDir = path.join(envDir, sheetConfig.targetFolder);
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    console.log(`\n------------------------------------------------------------`);
    console.log(`[Extractor] Processing: ${sheetConfig.file}`);
    const { width, height, raw } = decodePNG(sheetPath);

    // 1. Column alpha histogram for solid artwork (alpha > 15)
    const colNonZero15 = new Int32Array(width);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (raw[(y * width + x) * 4 + 3] > 15) {
          colNonZero15[x]++;
        }
      }
    }

    // 2. Identify primary continuous column intervals
    const intervals = [];
    let inInterval = false, start = 0;
    for (let x = 0; x < width; x++) {
      if (colNonZero15[x] > 0) {
        if (!inInterval) { inInterval = true; start = x; }
      } else {
        if (inInterval) { inInterval = false; intervals.push([start, x - 1]); }
      }
    }
    if (inInterval) intervals.push([start, width - 1]);

    // Merge intervals separated by <= 10 px gap
    const merged = [];
    for (const int of intervals) {
      if (merged.length === 0) merged.push(int);
      else {
        const prev = merged[merged.length - 1];
        if (int[0] - prev[1] <= 10) {
          prev[1] = int[1];
        } else {
          merged.push(int);
        }
      }
    }

    if (merged.length !== sheetConfig.expectedCount) {
      throw new Error(`[Extractor] Expected ${sheetConfig.expectedCount} variations in ${sheetConfig.file}, but found ${merged.length}`);
    }

    // 3. For each variation interval, compute exact visible bounding box with soft-edge preservation
    merged.forEach(([x1, x2], idx) => {
      // Find solid boundaries (alpha > 15)
      let minX = width, maxX = 0, minY = height, maxY = 0;
      for (let y = 0; y < height; y++) {
        for (let x = x1; x <= x2; x++) {
          if (raw[(y * width + x) * 4 + 3] > 15) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }

      // Expand bounds by 3px padding to preserve subtle translucent edge falloff (alpha 1..15)
      const softMinX = Math.max(x1, minX - 3);
      const softMaxX = Math.min(x2, maxX + 3);
      const softMinY = Math.max(0, minY - 3);
      const softMaxY = Math.min(height - 1, maxY + 3);

      // Tighten to exact non-zero alpha bounds within the local padded region
      let finalMinX = softMaxX, finalMaxX = softMinX, finalMinY = softMaxY, finalMaxY = softMinY;
      let solidPixels = 0, softPixels = 0;
      for (let y = softMinY; y <= softMaxY; y++) {
        for (let x = softMinX; x <= softMaxX; x++) {
          const a = raw[(y * width + x) * 4 + 3];
          if (a > 0) {
            if (a > 15) solidPixels++;
            else softPixels++;
            if (x < finalMinX) finalMinX = x;
            if (x > finalMaxX) finalMaxX = x;
            if (y < finalMinY) finalMinY = y;
            if (y > finalMaxY) finalMaxY = y;
          }
        }
      }

      const outW = finalMaxX - finalMinX + 1;
      const outH = finalMaxY - finalMinY + 1;

      // Extract pixel buffer
      const outBuffer = Buffer.alloc(outW * outH * 4);
      for (let y = 0; y < outH; y++) {
        const srcY = finalMinY + y;
        const srcRowStart = (srcY * width + finalMinX) * 4;
        const dstRowStart = y * outW * 4;
        raw.copy(outBuffer, dstRowStart, srcRowStart, srcRowStart + outW * 4);
      }

      // Encode and write PNG
      const outPng = encodePNG(outW, outH, outBuffer);
      const outFileName = `${sheetConfig.prefix}-${String(idx + 1).padStart(2, '0')}.png`;
      const outFilePath = path.join(outDir, outFileName);
      fs.writeFileSync(outFilePath, outPng);

      totalExtracted++;
      const record = {
        sheet: sheetConfig.file,
        fileName: outFileName,
        path: path.relative(rootDir, outFilePath).replace(/\\/g, '/'),
        width: outW,
        height: outH,
        aspectRatio: Number((outW / outH).toFixed(2)),
        fileSizeKB: Number((outPng.length / 1024).toFixed(1)),
        sourceBounds: { minX: finalMinX, minY: finalMinY, maxX: finalMaxX, maxY: finalMaxY },
        solidPixels,
        softPixels,
      };
      manifest.push(record);

      console.log(`  ✓ ${outFileName}: ${outW} × ${outH} px (aspect ${record.aspectRatio}, ${record.fileSizeKB} KB, solid: ${solidPixels}, soft: ${softPixels})`);
    });
  }

  console.log(`\n============================================================`);
  console.log(`[Extractor] SUCCESS: Extracted ${totalExtracted} assets`);

  // Write manifest JSON next to sprite sheets for reference & audit
  const manifestPath = path.join(sheetsDir, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`[Extractor] Manifest written to ${manifestPath}`);

  return manifest;
}

if (require.main === module) {
  try {
    extractSheets();
  } catch (err) {
    console.error('[Extractor] ERROR:', err);
    process.exit(1);
  }
}

module.exports = { extractSheets };
