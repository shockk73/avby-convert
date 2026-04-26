// Procedurally renders the extension icon as a white "$" on a rounded
// forest-green background. Outputs PNGs at 16/48/128 px into src/icons/.
// No native deps — encodes RGBA buffers to PNG via node:zlib.

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(__dirname, '..', 'src', 'icons');
fs.mkdirSync(outDir, { recursive: true });

// ─── Colors ───────────────────────────────────────────────────────
const BG = [0x1f, 0x9e, 0x4d, 0xff]; // crisp green, slightly punchier than forest
const FG = [0xff, 0xff, 0xff, 0xff]; // white

// ─── Canvas (RGBA framebuffer) ────────────────────────────────────
function newCanvas(size) {
  return { size, buf: new Uint8Array(size * size * 4) };
}

function setPixel(c, x, y, [r, g, b, a]) {
  if (x < 0 || x >= c.size || y < 0 || y >= c.size) return;
  const i = (y * c.size + x) * 4;
  if (a === 255) {
    c.buf[i] = r; c.buf[i + 1] = g; c.buf[i + 2] = b; c.buf[i + 3] = 255;
    return;
  }
  // Alpha blend over existing pixel
  const sa = a / 255;
  const dr = c.buf[i], dg = c.buf[i + 1], db = c.buf[i + 2], da = c.buf[i + 3] / 255;
  const oa = sa + da * (1 - sa);
  if (oa === 0) return;
  c.buf[i]     = Math.round((r * sa + dr * da * (1 - sa)) / oa);
  c.buf[i + 1] = Math.round((g * sa + dg * da * (1 - sa)) / oa);
  c.buf[i + 2] = Math.round((b * sa + db * da * (1 - sa)) / oa);
  c.buf[i + 3] = Math.round(oa * 255);
}

// Fills a rectangle, allowing fractional coordinates with edge antialiasing.
function fillRect(c, x, y, w, h, color) {
  const x0 = Math.floor(x), x1 = Math.ceil(x + w);
  const y0 = Math.floor(y), y1 = Math.ceil(y + h);
  for (let py = y0; py < y1; py++) {
    for (let px = x0; px < x1; px++) {
      const cover =
        Math.max(0, Math.min(px + 1, x + w) - Math.max(px, x)) *
        Math.max(0, Math.min(py + 1, y + h) - Math.max(py, y));
      if (cover <= 0) continue;
      const a = Math.round(color[3] * cover);
      setPixel(c, px, py, [color[0], color[1], color[2], a]);
    }
  }
}

// Filled rounded rectangle with antialiased corners.
function fillRoundedRect(c, x, y, w, h, r, color) {
  for (let py = Math.floor(y); py < Math.ceil(y + h); py++) {
    for (let px = Math.floor(x); px < Math.ceil(x + w); px++) {
      // Determine local corner center if pixel is inside a corner region.
      let cx = null, cy = null;
      if (px < x + r && py < y + r)             { cx = x + r;       cy = y + r; }
      else if (px >= x + w - r && py < y + r)   { cx = x + w - r;   cy = y + r; }
      else if (px < x + r && py >= y + h - r)   { cx = x + r;       cy = y + h - r; }
      else if (px >= x + w - r && py >= y + h - r) { cx = x + w - r; cy = y + h - r; }

      let cover = 1;
      if (cx !== null) {
        // Sample the pixel center against the inscribed circle.
        const sx = px + 0.5 - cx;
        const sy = py + 0.5 - cy;
        const d = Math.sqrt(sx * sx + sy * sy);
        if (d > r + 0.5) continue;
        if (d > r - 0.5) cover = 1 - (d - (r - 0.5));
      }
      const a = Math.round(color[3] * cover);
      setPixel(c, px, py, [color[0], color[1], color[2], a]);
    }
  }
}

// Filled circle (used for stroke caps and S-curve joints).
function fillCircle(c, cx, cy, r, color) {
  const x0 = Math.floor(cx - r), x1 = Math.ceil(cx + r);
  const y0 = Math.floor(cy - r), y1 = Math.ceil(cy + r);
  for (let py = y0; py <= y1; py++) {
    for (let px = x0; px <= x1; px++) {
      const dx = px + 0.5 - cx;
      const dy = py + 0.5 - cy;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d > r + 0.5) continue;
      const cover = d <= r - 0.5 ? 1 : 1 - (d - (r - 0.5));
      const a = Math.round(color[3] * cover);
      setPixel(c, px, py, [color[0], color[1], color[2], a]);
    }
  }
}

