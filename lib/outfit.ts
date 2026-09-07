import type { Gear, Profile, OutfitSlot } from './model.ts';
export const slots: { key: OutfitSlot; category: string; name: string }[] = [
  { key: 'top', category: '上装', name: '上装' }, { key: 'bottom', category: '下装', name: '下装' },
  { key: 'shoes', category: '鞋履', name: '鞋子' }, { key: 'accessory', category: '装备', name: '配件' },
];
export function equip(profile: Profile, slot: OutfitSlot, gear: Gear): Profile {
  return { ...profile, ...(slot === 'accessory' ? { accessory: true } : { [slot]: gear.color }),
    outfit: { ...profile.outfit, [slot]: { gearId: gear.id, x: 0, y: 0, scale: 1 } } };
}
export function worn(profile: Profile, gear: Gear[], slot: OutfitSlot) {
  return gear.find(g => g.id === profile.outfit?.[slot]?.gearId && !g.archived && g.category === slots.find(s => s.key === slot)?.category);
}
