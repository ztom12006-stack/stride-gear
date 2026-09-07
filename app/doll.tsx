import type { Gear, Profile, OutfitSlot } from '@/lib/model';
import { slots, worn } from '@/lib/outfit';
export default function Doll({ profile: p, gear }: { profile: Profile; gear: Gear[]; onChange?: (p: Profile) => void }) {
  const items = Object.fromEntries(slots.map(s => [s.key, worn(p, gear, s.key)])) as Record<OutfitSlot, Gear | undefined>;
  const width = 0.91 + (p.weight - 35) / 370, height = 0.84 + (p.height - 140) / 437.5;
  const faces = 0.92 + p.face / 600;
  const rects = { top:[50,42,49,28], bottom:[50,65,36,29], shoes:[50,92,38,10], accessory:[74,47,25,27] };
  return <div className="dress-doll" role="img" aria-label="穿着所选装备的装扮娃娃">
    <div className="doll-halo" /><div className="doll-ground" />
    <div className="doll-figure" style={{ transform:`scale(${width}, ${height})` }}>
      <svg viewBox="0 0 400 600" className="doll-body" aria-hidden="true">
        <defs><linearGradient id="doll-skin" x1="0" x2="1"><stop stopColor={p.skin}/><stop offset=".48" stopColor={p.skin}/><stop offset="1" stopColor={p.skin} stopOpacity=".82"/></linearGradient></defs>
        {p.hair === '长发' && <path d="M150 77 Q142 30 200 30 Q258 30 251 90 L266 218 Q225 242 200 205 Q173 239 133 217Z" fill="#302a29"/>}
        <g fill="url(#doll-skin)" stroke="#a4775f" strokeOpacity=".2" strokeWidth="1">
          <path d="M173 309 Q154 355 165 419 L169 541 Q181 554 191 541 L199 421 L207 337Z"/>
          <path d="M227 309 Q246 355 235 419 L231 541 Q219 554 209 541 L201 421 L193 337Z"/>
          <path d="M163 179 Q145 173 137 194 L107 306 Q99 320 99 340 Q103 356 110 346 L116 330 L120 339 Q126 341 124 328 L130 309 L163 235Z"/>
          <path d="M237 179 Q255 173 263 194 L293 306 Q301 320 301 340 Q297 356 290 346 L284 330 L280 339 Q274 341 276 328 L270 309 L237 235Z"/>
          <path d="M183 141 L182 169 L160 180 Q150 204 167 238 L177 277 Q162 296 165 324 Q200 343 235 324 Q238 296 223 277 L233 238 Q250 204 240 180 L218 169 L217 141Z"/>
          <g transform={`translate(200 103) scale(${faces} 1) translate(-200 -103)`}>
            <ellipse cx="158" cy="109" rx="8" ry="13"/><ellipse cx="242" cy="109" rx="8" ry="13"/>
            <path d="M159 85 Q158 45 200 45 Q242 45 241 85 L238 121 Q225 157 200 163 Q175 157 162 121Z"/>
          </g>
        </g>
        {p.hair !== '光头' && <path d="M157 104 Q142 48 177 35 Q224 16 245 56 Q252 74 240 104 L233 78 Q200 82 187 54 Q183 80 163 86Z" fill="#302a29"/>}
        <g fill="#342e30"><path d="M173 101 Q181 96 188 101" fill="none" stroke="#342e30" strokeWidth="2"/><path d="M212 101 Q220 96 227 101" fill="none" stroke="#342e30" strokeWidth="2"/>
          <ellipse cx={183 - p.eyes / 25} cy="109" rx="3" ry="4.5"/><ellipse cx={217 + p.eyes / 25} cy="109" rx="3" ry="4.5"/>
        </g><path d="M199 112 L196 125 L202 125" stroke="#b88573" fill="none"/><path d="M189 138 Q200 144 211 138 Q200 147 189 138" fill="#b86973"/>
        <ellipse cx="174" cy="125" rx="9" ry="4" fill="#d98c84" opacity=".3"/><ellipse cx="226" cy="125" rx="9" ry="4" fill="#d98c84" opacity=".3"/>
        <path d="M165 196 L181 191 Q200 205 219 191 L235 196 L225 237 Q200 247 175 237Z" fill={items.top?.image ? '#efe4dc' : p.top}/>
        {!items.top?.image && <g fill={items.top?.color || p.top} stroke="#000" strokeOpacity=".06"><path d="M180 168 Q200 185 220 168 L244 178 L268 222 L240 236 L228 214 L225 281 Q200 290 175 281 L172 214 L160 236 L132 222 L156 178Z"/><path d="M187 179 Q200 188 213 179" stroke="#fff" strokeWidth="4" fill="none"/><path d="M180 270 L220 270" stroke="#fff" opacity=".2"/></g>}
        <path d="M173 289 Q200 300 227 289 L230 320 L208 342 L200 323 L192 342 L170 320Z" fill={items.bottom?.image ? '#efe4dc' : (items.bottom?.color || p.bottom)}/>
        {!items.bottom?.image && <g fill={items.bottom?.color || p.bottom}><path d="M173 282 Q200 292 227 282 L239 380 L207 384 L200 324 L193 384 L161 380Z"/><path d="M173 290 L227 290" stroke="#fff" opacity=".35" strokeWidth="3"/></g>}
        {!items.shoes?.image && <g fill={items.shoes?.color || p.shoes} stroke="#d8d9db"><path d="M169 536 L192 536 L190 556 Q187 575 150 572 Q144 564 157 554Z"/><path d="M231 536 L208 536 L210 556 Q213 575 250 572 Q256 564 243 554Z"/><path d="M150 568 L188 565 M212 565 L250 568" stroke="#fff" strokeWidth="6"/></g>}
        {(items.accessory || p.accessory) && !items.accessory?.image && <g><path d="M232 190 Q295 215 282 309" fill="none" stroke="#675843" strokeWidth="9"/><rect x="260" y="244" width="45" height="73" rx="16" fill={items.accessory?.color || '#c19b6b'}/><rect x="266" y="272" width="33" height="30" rx="8" fill="#000" opacity=".12"/></g>}
      </svg>
      {(['bottom','top','shoes','accessory'] as OutfitSlot[]).map(slot => {
        const g = items[slot], layer = p.outfit?.[slot]; if (!g?.image || !layer) return null;
        const [x,y,w,h] = rects[slot];
        return <img key={slot + g.id + g.image.slice(-20)} className="worn-photo" src={g.image} alt={g.name} draggable={false} referrerPolicy="no-referrer" style={{left:`${x + layer.x}%`,top:`${y + layer.y}%`,width:`${w}%`,height:`${h}%`,transform:`translate(-50%, -50%) scale(${layer.scale})`}} />;
      })}
    </div>
  </div>;
}
