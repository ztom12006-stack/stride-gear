import test from 'node:test';
import assert from 'node:assert/strict';
import {
  periodBounds,
  periodData,
  shiftPeriod,
  fromISO,
} from '../lib/activity.ts';
import {
  parseDelimited,
  detectColumns,
  tableDrafts,
  textDrafts,
  draftErrors,
  draftsToGear,
  duplicateDraft,
} from '../lib/order-import.ts';
import { validImageUrl } from '../lib/images.ts';
import { seed, gearStats } from '../lib/model.ts';
const w = (date, km = 5) => ({
  id: date,
  date,
  sport: '跑步',
  minutes: 30,
  km,
  gear: [],
});
test('Monday-based week crosses year boundary correctly', () =>
  assert.deepEqual(periodBounds(fromISO('2026-01-01'), 'week'), {
    start: '2025-12-29',
    end: '2026-01-04',
  }));
test('Leap-year month and empty days are preserved', () => {
  const d = periodData(
    [w('2024-02-29'), w('2024-03-01')],
    fromISO('2024-02-15'),
    'month',
  );
  assert.equal(d.buckets.length, 29);
  assert.equal(d.summary.km, 5);
  assert.equal(d.buckets[0].count, 0);
});
test('Year aggregates months and counts unique active days', () => {
  const d = periodData(
    [w('2026-01-01'), w('2026-01-01'), w('2025-12-31')],
    fromISO('2026-09-06'),
    'year',
  );
  assert.equal(d.buckets.length, 12);
  assert.equal(d.summary.count, 2);
  assert.equal(d.summary.days, 1);
  assert.equal(d.buckets[0].km, 10);
});
test('Moving month from Jan 31 does not skip February', () =>
  assert.equal(shiftPeriod(fromISO('2026-01-31'), 'month', 1).getMonth(), 1));
test('CSV handles BOM, quoted comma, escaped quote and line break', () => {
  const r = parseDelimited(
    '\uFEFF商品名称,单价\r\n"鞋,\"\"蓝色\"\"\n跑步",100',
  );
  assert.equal(r[1][0], '鞋,"蓝色"\n跑步');
  assert.equal(r[1][1], '100');
});
test('CSV rejects unmatched quotes', () =>
  assert.throws(() => parseDelimited('name,price\n"shoe,10')));
test('Order mapping splits line total by quantity and retains large textual ID', () => {
  const headers = [
    '商品名称',
    '实付金额',
    '数量',
    '下单日期',
    '订单编号',
    '尺码',
  ];
  const d = tableDrafts(
    [['跑步鞋', '￥299.00', '2', '2026/09/01', '12345678901234567890', '42']],
    detectColumns(headers),
    '订单表格',
    'total',
  )[0];
  assert.equal(d.price, '149.50');
  assert.equal(d.orderId, '12345678901234567890');
  assert.equal(d.category, '鞋履');
  assert.equal(d.sport, '跑步');
  assert.equal(draftErrors(d).length, 0);
  assert.equal(draftsToGear([d]).length, 2);
});
test('Bad dates, missing amounts and unsafe image URLs block import', () => {
  const d = textDrafts('商品名称：跑步鞋\n单价：100\n购买日期：2026-02-30')[0];
  assert.ok(draftErrors(d).length);
  d.date = '2026-01-01';
  d.image = 'javascript:alert(1)';
  assert.ok(draftErrors(d).some((s) => s.includes('图片')));
  d.image = '';
  d.price = '';
  assert.ok(draftErrors(d).some((s) => s.includes('金额')));
});
test('OCR text normalization and duplicate order detection', () => {
  const d = textDrafts(
    '商 品 名 称：跑步鞋\n单价：¥199\n下单日期：2026-09-01\n订单编号：12345\n尺码：42',
  )[0];
  assert.equal(d.name, '跑步鞋');
  assert.equal(d.price, '199');
  const g = draftsToGear([d]);
  assert.equal(duplicateDraft(d, g), true);
});
test('Image URLs reject credentials and non-HTTPS', () => {
  assert.equal(validImageUrl('https://user:pass@example.com/a.jpg'), false);
  assert.equal(validImageUrl('//example.com/a.jpg'), false);
  assert.equal(validImageUrl('https://example.com/a.jpg'), true);
});
test('Prior gear data remains compatible with cost statistics', () => {
  const s = seed();
  const v = gearStats(s.gear[0], s.workouts);
  assert.equal(v.uses, 12);
  assert.equal(v.perUse, s.gear[0].price / 12);
});

test('Blank spreadsheet rows do not shift the embedded-image row index', () => {
  const h = ['商品名称', '单价', '下单日期'];
  const d = tableDrafts(
    [[], ['跑步鞋', '99', '2026-09-01']],
    detectColumns(h),
    '订单表格',
    'unit',
  );
  assert.equal(d.length, 1);
  assert.equal(d[0].sourceRow, 1);
});
test('OCR paragraph gaps keep one labeled order together', () => {
  const d = textDrafts(
    '商品名称：跑步短袖\n单价：129.50\n\n下单日期：2026-09-01\n尺码：M\n\n订单编号：12345',
  )[0];
  assert.equal(d.date, '2026-09-01');
  assert.equal(d.size, 'M');
  assert.equal(d.orderId, '12345');
  assert.equal(d.category, '上装');
});

test('Quantity splitting preserves the exact paid total to the cent', () => {
  const h = ['商品名称', '实付金额', '数量', '下单日期'];
  const d = tableDrafts(
    [['跑步袜', '100', '3', '2026-09-01']],
    detectColumns(h),
    '订单表格',
    'total',
  );
  const gear = draftsToGear(d);
  assert.deepEqual(
    gear.map((g) => g.price),
    [33.34, 33.33, 33.33],
  );
  assert.equal(
    gear.reduce((n, g) => n + Math.round(g.price * 100), 0),
    10000,
  );
});
