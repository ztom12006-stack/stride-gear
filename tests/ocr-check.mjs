import { createWorker } from 'tesseract.js';
import assert from 'node:assert/strict';
import { textDrafts } from '../lib/order-import.ts';
const worker = await createWorker(['chi_sim', 'eng'], 1, {
  langPath: 'public/ocr',
  cacheMethod: 'none',
});
try {
  const result = await worker.recognize('tests/fixtures/order.png');
  const text = result.data.text;
  assert.ok(text.includes('129.50'));
  assert.ok(text.includes('2026'));
  console.log(
    'OCR recognized Chinese order fixture:',
    text.replaceAll('\n', ' | '),
  );
  const draft = textDrafts(text)[0];
  assert.equal(draft.date, '2026-09-01');
  assert.equal(draft.size, 'M');
  assert.equal(draft.orderId, '1234567890123');
  assert.equal(draft.category, '上装');
  console.log('Parsed order fields verified.');
} finally {
  await worker.terminate();
}
const initial = await (await fetch('http://localhost:3000/api/state')).json();
const { readFile } = await import('node:fs/promises');
const photo = await readFile('public/gear-reference/shoe.jpg');
const f = new FormData();
f.set('file', new Blob([photo], { type: 'image/jpeg' }), 'shoe.jpg');
const upload = await fetch('http://localhost:3000/api/images', {
  method: 'POST',
  body: f,
});
assert.equal(upload.status, 200);
const { url } = await upload.json();
const download = await fetch('http://localhost:3000' + url);
assert.equal(download.status, 200);
assert.equal((await download.arrayBuffer()).byteLength, photo.length);
const next = structuredClone(initial);
next.state.gear[0].image = url;
const saved = await fetch('http://localhost:3000/api/state', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(next),
});
assert.equal(saved.status, 200);
const reread = await (await fetch('http://localhost:3000/api/state')).json();
assert.equal(reread.state.gear[0].image, url);
console.log(
  'PASS: OCR, image storage/readback and persistent gear-image linkage.',
);
