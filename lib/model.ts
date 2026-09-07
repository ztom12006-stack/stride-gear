export type Gear = {
  id: string;
  name: string;
  brand: string;
  sport: string;
  category: string;
  price: number;
  date: string;
  size: string;
  color: string;
  archived: boolean;
  image?: string;
  orderId?: string;
  importKey?: string;
  source?: string;
};
export type Workout = {
  id: string;
  date: string;
  sport: string;
  minutes: number;
  km: number;
  gear: string[];
};
export type Plan = {
  id: string;
  date: string;
  title: string;
  sport: string;
  gear: string[];
  done: boolean;
};
export type OutfitLayer = { gearId: string; x: number; y: number; scale: number };
export type OutfitSlot = 'top' | 'bottom' | 'shoes' | 'accessory';
export type Profile = {
  outfit?: Partial<Record<OutfitSlot, OutfitLayer>>;
  height: number;
  weight: number;
  face: number;
  eyes: number;
  skin: string;
  hair: string;
  top: string;
  bottom: string;
  shoes: string;
  accessory: boolean;
};
export type State = {
  gear: Gear[];
  workouts: Workout[];
  plans: Plan[];
  profile: Profile;
};
export const sports = ['跑步', '健身', '骑行', '徒步', '网球', '其他'];
export const categories = ['鞋履', '上装', '下装', '装备'];
export const today = () =>
  new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Shanghai' });
export const daysOwned = (date: string, now = today()) =>
  Math.max(
    1,
    Math.floor(
      (Date.parse(now + 'T00:00:00Z') - Date.parse(date + 'T00:00:00Z')) /
        86400000,
    ) + 1,
  );
export function gearStats(g: Gear, workouts: Workout[], now = today()) {
  const rows = workouts.filter((w) => w.gear.includes(g.id));
  const km = rows.reduce((s, w) => s + w.km, 0);
  return {
    uses: rows.length,
    km,
    minutes: rows.reduce((s, w) => s + w.minutes, 0),
    daily: g.price / daysOwned(g.date, now),
    perUse: rows.length ? g.price / rows.length : null,
    perKm: km ? g.price / km : null,
  };
}
export function seed(): State {
  const day = today();
  const ago = (n: number) => {
    const d = new Date(day + 'T12:00:00Z');
    d.setUTCDate(d.getUTCDate() - n);
    return d.toISOString().slice(0, 10);
  };
  return {
    gear: [
      {
        id: 'g1',
        name: 'PACE 01 日常训练跑鞋',
        brand: 'STRIDE LAB',
        sport: '跑步',
        category: '鞋履',
        price: 699,
        date: ago(89),
        size: '42',
        color: '#c3ec62',
        archived: false,
      },
      {
        id: 'g2',
        name: 'AIR 速干训练短袖',
        brand: 'STRIDE LAB',
        sport: '跑步',
        category: '上装',
        price: 199,
        date: ago(59),
        size: 'M',
        color: '#b6d2ce',
        archived: false,
      },
      {
        id: 'g3',
        name: 'MOVE 双层跑步短裤',
        brand: 'STRIDE LAB',
        sport: '跑步',
        category: '下装',
        price: 239,
        date: ago(39),
        size: 'M',
        color: '#343945',
        archived: false,
      },
      {
        id: 'g4',
        name: 'TRAIL 轻量徒步背包',
        brand: 'STRIDE LAB',
        sport: '徒步',
        category: '装备',
        price: 459,
        date: ago(29),
        size: '18L',
        color: '#e4aa64',
        archived: false,
      },
      {
        id: 'g5',
        name: 'FORM 支撑训练上衣',
        brand: 'STRIDE LAB',
        sport: '健身',
        category: '上装',
        price: 269,
        date: ago(19),
        size: 'M',
        color: '#adacd0',
        archived: false,
      },
    ],
    workouts: Array.from({ length: 12 }, (_, i) => ({
      id: 'w' + i,
      date: ago(i * 2 + 1),
      sport: '跑步',
      minutes: 30 + i,
      km: 5 + (i % 4),
      gear: ['g1', 'g2', ...(i % 2 ? ['g3'] : [])],
    })),
    plans: [
      {
        id: 'p1',
        date: day,
        title: '傍晚轻松跑 · 5 km',
        sport: '跑步',
        gear: ['g1', 'g2', 'g3'],
        done: false,
      },
      {
        id: 'p2',
        date: ago(-2),
        title: '周末山野徒步',
        sport: '徒步',
        gear: ['g4'],
        done: false,
      },
    ],
    profile: {
      height: 175,
      weight: 68,
      face: 50,
      eyes: 50,
      skin: '#c89574',
      hair: '短发',
      top: '#b6d2ce',
      bottom: '#343945',
      shoes: '#c3ec62',
      accessory: false,
    },
  };
}
