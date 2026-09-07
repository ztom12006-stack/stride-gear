import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizePixels, alphaMask, subjectBounds } from '../lib/cutout-math.ts';
import { equip, worn } from '../lib/outfit.ts';
import { seed } from '../lib/model.ts';
import { validState } from '../lib/state-validation.ts';
test('Cutout normalization produces finite planar channels even for black images', () => {
  const pixels = normalizePixels(new Uint8ClampedArray([0,0,0,255]), 1);
  assert.equal(pixels.length, 3); assert.ok([...pixels].every(Number.isFinite));
  assert.ok(Math.abs(pixels[0] + 0.485 / 0.229) < 0.001);
});
test('Segmentation retains foreground, clears background and rejects flat predictions', () => {
  assert.deepEqual([...alphaMask(new Float32Array([0,0.5,1]))], [0,128,255]);
  assert.throws(() => alphaMask(new Float32Array([1,1,1])));
});
test('Subject crop follows alpha rather than RGB so white gear is retained', () => {
  const p = new Uint8ClampedArray(4*4*4); p.set([255,255,255,255],(1*4+2)*4);
  assert.deepEqual(subjectBounds(p,4,4),{left:2,top:1,width:1,height:1});
});
test('Same-color items equip by ID, layers survive serialization, archived items are hidden', () => {
  const state = seed(); const item = state.gear.find(g => g.category === '上装');
  state.profile = equip(state.profile, 'top', item);
  state.profile.outfit.top.x = 12;
  const restored = JSON.parse(JSON.stringify(state));
  assert.equal(worn(restored.profile,restored.gear,'top').id,item.id);
  assert.equal(restored.profile.outfit.top.x,12);
  assert.ok(validState(restored));
  restored.profile.outfit.top.scale=9; assert.equal(Boolean(validState(restored)),false);
  item.archived=true; assert.equal(worn(state.profile,state.gear,'top'),undefined);
});
