import { env } from 'cloudflare:workers';
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  const { key } = await params;
  if (!/^[a-f0-9-]{36}\.(jpg|png|webp)$/.test(key))
    return new Response('Not found', { status: 404 });
  try {
    const object = await (
      env as unknown as { GEAR_IMAGES: R2Bucket }
    ).GEAR_IMAGES.get(key);
    if (!object) return new Response('Not found', { status: 404 });
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('Cache-Control', 'private, max-age=86400');
    headers.set('X-Content-Type-Options', 'nosniff');
    return new Response(object.body, { headers });
  } catch {
    return new Response('Image unavailable', { status: 503 });
  }
}
