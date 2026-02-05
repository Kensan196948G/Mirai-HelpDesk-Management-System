const fs = require('fs');

// シンプルな ICO ファイルを生成（16x16、単色）
const createSimpleIco = () => {
  // ICO ファイルヘッダー
  const header = Buffer.from([
    0, 0,           // Reserved
    1, 0,           // Type (1 = ICO)
    1, 0,           // Number of images
  ]);

  // Image directory entry (16 bytes)
  const dirEntry = Buffer.from([
    16,             // Width (16px)
    16,             // Height (16px)
    0,              // Color palette
    0,              // Reserved
    1, 0,           // Color planes
    32, 0,          // Bits per pixel
    0, 4, 0, 0,     // Size of image data (1024 bytes)
    22, 0, 0, 0,    // Offset to image data (22 bytes)
  ]);

  // BMP header for ICO
  const bmpHeader = Buffer.from([
    40, 0, 0, 0,    // Header size
    16, 0, 0, 0,    // Width
    32, 0, 0, 0,    // Height (x2 for ICO)
    1, 0,           // Planes
    32, 0,          // Bits per pixel
    0, 0, 0, 0,     // Compression
    0, 0, 0, 0,     // Image size
    0, 0, 0, 0,     // X pixels per meter
    0, 0, 0, 0,     // Y pixels per meter
    0, 0, 0, 0,     // Colors used
    0, 0, 0, 0,     // Important colors
  ]);

  // Create 16x16 icon (BGRA format)
  const pixels = Buffer.alloc(16 * 16 * 4);
  const andMask = Buffer.alloc(16 * 2); // 16 lines, 2 bytes each

  // Draw a simple blue circle with white checkmark
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const dx = x - 8;
      const dy = y - 8;
      const dist = Math.sqrt(dx * dx + dy * dy);

      const idx = ((15 - y) * 16 + x) * 4; // BMP is bottom-up

      if (dist < 7) {
        // Blue background
        pixels[idx] = 0xff;     // B
        pixels[idx + 1] = 0x90; // G
        pixels[idx + 2] = 0x18; // R
        pixels[idx + 3] = 0xff; // A

        // White checkmark area
        if ((x >= 6 && x <= 10 && y >= 10 && y <= 12) ||
            (x >= 9 && x <= 13 && y >= 6 && y <= 10)) {
          pixels[idx] = 0xff;
          pixels[idx + 1] = 0xff;
          pixels[idx + 2] = 0xff;
          pixels[idx + 3] = 0xff;
        }
      } else {
        // Transparent
        pixels[idx] = 0;
        pixels[idx + 1] = 0;
        pixels[idx + 2] = 0;
        pixels[idx + 3] = 0;
      }
    }
  }

  const ico = Buffer.concat([header, dirEntry, bmpHeader, pixels, andMask]);
  fs.writeFileSync('favicon.ico', ico);
  console.log('✅ favicon.ico created (16x16)');
};

createSimpleIco();
