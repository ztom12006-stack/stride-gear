import { validImageUrl } from './images.ts';
import { sports, categories, type State } from './model.ts';
export function validState(s: State) {
  const str = (v: unknown) => typeof v === 'string' && v.length <= 200;
  const date = (v: unknown) =>
    typeof v === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(v) &&
    !Number.isNaN(Date.parse(v));
  const num = (v: unknown, min: number, max: number) =>
    typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
  const color = (v: unknown) =>
    typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v);
  if (
    !s ||
    !Array.isArray(s.gear) ||
    !Array.isArray(s.workouts) ||
    !Array.isArray(s.plans) ||
    s.gear.length > 1000 ||
    s.workouts.length > 20000 ||
    s.plans.length > 2000
  )
    return false;
  const ids = new Set(s.gear.map((g) => g.id));
  const refs = (v: unknown) =>
    Array.isArray(v) &&
    v.length <= 100 &&
    new Set(v).size === v.length &&
    v.every((x) => ids.has(x));
  return (
    ids.size === s.gear.length &&
    s.gear.every(
      (g) =>
        str(g.id) &&
        str(g.name) &&
        g.name.trim() &&
        str(g.brand) &&
        str(g.size) &&
        sports.includes(g.sport) &&
        categories.includes(g.category) &&
        date(g.date) &&
        num(g.price, 0, 10000000) &&
        color(g.color) &&
        typeof g.archived === 'boolean' &&
        (g.image === undefined || validImageUrl(g.image)) &&
        (g.orderId === undefined || str(g.orderId)) &&
        (g.importKey === undefined || str(g.importKey)) &&
        (g.source === undefined || str(g.source)),
    ) &&
    s.workouts.every(
      (w) =>
        str(w.id) &&
        date(w.date) &&
        sports.includes(w.sport) &&
        num(w.minutes, 1, 1440) &&
        num(w.km, 0, 1000) &&
        refs(w.gear),
    ) &&
    s.plans.every(
      (p) =>
        str(p.id) &&
        str(p.title) &&
        date(p.date) &&
        sports.includes(p.sport) &&
        refs(p.gear) &&
        typeof p.done === 'boolean',
    ) &&
    s.profile &&
    num(s.profile.height, 140, 210) &&
    num(s.profile.weight, 35, 160) &&
    num(s.profile.face, 0, 100) &&
    num(s.profile.eyes, 0, 100) &&
    ['短发', '长发', '光头'].includes(s.profile.hair) &&
    [s.profile.skin, s.profile.top, s.profile.bottom, s.profile.shoes].every(
      color,
    ) &&
    typeof s.profile.accessory === 'boolean' &&
    (s.profile.outfit === undefined || (s.profile.outfit && typeof s.profile.outfit === 'object' && !Array.isArray(s.profile.outfit) &&
      Object.entries(s.profile.outfit).every(([slot, layer]) => ['top', 'bottom', 'shoes', 'accessory'].includes(slot) &&
        layer && str(layer.gearId) && num(layer.x, -25, 25) && num(layer.y, -25, 25) && num(layer.scale, 0.4, 2))))
  );
}
