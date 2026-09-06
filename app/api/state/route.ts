import { validImageUrl } from '@/lib/images';
import { database } from '@/lib/database';
import { seed, sports, categories, type State } from '@/lib/model';
export async function GET() {
  try {
    const row = await database()
      .prepare('SELECT data, revision FROM wardrobe WHERE id = ?')
      .bind('personal')
      .first<{ data: string; revision: number }>();
    return Response.json(
      row
        ? { state: JSON.parse(row.data), revision: row.revision }
        : { state: seed(), revision: 0 },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return Response.json(
      { error: '暂时无法读取装备库，请稍后重试。' },
      { status: 503 },
    );
  }
}
function valid(s: State) {
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
    typeof s.profile.accessory === 'boolean'
  );
}
export async function PUT(req: Request) {
  try {
    if (
      req.headers.get('origin') &&
      req.headers.get('origin') !== new URL(req.url).origin
    )
      return Response.json({ error: '请求来源无效' }, { status: 403 });
    const raw = await req.text();
    if (raw.length > 2000000)
      return Response.json({ error: '数据量超出限制' }, { status: 413 });
    const { state, revision } = JSON.parse(raw);
    if (!Number.isInteger(revision) || revision < 0 || !valid(state))
      return Response.json({ error: '请检查输入内容' }, { status: 400 });
    const result = await database()
      .prepare(
        'INSERT INTO wardrobe (id,data,revision) VALUES (?, ?, 1) ON CONFLICT(id) DO UPDATE SET data = excluded.data, revision = wardrobe.revision + 1 WHERE wardrobe.revision = ?',
      )
      .bind('personal', JSON.stringify(state), revision)
      .run();
    if (!result.meta.changes)
      return Response.json(
        { error: '装备库已在其他页面更新，请刷新后重试。' },
        { status: 409 },
      );
    return Response.json({ revision: revision + 1 });
  } catch {
    return Response.json(
      { error: '保存失败，请保留当前页面并重试。' },
      { status: 503 },
    );
  }
}
