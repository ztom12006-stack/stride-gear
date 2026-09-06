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
export function PhotoEditor({
  value,
  onChange,
  onBusy,
}: {
  value: string;
  onChange: (value: string) => void;
  onBusy?: (v: boolean) => void;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  async function upload(file: File) {
    setError('');
    setBusy(true);
    onBusy?.(true);
    try {
      onChange(await uploadGearImage(file));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      onBusy?.(false);
    }
  }
  return (
    <div className="photo-editor">
      <label className={'photo-upload ' + (busy ? 'uploading' : '')}>
        {value ? (
          <img src={value} alt="装备图片预览" referrerPolicy="no-referrer" />
        ) : (
          <ImagePlus size={26} />
        )}
        <span>
          {busy ? (
            <>
              <LoaderCircle size={16} className="spin" />
              上传中…
            </>
          ) : value ? (
            '更换实物图片'
          ) : (
            '上传装备照片'
          )}
        </span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={busy}
          onChange={(e) => {
            if (e.target.files?.[0]) void upload(e.target.files[0]);
            e.target.value = '';
          }}
        />
      </label>
      {value && (
        <button
          type="button"
          className="photo-remove"
          disabled={busy}
          onClick={() => onChange('')}
        >
          移除图片
        </button>
      )}
      <p>JPG / PNG / WebP，最大 10 MB</p>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
    </div>
  );
}
