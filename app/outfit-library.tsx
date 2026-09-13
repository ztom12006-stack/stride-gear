import { ArrowUpRight, Layers, Plus, Share2, Shirt } from 'lucide-react';
import type { SavedOutfit, State } from '@/lib/model';
import Doll from './doll';
import { GearPhoto } from './gear-photo';

export function OutfitLibrary({
  state,
  onOpenStudio,
  onUseOutfit,
  onShare,
}: {
  state: State;
  onOpenStudio: () => void;
  onUseOutfit: (outfit: SavedOutfit) => void;
  onShare: (outfit: SavedOutfit) => void;
}) {
  const active = state.gear.filter((item) => !item.archived);
  const outfits = [...(state.outfits || [])].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return <div className="looks-page">
    <section className="archive-hero">
      <div className="archive-hero-copy">
        <span className="archive-kicker">SPORT ARCHIVE · PRIVATE ISSUE</span>
        <div className="archive-name"><span>{state.profile.handle || 'STRIDE MEMBER'}</span><h2>{state.profile.displayName || '我的运动档案'}</h2></div>
        <p>{state.profile.tagline || '装备会记录每一次出发。'}</p>
        <div className="archive-stats"><div><b>{state.profile.height}</b><span>身高 / cm</span></div><div><b>{state.profile.weight}</b><span>体重 / kg</span></div><div><b>{active.length}</b><span>常用装备</span></div><div><b>{outfits.length}</b><span>已存套装</span></div></div>
        <button className="archive-edit" onClick={onOpenStudio}>进入搭配实验室 <ArrowUpRight size={16} /></button>
      </div>
      <div className="archive-hero-figure"><span className="archive-vertical">STRIDE</span><Doll profile={state.profile} gear={active} /><span className="archive-stamp">PERSONAL<br />SPORT FILE</span></div>
    </section>
    <section className="lookbook-head"><div><span className="eyebrow">SAVE THE LOOK, TELL THE STORY</span><h2>套装库与分享页</h2><p>每一套装备都可以保留出场场景，再做成一张可分享的运动档案卡。</p></div><button className="primary" onClick={onOpenStudio}><Plus size={17} />新建套装</button></section>
    {outfits.length ? <div className="lookbook-grid">{outfits.map((outfit, index) => {
      const items = outfit.gear.map((id) => state.gear.find((item) => item.id === id)).filter(Boolean);
      return <article className="lookbook-card" key={outfit.id}>
        <div className="lookbook-card-top"><span>LOOK {String(index + 1).padStart(2, '0')}</span><b>{outfit.sport}</b></div>
        <div className="lookbook-preview">{items.slice(0, 3).map((item) => <div className="lookbook-gear-photo" key={item!.id}><GearPhoto gear={item!} /></div>)}{items.length === 0 && <Layers size={30} />}</div>
        <div className="lookbook-card-copy"><small>{outfit.createdAt}</small><h3>{outfit.name}</h3><p>{outfit.note || `${items.length} 件装备，随时可以再出发。`}</p></div>
        <div className="lookbook-card-actions"><button onClick={() => onUseOutfit(outfit)}><Shirt size={15} />继续搭配</button><button onClick={() => onShare(outfit)}><Share2 size={15} />生成分享页</button></div>
      </article>;
    })}</div> : <section className="lookbook-empty"><span className="lookbook-empty-icon"><Layers /></span><h3>还没有保存的套装</h3><p>在穿搭实验室选好装备后，保存为套装；这里会成为你的运动衣橱与分享册。</p><button className="primary" onClick={onOpenStudio}>去创建第一套</button></section>}
  </div>;
}
