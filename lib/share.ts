import type { Gear, Profile, SavedOutfit, State } from './model.ts';

export type SharePayload = {
  version: 1;
  createdAt: string;
  profile: Pick<Profile, 'displayName' | 'handle' | 'tagline' | 'height' | 'weight' | 'top' | 'bottom' | 'shoes'>;
  outfit: Pick<SavedOutfit, 'name' | 'sport' | 'note' | 'createdAt'>;
  gear: Pick<Gear, 'name' | 'brand' | 'sport' | 'category' | 'color' | 'size' | 'image'>[];
  summary: { equipment: number; workouts: number; km: number };
};

const toBase64 = (value: string) => btoa(unescape(encodeURIComponent(value)));
const fromBase64 = (value: string) => decodeURIComponent(escape(atob(value)));

export function createSharePayload(state: State, outfit: SavedOutfit): SharePayload {
  const gear = outfit.gear
    .map((id) => state.gear.find((item) => item.id === id))
    .filter((item): item is Gear => Boolean(item))
    .map(({ name, brand, sport, category, color, size, image }) => ({
      name,
      brand,
      sport,
      category,
      color,
      size,
      image: image?.startsWith('https://') ? image : undefined,
    }));
  const profile = outfit.profile || state.profile;
  return {
    version: 1,
    createdAt: new Date().toISOString(),
    profile: {
      displayName: profile.displayName || '我的运动档案',
      handle: profile.handle || 'STRIDE MEMBER',
      tagline: profile.tagline || '装备会记录每一次出发。',
      height: profile.height,
      weight: profile.weight,
      top: profile.top,
      bottom: profile.bottom,
      shoes: profile.shoes,
    },
    outfit: { name: outfit.name, sport: outfit.sport, note: outfit.note, createdAt: outfit.createdAt },
    gear,
    summary: {
      equipment: state.gear.filter((item) => !item.archived).length,
      workouts: state.workouts.length,
      km: state.workouts.reduce((sum, item) => sum + item.km, 0),
    },
  };
}

export function encodeSharePayload(payload: SharePayload) {
  return toBase64(JSON.stringify(payload));
}

export function decodeSharePayload(value: string): SharePayload | null {
  try {
    const parsed = JSON.parse(fromBase64(value)) as SharePayload;
    if (parsed?.version !== 1 || !parsed.profile || !parsed.outfit || !Array.isArray(parsed.gear)) return null;
    return parsed;
  } catch {
    return null;
  }
}
