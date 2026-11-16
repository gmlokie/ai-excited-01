// ai-excited-01 entrypoint — copies the winning image to the output dir.
// Node 22, standard library only. No network, no dependencies.

import { promises as fsp } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

async function main() {
  const targetDir = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? "/output");
  const sourcePath = join(here, "entry.png");
  const payload = await fsp.readFile(sourcePath);
  if (payload.length === 0) {
    throw new Error("entry.png is empty, refusing to emit an empty image");
  }
  // Gate check, same limits as the competition gate: PNG or JPEG by first
  // bytes, at most 1 MiB. A corrupt or oversized file must fail loudly
  // here instead of silently shipping a rejected entry.
  const pngMagic = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const jpegMagic = Buffer.from([0xff, 0xd8, 0xff]);
  const looksPng = payload.subarray(0, 8).equals(pngMagic);
  const looksJpeg = payload.subarray(0, 3).equals(jpegMagic);
  if (!looksPng && !looksJpeg) {
    throw new Error("entry.png is neither PNG nor JPEG by its first bytes");
  }
  const oneMiB = 1024 * 1024;
  if (payload.length > oneMiB) {
    throw new Error(`entry.png is ${payload.length} bytes, over the 1 MiB limit`);
  }
  await fsp.mkdir(targetDir, { recursive: true });
  const destination = join(targetDir, "entry.png");
  await fsp.writeFile(destination, payload);
  console.log(`wrote ${destination} (${payload.length} bytes)`);
}

await main();
