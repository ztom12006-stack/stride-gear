import { useState } from 'react';
import { RotateCcw, Layers, PersonStanding, Image } from 'lucide-react';
import type { Gear, Profile } from '@/lib/model';
import { slots, worn } from '@/lib/outfit';
import Doll from './doll';
import CharacterScene from './character-scene';
import { GearPhoto } from './gear-photo';

export default function GameCharacter({ profile, gear }: { profile: Profile; gear: Gear[] }) {
  const [mode, setMode] = useState<'game' | 'flat' | 'photo'>('game');
  const [angle, setAngle] = useState(0), [reset, setReset] = useState(0);
  const views = [
    { id: 'game' as const, title: '比例人台', icon: PersonStanding },
    { id: 'flat' as const, title: '装备平铺', icon: Layers },
    { id: 'photo' as const, title: '照片叠搭', icon: Image },
  ];
  return <div className="character-viewer refined-viewer">
    <div className="character-view-tabs" role="group" aria-label="人物预览模式">
      {views.map(({ id, title, icon: Icon }) => <button key={id} aria-pressed={mode === id} onClick={() => setMode(id)}><Icon size={14} />{title}</button>)}
    </div>
    {mode === 'game' ? <>
      <CharacterScene profile={profile} gear={gear} angle={angle} reset={reset} />
      <div className="character-angle-controls" role="group" aria-label="角色视角">
        {[[0, '正面'], [Math.PI / 2, '侧面'], [Math.PI, '背面']].map(([value, label]) => <button key={label} onClick={() => { setAngle(Number(value)); setReset((v) => v + 1); }}>{label}</button>)}
        <button aria-label="重置角色视角" onClick={() => { setAngle(0); setReset((v) => v + 1); }}><RotateCcw size={14} /></button>
      </div>
    </> : mode === 'photo' ? <Doll profile={profile} gear={gear} /> : <section className="outfit-flatlay" aria-label="已选装备平铺">
      <div className="flatlay-heading"><span>THE DAILY KIT</span><b>今天的出场装备</b></div>
      <div className="flatlay-grid">{slots.map((slot, index) => {
        const item = worn(profile, gear, slot.key);
        return <article key={slot.key} className={'flatlay-item flatlay-' + slot.key}>
          <div className="flatlay-label"><span>0{index + 1} / {slot.name}</span><i style={{ background: item?.color || '#e4e6dd' }} /></div>
          <div className="flatlay-photo">{item ? <GearPhoto key={item.id + (item.image || '')} gear={item} /> : <span className="flatlay-placeholder">待选择{slot.name}</span>}</div>
          <h3>{item?.name || '留一点空间，给下一次出发'}</h3>
          <small>{item ? `${item.brand} · ${item.size}` : '在装备搭配中点选'}</small>
        </article>;
      })}</div>
    </section>}
    <p className="character-view-note">{mode === 'game' ? '拖动查看比例与配色 · 衣服为通用版型' : mode === 'flat' ? '展示所选装备的实物图；未上传时显示参考图或占位' : '透明实物图叠搭 · 在右侧调整位置与大小'}</p>
  </div>;
}
