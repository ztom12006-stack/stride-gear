import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { createDefaultState } from './default-state.mjs';

const dataDir = process.env.STRIDE_DATA_DIR || path.resolve('data');
mkdirSync(dataDir, { recursive: true });
const db = new DatabaseSync(path.join(dataDir, 'stride.sqlite'));
db.exec(`
  CREATE TABLE IF NOT EXISTS app_state (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    revision INTEGER NOT NULL,
    updated_at TEXT NOT NULL
  )
`);

const clone = (value) => JSON.parse(JSON.stringify(value));
const date = () => new Date().toISOString();
const ymd = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
const text = (value, maximum = 200) => typeof value === 'string' && value.length <= maximum;
const colors = (value) => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);

export function validateState(state) {
  if (!state || typeof state !== 'object' || Array.isArray(state)) return false;
  const { gear, workouts, plans, outfits = [], profile } = state;
  if (!Array.isArray(gear) || !Array.isArray(workouts) || !Array.isArray(plans) || !Array.isArray(outfits)) return false;
  if (gear.length > 1000 || workouts.length > 20000 || plans.length > 2000 || outfits.length > 500) return false;
  const ids = new Set(gear.map((item) => item?.id));
  const refs = (value) => Array.isArray(value) && value.length <= 100 && new Set(value).size === value.length && value.every((id) => ids.has(id));
  return (
    ids.size === gear.length &&
    gear.every((item) => item && text(item.id) && text(item.name) && item.name.trim() && text(item.brand) && text(item.sport) && text(item.category) && text(item.size) && ymd(item.date) && Number.isFinite(item.price) && item.price >= 0 && item.price <= 10000000 && colors(item.color) && typeof item.archived === 'boolean' && (item.image === undefined || (text(item.image, 7000000) && (/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/.test(item.image) || /^https:\/\//.test(item.image)))) && (item.orderId === undefined || text(item.orderId)) && (item.importKey === undefined || text(item.importKey)) && (item.source === undefined || text(item.source))) &&
    workouts.every((item) => item && text(item.id) && ymd(item.date) && text(item.sport) && Number.isFinite(item.minutes) && item.minutes >= 1 && item.minutes <= 1440 && Number.isFinite(item.km) && item.km >= 0 && item.km <= 1000 && refs(item.gear)) &&
    plans.every((item) => item && text(item.id) && text(item.title) && ymd(item.date) && text(item.sport) && refs(item.gear) && typeof item.done === 'boolean') &&
    outfits.every((item) => item && text(item.id) && text(item.name) && item.name.trim() && text(item.sport) && refs(item.gear) && ymd(item.createdAt) && ymd(item.updatedAt) && (item.note === undefined || text(item.note))) &&
    profile && Number.isFinite(profile.height) && profile.height >= 140 && profile.height <= 210 && Number.isFinite(profile.weight) && profile.weight >= 35 && profile.weight <= 160 && Number.isFinite(profile.face) && profile.face >= 0 && profile.face <= 100 && Number.isFinite(profile.eyes) && profile.eyes >= 0 && profile.eyes <= 100 && ['短发', '长发', '光头'].includes(profile.hair) && [profile.skin, profile.top, profile.bottom, profile.shoes].every(colors) && typeof profile.accessory === 'boolean' && (profile.displayName === undefined || text(profile.displayName)) && (profile.handle === undefined || text(profile.handle)) && (profile.tagline === undefined || text(profile.tagline))
  );
}

function initialSnapshot() {
  return { state: createDefaultState(), revision: 0 };
}

export function readState() {
  const row = db.prepare('SELECT data, revision FROM app_state WHERE id = ?').get('primary');
  if (!row) return initialSnapshot();
  try {
    const state = JSON.parse(row.data);
    return validateState(state) ? { state, revision: row.revision } : initialSnapshot();
  } catch {
    return initialSnapshot();
  }
}

export function writeState(next, expectedRevision) {
  if (!validateState(next)) throw new Error('数据格式不正确，未保存。');
  const current = readState();
  if (expectedRevision !== undefined && expectedRevision !== current.revision) {
    const error = new Error('数据已在其他窗口更新，请重新读取后再保存。');
    error.code = 'REVISION_CONFLICT';
    throw error;
  }
  const revision = current.revision + 1;
  db.prepare(`INSERT INTO app_state (id, data, revision, updated_at) VALUES (?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET data = excluded.data, revision = excluded.revision, updated_at = excluded.updated_at`).run(
    'primary', JSON.stringify(next), revision, date(),
  );
  return { state: clone(next), revision };
}

export function mutateState(mutator) {
  const current = readState();
  const next = clone(current.state);
  mutator(next);
  return writeState(next, current.revision);
}
