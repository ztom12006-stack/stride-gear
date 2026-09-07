import { isPages } from './runtime.ts';
export function validImageUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  if (isPages && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/.test(value) && value.length < 7000000) return true;
  if (value.length > 2000) return false;
  if (
    value === '' ||
    /^\/api\/images\/[a-f0-9-]{36}\.(jpg|png|webp)$/.test(value)
  )
    return true;
  try {
    const u = new URL(value);
    return u.protocol === 'https:' && !u.username && !u.password;
  } catch {
    return false;
  }
}
export async function uploadGearImage(file: File, options: { removeBackground?: boolean; progress?: (s: string) => void } = {}): Promise<string> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type))
    throw Error('请选择 JPG、PNG 或 WebP 图片。');
  if (file.size > 10 * 1024 * 1024) throw Error('单张图片请小于 10 MB。');
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1200 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    throw Error('无法处理图片，请重试。');
  }
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const rgba = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  let transparent = 0;
  for (let i = 3; i < rgba.length; i += 4) if (rgba[i] < 240) transparent++;
  const alreadyCut = transparent > canvas.width * canvas.height * 0.01;
  const processed = options.removeBackground === false || alreadyCut ? canvas : await (await import('./cutout')).cutout(canvas, options.progress || (() => {}));
  const blob = await new Promise<Blob>((resolve, reject) =>
    processed.toBlob(
      (b) => (b ? resolve(b) : reject(Error('无法处理图片'))),
      'image/png',
      0.87,
    ),
  );
  if (isPages) return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(Error('图片保存失败'));
    reader.readAsDataURL(blob);
  });
  const form = new FormData();
  form.set('file', blob, 'gear.png');
  const res = await fetch('/api/images', { method: 'POST', body: form });
  const result = (await res.json()) as { url: string; error?: string };
  if (!res.ok) throw Error(result.error || '图片上传失败');
  return result.url;
}
