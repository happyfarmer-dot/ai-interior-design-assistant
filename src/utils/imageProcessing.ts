import type { DesignStyleSpec } from '../types/planner';

export function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
}

export function readImageFile(
  file: File
): Promise<{ dataUrl: string; widthPx: number; heightPx: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const dataUrl = String(reader.result || '');
        const img = await loadImageElement(dataUrl);
        resolve({
          dataUrl,
          widthPx: img.naturalWidth || 1200,
          heightPx: img.naturalHeight || 900,
        });
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Real HTML5 Canvas corner-seeded flood-fill background remover with soft edge anti-aliasing.
 * Ideal for isolating furniture / product photos onto transparent PNGs for perspective compositing.
 */
export async function removeBackgroundFromImageUrl(
  imageUrl: string,
  threshold = 236
): Promise<string> {
  const img = await loadImageElement(imageUrl);
  const maxDim = 560;
  const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return imageUrl;

  ctx.drawImage(img, 0, 0, w, h);
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  // Sample corner color as background reference
  const corners = [
    0,
    (w - 1) * 4,
    (h - 1) * w * 4,
    ((h - 1) * w + (w - 1)) * 4,
  ];
  let refR = 0;
  let refG = 0;
  let refB = 0;
  for (const idx of corners) {
    refR += data[idx];
    refG += data[idx + 1];
    refB += data[idx + 2];
  }
  refR /= 4;
  refG /= 4;
  refB /= 4;

  const distTol = Math.max(18, (255 - threshold) * 2.1 + 26);
  const softBand = 18;

  const total = w * h;
  const visited = new Uint8Array(total);
  const queue = new Int32Array(total);
  let head = 0;
  let tail = 0;

  const isBgPixel = (pixelIdx: number): number => {
    const i = pixelIdx * 4;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const luma = 0.299 * r + 0.587 * g + 0.114 * b;
    const maxCh = Math.max(r, g, b);
    const minCh = Math.min(r, g, b);
    const sat = maxCh - minCh;
    const dist = Math.hypot(r - refR, g - refG, b - refB);

    if (dist <= distTol || (luma >= threshold && sat < 28)) {
      return 1; // background
    }
    if (dist <= distTol + softBand && luma >= threshold - 18 && sat < 35) {
      return 2; // soft feather boundary
    }
    return 0;
  };

  // Seed flood-fill from image perimeter
  for (let x = 0; x < w; x++) {
    const top = x;
    const bot = (h - 1) * w + x;
    if (!visited[top] && isBgPixel(top) > 0) {
      visited[top] = 1;
      queue[tail++] = top;
    }
    if (!visited[bot] && isBgPixel(bot) > 0) {
      visited[bot] = 1;
      queue[tail++] = bot;
    }
  }
  for (let y = 1; y < h - 1; y++) {
    const left = y * w;
    const right = y * w + (w - 1);
    if (!visited[left] && isBgPixel(left) > 0) {
      visited[left] = 1;
      queue[tail++] = left;
    }
    if (!visited[right] && isBgPixel(right) > 0) {
      visited[right] = 1;
      queue[tail++] = right;
    }
  }

  while (head < tail) {
    const curr = queue[head++];
    const cx = curr % w;
    const cy = (curr - cx) / w;
    const kind = isBgPixel(curr);

    const alphaIdx = curr * 4 + 3;
    if (kind === 1) {
      data[alphaIdx] = 0;
    } else if (kind === 2) {
      data[alphaIdx] = Math.min(data[alphaIdx], 95);
      continue;
    }

    const neighbors: number[] = [];
    if (cx > 0) neighbors.push(curr - 1);
    if (cx < w - 1) neighbors.push(curr + 1);
    if (cy > 0) neighbors.push(curr - w);
    if (cy < h - 1) neighbors.push(curr + w);

    for (const nb of neighbors) {
      if (!visited[nb]) {
        const nbKind = isBgPixel(nb);
        if (nbKind > 0) {
          visited[nb] = 1;
          queue[tail++] = nb;
        }
      }
    }
  }

  // Also gently clear interior closed-loop white gaps (e.g. between chair legs)
  for (let p = 0; p < total; p++) {
    if (!visited[p]) {
      const i = p * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const maxCh = Math.max(r, g, b);
      const minCh = Math.min(r, g, b);
      if (minCh >= Math.min(252, threshold + 8) && maxCh - minCh < 10) {
        data[i + 3] = 0;
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas.toDataURL('image/png');
}

/**
 * Generates a styled canvas composite when an exact pre-rendered photo is unavailable
 * (e.g. user-uploaded photos or procedural styles like Modern Minimalist / Modern Luxury).
 */
export async function renderProceduralStyleImage(
  baseImageUrl: string,
  styleSpec: DesignStyleSpec,
  intensity: number
): Promise<string> {
  const img = await loadImageElement(baseImageUrl);
  const w = Math.min(1200, img.naturalWidth || 1200);
  const h = Math.round((w * (img.naturalHeight || 900)) / (img.naturalWidth || 1200));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return baseImageUrl;

  // Draw base
  ctx.drawImage(img, 0, 0, w, h);

  // Blend styled filtered pass according to intensity (0..100)
  const alpha = Math.max(0, Math.min(1, intensity / 100));
  if (alpha > 0.02) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.filter = styleSpec.lutFilter;
    ctx.drawImage(img, 0, 0, w, h);
    ctx.restore();

    // Apply atmospheric palette wash
    ctx.save();
    ctx.globalCompositeOperation = 'soft-light';
    ctx.globalAlpha = alpha * (styleSpec.tintOpacity * 2.2);
    ctx.fillStyle = styleSpec.tintColor;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();

    // Subtle architectural highlight lift on ceiling/upper third
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, `${styleSpec.palette[0]}26`);
    grad.addColorStop(0.55, 'transparent');
    grad.addColorStop(1, `${styleSpec.palette[2]}22`);
    ctx.save();
    ctx.globalAlpha = alpha * 0.75;
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  return canvas.toDataURL('image/jpeg', 0.9);
}
