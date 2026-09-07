'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  Activity,
  ArrowUpRight,
  ArrowRight,
  Plus,
  Search,
  Package,
  CalendarDays,
  ChartNoAxesColumn,
  Compass,
  Shirt,
  Footprints,
  Backpack,
  Check,
  LoaderCircle,
  MoveUpRight,
  SlidersHorizontal,
  RotateCw,
  ChevronRight,
  Wallet,
  Layers,
  Timer,
  Mountain,
  CheckCircle2,
} from 'lucide-react';
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import {
  seed,
  today,
  gearStats,
  categories,
  sports,
  type Gear,
  type State,
  type Profile,
  type Plan,
} from '@/lib/model';
import { isPages, assetUrl } from '@/lib/runtime';
import { readLocal, writeLocal } from '@/lib/local-state';
import BackupControls from './backup-controls';
import Doll from './doll';
import { OutfitPicker } from './outfit-picker';
import ActivityDashboard from './activity-dashboard';
import { GearPhoto, PhotoEditor } from './gear-photo';
import OrderImporter from './order-importer';
const money = (n: number) =>
  '¥' +
  n.toLocaleString('zh-CN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  });
const iconFor = (c: string) =>
  c === '鞋履' ? Footprints : c === '装备' ? Backpack : Shirt;
const nav = [
  { id: 'overview', name: '装备总览', icon: Layers },
  { id: 'gear', name: '我的装备', icon: Package },
  { id: 'plans', name: '使用计划', icon: CalendarDays },
  { id: 'stats', name: '运动与成本', icon: ChartNoAxesColumn },
  { id: 'discover', name: '装备发现', icon: Compass },
  { id: 'studio', name: '穿搭实验室', icon: Shirt },
];
function Choice({
  value,
  onChange,
  options,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  label: string;
}) {
  return (
    <Select value={value} onValueChange={(v) => v && onChange(v)}>
      <SelectTrigger aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((v) => (
          <SelectItem key={v} value={v}>
            {v}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
function Nav({
  page,
  setPage,
}: {
  page: string;
  setPage: (s: string) => void;
}) {
  const { setOpenMobile } = useSidebar();
  return (
    <Sidebar>
      <SidebarHeader>
        <a
          href="#overview"
          className="brand"
          onClick={() => setPage('overview')}
        >
          <span className="brand-mark">
            <Activity />
          </span>
          STRIDE<span className="brand-dot">®</span>
        </a>
      </SidebarHeader>
      <SidebarContent>
        <div className="nav-caption">个人空间</div>
        <SidebarMenu>
          {nav.map((n, i) => (
            <SidebarMenuItem key={n.id}>
              {i === 4 && (
                <div className="nav-caption second-caption">发现与灵感</div>
              )}
              <SidebarMenuButton
                className="nav-button"
                isActive={page === n.id}
                onClick={() => {
                  setPage(n.id);
                  setOpenMobile(false);
                }}
              >
                <n.icon />
                <span>{n.name}</span>
                {n.id === 'studio' && <i className="beta">LAB</i>}
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
        <div className="sidebar-note">
          <div className="small-orbit">
            <Footprints />
          </div>
          <b>
            让每一件装备
            <br />
            都有出场机会。
          </b>
          <span>PACK WELL. MOVE MORE.</span>
        </div>
      </SidebarContent>
      <SidebarFooter>
        <div className="person">
          <span className="person-avatar">S</span>
          <div>
            <b>我的运动空间</b>
            <small>私人装备库</small>
          </div>
          <span className="online-dot" />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
export default function GearApp() {
  const [state, setState] = useState<State | null>(null),
    [revision, setRevision] = useState(0),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(true),
    [saving, setSaving] = useState(false),
    [notice, setNotice] = useState(''),
    [page, setPageRaw] = useState('overview'),
    [filter, setFilter] = useState('全部运动'),
    [query, setQuery] = useState(''),
    [archived, setArchived] = useState(false),
    [modal, setModal] = useState<'gear' | 'workout' | 'plan' | null>(null),
    [editing, setEditing] = useState<Gear | null>(null),
    [fromPlan, setFromPlan] = useState<Plan | null>(null),
    [profile, setProfile] = useState<Profile>(seed().profile),
    [audience, setAudience] = useState('日常入门'),
    [budget, setBudget] = useState('不限预算');
  const [importOpen, setImportOpen] = useState(false),
    [recordDate, setRecordDate] = useState(today());
  const busy = useRef(false);
  const setPage = (id: string) => {
    setPageRaw(id);
    window.history.replaceState(null, '', '#' + id);
  };
  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = isPages ? null : await fetch('/api/state');
      const data = (isPages ? await readLocal() : await res!.json()) as {
        state: State;
        revision: number;
        error?: string;
      };
      if (res && !res.ok) throw Error(data.error);
      setState(data.state);
      setProfile(data.state.profile);
      setRevision(data.revision);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
    const h = window.location.hash.slice(1);
    if (nav.some((n) => n.id === h)) setPageRaw(h);
  }, []);
  useEffect(() => {
    if (notice) {
      const t = setTimeout(() => setNotice(''), 4500);
      return () => clearTimeout(t);
    }
  }, [notice]);
  async function save(next: State, message = '已保存') {
    if (busy.current) return false;
    busy.current = true;
    setSaving(true);
    setError('');
    try {
      const r = isPages ? null : await fetch('/api/state', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: next, revision }),
      });
      const d = (isPages ? await writeLocal(next, revision) : await r!.json()) as { revision: number; error?: string };
      if (r && !r.ok) throw Error(d.error);
      setState(next);
      setRevision(d.revision);
      setNotice(message);
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }
  function open(
    kind: 'gear' | 'workout' | 'plan',
    gear: Gear | null = null,
    plan: Plan | null = null,
  ) {
    setEditing(gear);
    setFromPlan(plan);
    setRecordDate(today());
    setModal(kind);
  }
  const active = state?.gear.filter((g) => !g.archived) || [];
  const total = state?.gear.reduce((s, g) => s + g.price, 0) || 0;
  const runs = state?.workouts || [];
  const km = runs.reduce((s, w) => s + w.km, 0);
  const daily =
    state?.gear.reduce((s, g) => s + gearStats(g, runs).daily, 0) || 0;
  const cards =
    state?.gear.filter(
      (g) =>
        g.archived === archived &&
        (filter === '全部运动' || g.sport === filter) &&
        `${g.name} ${g.brand}`.toLowerCase().includes(query.toLowerCase()),
    ) || [];
  function gearCard(g: Gear) {
    const stats = gearStats(g, runs);
    return (
      <button className="gear-card" key={g.id} onClick={() => open('gear', g)}>
        <div
          className="gear-visual"
          
        >
          <span className="sport-tag">
            {g.sport} / {g.category}
          </span>
          <GearPhoto key={g.image || g.category} gear={g} />
          <span className="gear-size">{g.size}</span>
        </div>
        <div className="gear-details">
          <small>{g.brand}</small>
          <h3>{g.name}</h3>
          <div className="gear-meta">
            <span>
              已使用 <b>{stats.uses}</b> 次
            </span>
            <span>
              {stats.perUse === null ? '尚未使用' : money(stats.perUse) + '/次'}
            </span>
          </div>
          <div className="gear-bottom">
            <span>
              <i style={{ background: g.color }} />
              {g.archived ? '已归档' : '使用中'}
            </span>
            <ArrowUpRight size={17} />
          </div>
        </div>
      </button>
    );
  }
  return (
    <SidebarProvider>
      <Nav page={page} setPage={setPage} />
      <main className="app-main">
        <header className="topbar">
          <div>
            <SidebarTrigger className="mobile-trigger" />
            <span>我的空间</span>
            <ChevronRight size={14} />
            <b>{nav.find((n) => n.id === page)?.name}</b>
          </div>
          <div className="topbar-right">
            <span className="status-dot" />
            {saving ? '正在保存…' : '私人空间'}
            <span className="date-label">{today().replaceAll('-', ' / ')}</span>
            <span className="mini-avatar">S</span>
          </div>
        </header>
        <div className="page-content">
          {error && (
            <div className="error-banner" role="alert">
              {error}
              <button onClick={load}>重新读取</button>
            </div>
          )}
          {notice && (
            <div className="toast" role="status">
              <CheckCircle2 size={18} />
              {notice}
            </div>
          )}
          {loading ? (
            <div className="loading">
              <LoaderCircle className="spin" />
              正在整理你的装备空间…
            </div>
          ) : !state ? (
            <div className="empty">
              <Package />
              <h2>暂时无法打开装备库</h2>
              <button className="primary" onClick={load}>
                重新加载
              </button>
            </div>
          ) : (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">
                    {page === 'discover'
                      ? 'EXPLORE YOUR NEXT MOVE'
                      : page === 'studio'
                        ? 'THE FIT LAB'
                        : 'YOUR PERSONAL GEAR SPACE'}
                  </div>
                  <h1>
                    {page === 'overview'
                      ? '好装备，陪你走得更远。'
                      : nav.find((n) => n.id === page)?.name}
                  </h1>
                  <p>
                    {page === 'overview'
                      ? '记录每一次出发，让热爱看得见。'
                      : page === 'gear'
                        ? '从第一双跑鞋，到每一次新的开始。'
                        : page === 'plans'
                          ? '为下一次出发，提前准备好。'
                          : page === 'stats'
                            ? '看见你的投入，也看见每一份坚持。'
                            : page === 'discover'
                              ? '从运动场景出发，找到合适的装备。'
                              : '试试新的配色，找到自己的运动风格。'}
                  </p>
                </div>
                <div className="heading-actions">
                  {(page === 'gear' || page === 'overview') && (
                    <button
                      className="outline"
                      onClick={() => setImportOpen(true)}
                    >
                      订单导入
                    </button>
                  )}
                  <button
                    className="primary"
                    disabled={saving}
                    onClick={() =>
                      page === 'plans'
                        ? open('plan')
                        : page === 'stats'
                          ? open('workout')
                          : page === 'studio'
                            ? save({ ...state, profile }, '人物与搭配已保存')
                            : open('gear')
                    }
                  >
                    <Plus size={17} />
                    {page === 'plans'
                      ? '新建计划'
                      : page === 'stats'
                        ? '记录运动'
                        : page === 'studio'
                          ? '保存形象与搭配'
                          : '添加装备'}
                  </button>
                </div>
              </div>
              {isPages && <BackupControls state={state} saving={saving} restore={(next) => save(next, "备份已恢复")} />}
              {revision === 0 && (
                <div className="demo-notice">
                  当前展示示例装备与运动记录。首次保存后写入你的私人空间，可逐件编辑或归档。
                </div>
              )}
              {page === 'overview' && (
                <section className="metrics">
                  <div>
                    <span>
                      <Package size={16} />
                      装备总数
                    </span>
                    <strong>
                      {active.length}
                      <small>件</small>
                    </strong>
                    <p>
                      {state.gear.filter((g) => g.archived).length} 件已归档
                    </p>
                  </div>
                  <div>
                    <span>
                      <Wallet size={16} />
                      累计购入金额
                    </span>
                    <strong>
                      <small>¥</small>
                      {total.toLocaleString('zh-CN')}
                    </strong>
                    <p>含已归档装备</p>
                  </div>
                  <div>
                    <span>
                      <Activity size={16} />
                      累计运动里程
                    </span>
                    <strong>
                      {km.toFixed(1)}
                      <small>km</small>
                    </strong>
                    <p>{runs.length} 次运动，一步一步积累</p>
                  </div>
                  <div className="metric-accent">
                    <span>
                      <ChartNoAxesColumn size={16} />
                      每日持有成本
                    </span>
                    <strong>
                      <small>¥</small>
                      {daily.toFixed(2)}
                      <small>/ 天</small>
                    </strong>
                    <p>逐件购入金额 ÷ 各自持有天数</p>
                  </div>
                </section>
              )}
              {page === 'overview' && (
                <div className="overview-grid">
                  <div>
                    <section className="journey-banner">
                      <div>
                        <span className="eyebrow">
                          READY FOR YOUR NEXT STRIDE
                        </span>
                        <h2>让装备动起来。</h2>
                        <p>
                          {
                            active.filter((g) => gearStats(g, runs).uses === 0)
                              .length
                          }{' '}
                          件装备还没有运动记录
                          <br />
                          下一次出发，给它们一个机会。
                        </p>
                        <button onClick={() => open('workout')}>
                          记录一次运动 <ArrowUpRight size={16} />
                        </button>
                      </div>
                      <span className="journey-number">
                        GO
                        <MoveUpRight />
                      </span>
                      <span className="banner-coordinate">
                        31° N / KEEP MOVING
                      </span>
                    </section>
                    <div className="section-heading">
                      <h2>
                        常用装备 <span>{active.length}</span>
                      </h2>
                      <button onClick={() => setPage('gear')}>
                        查看全部 <ArrowRight size={16} />
                      </button>
                    </div>
                    <div className="gear-grid overview-cards">
                      {[...active]
                        .sort(
                          (a, b) =>
                            gearStats(b, runs).uses - gearStats(a, runs).uses,
                        )
                        .slice(0, 3)
                        .map(gearCard)}
                    </div>
                    <section className="activity-panel">
                      <div className="section-heading">
                        <h2>最近的脚步</h2>
                        <button onClick={() => setPage('stats')}>
                          全部记录 <ArrowRight size={16} />
                        </button>
                      </div>
                      {[...runs]
                        .sort((a, b) => b.date.localeCompare(a.date))
                        .slice(0, 3)
                        .map((w) => (
                          <div className="activity-row" key={w.id}>
                            <span className="activity-icon">
                              <Activity />
                            </span>
                            <div>
                              <b>{w.sport}</b>
                              <small>
                                {w.date} · {w.gear.length} 件装备
                              </small>
                            </div>
                            <strong>
                              {w.km}
                              <small> km</small>
                            </strong>
                            <span>{w.minutes} 分钟</span>
                          </div>
                        ))}
                      {!runs.length && (
                        <p className="muted">
                          还没有运动记录，记录你的第一次出发。
                        </p>
                      )}
                    </section>
                  </div>
                  <aside className="right-column">
                    <section className="plan-panel">
                      <div className="section-heading">
                        <h2>接下来的计划</h2>
                        <CalendarDays size={18} />
                      </div>
                      {state.plans
                        .filter((p) => !p.done)
                        .sort((a, b) => a.date.localeCompare(b.date))
                        .slice(0, 3)
                        .map((p) => (
                          <div className="plan-preview" key={p.id}>
                            <span>{p.date === today() ? '今天' : p.date}</span>
                            <h3>{p.title}</h3>
                            <p>{p.gear.length} 件装备已就位</p>
                            <button onClick={() => open('workout', null, p)}>
                              完成并记录 <ArrowRight size={14} />
                            </button>
                          </div>
                        ))}
                      <button
                        className="outline full"
                        onClick={() => open('plan')}
                      >
                        <Plus size={16} />
                        安排下一次运动
                      </button>
                    </section>
                    <section className="studio-card">
                      <div className="studio-card-title">
                        <span className="eyebrow">THE FIT LAB</span>
                        <h2>你的下一套运动穿搭</h2>
                        <p>随心组合，找到新的可能。</p>
                      </div>
                      <div className="mini-model">
                        <Doll profile={state.profile} gear={active} />
                      </div>
                      <button onClick={() => setPage('studio')}>
                        进入穿搭实验室 <ArrowUpRight size={18} />
                      </button>
                    </section>
                  </aside>
                </div>
              )}
              {page === 'gear' && (
                <>
                  <div className="filter-row">
                    <div className="search-field">
                      <Search size={18} />
                      <input
                        aria-label="搜索装备"
                        placeholder="搜索名称、品牌…"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                    </div>
                    <Choice
                      value={filter}
                      onChange={setFilter}
                      options={['全部运动', ...sports]}
                      label="运动项目"
                    />
                    <button
                      className={'outline ' + (archived ? 'selected' : '')}
                      onClick={() => setArchived(!archived)}
                    >
                      {archived ? '查看使用中' : '查看已归档'}
                    </button>
                    <span className="muted">{cards.length} 件装备</span>
                  </div>
                  <div className="gear-grid">{cards.map(gearCard)}</div>
                  {!cards.length && (
                    <div className="empty">
                      <Package />
                      <h2>这里还没有装备</h2>
                      <p>调整筛选条件，或添加你的第一件装备。</p>
                      <button className="primary" onClick={() => open('gear')}>
                        添加装备
                      </button>
                    </div>
                  )}
                </>
              )}
              {page === 'plans' && (
                <div className="plan-grid">
                  {[...state.plans]
                    .sort((a, b) => a.date.localeCompare(b.date))
                    .map((p) => (
                      <article
                        className={'plan-card ' + (p.done ? 'done' : '')}
                        key={p.id}
                      >
                        <div className="section-heading">
                          <span className="pill">{p.sport}</span>
                          <span className="muted">
                            {p.done
                              ? '已完成'
                              : p.date < today()
                                ? '待补记'
                                : '待出发'}
                          </span>
                        </div>
                        <h2>{p.title}</h2>
                        <p>
                          <CalendarDays size={16} />
                          {p.date}
                        </p>
                        <div className="plan-gear">
                          {p.gear.map((id) => (
                            <span key={id}>
                              {state.gear.find((g) => g.id === id)?.name}
                            </span>
                          ))}
                        </div>
                        <button
                          className="outline"
                          disabled={saving || p.done}
                          onClick={() => open('workout', null, p)}
                        >
                          {p.done ? <Check size={16} /> : <Plus size={16} />}{' '}
                          {p.done ? '运动已记录' : '完成并记录运动'}
                        </button>
                      </article>
                    ))}
                  {!state.plans.length && (
                    <div className="empty">还没有计划，安排下一次运动吧。</div>
                  )}
                </div>
              )}
              {page === 'stats' && (
                <>
                  <ActivityDashboard
                    state={state}
                    onRecord={(date) => {
                      open('workout');
                      if (date) setRecordDate(date);
                    }}
                  />
                  <div className="section-heading">
                    <h2>每件装备，用得值吗？</h2>
                  </div>
                  <p className="cost-note">
                    每日成本＝价格 ÷
                    持有天数（含购买当天）；每次／每公里成本＝价格 ÷
                    已关联的次数／里程。未使用时显示「—」。
                  </p>
                  <div className="table-wrap">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {[
                            '装备',
                            '使用次数',
                            '里程',
                            '每日成本',
                            '每次成本',
                            '每公里成本',
                          ].map((t) => (
                            <TableHead key={t}>{t}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {state.gear.map((g) => {
                          const st = gearStats(g, runs);
                          return (
                            <TableRow key={g.id}>
                              <TableCell>
                                <b>{g.name}</b>
                                {g.archived && <small> · 已归档</small>}
                              </TableCell>
                              <TableCell>{st.uses} 次</TableCell>
                              <TableCell>{st.km} km</TableCell>
                              <TableCell>{money(st.daily)}</TableCell>
                              <TableCell>
                                {st.perUse === null ? '—' : money(st.perUse)}
                              </TableCell>
                              <TableCell>
                                {st.perKm === null ? '—' : money(st.perKm)}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="section-heading">
                    <h2>运动记录</h2>
                    <button onClick={() => open('workout')}>
                      添加记录 <Plus size={16} />
                    </button>
                  </div>
                  <div className="table-wrap">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {['日期', '运动', '时长', '里程', '关联装备'].map(
                            (t) => (
                              <TableHead key={t}>{t}</TableHead>
                            ),
                          )}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {[...runs]
                          .sort((a, b) => b.date.localeCompare(a.date))
                          .map((w) => (
                            <TableRow key={w.id}>
                              <TableCell>{w.date}</TableCell>
                              <TableCell>{w.sport}</TableCell>
                              <TableCell>{w.minutes} 分钟</TableCell>
                              <TableCell>{w.km} km</TableCell>
                              <TableCell>
                                {w.gear
                                  .map(
                                    (id) =>
                                      state.gear.find((g) => g.id === id)?.name,
                                  )
                                  .join('、') || '未关联'}
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
              {page === 'discover' && (
                <>
                  <div className="discovery-banner">
                    <div>
                      <span className="eyebrow">FIND YOUR OWN PACE</span>
                      <h2>
                        适合你的，
                        <br />
                        才是好装备。
                      </h2>
                      <p>结合运动目标与预算，探索选购方向。</p>
                    </div>
                    <img
                      src={assetUrl("/outfit-reference.jpg")}
                      alt="灰色运动服全身搭配参考"
                    />
                    <a
                      href="https://www.pexels.com/photo/athletic-woman-in-gray-sportswear-studio-portrait-28774702/"
                      target="_blank"
                      rel="noreferrer"
                    >
                      穿搭参考 · INFECTED Store / Pexels ↗
                    </a>
                  </div>
                  <div className="filter-row">
                    <SlidersHorizontal size={18} />
                    <Choice
                      value={filter}
                      onChange={setFilter}
                      options={['全部运动', ...sports]}
                      label="运动项目"
                    />
                    <Choice
                      value={audience}
                      onChange={setAudience}
                      options={['日常入门', '进阶训练', '舒适优先']}
                      label="使用人群"
                    />
                    <Choice
                      value={budget}
                      onChange={setBudget}
                      options={['不限预算', '300 元以内', '300–800 元']}
                      label="预算"
                    />
                  </div>
                  <p className="cost-note">
                    以下为虚构概念装备与示例评估，用于体验推荐流程；评分和价格不代表实测或在售商品。
                  </p>
                  <div className="discovery-grid">
                    {state.gear
                      .filter(
                        (g) =>
                          (filter === '全部运动' || filter === g.sport) &&
                          (budget === '不限预算' ||
                            (budget === '300 元以内' && g.price <= 300) ||
                            (budget === '300–800 元' &&
                              g.price > 300 &&
                              g.price <= 800)),
                      )
                      .map((g) => (
                        <article className="discovery-item" key={g.id}>
                          <div className="discovery-photo">
                            <GearPhoto key={g.image || g.category} gear={g} />
                          </div>
                          <span className="pill">
                            {g.sport} · {audience}
                          </span>
                          <h2>{g.name}</h2>
                          <p>
                            {audience === '进阶训练'
                              ? '建议重点比较专项性能、耐用度与训练场景。'
                              : audience === '舒适优先'
                                ? '建议优先确认穿着舒适度、尺码与活动空间。'
                                : '先从日常使用频率和基础需求出发，减少闲置。'}
                          </p>
                          <div className="review-scores">
                            {['轻量性', '舒适性', '耐用性'].map((k, i) => (
                              <div key={k}>
                                <span>{k}</span>
                                <meter min={0} max={10} value={[8, 9, 7][i]} />
                                <b>{[8, 9, 7][i]}.0</b>
                              </div>
                            ))}
                          </div>
                          <div className="section-heading">
                            <b>示例价格 {money(g.price)}</b>
                            <button
                              onClick={() => {
                                setProfile({
                                  ...profile,
                                  ...(g.category === '上装'
                                    ? { top: g.color }
                                    : g.category === '下装'
                                      ? { bottom: g.color }
                                      : g.category === '鞋履'
                                        ? { shoes: g.color }
                                        : { accessory: true }),
                                });
                                setPage('studio');
                              }}
                            >
                              试试配色 <ArrowUpRight size={16} />
                            </button>
                          </div>
                          <button
                            className="outline full"
                            onClick={() =>
                              open('gear', {
                                ...g,
                                id: crypto.randomUUID(),
                                name: g.name + '（新购）',
                                date: today(),
                                archived: false,
                              })
                            }
                          >
                            录入为新装备 <Plus size={15} />
                          </button>
                        </article>
                      ))}
                  </div>
                  {!state.gear.some(
                    (g) =>
                      (filter === '全部运动' || filter === g.sport) &&
                      (budget === '不限预算' ||
                        (budget === '300 元以内' && g.price <= 300) ||
                        (budget === '300–800 元' &&
                          g.price > 300 &&
                          g.price <= 800)),
                  ) && (
                    <div className="empty">
                      暂无符合条件的示例装备，请调整筛选。
                    </div>
                  )}
                </>
              )}
              {page === 'studio' && (
                <div className="studio-layout">
                  <section className="avatar-stage">
                    <div className="stage-label">
                      <span className="pill">装扮娃娃</span>
                      <span>
                        {profile.height} cm / {profile.weight} kg
                      </span>
                    </div>
                    <Doll profile={profile} gear={active} onChange={setProfile} />
                    <div className="stage-footer">
                      <RotateCw size={16} />
                      选择装备，调整位置与大小
                    </div>
                    <div className="stage-caption">
                      平面换装用于搭配参考。正面、平铺、透明背景的装备照片效果更好，不用于判断真实合身度。
                    </div>
                  </section>
                  <section className="studio-controls">
                    <Tabs defaultValue="outfit">
                      <TabsList className="studio-tabs">
                        <TabsTrigger value="outfit">装备搭配</TabsTrigger>
                        <TabsTrigger value="body">身材与捏脸</TabsTrigger>
                      </TabsList>
                      <TabsContent value="outfit">
                        <h2>今天，怎么穿？</h2>
                        <OutfitPicker profile={profile} gear={active} onChange={setProfile} />
                      </TabsContent>
                      <TabsContent value="body">
                        <h2>建立你的运动形象</h2>
                        <div className="form-grid">
                          <label>
                            身高 / cm
                            <input
                              type="number"
                              min="140"
                              max="210"
                              value={profile.height}
                              onChange={(e) =>
                                setProfile({
                                  ...profile,
                                  height: Math.max(
                                    140,
                                    Math.min(210, +e.target.value),
                                  ),
                                })
                              }
                            />
                          </label>
                          <label>
                            体重 / kg
                            <input
                              type="number"
                              min="35"
                              max="160"
                              value={profile.weight}
                              onChange={(e) =>
                                setProfile({
                                  ...profile,
                                  weight: Math.max(
                                    35,
                                    Math.min(160, +e.target.value),
                                  ),
                                })
                              }
                            />
                          </label>
                        </div>
                        <p className="cost-note">
                          身高和体重仅控制人物的大致比例，不推断真实身体围度。
                        </p>
                        {[
                          ['脸型宽度', 'face'],
                          ['眼距', 'eyes'],
                        ].map(([name, key]) => (
                          <div className="range-control" key={key}>
                            <label>
                              {name}
                              <span>{profile[key as 'face' | 'eyes']}</span>
                            </label>
                            <Slider
                              aria-label={name}
                              value={[profile[key as 'face' | 'eyes']]}
                              onValueChange={(v) =>
                                setProfile({
                                  ...profile,
                                  [key]: Array.isArray(v) ? v[0] : v,
                                })
                              }
                              min={0}
                              max={100}
                            />
                          </div>
                        ))}
                        <label className="field">
                          发型
                          <Choice
                            label="发型"
                            value={profile.hair}
                            onChange={(v) =>
                              setProfile({ ...profile, hair: v })
                            }
                            options={['短发', '长发', '光头']}
                          />
                        </label>
                        <div className="skin-choices">
                          <h3>肤色</h3>
                          {[
                            '#efd0b2',
                            '#d8ac8e',
                            '#c89574',
                            '#986647',
                            '#614632',
                          ].map((c) => (
                            <button
                              key={c}
                              aria-label={'肤色 ' + c}
                              aria-pressed={profile.skin === c}
                              style={{ background: c }}
                              onClick={() =>
                                setProfile({ ...profile, skin: c })
                              }
                            >
                              {profile.skin === c && <Check size={18} />}
                            </button>
                          ))}
                        </div>
                      </TabsContent>
                    </Tabs>
                    <button
                      className="primary full"
                      disabled={saving}
                      onClick={() =>
                        save({ ...state, profile }, '人物与搭配已保存')
                      }
                    >
                      <Check size={17} />
                      保存这套搭配
                    </button>
                  </section>
                </div>
              )}
              <footer className="page-footer">
                <span>STRIDE · 每一次出发，都算数。</span>
                <span>PERSONAL GEAR / EVERYDAY MOVEMENT</span>
              </footer>
            </>
          )}
        </div>
      </main>
      {state && importOpen && (
        <OrderImporter
          open
          onClose={() => setImportOpen(false)}
          gear={state.gear}
          onImport={(items) =>
            save(
              { ...state, gear: [...state.gear, ...items] },
              `已导入 ${items.length} 件装备`,
            )
          }
        />
      )}
      <Dialog
        open={modal !== null}
        onOpenChange={(o) => {
          if (!o && !saving) setModal(null);
        }}
      >
        <DialogContent className="edit-dialog">
          <DialogTitle>
            {modal === 'gear'
              ? editing
                ? '编辑装备'
                : '添加新装备'
              : modal === 'plan'
                ? '安排下一次运动'
                : '记录一次运动'}
          </DialogTitle>
          <DialogDescription>
            {modal === 'gear'
              ? '记录装备信息，开始积累它的使用故事。'
              : modal === 'plan'
                ? '选好日期和装备，让出发更轻松。'
                : '关联本次使用的装备，自动更新次数、里程和成本。'}
          </DialogDescription>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          {state && modal && (
            <EntryForm
              key={
                modal + (editing?.id || '') + (fromPlan?.id || '') + recordDate
              }
              defaultDate={recordDate}
              kind={modal}
              state={state}
              editing={editing}
              plan={fromPlan}
              saving={saving}
              onArchive={async () => {
                if (
                  editing &&
                  (await save(
                    {
                      ...state,
                      gear: state.gear.map((g) =>
                        g.id === editing.id
                          ? { ...g, archived: !g.archived }
                          : g,
                      ),
                    },
                    editing.archived ? '已恢复装备' : '已归档，历史记录仍保留',
                  ))
                )
                  setModal(null);
              }}
              onSubmit={async (next) => {
                if (await save(next)) setModal(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
function EntryForm({
  kind,
  state,
  editing,
  plan,
  saving,
  onSubmit,
  onArchive,
  defaultDate,
}: {
  defaultDate: string;
  kind: 'gear' | 'plan' | 'workout';
  state: State;
  editing: Gear | null;
  plan: Plan | null;
  saving: boolean;
  onSubmit: (s: State) => Promise<void>;
  onArchive: () => Promise<void>;
}) {
  const [sport, setSport] = useState(editing?.sport || plan?.sport || '跑步'),
    [category, setCategory] = useState(editing?.category || '鞋履'),
    [ids, setIds] = useState<string[]>(plan?.gear || []),
    [error, setError] = useState(''),
    [gearImage, setGearImage] = useState(editing?.image || ''),
    [imageBusy, setImageBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    const fd = new FormData(e.currentTarget),
      s = (k: string) => String(fd.get(k) || '').trim();
    const date = s('date');
    if (kind !== 'plan' && date > today()) {
      setError('购买日期与运动日期不能晚于今天。');
      return;
    }
    if (kind === 'gear') {
      const g: Gear = {
        ...editing,
        image: gearImage,
        id: editing?.id || crypto.randomUUID(),
        name: s('name'),
        brand: s('brand'),
        size: s('size'),
        price: Number(fd.get('price')),
        date,
        color: s('color'),
        sport,
        category,
        archived: editing?.archived || false,
      };
      await onSubmit({
        ...state,
        gear: state.gear.some((x) => x.id === g.id)
          ? state.gear.map((x) => (x.id === g.id ? g : x))
          : [...state.gear, g],
      });
    } else if (kind === 'plan') {
      await onSubmit({
        ...state,
        plans: [
          ...state.plans,
          {
            id: crypto.randomUUID(),
            title: s('name'),
            date,
            sport,
            gear: ids,
            done: false,
          },
        ],
      });
    } else {
      if (
        ids.some(
          (id) => (state.gear.find((g) => g.id === id)?.date || '') > date,
        )
      ) {
        setError('运动日期不能早于所选装备的购买日期。');
        return;
      }
      await onSubmit({
        ...state,
        workouts: [
          ...state.workouts,
          {
            id: crypto.randomUUID(),
            date,
            sport,
            minutes: Number(fd.get('minutes')),
            km: Number(fd.get('km')),
            gear: ids,
          },
        ],
        plans: plan
          ? state.plans.map((p) =>
              p.id === plan.id ? { ...p, done: true } : p,
            )
          : state.plans,
      });
    }
  }
  return (
    <form onSubmit={submit} className="entry-form">
      {kind === 'gear' && (
        <PhotoEditor
          value={gearImage}
          onChange={setGearImage}
          onBusy={setImageBusy}
        />
      )}
      <div className="form-grid">
        {kind !== 'workout' && (
          <label className="wide">
            {kind === 'gear' ? '装备名称' : '计划名称'}
            <input
              name="name"
              required
              maxLength={100}
              defaultValue={editing?.name}
              placeholder={
                kind === 'gear'
                  ? '例如：日常训练跑鞋'
                  : '例如：周末 10 km 轻松跑'
              }
            />
          </label>
        )}
        <label>
          运动项目
          <Choice
            value={sport}
            onChange={setSport}
            options={sports}
            label="运动项目"
          />
        </label>
        {kind === 'gear' && (
          <label>
            装备类型
            <Choice
              value={category}
              onChange={setCategory}
              options={categories}
              label="装备类型"
            />
          </label>
        )}
        <label>
          {kind === 'gear' ? '购买日期' : '运动日期'}
          <input
            name="date"
            type="date"
            required
            max={kind === 'plan' ? undefined : today()}
            defaultValue={
              editing?.date ||
              (plan && plan.date <= today() ? plan.date : defaultDate)
            }
          />
        </label>
        {kind === 'gear' ? (
          <>
            <label>
              购入价格 / 元
              <input
                name="price"
                type="number"
                required
                min={0}
                max={10000000}
                step="0.01"
                defaultValue={editing?.price}
                placeholder="0.00"
              />
            </label>
            <label>
              品牌
              <input
                name="brand"
                maxLength={100}
                defaultValue={editing?.brand}
                placeholder="品牌名称"
              />
            </label>
            <label>
              尺码
              <input
                name="size"
                maxLength={100}
                defaultValue={editing?.size}
                placeholder="例如：M / 42"
              />
            </label>
            <label>
              装备颜色
              <input
                name="color"
                type="color"
                defaultValue={editing?.color || '#b6d2ce'}
              />
            </label>
          </>
        ) : kind === 'workout' ? (
          <>
            <label>
              时长 / 分钟
              <input
                name="minutes"
                type="number"
                min={1}
                max={1440}
                required
                defaultValue={30}
              />
            </label>
            <label>
              里程 / km
              <input
                name="km"
                type="number"
                min={0}
                max={1000}
                step="0.01"
                required
                defaultValue={5}
              />
            </label>
          </>
        ) : null}
      </div>
      {kind !== 'gear' && (
        <fieldset>
          <legend>本次使用的装备</legend>
          <div className="gear-check-list">
            {state.gear
              .filter((g) => !g.archived || ids.includes(g.id))
              .map((g) => (
                <label className="check-label" key={g.id}>
                  <Checkbox
                    checked={ids.includes(g.id)}
                    onCheckedChange={(v) =>
                      setIds(
                        v ? [...ids, g.id] : ids.filter((id) => id !== g.id),
                      )
                    }
                  />
                  <span>
                    {g.name}
                    <small>
                      {g.sport} · {g.category}
                    </small>
                  </span>
                </label>
              ))}
          </div>
        </fieldset>
      )}
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <div className="form-actions">
        {kind === 'gear' &&
          editing &&
          state.gear.some((g) => g.id === editing.id) && (
            <button
              type="button"
              className="outline"
              disabled={saving}
              onClick={onArchive}
            >
              {editing.archived ? '恢复使用' : '归档装备'}
            </button>
          )}
        <button
          className="primary"
          type="submit"
          disabled={saving || imageBusy}
        >
          {saving ? (
            <LoaderCircle className="spin" size={17} />
          ) : (
            <Check size={17} />
          )}{' '}
          {saving ? '正在保存' : '保存'}
        </button>
      </div>
    </form>
  );
}
