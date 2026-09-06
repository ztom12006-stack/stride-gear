import { env } from 'cloudflare:workers';
export async function POST(request: Request) {
  try {
    if (
      request.headers.get('origin') &&
      request.headers.get('origin') !== new URL(request.url).origin
    )
      return Response.json({ error: '请求来源无效' }, { status: 403 });
    if (Number(request.headers.get('content-length')) > 6 * 1024 * 1024)
      return Response.json({ error: '图片过大' }, { status: 413 });
    const data = await request.formData();
    const file = data.get('file');
    if (!(file instanceof File) || file.size > 5 * 1024 * 1024)
      return Response.json(
        { error: '请选择小于 5 MB 的图片' },
        { status: 400 },
      );
    const bytes = new Uint8Array(await file.arrayBuffer());
    let ext = '',
      type = '';
    if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) {
      ext = 'jpg';
      type = 'image/jpeg';
    } else if (
      bytes[0] === 137 &&
      bytes[1] === 80 &&
      bytes[2] === 78 &&
      bytes[3] === 71
    ) {
      ext = 'png';
      type = 'image/png';
    } else if (
      new TextDecoder().decode(bytes.slice(0, 4)) === 'RIFF' &&
      new TextDecoder().decode(bytes.slice(8, 12)) === 'WEBP'
    ) {
      ext = 'webp';
      type = 'image/webp';
    } else
      return Response.json(
        { error: '仅支持 JPG、PNG 和 WebP 图片' },
        { status: 400 },
      );
    const key = crypto.randomUUID() + '.' + ext;
    await (env as unknown as { GEAR_IMAGES: R2Bucket }).GEAR_IMAGES.put(
      key,
      bytes,
      { httpMetadata: { contentType: type } },
    );
    return Response.json({ url: '/api/images/' + key });
  } catch {
    return Response.json(
      { error: '图片未上传成功，请稍后重试。' },
      { status: 503 },
    );
  }
}
