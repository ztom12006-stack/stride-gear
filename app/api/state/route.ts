import { validState } from '@/lib/state-validation';
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
    if (!Number.isInteger(revision) || revision < 0 || !validState(state))
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
