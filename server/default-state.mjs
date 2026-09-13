const pad = (n) => String(n).padStart(2, '0');
const day = () => {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

export function createDefaultState() {
  const today = day();
  return {
    gear: [
      { id: 'g1', name: 'PACE 01 日常训练跑鞋', brand: 'STRIDE LAB', sport: '跑步', category: '鞋履', price: 699, date: today, size: '42', color: '#c3ec62', archived: false },
      { id: 'g2', name: 'AIR 速干训练短袖', brand: 'STRIDE LAB', sport: '跑步', category: '上装', price: 199, date: today, size: 'M', color: '#b6d2ce', archived: false },
      { id: 'g3', name: 'MOVE 双层跑步短裤', brand: 'STRIDE LAB', sport: '跑步', category: '下装', price: 239, date: today, size: 'M', color: '#343945', archived: false },
    ],
    workouts: [],
    plans: [],
    outfits: [],
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
      displayName: '我的运动档案',
      handle: 'STRIDE MEMBER',
      tagline: '装备会记录每一次出发。',
    },
  };
}
