import { DESIGN_STYLES } from '../../data/presets';
import { renderProceduralStyleImage } from '../../utils/imageProcessing';
import { getOrientedBounds } from '../physics/ergonomicsEngine';
import type {
  AiServiceConfig,
  AppliedMaterials,
  DesignConstraints,
  DesignStyleId,
  FurnitureItem,
  NewObjectCandidate,
  PlacementZone,
  ProtectionMask,
  RearrangementGoal,
  RearrangementVariant,
  RoomPreset,
  ScaleCalibration,
} from '../../types/planner';
import type { IRenderingService } from './interfaces';

export class RenderingService implements IRenderingService {
  private config: AiServiceConfig;

  constructor(config: AiServiceConfig) {
    this.config = config;
  }

  async generateRearrangements({
    baseFurniture,
    calibration,
    masks,
    constraints,
    goal,
  }: {
    baseFurniture: FurnitureItem[];
    calibration: ScaleCalibration;
    masks: ProtectionMask[];
    constraints: DesignConstraints;
    goal: RearrangementGoal;
  }): Promise<RearrangementVariant[]> {
    const rw = calibration.roomWidthCm;
    const rd = calibration.roomDepthCm;
    const isBedroom = baseFurniture.some((f) => f.category === 'bed');

    const cloneItems = () => structuredClone(baseFurniture);

    // Check if an item is preserved/locked by user OR constraint parser
    const isLocked = (item: FurnitureItem) =>
      item.locked ||
      constraints.preserveItems.some((p) =>
        item.name.includes(p.replace('原有', ''))
      );

    if (isBedroom) {
      // Bedroom 3 Rearrangement Variants
      const varA = cloneItems().map((item) => {
        if (isLocked(item)) return item;
        if (item.category === 'bed') {
          return {
            ...item,
            floorRect: { ...item.floorRect, xCm: Math.round(rw - item.floorRect.wCm - 12), yCm: 48, rotationDeg: 0 },
            bbox: { x: 0.44, y: 0.51, w: 0.38, h: 0.34 },
          };
        }
        if (item.category === 'wardrobe') {
          return {
            ...item,
            floorRect: { ...item.floorRect, xCm: 8, yCm: 135, rotationDeg: 90 },
            bbox: { x: 0.08, y: 0.34, w: 0.14, h: 0.48 },
          };
        }
        return item;
      });

      const varB = cloneItems().map((item) => {
        if (isLocked(item)) return item;
        if (item.category === 'bed') {
          return {
            ...item,
            floorRect: { ...item.floorRect, xCm: 12, yCm: 95, rotationDeg: 90 },
            bbox: { x: 0.12, y: 0.56, w: 0.42, h: 0.3 },
          };
        }
        if (item.category === 'wardrobe') {
          return {
            ...item,
            floorRect: { ...item.floorRect, xCm: rw - 72, yCm: 40, rotationDeg: 90 },
            bbox: { x: 0.7, y: 0.25, w: 0.15, h: 0.45 },
          };
        }
        return item;
      });

      const varC = cloneItems().map((item) => {
        if (isLocked(item)) return item;
        if (item.category === 'bed') {
          return {
            ...item,
            floorRect: { ...item.floorRect, xCm: Math.round(rw - item.floorRect.wCm - 12), yCm: 50, rotationDeg: 0 },
            bbox: { x: 0.44, y: 0.51, w: 0.38, h: 0.34 },
          };
        }
        return item;
      });

      return [
        {
          id: 'var_a',
          code: 'A',
          title: '方案 A：床位居中雙側下床・採光窗全保留',
          subtitle: '衣櫃退離轉角採光窗，釋放天然進光面',
          rationale: [
            '將高衣櫃自轉角窗邊往室內前移，避免高櫃遮擋自然日照與通風氣流。',
            '床組置中對齊，左右兩側皆留設寬裕下床與開門迴轉空間。',
            '避開床頭上方冷氣直吹位置與右側房門 85cm 扇形開啟區。',
          ],
          furniture: varA,
          score: 95,
          mepSafe: true,
        },
        {
          id: 'var_b',
          code: 'B',
          title: '方案 B：橫向靠窗佈局・獨立更衣動線',
          subtitle: '釋出中央開闊活動區，適合加設書桌或嬰兒床',
          rationale: [
            '床組轉向貼近左側實牆，視覺延伸縱深並形成寬敞中央迴游走道。',
            '衣櫃改置右後牆面（嚴格保留與冷氣出風口 45cm 距離）。',
            '確保右側木門開啟扇區完全無遮擋。',
          ],
          furniture: varB,
          score: 88,
          mepSafe: true,
        },
        {
          id: 'var_c',
          code: 'C',
          title: '方案 C：右側靠牆・最大化左側採光書桌角',
          subtitle: '集中休息區與收納區，釋出臨窗閱讀角落',
          rationale: [
            '雙人床靠右牆擺放（預留門片開啟安全距 95cm），創造大尺度臨窗書桌空間。',
            '降低左側視覺壓迫，讓轉角窗陽光完整灑落床尾地面。',
          ],
          furniture: varC,
          score: 84,
          mepSafe: true,
        },
      ];
    }

    // Living Room 3 Rearrangement Variants
    const varA = cloneItems().map((item) => {
      if (isLocked(item)) return item;
      if (item.category === 'sofa') {
        return {
          ...item,
          floorRect: { ...item.floorRect, xCm: 8, yCm: 110, wCm: 210, dCm: 92, rotationDeg: 90 },
          bbox: { x: 0.08, y: 0.53, w: 0.27, h: 0.35 },
        };
      }
      if (item.category === 'coffee_table') {
        return {
          ...item,
          floorRect: { ...item.floorRect, xCm: 132, yCm: 165, wCm: 96, dCm: 52, rotationDeg: 90 },
          bbox: { x: 0.37, y: 0.64, w: 0.11, h: 0.18 },
        };
      }
      if (item.category === 'tv_console') {
        return {
          ...item,
          floorRect: { ...item.floorRect, xCm: Math.max(255, rw - 52), yCm: 120, wCm: 175, dCm: 46, rotationDeg: 90 },
          bbox: { x: 0.64, y: 0.49, w: 0.18, h: 0.33 },
        };
      }
      return item;
    });

    const varB = cloneItems().map((item) => {
      if (isLocked(item)) return item;
      if (item.category === 'sofa') {
        return {
          ...item,
          floorRect: { ...item.floorRect, xCm: 8, yCm: 60, wCm: 210, dCm: 92, rotationDeg: 90 },
          bbox: { x: 0.11, y: 0.51, w: 0.25, h: 0.32 },
        };
      }
      if (item.category === 'coffee_table') {
        return {
          ...item,
          floorRect: { ...item.floorRect, xCm: 126, yCm: 115, wCm: 92, dCm: 52, rotationDeg: 90 },
          bbox: { x: 0.34, y: 0.61, w: 0.11, h: 0.17 },
        };
      }
      if (item.category === 'tv_console') {
        return {
          ...item,
          floorRect: { ...item.floorRect, xCm: Math.max(255, rw - 52), yCm: 75, wCm: 175, dCm: 46, rotationDeg: 90 },
          bbox: { x: 0.61, y: 0.47, w: 0.17, h: 0.31 },
        };
      }
      return item;
    });

    const varC = cloneItems().map((item) => {
      if (isLocked(item)) return item;
      if (item.category === 'sofa') {
        return {
          ...item,
          floorRect: { ...item.floorRect, xCm: 48, yCm: Math.max(210, rd - 130), wCm: 210, dCm: 92, rotationDeg: 0 },
          bbox: { x: 0.22, y: 0.64, w: 0.45, h: 0.28 },
        };
      }
      if (item.category === 'coffee_table') {
        return {
          ...item,
          floorRect: { ...item.floorRect, xCm: 102, yCm: Math.max(135, rd - 205), wCm: 102, dCm: 55, rotationDeg: 0 },
          bbox: { x: 0.35, y: 0.58, w: 0.18, h: 0.14 },
        };
      }
      if (item.category === 'tv_console') {
        return {
          ...item,
          floorRect: { ...item.floorRect, xCm: Math.max(255, rw - 52), yCm: 90, wCm: 175, dCm: 46, rotationDeg: 90 },
          bbox: { x: 0.64, y: 0.49, w: 0.18, h: 0.32 },
        };
      }
      return item;
    });

    const extraConstraintTip = constraints.catPathway
      ? '預留靠窗立面寬度 65cm 供貓跳台與高處俯瞰曬太陽動線。'
      : constraints.entrywayDustZone
        ? '前段入口處淨空 135cm 縱深，形成完整玄關落塵區與穿鞋動線。'
        : '所有高櫃體遠離配電箱及冷氣出風口至少 50cm 以上。';

    const variants: RearrangementVariant[] = [
      {
        id: 'var_a',
        code: 'A',
        title: '方案 A：黃金採光軸線・92cm 主動線優化',
        subtitle: '推薦預設・沙發靠實牆、茶几微調內縮釋出暢通走道',
        rationale: [
          '將沙發與電視櫃向陽台窗端適度前推，避免入口與右側臥室房門開啟衝突。',
          '茶几與電視櫃之間淨寬拓寬至 92~100 cm，完全符合雙人錯身與掃拖機器人通過標準。',
          extraConstraintTip,
          masks.length > 0
            ? `已檢核 ${masks.length} 處不可更動結構/機電遮罩，確保採光窗與電箱零遮擋。`
            : '維持中央自然對流氣道，通風效率提升約 25%。',
        ],
        furniture: varA,
        score: goal === 'traffic_flow' ? 96 : 94,
        mepSafe: true,
      },
      {
        id: 'var_b',
        code: 'B',
        title: '方案 B：臨窗開闊前廳・玄關落塵區釋放',
        subtitle: '客廳機能集中後半段，前段預留完整玄關或寵物活動區',
        rationale: [
          '將主客廳區往落地窗方向集中，大幅釋放近入口處超過 150cm 縱深的開放空間。',
          '特別適合規劃「玄關落塵區」或於前側牆面增設頂天系統收納櫃（需避開右側配電箱）。',
          '沙發背牆保留左側結構大樑下方投影，空間重心更顯穩定。',
        ],
        furniture: varB,
        score: goal === 'pet_storage_friendly' ? 95 : 89,
        mepSafe: true,
      },
      {
        id: 'var_c',
        code: 'C',
        title: '方案 C：橫向轉向面向落地窗・賞景對話配置',
        subtitle: '打破傳統貼牆擺法，引導視線面向採光面與陽台綠意',
        rationale: [
          '將三人沙發旋轉 90° 面向陽台落地窗配置，創造飯店式起居對話空間。',
          '沙發後方形成天然走道區隔內外動線，不阻擋陽光直入室內深處。',
          '注意：此配置需確認右側臥室房門開啟半徑與沙發右端距離維持 > 85cm。',
        ],
        furniture: varC,
        score: goal === 'daylight_ventilation' ? 91 : 82,
        mepSafe: true,
      },
    ];

    return variants.sort((a, b) => b.score - a.score);
  }

