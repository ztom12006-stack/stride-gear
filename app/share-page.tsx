import { ArrowLeft, Copy, Printer, Share2 } from 'lucide-react';
import type { CSSProperties } from 'react';
import type { SharePayload } from '@/lib/share';

const fallbacks = ['鞋履', '上装', '下装', '装备'];
export function SharePage({ payload, onBack }: { payload: SharePayload; onBack: () => void }) {
  const copy = async () => {
    await navigator.clipboard?.writeText(window.location.href);
    window.alert('分享链接已复制。');
  };
  const share = async () => {
    if (navigator.share) await navigator.share({ title: `${payload.profile.displayName} · ${payload.outfit.name}`, text: payload.outfit.note || '我的运动装备搭配', url: window.location.href });
    else await copy();
  };
  return <div className="share-page">
    <div className="share-toolbar"><button className="outline" onClick={onBack}><ArrowLeft size={16} />返回装备库</button><div><button className="outline" onClick={() => void copy()}><Copy size={16} />复制链接</button><button className="primary" onClick={() => void share()}><Share2 size={16} />分享</button><button className="outline share-print" onClick={() => window.print()}><Printer size={16} />打印</button></div></div>
    <article className="share-sheet">
      <header className="share-sheet-head"><span>STRIDE · SPORT ARCHIVE</span><b>LOOKBOOK / {payload.outfit.sport.toUpperCase()}</b></header>
      <section className="share-identity"><div className="share-avatar" style={{ '--top': payload.profile.top, '--bottom': payload.profile.bottom, '--shoes': payload.profile.shoes } as CSSProperties}><span className="share-head" /><span className="share-top" /><span className="share-bottom" /><span className="share-shoes" /></div><div className="share-person"><span>{payload.profile.handle}</span><h1>{payload.profile.displayName}</h1><p>{payload.profile.tagline}</p><div><b>{payload.profile.height} <small>cm</small></b><b>{payload.profile.weight} <small>kg</small></b><b>{payload.gear.length} <small>件装备</small></b></div></div><em>PERSONAL<br />SPORT FILE</em></section>
      <section className="share-title"><span>THE LOOK</span><h2>{payload.outfit.name}</h2><p>{payload.outfit.note || '为下一次出发准备的装备组合。'}</p></section>
      <section className="share-products">{payload.gear.map((gear, index) => <article className={`share-product share-product-${index % 3}`} key={`${gear.name}-${index}`}><div className="share-product-visual" style={{ backgroundColor: `${gear.color}18` }}>{gear.image ? <img src={gear.image} alt={gear.name} referrerPolicy="no-referrer" /> : <span style={{ color: gear.color }}>{fallbacks.includes(gear.category) ? gear.category : 'GEAR'}</span>}</div><div><small>{gear.brand} · {gear.category} · {gear.size}</small><h3>{gear.name}</h3></div><b>{String(index + 1).padStart(2, '0')}</b></article>)}</section>
      <footer className="share-sheet-foot"><span>{payload.summary.workouts} 次运动 · {payload.summary.km.toFixed(1)} km · {payload.summary.equipment} 件装备</span><span>CREATED {payload.createdAt.slice(0, 10)}</span></footer>
    </article>
  </div>;
}
