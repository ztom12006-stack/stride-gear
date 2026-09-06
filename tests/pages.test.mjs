import test from 'node:test';
import assert from 'node:assert/strict';
globalThis.__STRIDE_PAGES__ = true;
const { assetUrl } = await import('../lib/runtime.ts');
const { validImageUrl } = await import('../lib/images.ts');
const { validState } = await import('../lib/state-validation.ts');
const { seed } = await import('../lib/model.ts');
test('Pages asset paths include the repository prefix', () => {
  assert.equal(assetUrl('/ocr/worker.min.js'), '/stride-gear/ocr/worker.min.js');
  assert.equal(assetUrl('/order-template.csv'), '/stride-gear/order-template.csv');
});
test('Local image backups accept raster images and reject executable content', () => {
  assert.equal(validImageUrl('data:image/jpeg;base64,/9j/AA=='), true);
  assert.equal(validImageUrl('data:image/svg+xml;base64,PHN2Zz4='), false);
  assert.equal(validImageUrl('javascript:alert(1)'), false);
  const state = seed(); state.gear[0].image = 'data:image/jpeg;base64,/9j/AA==';
  assert.equal(Boolean(validState(state)), true);
  state.gear[0].image = 'data:text/html;base64,PHNjcmlwdD4=';
  assert.equal(Boolean(validState(state)), false);
});
test('Restore validation rejects invalid references and duplicate equipment IDs', () => {
  const state = seed();
  state.gear.push({...state.gear[0]});
  assert.equal(Boolean(validState(state)), false);
  const another = seed(); another.workouts[0].gear = ['missing'];
  assert.equal(Boolean(validState(another)), false);
});