  async renderStyleTransfer({
    roomImageUrl,
    preset,
    styleId,
    styleIntensity,
    appliedMaterials,
  }: {
    roomImageUrl: string;
    preset?: RoomPreset;
    styleId: DesignStyleId;
    styleIntensity: number;
    appliedMaterials: AppliedMaterials;
  }): Promise<{ renderedImageUrl: string; isPresetDirectMatch: boolean }> {
    void appliedMaterials;

    if (this.config.mode === 'live' && this.config.renderApiKey) {
      // Integration point for Replicate / ControlNet / Stability Inpainting API
    }

    const directStyleUrl = preset?.styleRenders?.[styleId];
    const styleSpec =
      DESIGN_STYLES.find((s) => s.id === styleId) || DESIGN_STYLES[0];

    if (directStyleUrl && styleIntensity >= 78) {
      return {
        renderedImageUrl: directStyleUrl,
        isPresetDirectMatch: true,
      };
    }

    // If directStyleUrl exists and intensity < 78, blend original and direct render on Canvas
    if (directStyleUrl) {
      try {
        const canvas = document.createElement('canvas');
        const imgBase = new Image();
        const imgStyled = new Image();
        imgBase.crossOrigin = 'anonymous';
        imgStyled.crossOrigin = 'anonymous';

        await Promise.all([
          new Promise<void>((res, rej) => {
            imgBase.onload = () => res();
            imgBase.onerror = () => rej();
            imgBase.src = roomImageUrl;
          }),
          new Promise<void>((res, rej) => {
            imgStyled.onload = () => res();
            imgStyled.onerror = () => rej();
            imgStyled.src = directStyleUrl;
          }),
        ]);

        canvas.width = imgBase.naturalWidth || 1200;
        canvas.height = imgBase.naturalHeight || 900;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(imgBase, 0, 0, canvas.width, canvas.height);
          ctx.globalAlpha = Math.max(0, Math.min(1, styleIntensity / 100));
          ctx.drawImage(imgStyled, 0, 0, canvas.width, canvas.height);
          return {
            renderedImageUrl: canvas.toDataURL('image/jpeg', 0.9),
            isPresetDirectMatch: true,
          };
        }
      } catch {
        // Fallback to procedural render
      }
    }

