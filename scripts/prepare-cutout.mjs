import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const folder = new URL('../public/cutout/', import.meta.url);
await mkdir(folder, { recursive: true });
for (const name of ['ort-wasm-simd-threaded.wasm', 'ort-wasm-simd-threaded.mjs']) {
  await copyFile(new URL('../node_modules/onnxruntime-web/dist/' + name, import.meta.url), new URL(name, folder));
}
const model = new URL('u2netp.onnx', folder);
const expected = '8e83ca70e441ab06c318d82300c84806';
let bytes;
try { bytes = await readFile(model); } catch {}
if (!bytes || createHash('md5').update(bytes).digest('hex') !== expected) {
  const response = await fetch('https://github.com/danielgatis/rembg/releases/download/v0.0.0/u2netp.onnx');
  if (!response.ok) throw Error('Unable to download cutout model: ' + response.status);
  bytes = Buffer.from(await response.arrayBuffer());
  if (createHash('md5').update(bytes).digest('hex') !== expected) throw Error('Cutout model checksum mismatch');
  await writeFile(model, bytes);
}
console.log('Cutout model and runtime prepared');
