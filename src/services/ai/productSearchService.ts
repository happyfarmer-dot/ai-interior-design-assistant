import { RETAIL_CATALOG, TAIWAN_RENOVATION_RATES } from '../../data/catalog';
import { MATERIAL_SWATCHES } from '../../data/presets';
import {
  estimateFloorAreaPing,
  estimateWallAreaPing,
} from '../physics/scaleEngine';
import type {
  AppliedMaterials,
  BomLineItem,
  BomSummary,
  DesignConstraints,
  DesignStyleId,
  FurnitureCategory,
  FurnitureItem,
  LightingState,
  MatchedProduct,
  NewObjectCandidate,
  ScaleCalibration,
} from '../../types/planner';
import type { IProductSearchService } from './interfaces';

export function buildRetailSearchUrl(brand: string, keyword: string): string {
  const cleanKw = keyword.trim();
  const b = brand.toUpperCase();
  if (b.includes('IKEA')) {
    return `https://www.ikea.com.tw/zh/search?q=${encodeURIComponent(cleanKw)}`;
  }
  if (b.includes('MUJI') || brand.includes('無印')) {
    return `https://www.google.com/search?q=${encodeURIComponent(`site:muji.com/tw ${cleanKw}`)}`;
  }
  if (b.includes('NITORI') || brand.includes('宜得利')) {
    return `https://www.nitori-net.tw/Search?keyword=${encodeURIComponent(cleanKw)}`;
  }
  if (b.includes('MR. LIVING')) {
    return `https://www.google.com/search?q=${encodeURIComponent(`site:mrliving.com.tw ${cleanKw}`)}`;
  }
  if (brand.includes('有情門')) {
    return `https://www.google.com/search?q=${encodeURIComponent(`有情門 ${cleanKw}`)}`;
  }
  return `https://www.google.com/search?q=${encodeURIComponent(`${brand} ${cleanKw} 台灣購買`)}`;
}

function computeDimensionFitScore(
  targetW: number,
  targetD: number,
  targetH: number,
  candW: number,
  candD: number,
  candH: number,
  petBonus: boolean
): number {
  const wDiff = Math.abs(targetW - candW) / Math.max(40, targetW);
  const dDiff = Math.abs(targetD - candD) / Math.max(40, targetD);
  const hDiff = Math.abs(targetH - candH) / Math.max(40, targetH);
  const raw = 100 - (wDiff * 38 + dDiff * 32 + hDiff * 15);
  return Math.max(62, Math.min(99, Math.round(raw + (petBonus ? 5 : 0))));
}

export class ProductSearchService implements IProductSearchService {
  async matchProducts({
    furniture,
    newObject,
    constraints,
    styleId,
  }: {
    furniture: FurnitureItem[];
    newObject: NewObjectCandidate | null;
    constraints: DesignConstraints;
    styleId: DesignStyleId;
  }): Promise<MatchedProduct[]> {
    const targets: {
      category: FurnitureCategory;
      w: number;
      d: number;
      h: number;
      slotLabel: string;
    }[] = [];

    for (const item of furniture) {
      const w = Math.max(item.floorRect.wCm, item.floorRect.dCm);
      const d = Math.min(item.floorRect.wCm, item.floorRect.dCm);
      targets.push({
        category: item.category,
        w,
        d,
        h: item.floorRect.hCm,
        slotLabel: item.name,
      });
    }

    if (newObject && !targets.some((t) => t.category === newObject.category)) {
      targets.push({
        category: newObject.category,
        w: newObject.widthCm,
        d: newObject.depthCm,
        h: newObject.heightCm,
        slotLabel: `新增單品：${newObject.name}`,
      });
    }

    // Add accent chair / floor lamp if living room style upgrade is active
    const isBedroom = furniture.some((f) => f.category === 'bed');
    if (!isBedroom && !targets.some((t) => t.category === 'floor_lamp')) {
      targets.push({
        category: 'floor_lamp',
        w: 42,
        d: 42,
        h: 178,
        slotLabel: '推薦氛圍立燈位',
      });
    }
    if (
      constraints.catPathway &&
      !targets.some((t) => t.category === 'cat_tree')
    ) {
      targets.push({
        category: 'cat_tree',
        w: 58,
        d: 58,
        h: 145,
        slotLabel: '貓咪垂直動線跳台位',
      });
    }

    const matched: MatchedProduct[] = [];

    for (const target of targets) {
      const candidates = RETAIL_CATALOG.filter(
        (p) => p.category === target.category
      );
      if (candidates.length === 0) continue;

      const ranked = candidates
        .map((c) => {
          const petBonus = constraints.scratchResistant && c.petFriendly;
          const styleBonus =
            (styleId === 'muji' && c.brand === '無印良品 MUJI') ||
            (styleId === 'scandinavian' && c.brand === 'IKEA')
              ? 3
              : 0;
          const fitScore = Math.min(
            99,
            computeDimensionFitScore(
              target.w,
              target.d,
              target.h,
              c.widthCm,
              c.depthCm,
              c.heightCm,
              petBonus
            ) + styleBonus
          );
          return { candidate: c, fitScore };
        })
        .sort((a, b) => b.fitScore - a.fitScore)
        .slice(0, 2);

      ranked.forEach((entry, idx) => {
        const c = entry.candidate;
        const searchKeyword = `${c.brand} ${c.name.split('(')[0].trim()}`;
        matched.push({
          id: `${c.id}_${target.category}`,
          brand: c.brand,
          name: c.name,
          category: c.category,
          widthCm: c.widthCm,
          depthCm: c.depthCm,
          heightCm: c.heightCm,
          priceTWD: c.priceTWD,
          material: c.material,
          petFriendly: c.petFriendly,
          fitScore: entry.fitScore,
          targetSlotLabel: target.slotLabel,
          colorHex: c.colorHex,
          // Pre-select best fit items unless original item is explicitly preserved
          selectedForBom:
            idx === 0 &&
            !constraints.preserveItems.some((keep) =>
              target.slotLabel.includes(keep.replace('原有', ''))
            ),
          urlSlug: c.urlSlug,
          searchKeyword,
          searchUrl: buildRetailSearchUrl(c.brand, searchKeyword),
        });
      });
    }

    return matched;
  }
}