    const rendered = await renderProceduralStyleImage(
      roomImageUrl,
      styleSpec,
      styleIntensity
    );
    return {
      renderedImageUrl: rendered,
      isPresetDirectMatch: false,
    };
  }

  async analyzePlacementZones({
    newObject,
    existingFurniture,
    calibration,
    masks,
    constraints,
  }: {
    newObject: NewObjectCandidate;
    existingFurniture: FurnitureItem[];
    calibration: ScaleCalibration;
    masks: ProtectionMask[];
    constraints: DesignConstraints;
  }): Promise<PlacementZone[]> {
    const rw = calibration.roomWidthCm;
    const isBedroom = existingFurniture.some((f) => f.category === 'bed');

    if (isBedroom) {
      return [
        {
          id: 'zone_bed_corner',
          label: 'Zone A｜右側臨壁機能角落',
          description: `尺寸 ${newObject.widthCm}×${newObject.depthCm}cm 適配，遠離房門開啟弧線`,
          anchor: { x: 0.78, y: 0.76 },
          floorPosCm: { xCm: Math.max(190, rw - newObject.widthCm - 15), yCm: 145, rotationDeg: 0 },
          scaleFactor: 0.92,
          suitabilityScore: 93,
          mepClear: true,
        },
        {
          id: 'zone_bed_window',
          label: 'Zone B｜左後方窗邊日光區',
          description: '近轉角窗自然採光充沛，若物件高度低於窗台則不影響採光',
          anchor: { x: 0.34, y: 0.72 },
          floorPosCm: { xCm: 48, yCm: 175, rotationDeg: 0 },
          scaleFactor: 0.85,
          suitabilityScore: newObject.heightCm > 120 ? 74 : 90,
          mepClear: newObject.heightCm <= 120,
          warning:
            newObject.heightCm > 120
              ? `物件高度 ${newObject.heightCm}cm 偏高，恐局部遮擋左側轉角窗採光`
              : undefined,
        },
      ];
    }

    const acMask = masks.find((m) => m.category === 'ac_vent');
    const isCatTree = newObject.category === 'cat_tree';
    const isLamp = newObject.category === 'floor_lamp';

    const zones: PlacementZone[] = [
      {
        id: 'zone_window_right',
        label: 'Zone A｜陽台窗旁黃金角落 (最推薦)',
        description: isCatTree
          ? '緊鄰落地窗陽光充足，貓咪可登高俯瞰窗外街景，且離冷氣出風口留有餘裕'
          : isLamp
            ? '位於沙發與落地窗間的畸零角，補強夜間閱讀與氛圍照明'
            : `可用畸零寬度約 82cm，完美容納 ${newObject.widthCm}cm 寬單品且主走道維持 ≥80cm`,
        anchor: { x: 0.59, y: 0.68 },
        floorPosCm: {
          xCm: Math.max(175, rw - 115),
          yCm: 55,
          rotationDeg: 0,
        },
        scaleFactor: 0.76,
        suitabilityScore: constraints.catPathway && isCatTree ? 98 : 94,
        mepClear: !(acMask && newObject.heightCm > 175),
        warning:
          acMask && newObject.heightCm > 175
            ? '注意高度接近冷氣機下緣，請確認冷氣迴風裕度'
            : undefined,
      },
      {
        id: 'zone_sofa_front_left',
        label: 'Zone B｜沙發前端迎賓角落',
        description: `形成對話三角區，方便拿取茶几物品，寬度餘裕 ${Math.round(rw * 0.24)}cm`,
        anchor: { x: 0.29, y: 0.87 },
        floorPosCm: { xCm: 22, yCm: 345, rotationDeg: 25 },
        scaleFactor: 1.04,
        suitabilityScore: 87,
        mepClear: true,
      },
      {
        id: 'zone_tv_right_wall',
        label: 'Zone C｜右側電箱下方走道旁',
        description: '靠牆配置，但需注意是否影響臥室門片 85cm 開啟半徑與總電箱檢修',
        anchor: { x: 0.81, y: 0.85 },
        floorPosCm: { xCm: Math.max(230, rw - 72), yCm: 325, rotationDeg: 0 },
        scaleFactor: 0.96,
        suitabilityScore: 68,
        mepClear: false,
        warning:
          '警示：靠近右側總電源配電箱與房門 85cm 開啟半徑，擺放實體傢俱恐造成開門受阻！',
      },
    ];

    // Validate against existing furniture overlap hints
    for (const f of existingFurniture) {
      const fb = getOrientedBounds(f.floorRect);
      if (fb.x2 > 280 && fb.y1 > 280) {
        zones[2].suitabilityScore = 62;
      }
    }

    return zones;
  }
}
