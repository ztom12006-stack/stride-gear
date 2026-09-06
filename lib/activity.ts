import type { Workout } from './model.ts';
export type Period = 'week' | 'month' | 'year';
export const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const fromISO = (s: string) =>
  new Date(
    Number(s.slice(0, 4)),
    Number(s.slice(5, 7)) - 1,
    Number(s.slice(8, 10)),
    12,
  );
export function periodBounds(anchor: Date, period: Period) {
  let start: Date, end: Date;
  if (period === 'year') {
    start = new Date(anchor.getFullYear(), 0, 1, 12);
    end = new Date(anchor.getFullYear(), 11, 31, 12);
  } else if (period === 'month') {
    start = new Date(anchor.getFullYear(), anchor.getMonth(), 1, 12);
    end = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0, 12);
  } else {
    start = new Date(anchor);
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    end = new Date(start);
    end.setDate(end.getDate() + 6);
  }
  return { start: iso(start), end: iso(end) };
}
export function shiftPeriod(anchor: Date, period: Period, direction: number) {
  if (period === 'year')
    return new Date(anchor.getFullYear() + direction, 0, 1, 12);
  if (period === 'month')
    return new Date(anchor.getFullYear(), anchor.getMonth() + direction, 1, 12);
  const d = new Date(anchor);
  d.setDate(d.getDate() + direction * 7);
  return d;
}
export function summarize(rows: Workout[]) {
  return {
    count: rows.length,
    km: Math.round(rows.reduce((s, w) => s + w.km, 0) * 100) / 100,
    minutes: rows.reduce((s, w) => s + w.minutes, 0),
    days: new Set(rows.map((w) => w.date)).size,
  };
}
export function periodData(rows: Workout[], anchor: Date, period: Period) {
  const { start, end } = periodBounds(anchor, period);
  const current = rows.filter((w) => w.date >= start && w.date <= end);
  const buckets = [];
  if (period === 'year') {
    for (let m = 0; m < 12; m++) {
      const prefix = `${anchor.getFullYear()}-${String(m + 1).padStart(2, '0')}`;
      buckets.push({
        label: `${m + 1}月`,
        date: prefix,
        ...summarize(current.filter((w) => w.date.startsWith(prefix))),
      });
    }
  } else {
    const d = fromISO(start);
    while (iso(d) <= end) {
      const key = iso(d);
      buckets.push({
        label:
          period === 'week'
            ? ['日', '一', '二', '三', '四', '五', '六'][d.getDay()]
            : `${d.getDate()}`,
        date: key,
        ...summarize(current.filter((w) => w.date === key)),
      });
      d.setDate(d.getDate() + 1);
    }
  }
  return { start, end, rows: current, buckets, summary: summarize(current) };
}
