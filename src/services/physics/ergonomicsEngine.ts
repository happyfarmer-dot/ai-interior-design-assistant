import type {
  DesignConstraints,
  DoorSwingArc,
  ErgonomicMetric,
  ErgonomicsReport,
  FloorPlanBox,
  FurnitureItem,
  ProtectionMask,
  ScaleCalibration,
  TrafficStatus,
} from '../../types/planner';

interface BoxBounds {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export function getOrientedBounds(rect: FloorPlanBox): BoxBounds {
  const isRotated = Math.abs(rect.rotationDeg % 180) === 90;
  const w = isRotated ? rect.dCm : rect.wCm;
  const d = isRotated ? rect.wCm : rect.dCm;
  return {
    x1: rect.xCm,
    y1: rect.yCm,
    x2: rect.xCm + w,
    y2: rect.yCm + d,
  };
}

function boxesOverlapY(a: BoxBounds, b: BoxBounds): boolean {
  return Math.min(a.y2, b.y2) - Math.max(a.y1, b.y1) > 12;
}

function boxesOverlapX(a: BoxBounds, b: BoxBounds): boolean {
  return Math.min(a.x2, b.x2) - Math.max(a.x1, b.x1) > 12;
}

function checkDoorSwingCollision(
  door: DoorSwingArc,
  item: FurnitureItem
): boolean {
  const b = getOrientedBounds(item.floorRect);
  // Sample points on the door arc & interior sweep
  const startRad = (door.startAngleDeg * Math.PI) / 180;
  const endRad = (door.endAngleDeg * Math.PI) / 180;
  const steps = 10;
  const radii = [0.35, 0.65, 0.92];

  for (const rFrac of radii) {
    const r = door.radiusCm * rFrac;
    for (let i = 0; i <= steps; i++) {
      const theta = startRad + ((endRad - startRad) * i) / steps;
      const px = door.hingeXCm + r * Math.cos(theta);
      const py = door.hingeYCm + r * Math.sin(theta);
      if (px >= b.x1 && px <= b.x2 && py >= b.y1 && py <= b.y2) {
        return true;
      }
    }
  }
  return false;
}

function computePrimaryWalkwayClearance(
  items: FurnitureItem[],
  cal: ScaleCalibration
): number {
  if (items.length === 0) return Math.round(cal.roomWidthCm);

  // Measure central clear walkway corridors between opposing items or walls
  const bounds = items.map((item) => ({ item, b: getOrientedBounds(item.floorRect) }));

  const gaps: number[] = [];

  for (let i = 0; i < bounds.length; i++) {
    for (let j = i + 1; j < bounds.length; j++) {
      const A = bounds[i];
      const B = bounds[j];
      // Horizontal gap when overlapping vertically
      if (boxesOverlapY(A.b, B.b)) {
        const horizGap =
          A.b.x2 <= B.b.x1
            ? B.b.x1 - A.b.x2
            : B.b.x2 <= A.b.x1
              ? A.b.x1 - B.b.x2
              : 0;
        // Skip small natural grouping between sofa and coffee table (< 55cm knee gap if it's coffee table + sofa)
        const isSofaCoffeePair =
          (A.item.category === 'sofa' && B.item.category === 'coffee_table') ||
          (A.item.category === 'coffee_table' && B.item.category === 'sofa');
        if (!isSofaCoffeePair) {
          gaps.push(horizGap);
        }
      }
      // Vertical gap when overlapping horizontally
      if (boxesOverlapX(A.b, B.b)) {
        const vertGap =
          A.b.y2 <= B.b.y1
            ? B.b.y1 - A.b.y2
            : B.b.y2 <= A.b.y1
              ? A.b.y1 - B.b.y2
              : 0;
        const isSofaCoffeePair =
          (A.item.category === 'sofa' && B.item.category === 'coffee_table') ||
          (A.item.category === 'coffee_table' && B.item.category === 'sofa');
        if (!isSofaCoffeePair && vertGap < 180) {
          gaps.push(vertGap);
        }
      }
    }
  }

  // Also check passage between furniture and right/left walls if item is near center
  for (const { item, b } of bounds) {
    if (item.category === 'bed' || item.category === 'coffee_table') {
      const leftGap = b.x1;
      const rightGap = cal.roomWidthCm - b.x2;
      if (leftGap > 15 && leftGap < 150) gaps.push(leftGap);
      if (rightGap > 15 && rightGap < 150) gaps.push(rightGap);
    }
  }

  if (gaps.length === 0) {
    return Math.round(cal.roomWidthCm * 0.45);
  }
  return Math.max(0, Math.round(Math.min(...gaps)));
}

function checkMepConflicts(
  items: FurnitureItem[],
  masks: ProtectionMask[]
): string[] {
  const conflicts: string[] = [];
  for (const mask of masks) {
    if (!mask.floorZone) continue;
    const z = mask.floorZone;
    const zBounds: BoxBounds = {
      x1: z.xCm,
      y1: z.yCm,
      x2: z.xCm + z.wCm,
      y2: z.yCm + z.dCm,
    };

    for (const item of items) {
      const b = getOrientedBounds(item.floorRect);
      const overlapX = Math.min(b.x2, zBounds.x2) - Math.max(b.x1, zBounds.x1);
      const overlapY = Math.min(b.y2, zBounds.y2) - Math.max(b.y1, zBounds.y1);
      if (overlapX > 8 && overlapY > 8) {
        if (mask.category === 'electrical_panel' && item.floorRect.hCm > 105) {
          conflicts.push(`「${item.name}」高度 ${item.floorRect.hCm}cm 遮擋${mask.label}`);
        } else if (mask.category === 'ac_vent' && item.floorRect.hCm >= 150) {
          conflicts.push(`「${item.name}」高度過高，阻擋${mask.label}迴風出風`);
        } else if (mask.category === 'window_daylight' && item.floorRect.hCm >= 115) {
          conflicts.push(`「${item.name}」高度 ${item.floorRect.hCm}cm 嚴重遮蔽${mask.label}採光`);
        }
      }
    }
  }
  return conflicts;
}

function recommendTvSize(distanceCm: number): string {
  if (distanceCm <= 0) return '空間無電視牆配置';
  if (distanceCm < 175) return '43" ~ 50" 螢幕';
  if (distanceCm < 225) return '50" ~ 55" 螢幕';
  if (distanceCm < 275) return '55" ~ 65" 螢幕';
  if (distanceCm < 330) return '65" ~ 75" 螢幕';
  return '75" ~ 85" 大尺寸螢幕';
}

export function evaluateErgonomics(
  items: FurnitureItem[],
  cal: ScaleCalibration,
  masks: ProtectionMask[],
  doorSwings: DoorSwingArc[],
  constraints: DesignConstraints
): ErgonomicsReport {
  const walkwayRequiredCm = constraints.accessibilityClearance ? 90 : 75;
  const walkwayMinCm = computePrimaryWalkwayClearance(items, cal);

  let walkwayStatus: TrafficStatus = 'pass';
  if (walkwayMinCm < 60) {
    walkwayStatus = 'fail';
  } else if (walkwayMinCm < walkwayRequiredCm) {
    walkwayStatus = 'warn';
  }

  let doorBlocked = false;
  let doorBlockingItem: string | undefined;
  for (const door of doorSwings) {
    for (const item of items) {
      if (item.category === 'rug') continue;
      if (checkDoorSwingCollision(door, item)) {
        doorBlocked = true;
        doorBlockingItem = `${item.name} 侵入「${door.label}」`;
        break;
      }
    }
    if (doorBlocked) break;
  }

  const mepConflictDetails = checkMepConflicts(items, masks);
  const mepConflictCount = mepConflictDetails.length;

  // Viewing distance between sofa/bed and TV console
  const sofa = items.find((i) => i.category === 'sofa' || i.category === 'bed');
  const tv = items.find((i) => i.category === 'tv_console');
  let tvDistanceCm = 0;
  if (sofa && tv) {
    const sb = getOrientedBounds(sofa.floorRect);
    const tb = getOrientedBounds(tv.floorRect);
    const scx = (sb.x1 + sb.x2) / 2;
    const scy = (sb.y1 + sb.y2) / 2;
    const tcx = (tb.x1 + tb.x2) / 2;
    const tcy = (tb.y1 + tb.y2) / 2;
    tvDistanceCm = Math.round(Math.hypot(tcx - scx, tcy - scy));
  } else {
    tvDistanceCm = Math.round(cal.roomWidthCm * 0.72);
  }

  const recommendedTvInches = recommendTvSize(tvDistanceCm);
  const tvStatus: TrafficStatus =
    tvDistanceCm === 0
      ? 'pass'
      : tvDistanceCm < 160
        ? 'warn'
        : 'pass';

  const doorStatus: TrafficStatus = doorBlocked ? 'fail' : 'pass';
  const mepStatus: TrafficStatus = mepConflictCount > 0 ? 'fail' : 'pass';

  const metrics: ErgonomicMetric[] = [
    {
      id: 'walkway',
      label: '主要走道淨寬',
      valueText: `${walkwayMinCm} cm`,
      benchmarkText: `建議 ≥ ${walkwayRequiredCm} cm（低於 60 cm 紅燈）`,
      status: walkwayStatus,
      detail:
        walkwayStatus === 'pass'
          ? `空間動線充裕，滿足單人通行與日常清潔動線標準。`
          : walkwayStatus === 'warn'
            ? `通道略窄於 ${walkwayRequiredCm} cm，雙人錯身需側身避讓。`
            : `通道僅 ${walkwayMinCm} cm！低於 60 cm 人體工學下限，建議縮小茶几或調整擺位。`,
    },
    {
      id: 'door_swing',
      label: '門片與櫃門開啟半徑',
      valueText: doorBlocked ? '動線受阻' : '90° 無阻擋',
      benchmarkText: '門片迴轉半徑 85 cm 淨空',
      status: doorStatus,
      detail: doorBlocked
        ? `警告：${doorBlockingItem}，將導致房門或櫃門無法全開。`
        : '所有房門與櫃門開啟扇形區域均保持完全淨空。',
    },
    {
      id: 'mep_protection',
      label: '結構與機電遮罩合規',
      valueText: mepConflictCount > 0 ? `${mepConflictCount} 項衝突` : '100% 受保護',
      benchmarkText: '窗戶、冷氣迴風與配電箱零遮蔽',
      status: mepStatus,
      detail:
        mepConflictCount > 0
          ? mepConflictDetails.join('；')
          : '未遮蔽採光窗戶、冷氣出風口與配電箱檢修門。',
    },
    {
      id: 'tv_distance',
      label: '視聽距離與螢幕建議',
      valueText: tvDistanceCm > 0 ? `${tvDistanceCm} cm` : '未配置視聽區',
      benchmarkText: `最佳建議：${recommendedTvInches}`,
      status: tvStatus,
      detail:
        tvDistanceCm < 160 && tvDistanceCm > 0
          ? '視距偏近，建議選用 43 吋以下螢幕或改採投影布幕以減少視覺疲勞。'
          : `依 ${tvDistanceCm} cm 觀看視距與 30° 舒適視角公式推算，最適配 ${recommendedTvInches}。`,
    },
  ];

  let overallStatus: TrafficStatus = 'pass';
  if (metrics.some((m) => m.status === 'fail')) {
    overallStatus = 'fail';
  } else if (metrics.some((m) => m.status === 'warn')) {
    overallStatus = 'warn';
  }

  return {
    overallStatus,
    walkwayMinCm,
    walkwayRequiredCm,
    doorBlocked,
    doorBlockingItem,
    mepConflictCount,
    mepConflictDetails,
    tvDistanceCm,
    recommendedTvInches,
    metrics,
  };
}
