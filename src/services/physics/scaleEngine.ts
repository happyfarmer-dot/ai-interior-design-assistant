import type { Point2D, ScaleCalibration } from '../../types/planner';

export function computePixelLength(
  p1: Point2D,
  p2: Point2D,
  imageWidthPx: number,
  imageHeightPx: number
): number {
  const dx = (p2.x - p1.x) * imageWidthPx;
  const dy = (p2.y - p1.y) * imageHeightPx;
  return Math.hypot(dx, dy);
}

export function computeScaleFromCalibration(
  cal: ScaleCalibration,
  basePxPerCm?: number,
  baseRoomW?: number,
  baseRoomD?: number
): ScaleCalibration {
  const pixelLen = computePixelLength(cal.p1, cal.p2, cal.imageWidthPx, cal.imageHeightPx);
  const safeKnownCm = Math.max(5, cal.knownCm || 210);
  const pxPerCm = Math.max(0.4, pixelLen / safeKnownCm);

  // Estimate real-world room dimensions proportionally when user recalibrates
  let roomWidthCm = cal.roomWidthCm;
  let roomDepthCm = cal.roomDepthCm;
  if (basePxPerCm && baseRoomW && baseRoomD && pxPerCm > 0) {
    const ratio = basePxPerCm / pxPerCm;
    roomWidthCm = Math.round(Math.min(900, Math.max(220, baseRoomW * ratio)));
    roomDepthCm = Math.round(Math.min(1100, Math.max(250, baseRoomD * ratio)));
  }

  return {
    ...cal,
    pxPerCm: Number(pxPerCm.toFixed(2)),
    roomWidthCm,
    roomDepthCm,
    calibrated: pixelLen > 12,
  };
}

export function sqmToPing(sqm: number): number {
  return Number((sqm / 3.305785).toFixed(2));
}

export function estimateFloorAreaPing(cal: ScaleCalibration): number {
  const areaSqm = (cal.roomWidthCm / 100) * (cal.roomDepthCm / 100);
  return sqmToPing(areaSqm);
}

export function estimateWallAreaPing(cal: ScaleCalibration): number {
  // 3 visible walls roughly painted/treated (back + left + right minus window/door openings ~22%)
  const perimeterM = (cal.roomWidthCm + cal.roomDepthCm * 2) / 100;
  const heightM = cal.ceilingHeightCm / 100;
  const netWallSqm = perimeterM * heightM * 0.78;
  return sqmToPing(netWallSqm);
}

export interface PerspectiveGridData {
  convergingRays: { x1: number; y1: number; x2: number; y2: number }[];
  horizontalLines: { x1: number; y1: number; x2: number; y2: number; depthCm: number }[];
}

export function generatePerspectiveGrid(cal: ScaleCalibration): PerspectiveGridData {
  const vx = cal.vanishingPoint.x;
  const vy = cal.vanishingPoint.y;
  const floorTopY = Math.max(vy + 0.14, Math.min(0.75, cal.horizonY + 0.2));

  // Generate converging floor rays from vanishing point out to bottom & side edges
  const targetXs = [-0.2, 0.0, 0.16, 0.33, 0.5, 0.67, 0.84, 1.0, 1.2];
  const convergingRays = targetXs.map((tx) => {
    // Clip ray start at floorTopY
    const t = (floorTopY - vy) / (1.0 - vy);
    const sx = vx + (tx - vx) * t;
    return {
      x1: sx,
      y1: floorTopY,
      x2: tx,
      y2: 1.0,
    };
  });

  // Receding perspective horizontal steps (exponential spacing)
  const steps = 6;
  const horizontalLines: { x1: number; y1: number; x2: number; y2: number; depthCm: number }[] = [];
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    // Perspective foreshortening curve
    const y = floorTopY + (1.0 - floorTopY) * Math.pow(u, 1.65);
    const depthCm = Math.round((1 - u) * cal.roomDepthCm);
    horizontalLines.push({
      x1: 0,
      y1: y,
      x2: 1,
      y2: y,
      depthCm,
    });
  }

  return { convergingRays, horizontalLines };
}