export function computeBomSummary(params: {
  calibration: ScaleCalibration;
  appliedMaterials: AppliedMaterials;
  lighting: LightingState;
  constraints: DesignConstraints;
  matchedProducts: MatchedProduct[];
  mode: string;
  geminiBomItems?: BomLineItem[] | null;
}): BomSummary {
  const {
    calibration,
    appliedMaterials,
    lighting,
    constraints,
    matchedProducts,
    mode,
    geminiBomItems,
  } = params;

  const roomAreaPing = estimateFloorAreaPing(calibration);
  const wallAreaPing = estimateWallAreaPing(calibration);
  const items: BomLineItem[] = [];

  if (geminiBomItems && geminiBomItems.length > 0) {
    // Use AI-detected renovation / surface items returned by Gemini
    items.push(
      ...geminiBomItems.filter((item) => item.category !== 'soft_furnishing')
    );
  } else {
    // 1. Floor material delta
    const floorSwatch =
      MATERIAL_SWATCHES.find((m) => m.id === appliedMaterials.floor) ||
      (mode === 'style'
        ? MATERIAL_SWATCHES.find((m) => m.id === 'floor_oak_plank')
        : undefined);

    if (floorSwatch) {
      const minTWD = Math.round(roomAreaPing * floorSwatch.unitPriceMinTWD);
      const maxTWD = Math.round(roomAreaPing * floorSwatch.unitPriceMaxTWD);
      items.push({
        id: 'bom_floor',
        category: 'surface_floor',
        categoryLabel: '地面表面材鋪設',
        name: `${floorSwatch.name}（${floorSwatch.subtitle}）`,
        quantityText: `${roomAreaPing} 坪`,
        unitRateText: `NT$ ${floorSwatch.unitPriceMinTWD.toLocaleString()}~${floorSwatch.unitPriceMaxTWD.toLocaleString()} / 坪`,
        minTWD,
        maxTWD,
        note: '依空間校準比例推算實際鋪設坪數（含 8% 收邊損耗預估）',
      });
    }

    // 2. Wall paint / special finish delta
    const wallSwatch =
      MATERIAL_SWATCHES.find((m) => m.id === appliedMaterials.main_wall) ||
      (mode === 'style'
        ? MATERIAL_SWATCHES.find((m) => m.id === 'wall_warm_ivory')
        : undefined);

    if (wallSwatch) {
      const minTWD = Math.round(wallAreaPing * wallSwatch.unitPriceMinTWD);
      const maxTWD = Math.round(wallAreaPing * wallSwatch.unitPriceMaxTWD);
      items.push({
        id: 'bom_wall',
        category: 'surface_wall',
        categoryLabel: '牆面塗料 / 特殊漆',
        name: `${wallSwatch.name}（${wallSwatch.subtitle}）`,
        quantityText: `${wallAreaPing} 坪`,
        unitRateText: `NT$ ${wallSwatch.unitPriceMinTWD.toLocaleString()}~${wallSwatch.unitPriceMaxTWD.toLocaleString()} / 坪`,
        minTWD,
        maxTWD,
        note: '扣除門窗開口面積約 22% 之三面主牆估算',
      });
    }

    // 3. Curtain replacement if applied or styled
    const curtainSwatch = MATERIAL_SWATCHES.find(
      (m) => m.id === appliedMaterials.curtain
    );
    if (curtainSwatch) {
      items.push({
        id: 'bom_curtain',
        category: 'soft_furnishing',
        categoryLabel: '窗簾軌道軟裝',
        name: curtainSwatch.name,
        quantityText: '1 窗 (含蛇行軌道)',
        unitRateText: `NT$ ${curtainSwatch.unitPriceMinTWD.toLocaleString()}~${curtainSwatch.unitPriceMaxTWD.toLocaleString()} / 窗`,
        minTWD: curtainSwatch.unitPriceMinTWD,
        maxTWD: curtainSwatch.unitPriceMaxTWD,
      });
    }

    // 4. Optional Entryway Dust Zone & Extra System Storage from Constraints
    if (constraints.entrywayDustZone) {
      items.push({
        id: 'bom_entryway',
        category: 'surface_floor',
        categoryLabel: '表面材加項',
        name: '玄關六角磚 / 防污落塵區表層拼貼',
        quantityText: '1.2 坪',
        unitRateText: 'NT$ 18,000~32,000 / 式',
        minTWD: TAIWAN_RENOVATION_RATES.entrywayDustZoneMin,
        maxTWD: TAIWAN_RENOVATION_RATES.entrywayDustZoneMax,
        note: '依客製化需求自動新增',
      });
    }

    if (constraints.extraStorage) {
      const chiCount = 6; // 6 尺 = ~182 cm system cabinet
      items.push({
        id: 'bom_system_cabinet',
        category: 'system_cabinet',
        categoryLabel: '新增系統櫃體',
        name: 'E1 低甲醛客製化系統收納高櫃（避開冷氣與電箱遮罩）',
        quantityText: `${chiCount} 尺 (約 182 cm)`,
        unitRateText: `NT$ ${TAIWAN_RENOVATION_RATES.systemCabinetPerChiMin.toLocaleString()}~${TAIWAN_RENOVATION_RATES.systemCabinetPerChiMax.toLocaleString()} / 尺`,
        minTWD: chiCount * TAIWAN_RENOVATION_RATES.systemCabinetPerChiMin,
        maxTWD: chiCount * TAIWAN_RENOVATION_RATES.systemCabinetPerChiMax,
        note: '含五金緩衝鉸鏈與收邊板',
      });
    }

    // 5. Lighting upgrades
    if (lighting.recessedDownlights) {
      items.push({
        id: 'bom_downlights',
        category: 'surface_wall',
        categoryLabel: '照明燈具表面材',
        name: `無主燈深防眩嵌燈組（${lighting.kelvin}K）`,
        quantityText: '6 盞',
        unitRateText: 'NT$ 12,000~24,000 / 式',
        minTWD: TAIWAN_RENOVATION_RATES.recessedLightingMin,
        maxTWD: TAIWAN_RENOVATION_RATES.recessedLightingMax,
        note: '含燈具與明裝/既設孔位燈具更換',
      });
    }

    if (lighting.indirectCoveLed) {
      items.push({
        id: 'bom_cove_led',
        category: 'surface_wall',
        categoryLabel: '照明燈具表面材',
        name: `鋁槽間接照明 LED 燈帶（${lighting.kelvin}K）`,
        quantityText: '12 米',
        unitRateText: 'NT$ 8,000~16,000 / 式',
        minTWD: TAIWAN_RENOVATION_RATES.indirectCoveMin,
        maxTWD: TAIWAN_RENOVATION_RATES.indirectCoveMax,
      });
    }
  }

  // 6. Selected Matched Retail Soft Furnishings (always dynamic!)
  const selectedFurniture = matchedProducts.filter((p) => p.selectedForBom);
  for (const prod of selectedFurniture) {
    items.push({
      id: `bom_prod_${prod.id}`,
      category: 'soft_furnishing',
      categoryLabel: `軟裝採購 (${prod.brand})`,
      name: `${prod.name}（${prod.widthCm}×${prod.depthCm}×${prod.heightCm}cm）`,
      quantityText: '1 件',
      unitRateText: `NT$ ${prod.priceTWD.toLocaleString()}`,
      minTWD: prod.priceTWD,
      maxTWD: prod.priceTWD,
      note: `尺寸適配度 ${prod.fitScore}%${prod.petFriendly ? ' · 防抓耐磨 ✓' : ''}`,
    });
  }

  const totalMinTWD = items.reduce((sum, i) => sum + i.minTWD, 0);
  const totalMaxTWD = items.reduce((sum, i) => sum + i.maxTWD, 0);
  const budgetCapTWD = constraints.maxBudgetTWD;
  const withinBudget =
    budgetCapTWD === null ? true : totalMinTWD <= budgetCapTWD;

  return {
    items,
    totalMinTWD,
    totalMaxTWD,
    roomAreaPing,
    wallAreaPing,
    budgetCapTWD,
    withinBudget,
    disclaimer:
      '本數據僅供表面材與軟裝採購參考，不含拆除、水電重拉等基礎泥作工程',
  };
}
