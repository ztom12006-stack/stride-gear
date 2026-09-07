export function normalizePixels(data: Uint8ClampedArray, pixels: number) {
  const output = new Float32Array(pixels * 3);
  const mean = [0.485, 0.456, 0.406], std = [0.229, 0.224, 0.225];
  let maximum = 1;
  for (let i = 0; i < pixels; i++) for (let c = 0; c < 3; c++) maximum = Math.max(maximum, data[i * 4 + c]);
  for (let c = 0; c < 3; c++) for (let i = 0; i < pixels; i++) output[c * pixels + i] = (data[i * 4 + c] / maximum - mean[c]) / std[c];
  return output;
}
export function alphaMask(values: Float32Array) {
  let min = Infinity, max = -Infinity;
  for (const value of values) { min = Math.min(min, value); max = Math.max(max, value); }
  if (!Number.isFinite(min) || max - min < 0.00001) throw Error('未识别到清晰主体，请换一张照片或保留原图。');
  return Uint8ClampedArray.from(values, value => 255 * Math.max(0, Math.min(1, ((value - min) / (max - min) - 0.04) / 0.92)));
}
export function subjectBounds(data: Uint8ClampedArray, width: number, height: number) {
  let left = width, top = height, right = -1, bottom = -1;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (data[(y * width + x) * 4 + 3] > 24) {
    left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
  }
  if (right < left) throw Error('未识别到装备主体，请保留原图或重新选择照片。');
  return { left, top, width: right - left + 1, height: bottom - top + 1 };
}
