// Run after preparing assets and generating outputs/cutout-fixture.bin (320x320 RGBA).
import { readFile } from 'node:fs/promises';
import * as ort from 'onnxruntime-web';
import assert from 'node:assert/strict';
import { normalizePixels, alphaMask } from '../lib/cutout-math.ts';
ort.env.wasm.numThreads = 1;
const session = await ort.InferenceSession.create(new Uint8Array(await readFile('public/cutout/u2netp.onnx')), {executionProviders:['wasm']});
const input = new ort.Tensor('float32',normalizePixels(new Uint8ClampedArray(await readFile('outputs/cutout-fixture.bin')),320*320),[1,3,320,320]);
const result = await session.run({[session.inputNames[0]]:input});
const mask=alphaMask(result[session.outputNames[0]].data);
const foreground=mask.filter(x=>x>200).length, background=mask.filter(x=>x<30).length;
assert.ok(foreground>1000 && background>1000);
console.log({pixels:mask.length,foreground,background});
input.dispose(); for(const value of Object.values(result)) value.dispose(); await session.release();
