// ai-excited-01 — entry program.
// Copies the entry image (entry.png, next to this file) into the grader's
// output directory. Node 22, standard library only, no network access.

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const IMAGE_NAME = "entry.png";
const MAX_BYTES = 1024 * 1024;
const MAX_SIDE = 1024;

// Reads width/height from a PNG IHDR chunk or a JPEG start-of-frame marker.
// Returns null when the dimensions cannot be parsed (the magic-byte check
// above has already rejected non-image files by then).
function readDimensions(data) {
  if (startsWith(data, PNG_HEADER) && data.length >= 24) {
    return { width: data.readUInt32BE(16), height: data.readUInt32BE(20) };
  }
  if (startsWith(data, JPEG_HEADER)) {
    let pos = 2;
    while (pos + 9 < data.length) {
      if (data[pos] !== 0xff) return null;
      const marker = data[pos + 1];
      if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
        pos += 2;
        continue;
      }
      const segLen = data.readUInt16BE(pos + 2);
      if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
        return { width: data.readUInt16BE(pos + 7), height: data.readUInt16BE(pos + 5) };
      }
      pos += 2 + segLen;
    }
  }
  return null;
}

// First bytes of a PNG file, and of a JPEG file.
const PNG_HEADER = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG_HEADER = [0xff, 0xd8, 0xff];

function startsWith(bytes, header) {
  if (bytes.length < header.length) return false;
  for (let i = 0; i < header.length; i++) {
    if (bytes[i] !== header[i]) return false;
  }
  return true;
}

async function run() {
  const repoDir = dirname(fileURLToPath(import.meta.url));
  const source = join(repoDir, IMAGE_NAME);
  const data = await readFile(source);

  if (data.length === 0) {
    throw new Error(`${IMAGE_NAME} is empty`);
  }
  if (!startsWith(data, PNG_HEADER) && !startsWith(data, JPEG_HEADER)) {
    throw new Error(`${IMAGE_NAME} is not a PNG or JPEG image`);
  }
  if (data.length > MAX_BYTES) {
    throw new Error(
      `${IMAGE_NAME} is ${data.length} bytes, over the ${MAX_BYTES} byte limit`,
    );
  }
  const dims = readDimensions(data);
  if (dims && (dims.width > MAX_SIDE || dims.height > MAX_SIDE)) {
    throw new Error(
      `${IMAGE_NAME} is ${dims.width}x${dims.height}, over the ${MAX_SIDE}px side limit`,
    );
  }

  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
  await mkdir(outDir, { recursive: true });
  const dest = join(outDir, IMAGE_NAME);
  await writeFile(dest, data);
  console.log(`wrote ${dest} (${data.length} bytes)`);
}

await run();
