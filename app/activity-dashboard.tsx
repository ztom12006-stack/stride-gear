'use client';
import { useMemo, useState } from 'react';
import { Calendar, CalendarDayButton } from '@/components/ui/calendar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { zhCN } from 'date-fns/locale';
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Timer,
  Footprints,
  Plus,
} from 'lucide-react';
import {
  iso,
  fromISO,
  periodData,
  shiftPeriod,
  type Period,
} from '@/lib/activity';
import { sports, today, type State } from '@/lib/model';
export default function ActivityDashboard({
  state,
  onRecord,
}: {
  state: State;
  onRecord: (date?: string) => void;
}) {
  const [view, setView] = useState('calendar'),
    [anchor, setAnchor] = useState(() => fromISO(today())),
    [selected, setSelected] = useState<Date | undefined>(() =>
      fromISO(today()),
    ),
    [period, setPeriod] = useState<Period>('month'),
    [sport, setSport] = useState('全部运动'),
    [metric, setMetric] = useState<'km' | 'minutes' | 'count'>('km');
  const rows = useMemo(
    () =>
      state.workouts.filter((w) => sport === '全部运动' || w.sport === sport),
    [state.workouts, sport],
  );
  const effective = view === 'calendar' ? 'month' : period;
  const data = periodData(rows, anchor, effective),
    previous = periodData(rows, shiftPeriod(anchor, effective, -1), effective);
  const date = selected ? iso(selected) : '';
  const dayRows = rows.filter((w) => w.date === date);
  const dayPlans = state.plans.filter(
    (p) =>
      p.date === date && !p.done && (sport === '全部运动' || p.sport === sport),
  );
  const title =
    effective === 'year'
      ? `${anchor.getFullYear()} 年`
      : effective === 'month'
        ? `${anchor.getFullYear()} 年 ${anchor.getMonth() + 1} 月`
        : `${data.start} — ${data.end}`;
  const metrics = [
    { key: 'count', name: '运动次数', unit: '次', icon: Activity },
    { key: 'km', name: '运动里程', unit: 'km', icon: Footprints },
    { key: 'minutes', name: '运动时长', unit: '分钟', icon: Timer },
    { key: 'days', name: '活跃天数', unit: '天', icon: CalendarDays },
  ] as const;
  const change = (key: keyof typeof data.summary) => {
    const before = previous.summary[key],
      value = data.summary[key];
    return before
      ? `${value >= before ? '+' : ''}${(((value - before) / before) * 100).toFixed(0)}%`
      : '上一周期无记录';
  };
  return (
    <section className="activity-dashboard">
      <div className="dashboard-toolbar">
        <Tabs value={view} onValueChange={(v) => setView(String(v))}>
          <TabsList>
            <TabsTrigger value="calendar">月视图</TabsTrigger>
            <TabsTrigger value="trend">周期趋势</TabsTrigger>
          </TabsList>
        </Tabs>
        <Select value={sport} onValueChange={(v) => v && setSport(v)}>
          <SelectTrigger aria-label="统计运动项目">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {['全部运动', ...sports].map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <button
          className="outline"
          onClick={() => {
            setAnchor(fromISO(today()));
            setSelected(fromISO(today()));
          }}
        >
          回到今天
        </button>
      </div>
      <div className="period-heading">
        <div className="period-navigation">
          <button
            className="outline"
            aria-label="上一周期"
            onClick={() => setAnchor(shiftPeriod(anchor, effective, -1))}
          >
            <ChevronLeft size={18} />
          </button>
          <h2>{title}</h2>
          <button
            className="outline"
            aria-label="下一周期"
            onClick={() => setAnchor(shiftPeriod(anchor, effective, 1))}
          >
            <ChevronRight size={18} />
          </button>
        </div>
        {view === 'trend' && (
          <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <TabsList>
              {[
                ['week', '周'],
                ['month', '月'],
                ['year', '年'],
              ].map(([v, label]) => (
                <TabsTrigger key={v} value={v}>
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        )}
      </div>
      <div className="period-metrics">
        {metrics.map((m) => (
          <div key={m.key}>
            <span>
              <m.icon size={16} />
              {m.name}
            </span>
            <strong>
              {data.summary[m.key].toLocaleString()}
              <small>{m.unit}</small>
            </strong>
            <p>{change(m.key)}</p>
          </div>
        ))}
      </div>
      <p className="period-hint">
        对比上一
        {effective === 'week' ? '周' : effective === 'month' ? '月' : '年'}
        ；当前周期未结束时，数值会随记录继续增长。
      </p>
      {view === 'calendar' ? (
        <div className="calendar-layout">
          <div className="calendar-panel">
            <Calendar
              className="workout-calendar"
              mode="single"
              locale={zhCN}
              weekStartsOn={1}
              month={anchor}
              onMonthChange={setAnchor}
              selected={selected}
              onSelect={setSelected}
              hideNavigation
              showOutsideDays={false}
              classNames={{
                month_caption: 'sr-only',
                months: 'w-full',
                month: 'w-full',
                month_grid: 'w-full',
              }}
              components={{
                DayButton: (props) => {
                  const key = iso(props.day.date),
                    daily = rows.filter((w) => w.date === key),
                    minutes = daily.reduce((s, w) => s + w.minutes, 0),
                    distance = daily.reduce((s, w) => s + w.km, 0);
                  return (
                    <CalendarDayButton
                      {...props}
                      className={
                        'workout-day ' + (daily.length ? 'has-workout' : '')
                      }
                      aria-label={`${key}，${daily.length} 次运动，${minutes} 分钟，${distance} 公里`}
                    >
                      <span className="day-number">
                        {props.day.date.getDate()}
                      </span>
                      {daily.length > 0 ? (
                        <>
                          <span className="day-sport">
                            {daily[0].sport}
                            {daily.length > 1 ? ` +${daily.length - 1}` : ''}
                          </span>
                          <span className="day-distance">
                            {distance
                              ? `${+distance.toFixed(1)} km`
                              : `${minutes} 分钟`}
                          </span>
                        </>
                      ) : (
                        <span className="rest-day">—</span>
                      )}
                    </CalendarDayButton>
                  );
                },
              }}
            />
            <div className="calendar-legend">
              <i />
              有运动记录 <span>点击日期查看详情</span>
            </div>
          </div>
          <aside className="day-detail">
            <span className="eyebrow">DAILY MOVEMENT</span>
            <h2>
              {selected
                ? `${selected.getMonth() + 1} 月 ${selected.getDate()} 日`
                : '选择一天'}
            </h2>
            {dayRows.map((w) => (
              <div className="daily-workout" key={w.id}>
                <div>
                  <Activity size={17} />
                  <b>{w.sport}</b>
                </div>
                <p>
                  {w.km} km <span>·</span> {w.minutes} 分钟
                </p>
                <small>
                  {w.gear
                    .map((id) => state.gear.find((g) => g.id === id)?.name)
                    .join('、') || '未关联装备'}
                </small>
              </div>
            ))}
            {date && !dayRows.length && (
              <p className="muted">这一天还没有运动记录。</p>
            )}
            {dayPlans.map((p) => (
              <div className="day-plan" key={p.id}>
                <small>待完成计划</small>
                <p>{p.title}</p>
              </div>
            ))}
            {date && date <= today() && (
              <button className="outline full" onClick={() => onRecord(date)}>
                <Plus size={16} />
                记录这一天的运动
              </button>
            )}
          </aside>
        </div>
      ) : (
        <section className="trend-panel">
          <div className="section-heading">
            <h2>
              {metric === 'km'
                ? '运动里程'
                : metric === 'minutes'
                  ? '运动时长'
                  : '运动次数'}
              趋势
            </h2>
            <Select
              value={metric}
              onValueChange={(v) => setMetric(v as typeof metric)}
            >
              <SelectTrigger aria-label="趋势指标">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="km">里程 / km</SelectItem>
                <SelectItem value="minutes">时长 / 分钟</SelectItem>
                <SelectItem value="count">次数</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <ChartContainer
            className="period-chart"
            config={{
              [metric]: {
                label:
                  metric === 'km'
                    ? '里程 (km)'
                    : metric === 'minutes'
                      ? '时长 (分钟)'
                      : '次数',
                color: '#739b44',
              },
            }}
          >
            <AreaChart
              data={data.buckets}
              accessibilityLayer
              margin={{ left: 4, right: 16, top: 15, bottom: 4 }}
            >
              <defs>
                <linearGradient id="activity-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#b4ce8d" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="#b4ce8d" stopOpacity={0.03} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="4 4" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                minTickGap={16}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                allowDecimals={metric === 'km'}
                width={42}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area
                type="linear"
                dataKey={metric}
                stroke="#779b48"
                fill="url(#activity-fill)"
                strokeWidth={2.5}
                dot={effective === 'week'}
                isAnimationActive={false}
              />
            </AreaChart>
          </ChartContainer>
          {!data.rows.length && (
            <p className="trend-empty">
              这个周期暂无记录，可切换日期或记录运动。
            </p>
          )}
          <details className="chart-data">
            <summary>查看周期数据明细</summary>
            <div className="chart-data-list">
              {data.buckets.map((b) => (
                <div key={b.date}>
                  <b>{b.date}</b>
                  <span>{b.count} 次</span>
                  <span>{b.minutes} 分钟</span>
                  <span>{b.km} km</span>
                </div>
              ))}
            </div>
          </details>
        </section>
      )}
    </section>
  );
}