// Draws a stylised "$" centered at (cx, cy) into a glyph box of (w, h).
// stroke is the line thickness. Uses three horizontal bars + two short
// connecting verticals to form an "S", plus a vertical stem.
function drawDollar(c, cx, cy, w, h, stroke, color) {
  const x = cx - w / 2;
  const y = cy - h / 2;
  const topY = y;
  const midY = y + h / 2;
  const botY = y + h;
  const r = stroke / 2;

  // Three horizontal strokes (top, middle, bottom of the S).
  const horizStartY = topY - r;
  const horizMidY = midY - r;
  const horizBotY = botY - r;

  fillRect(c, x, horizStartY, w, stroke, color);
  fillRect(c, x, horizMidY, w, stroke, color);
  fillRect(c, x, horizBotY, w, stroke, color);

  // Round the four end-caps so the bars don't look chopped.
  fillCircle(c, x, topY, r, color);
  fillCircle(c, x + w, topY, r, color);
  fillCircle(c, x, midY, r, color);
  fillCircle(c, x + w, midY, r, color);
  fillCircle(c, x, botY, r, color);
  fillCircle(c, x + w, botY, r, color);

  // Top-left short vertical: connects top bar to middle bar on the left.
  fillRect(c, x - r, topY, stroke, h / 2, color);
  // Bottom-right short vertical: connects middle bar to bottom bar on the right.
  fillRect(c, x + w - r, midY, stroke, h / 2, color);

  // Vertical stem extending slightly above and below the S.
  const extend = stroke * 1.0;
  fillRect(c, cx - r, topY - extend, stroke, h + extend * 2, color);
  fillCircle(c, cx, topY - extend, r, color);
  fillCircle(c, cx, botY + extend, r, color);
}

// ─── PNG encoding ────────────────────────────────────────────────
function crc32(buf) {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    table[n] = c >>> 0;
  }
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);  len.writeUInt32BE(data.length, 0);
  const tbuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([tbuf, data])), 0);
  return Buffer.concat([len, tbuf, data, crcBuf]);
}

function encodePng(canvas) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(canvas.size, 0);
  ihdr.writeUInt32BE(canvas.size, 4);
  ihdr[8] = 8;     // bit depth
  ihdr[9] = 6;     // RGBA
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  const rows = [];
  for (let y = 0; y < canvas.size; y++) {
    const row = Buffer.alloc(1 + canvas.size * 4);
    row[0] = 0;    // filter type
    for (let x = 0; x < canvas.size; x++) {
      const i = (y * canvas.size + x) * 4;
      row[1 + x * 4 + 0] = canvas.buf[i];
      row[1 + x * 4 + 1] = canvas.buf[i + 1];
      row[1 + x * 4 + 2] = canvas.buf[i + 2];
      row[1 + x * 4 + 3] = canvas.buf[i + 3];
    }
    rows.push(row);
  }
  const idat = zlib.deflateSync(Buffer.concat(rows));
  return Buffer.concat([
    sig,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', idat),
    makeChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ─── Compose icons ────────────────────────────────────────────────
function renderIcon(size) {
  const c = newCanvas(size);
  const radius = Math.max(2, Math.round(size * 0.18));
  fillRoundedRect(c, 0, 0, size, size, radius, BG);

  // Glyph occupies ~50% width, ~62% height of the canvas.
  const glyphW = size * 0.42;
  const glyphH = size * 0.62;
  // Stroke proportional to canvas; clamped so 16px doesn't get a hairline.
  const stroke = size <= 16 ? 2 : Math.max(2, Math.round(size * 0.10));
  drawDollar(c, size / 2, size / 2, glyphW, glyphH, stroke, FG);

  return c;
}

for (const size of [16, 48, 128]) {
  const png = encodePng(renderIcon(size));
  fs.writeFileSync(path.join(outDir, `icon-${size}.png`), png);
  console.log(`wrote icon-${size}.png (${png.length} bytes)`);
}
