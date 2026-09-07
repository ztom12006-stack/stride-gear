'use client';
import { useState } from 'react';
import { ImagePlus, LoaderCircle, ImageOff } from 'lucide-react';
import { uploadGearImage } from '@/lib/images';
import { assetUrl } from '@/lib/runtime';
import type { Gear } from '@/lib/model';
export function GearPhoto({ gear }: { gear: Gear }) {
  const [failed, setFailed] = useState(false);
  const reference = !gear.image && gear.brand === 'STRIDE LAB';
  const images: Record<string, string> = {
    鞋履: 'shoe',
    上装: 'shirt',
    下装: 'shorts',
    装备: 'backpack',
  };
  const src =
    gear.image ||
    (reference ? assetUrl(`/gear-reference/${images[gear.category]}.jpg`) : '');
  return src && !failed ? (
    <>
      <img
        className="gear-real-photo"
        src={src}
        alt={
          reference
            ? `${gear.category}实拍参考，非此型号`
            : `${gear.name}装备图片`
        }
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
      />
      {reference && <span className="reference-label">品类实拍参考</span>}
    </>
  ) : (
    <span className="no-gear-photo">
      <ImageOff size={30} />
      <span>{failed ? '图片无法加载' : '添加实物图片'}</span>
    </span>
  );
}
export function PhotoEditor({ value, onChange, onBusy }: {
  value: string; onChange: (value: string) => void; onBusy?: (v: boolean) => void;
}) {
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [automatic, setAutomatic] = useState(true), [status, setStatus] = useState('');
  const [original, setOriginal] = useState<File | null>(null);
  async function upload(file: File, removeBackground = automatic) {
    setError(''); setBusy(true); onBusy?.(true); setOriginal(file); setStatus('正在准备照片…');
    try {
      onChange(await uploadGearImage(file, { removeBackground, progress: setStatus }));
    } catch (e) {
      setError('处理未完成：' + (e as Error).message + ' 可以重试，或选择保留原图。');
    } finally { setBusy(false); onBusy?.(false); setStatus(''); }
  }
  async function processExisting() {
    if (original) return upload(original, true);
    setError(''); setBusy(true); onBusy?.(true);
    try {
      const response = await fetch(value);
      if (!response.ok) throw Error('无法读取这张图片');
      const blob = await response.blob();
      await upload(new File([blob], 'gear.png', { type: blob.type }), true);
    } catch { setError('这张图片不支持直接处理，请下载后重新选择图片。'); }
    finally { setBusy(false); onBusy?.(false); }
  }
  return <div className="photo-editor">
    <label className={'photo-upload ' + (busy ? 'uploading' : '')}>
      {value ? <img src={value} alt="白底装备图片预览" referrerPolicy="no-referrer" /> : <ImagePlus size={26} />}
      <span>{busy ? <><LoaderCircle size={16} className="spin" />{status || '正在处理…'}</> : value ? '更换装备照片' : '选择装备照片'}</span>
      <input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={e => {
        if (e.target.files?.[0]) void upload(e.target.files[0]); e.target.value = '';
      }} />
    </label>
    <label className="cutout-toggle"><input type="checkbox" checked={automatic} disabled={busy} onChange={e => setAutomatic(e.target.checked)} />自动抠出装备，白底展示</label>
    <div className="photo-actions">
      {value && <button type="button" className="outline" disabled={busy} onClick={processExisting}>重新抠图</button>}
      {original && <button type="button" className="outline" disabled={busy} onClick={() => upload(original, false)}>保留原图</button>}
      {value && <button type="button" className="photo-remove" disabled={busy} onClick={() => { onChange(''); setOriginal(null); }}>移除图片</button>}
    </div>
    <p>照片在本机处理。建议单件装备、主体完整；也支持 iPhone 抠图后保存的透明 PNG。JPG / PNG / WebP，最大 10 MB。</p>
    {busy && <p role="status">首次抠图需要加载工具，请稍候。</p>}
    {error && <p role="alert" className="form-error">{error}</p>}
  </div>;
}
