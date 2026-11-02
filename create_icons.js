// create_icons.js
// Generates valid PNG icons (16x16, 48x48, 128x128) using pure Node.js (zlib)
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function createPNG(size) {
  // RGBA buffer: 4 bytes per pixel + 1 filter byte per row
  const rowSize = 1 + size * 4;
  const rawData = Buffer.alloc(rowSize * size);

  // Kahoot purple background: #46178F -> R:70, G:23, B:143
  // Accent orange/yellow or white "K!" symbol in center
  for (let y = 0; y < size; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter type: None

    for (let x = 0; x < size; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;
      
      // Calculate distance from center for rounded corner / circle badge
      const cx = size / 2;
      const cy = size / 2;
      const r = size * 0.46;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= r) {
        // Center lightning / K! symbol area
        // Draw a playful lightning or "K!" shape in the middle
        const inCenterBox = (Math.abs(dx) < size * 0.28 && Math.abs(dy) < size * 0.28);
        const isLightning = (
          (dx > -size*0.2 && dx < size*0.05 && dy < size*0.1) ||
          (dx > -size*0.05 && dx < size*0.2 && dy > -size*0.1) ||
          (Math.abs(dx + dy * 0.5) < size * 0.12)
        );

        if (isLightning) {
          // Yellow / Gold electric #FFB800
          rawData[pixelOffset] = 255;     // R
          rawData[pixelOffset + 1] = 184; // G
          rawData[pixelOffset + 2] = 0;   // B
          rawData[pixelOffset + 3] = 255; // A
        } else {
          // Kahoot Purple #46178F
          rawData[pixelOffset] = 70;      // R
          rawData[pixelOffset + 1] = 23;  // G
          rawData[pixelOffset + 2] = 143; // B
          rawData[pixelOffset + 3] = 255; // A
        }
      } else {
        // Transparent
        rawData[pixelOffset] = 0;
        rawData[pixelOffset + 1] = 0;
        rawData[pixelOffset + 2] = 0;
        rawData[pixelOffset + 3] = 0;
      }
    }
  }

  // PNG Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR Chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); // Width
  ihdr.writeUInt32BE(size, 4); // Height
  ihdr[8] = 8; // Bit depth: 8
  ihdr[9] = 6; // Color type: RGBA
  ihdr[10] = 0; // Compression: Deflate
  ihdr[11] = 0; // Filter: Adaptive
  ihdr[12] = 0; // Interlace: None
  const ihdrChunk = createChunk('IHDR', ihdr);

  // IDAT Chunk
  const compressed = zlib.deflateSync(rawData);
  const idatChunk = createChunk('IDAT', compressed);

  // IEND Chunk
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);

  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);

  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);

  return Buffer.concat([len, body, crc]);
}

// Standard CRC32 table
const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

[16, 48, 128].forEach(size => {
  const pngBuf = createPNG(size);
  const filePath = path.join(iconsDir, `icon${size}.png`);
  fs.writeFileSync(filePath, pngBuf);
  console.log(`Generated: icon${size}.png (${size}x${size}, ${pngBuf.length} bytes)`);
});

