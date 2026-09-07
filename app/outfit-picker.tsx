import type { Gear, Profile, OutfitSlot } from '@/lib/model';
import { slots, equip, worn } from '@/lib/outfit';
import { GearPhoto } from './gear-photo';
import { useState } from 'react';
export function OutfitPicker({ profile, gear, onChange }: { profile: Profile; gear: Gear[]; onChange: (p: Profile) => void }) {
  const [slot, setSlot] = useState<OutfitSlot>('top');
  const current = slots.find(s => s.key === slot)!;
  const selected = worn(profile, gear, slot);
  const layer = profile.outfit?.[slot];
  return <div className="dressing-picker">
    <p className="muted">点选装备探索角色配色；切换「照片换装」查看上传装备的实物效果。</p>
    <div className="closet-tabs" role="group" aria-label="装备类别">{slots.map(s => <button key={s.key} aria-pressed={s.key === slot} onClick={() => setSlot(s.key)}>{s.name}</button>)}</div>
    <div className="closet-grid">
      <button className={!selected ? 'selected' : ''} onClick={() => {
        const outfit = { ...profile.outfit }; delete outfit[slot]; onChange({ ...profile, outfit, ...(slot === 'accessory' ? { accessory: false } : {}) });
      }}><span className="closet-empty">＋</span><b>{slot === 'accessory' ? '不搭配配件' : '基础款'}</b></button>
      {gear.filter(g => g.category === current.category).map(g => <button key={g.id} className={selected?.id === g.id ? 'selected' : ''} aria-pressed={selected?.id === g.id} onClick={() => onChange(equip(profile, slot, g))}>
        <span className="closet-photo"><GearPhoto gear={g} key={g.image || g.id} /></span><b>{g.name}</b><small>{g.image ? '实物图片' : '通用款式示意'}</small>
      </button>)}
    </div>
    {!gear.some(g => g.category === current.category) && <p className="muted">还没有{current.name}，先在「我的装备」添加照片。</p>}
    {slot !== 'accessory' && <label className="doll-color">基础款颜色<input aria-label="基础款颜色" type="color" value={profile[slot]} onChange={e => onChange({ ...profile, [slot]: e.target.value })} /></label>}
    {selected && layer && <div className="fitting-controls"><h3>调整「{selected.name}」</h3>
      {!selected.image && <p className="muted">添加装备实物照片后，可在照片换装中预览它的外观。</p>}
      {selected.image && <>
        {([['左右位置','x',-25,25,1],['上下位置','y',-25,25,1],['装备大小','scale',0.4,2,0.02]] as const).map(([label,key,min,max,step]) => <label key={key}>{label}<input type="range" min={min} max={max} step={step} value={layer[key]} onChange={e => onChange({...profile, outfit:{...profile.outfit,[slot]:{...layer,[key]:+e.target.value}}})} /><span>{key === 'scale' ? Math.round(layer[key]*100)+'%' : layer[key]}</span></label>)}
        <button className="outline" onClick={() => onChange(equip(profile, slot, selected))}>还原位置</button>
      </>}
    </div>}
    <p className="cost-note">位置和大小调整用于「照片换装」视图。修改后点击上方「保存形象与搭配」。</p>
  </div>;
}
