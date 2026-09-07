import { assetUrl } from './runtime.ts';
import { normalizePixels, alphaMask, subjectBounds } from './cutout-math.ts';
import type { InferenceSession } from 'onnxruntime-web';
let sessionPromise: Promise<InferenceSession> | null = null;
async function session() {
  const ort = await import('onnxruntime-web/wasm');
  ort.env.wasm.numThreads = 1;
  ort.env.wasm.wasmPaths = new URL(assetUrl('/cutout/'), location.origin).href;
  if (!sessionPromise) sessionPromise = ort.InferenceSession.create(assetUrl('/cutout/u2netp.onnx'), { executionProviders: ['wasm'] }).catch(e => { sessionPromise = null; throw e; });
  return { engine: await sessionPromise, Tensor: ort.Tensor };
}
export async function cutout(canvas: HTMLCanvasElement, progress: (s: string) => void) {
  progress('准备抠图工具，首次使用需要下载…');
  const { engine, Tensor } = await session();
  progress('正在识别装备主体…');
  const input = document.createElement('canvas'); input.width = input.height = 320;
  const ctx = input.getContext('2d')!;
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 320, 320); ctx.drawImage(canvas, 0, 0, 320, 320);
  const output = await engine.run({ [engine.inputNames[0]]: new Tensor('float32', normalizePixels(ctx.getImageData(0, 0, 320, 320).data, 320 * 320), [1, 3, 320, 320]) });
  const alpha = alphaMask(output[engine.outputNames[0]].data as Float32Array);
  const mask = ctx.createImageData(320, 320);
  for (let i = 0; i < alpha.length; i++) { mask.data[i * 4] = mask.data[i * 4 + 1] = mask.data[i * 4 + 2] = 255; mask.data[i * 4 + 3] = alpha[i]; }
  ctx.putImageData(mask, 0, 0);
  const target = canvas.getContext('2d')!;
  target.globalCompositeOperation = 'destination-in'; target.drawImage(input, 0, 0, canvas.width, canvas.height); target.globalCompositeOperation = 'source-over';
  const bounds = subjectBounds(target.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height);
  const result = document.createElement('canvas');
  const pad = Math.ceil(Math.max(bounds.width, bounds.height) * 0.035);
  result.width = bounds.width + pad * 2; result.height = bounds.height + pad * 2;
  result.getContext('2d')!.drawImage(canvas, bounds.left, bounds.top, bounds.width, bounds.height, pad, pad, bounds.width, bounds.height);
  for (const tensor of Object.values(output)) tensor.dispose();
  return result;
}
