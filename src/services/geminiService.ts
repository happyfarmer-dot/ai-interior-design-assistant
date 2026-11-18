import { GoogleGenAI, Modality } from '@google/genai';
import { DESIGN_STYLES, MATERIAL_SWATCHES } from '../data/presets';
import type {
  AppliedMaterials,
  BomLineItem,
  DesignConstraints,
  DesignMode,
  DesignStyleId,
  FurnitureCategory,
  FurnitureItem,
  LightingState,
  MatchedProduct,
  Point2D,
  ProtectionCategory,
  ProtectionMask,
  RearrangementGoal,
  RearrangementVariant,
  ScaleCalibration,
} from '../types/planner';
import { loadImageElement } from '../utils/imageProcessing';
import {
  USER_GEMINI_API_KEY_STORAGE,
  createInitialAiConfig,
} from './ai/config';
import { ConstraintParserService } from './ai/constraintParser';
import { buildRetailSearchUrl } from './ai/productSearchService';

const VALID_FURNITURE_CATEGORIES: FurnitureCategory[] = [
  'sofa',
  'coffee_table',
  'tv_console',
  'dining_table',
  'bed',
  'wardrobe',
  'accent_chair',
  'cat_tree',
  'floor_lamp',
  'storage_cabinet',
  'rug',
];

const VALID_PROTECTION_CATEGORIES: ProtectionCategory[] = [
  'beam_column',
  'window_daylight',
  'ac_vent',
  'electrical_panel',
  'outlet',
];

const CATEGORY_COLORS: Record<FurnitureCategory, string> = {
  sofa: '#64748b',
  coffee_table: '#9a6b42',
  tv_console: '#7c5338',
  dining_table: '#8b5e34',
  bed: '#94a3b8',
  wardrobe: '#a17449',
  accent_chair: '#d9822b',
  cat_tree: '#b08968',
  floor_lamp: '#eab308',
  storage_cabinet: '#78716c',
  rug: '#cbd5e1',
};

export function getStoredGeminiApiKey(): string {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return '';
    return (
      window.localStorage.getItem(USER_GEMINI_API_KEY_STORAGE)?.trim() || ''
    );
  } catch {
    return '';
  }
}

export function setStoredGeminiApiKey(apiKey: string): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    const trimmed = apiKey.trim();
    if (trimmed) {
      window.localStorage.setItem(USER_GEMINI_API_KEY_STORAGE, trimmed);
    } else {
      window.localStorage.removeItem(USER_GEMINI_API_KEY_STORAGE);
    }
  } catch {
    // Ignore storage quota / privacy mode errors cleanly
  }
}

function createGeminiClient(apiKeyOverride?: string): GoogleGenAI | null {
  const key = (apiKeyOverride ?? getStoredGeminiApiKey()).trim();
  if (!key) return null;
  return new GoogleGenAI({ apiKey: key });
}

function safeParseJson<T>(raw: string | undefined): T | null {
  if (!raw) return null;
  const cleaned = raw
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    return null;
  }
}

function normalizeCategory(raw: string | undefined): FurnitureCategory {
  if (raw && VALID_FURNITURE_CATEGORIES.includes(raw as FurnitureCategory)) {
    return raw as FurnitureCategory;
  }
  return 'storage_cabinet';
}

function normalizeProtectionCategory(
  raw: string | undefined
): ProtectionCategory {
  if (raw && VALID_PROTECTION_CATEGORIES.includes(raw as ProtectionCategory)) {
    return raw as ProtectionCategory;
  }
  return 'window_daylight';
}

function clamp01(val: unknown, fallback = 0.5): number {
  const n = Number(val);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0.02, Math.min(0.98, n));
}

function normalizeRotation(deg: unknown): number {
  const n = Number(deg) || 0;
  const snapped = Math.round(n / 90) * 90;
  return ((snapped % 360) + 360) % 360;
}

/**
 * Converts a URL, dataUrl, or raw base64 string into { mimeType, data } suitable for @google/genai inlineData.
 * Downscales large uploaded photos via Canvas to <=1280px JPEG so Android/Web mobile transfers stay reliable.
 */
export async function imageSourceToInlineData(
  imageSource: string,
  maxDim = 1280
): Promise<{ data: string; mimeType: string }> {
  const trimmed = imageSource.trim();

  // Case 1: Data URL
  if (trimmed.startsWith('data:')) {
    const match = trimmed.match(/^data:([^;]+);base64,(.+)$/);
    if (match) {
      const mimeType = match[1];
      const rawBase64 = match[2];
      // If payload already reasonable size (< ~2MB base64 chars), pass straight through unless PNG mask
      if (rawBase64.length < 2_200_000 || typeof document === 'undefined') {
        return { mimeType, data: rawBase64 };
      }
      // Re-encode oversized camera image via canvas
      const img = await loadImageElement(trimmed);
      return downscaleImageElementToJpeg(img, maxDim);
    }
  }

  // Case 2: Raw base64 passed directly
  if (
    !trimmed.startsWith('http') &&
    !trimmed.startsWith('./') &&
    !trimmed.startsWith('/') &&
    !trimmed.startsWith('blob:') &&
    trimmed.length > 100
  ) {
    const mimeType = trimmed.startsWith('iVBOR') ? 'image/png' : 'image/jpeg';
    return { mimeType, data: trimmed };
  }

  // Case 3: Image URL or Blob URL -> draw onto Canvas to serialize cleanly
  if (typeof document !== 'undefined') {
    try {
      const img = await loadImageElement(trimmed);
      return downscaleImageElementToJpeg(img, maxDim);
    } catch {
      // Fallback to fetch arrayBuffer if Image element fails
    }
  }

  const resp = await fetch(trimmed);
  const blob = await resp.blob();
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read image blob'));
    reader.readAsDataURL(blob);
  });
  const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (m) {
    return { mimeType: m[1], data: m[2] };
  }
  throw new Error('Unsupported image format for Gemini inlineData');
}

function downscaleImageElementToJpeg(
  img: HTMLImageElement,
  maxDim: number
): { data: string; mimeType: string } {
  const natW = img.naturalWidth || 1200;
  const natH = img.naturalHeight || 900;
  const scale = Math.min(1, maxDim / Math.max(natW, natH));
  const w = Math.max(1, Math.round(natW * scale));
  const h = Math.max(1, Math.round(natH * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('2D Canvas context unavailable');
  }
  ctx.drawImage(img, 0, 0, w, h);
  const out = canvas.toDataURL('image/jpeg', 0.88);
  return {
    mimeType: 'image/jpeg',
    data: out.replace(/^data:image\/jpeg;base64,/, ''),
  };
}

/**
 * Renders Feature 7 ProtectionMasks (beams, windows, AC, electrical panels)
 * into a crisp black/white PNG Base64 mask image (white = locked/protected).
 */
export async function renderProtectionMasksToPngBase64(
  masks: ProtectionMask[],
  width = 1024,
  height = 768
): Promise<string> {
  if (typeof document === 'undefined' || masks.length === 0) return '';
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#ffffff';

  for (const mask of masks) {
    if (mask.points.length === 0) continue;
    if (mask.shape === 'brush') {
      ctx.beginPath();
      mask.points.forEach((pt, idx) => {
        const px = pt.x * width;
        const py = pt.y * height;
        if (idx === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.lineWidth = Math.max(20, (mask.brushRadius ?? 0.025) * width * 1.8);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
    } else if (mask.points.length >= 3) {
      ctx.beginPath();
      mask.points.forEach((pt, idx) => {
        const px = pt.x * width;
        const py = pt.y * height;
        if (idx === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.closePath();
      ctx.fill();
    }
  }

  return canvas.toDataURL('image/png');
}

/**
 * Tests connectivity with Google Gemini API using the supplied key (does not persist key).
 */
export async function testGeminiConnection(
  apiKey: string
): Promise<{ ok: boolean; message: string; latencyMs: number }> {
  const trimmed = apiKey.trim();
  const start = performance.now();
  if (!trimmed) {
    return {
      ok: false,
      message: '請先輸入 Gemini API Key。',
      latencyMs: 0,
    };
  }

  try {
    const ai = new GoogleGenAI({ apiKey: trimmed });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: 'Reply with JSON: {"status":"ok"}',
      config: {
        responseMimeType: 'application/json',
        maxOutputTokens: 24,
        temperature: 0,
      },
    });
    const latencyMs = Math.round(performance.now() - start);
    if (response.text) {
      return {
        ok: true,
        message: `連線成功！Gemini 2.5 Flash 已就緒 (${latencyMs}ms)`,
        latencyMs,
      };
    }
    return {
      ok: false,
      message: 'API 有回應但未回傳文字內容，請確認金鑰權限。',
      latencyMs,
    };
  } catch (err) {
    const latencyMs = Math.round(performance.now() - start);
    const msg =
      err instanceof Error ? err.message : '未知網路或金鑰驗證錯誤';
    return {
      ok: false,
      message: `連線驗證失敗：${msg.slice(0, 140)}`,
      latencyMs,
    };
  }
}

export interface SpaceScaleInput {
  roomWidthCm: number;
  roomDepthCm: number;
  ceilingHeightCm?: number;
  pxPerCm: number;
  knownCm?: number;
  presetId?: string;
}

export interface SpaceAnalysisResult {
  source: 'gemini' | 'fallback';
  furniture: FurnitureItem[];
  autoMasks: ProtectionMask[];
  constraints: DesignConstraints;
  rearrangementPlans: RearrangementVariant[];
  ergonomicsNotes: string[];
  walkwayEstimateCm?: number;
  recommendedTvInches?: string;
  errorNote?: string;
}

/**
 * Core Method 1:
 * Uses gemini-2.5-flash (JSON mode) to analyze room photo + calibrated spatial scale + custom user prompt.
 * Extracts existing furniture bboxes & floor coordinates, protected MEP/structural zones,
 * structured design constraints, and 2-3 rearrangement traffic/ergonomic analyses.
 * Gracefully returns fallback data if no API key is configured or on network error.
 */
export async function analyzeSpaceAndConstraints(
  imageBase64: string,
  scaleInfo: ScaleCalibration | SpaceScaleInput,
  customPrompt: string | { promptText: string; selectedTags?: string[] }
): Promise<SpaceAnalysisResult> {
  const promptStr =
    typeof customPrompt === 'string'
      ? customPrompt
      : [customPrompt.promptText, ...(customPrompt.selectedTags || [])]
          .filter(Boolean)
          .join(' / ');

  const parser = new ConstraintParserService(createInitialAiConfig());
  const deterministicConstraints = await parser.parsePromptToConstraints(
    typeof customPrompt === 'string' ? customPrompt : customPrompt.promptText,
    typeof customPrompt === 'string' ? [] : customPrompt.selectedTags || []
  );

  const ai = createGeminiClient();
  if (!ai) {
    return {
      source: 'fallback',
      furniture: [],
      autoMasks: [],
      constraints: deterministicConstraints,
      rearrangementPlans: [],
      ergonomicsNotes: [
        '未設定 Gemini API Key，已自動使用本地物理比例尺與約束解析引擎。',
      ],
    };
  }

  try {
    const imgInline = await imageSourceToInlineData(imageBase64, 1024);

    const systemPrompt = `你是一位擁有台灣室內裝修專業技術人員資格與結構物理知識的資深建築師。
請根據使用者上傳的室內空間照片、已校準之實體尺度資訊，以及客製化設計需求，精準分析空間並嚴格回傳 JSON 格式（所有顯示文字必須使用繁體中文）。

空間校準參數：
- 推算空間寬度: ${scaleInfo.roomWidthCm} cm, 深度: ${scaleInfo.roomDepthCm} cm, 樓高: ${scaleInfo.ceilingHeightCm ?? 275} cm
- 物理比例尺: 1 cm = ${scaleInfo.pxPerCm} px
- 使用者客製化需求: "${promptStr || '無額外特殊需求，維持採光與流暢動線'}"

請輸出嚴格符合以下結構的 JSON 物件：
{
  "furniture": [
    {
      "id": "item_1",
      "name": "繁體中文傢俱名稱",
      "category": "sofa | coffee_table | tv_console | dining_table | bed | wardrobe | accent_chair | cat_tree | floor_lamp | storage_cabinet | rug",
      "bbox": { "x": 0.1, "y": 0.45, "w": 0.3, "h": 0.32 },
      "floorRect": { "xCm": 15, "yCm": 140, "wCm": 210, "dCm": 92, "hCm": 82, "rotationDeg": 90 },
      "locked": false,
      "materialNote": "材質描述"
    }
  ],
  "protectedZones": [
    {
      "id": "mask_1",
      "category": "beam_column | window_daylight | ac_vent | electrical_panel | outlet",
      "label": "例如：對外採光窗面 / 冷氣室內機",
      "points": [{"x":0.3,"y":0.2},{"x":0.6,"y":0.2},{"x":0.6,"y":0.6},{"x":0.3,"y":0.6}],
      "floorZone": { "xCm": 80, "yCm": 0, "wCm": 150, "dCm": 35, "elevationCm": 40, "blocksHighCabinet": true }
    }
  ],
  "constraints": {
    "pets": 0,
    "scratchResistant": false,
    "catPathway": false,
    "maxBudgetTWD": 300000,
    "preserveItems": ["例如：原有實木餐桌"],
    "entrywayDustZone": false,
    "extraStorage": false,
    "accessibilityClearance": false,
    "naturalLightPriority": true,
    "customNotes": ["解析後的設計約束建議"]
  },
  "rearrangementPlans": [
    {
      "code": "A",
      "title": "方案 A：黃金採光動線優化",
      "subtitle": "方案一句重點摘要",
      "rationale": ["調整理由一（說明採光/通風/動線）", "調整理由二（說明避開冷氣與窗戶遮罩）"],
      "score": 94,
      "mepSafe": true,
      "furniture": [ ...同上 furniture 結構但更新建議重排後的 bbox 與 floorRect 座標... ]
    },
    {
      "code": "B",
      "title": "方案 B：開闊多功能配置",
      "subtitle": "重點摘要",
      "rationale": ["調整理由"],
      "score": 89,
      "mepSafe": true,
      "furniture": [ ... ]
    }
  ],
  "ergonomicsAudit": {
    "walkwayMinCm": 88,
    "tvDistanceCm": 245,
    "recommendedTvInches": "55~65 吋",
    "notes": ["主要走道淨寬評估說明", "門片開啟半徑與視聽距離建議"]
  }
}

注意：
1. bbox.x, bbox.y, bbox.w, bbox.h 以及 points[].x/y 必須為 0.0~1.0 的歸一化比例座標。
2. floorRect.xCm, yCm 不可超出 roomWidthCm (${scaleInfo.roomWidthCm}) 與 roomDepthCm (${scaleInfo.roomDepthCm})；rotationDeg 僅能為 0, 90, 180, 270。
3. maxBudgetTWD 若無提及預算則填 null，若有寫「30萬」請換算為 300000。`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        { inlineData: imgInline },
        { text: systemPrompt },
      ],
      config: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    });

    interface RawGeminiSpaceJson {
      furniture?: Array<Record<string, unknown>>;
      protectedZones?: Array<Record<string, unknown>>;
      constraints?: Partial<DesignConstraints>;
      rearrangementPlans?: Array<Record<string, unknown>>;
      ergonomicsAudit?: {
        walkwayMinCm?: number;
        recommendedTvInches?: string;
        notes?: string[];
      };
    }

    const parsed = safeParseJson<RawGeminiSpaceJson>(response.text);
    if (!parsed) {
      throw new Error('Gemini JSON 回應解析失敗');
    }

    const sanitizeFurnitureList = (
      list: Array<Record<string, unknown>> | undefined
    ): FurnitureItem[] => {
      if (!Array.isArray(list)) return [];
      return list.map((raw, idx) => {
        const cat = normalizeCategory(String(raw.category || ''));
        const bboxRaw = (raw.bbox || {}) as Record<string, unknown>;
        const floorRaw = (raw.floorRect || {}) as Record<string, unknown>;
        const x = clamp01(bboxRaw.x, 0.2);
        const y = clamp01(bboxRaw.y, 0.5);
        const w = Math.max(0.05, Math.min(0.85, Number(bboxRaw.w) || 0.22));
        const h = Math.max(0.05, Math.min(0.85, Number(bboxRaw.h) || 0.24));
        const wCm = Math.max(30, Math.min(320, Number(floorRaw.wCm) || 95));
        const dCm = Math.max(30, Math.min(260, Number(floorRaw.dCm) || 80));
        const xCm = Math.max(
          0,
          Math.min(scaleInfo.roomWidthCm - 35, Number(floorRaw.xCm) || 20)
        );
        const yCm = Math.max(
          0,
          Math.min(scaleInfo.roomDepthCm - 35, Number(floorRaw.yCm) || 80)
        );

        return {
          id: String(raw.id || `gem_furn_${idx + 1}`),
          name: String(raw.name || '偵測傢俱'),
          category: cat,
          bbox: { x, y, w, h },
          floorRect: {
            xCm: Math.round(xCm),
            yCm: Math.round(yCm),
            wCm: Math.round(wCm),
            dCm: Math.round(dCm),
            hCm: Math.max(25, Math.min(250, Math.round(Number(floorRaw.hCm) || 80))),
            rotationDeg: normalizeRotation(floorRaw.rotationDeg),
          },
          locked: Boolean(raw.locked),
          color: CATEGORY_COLORS[cat],
          materialNote: raw.materialNote ? String(raw.materialNote) : undefined,
        };
      });
    };

    const furniture = sanitizeFurnitureList(parsed.furniture);

    const autoMasks: ProtectionMask[] = Array.isArray(parsed.protectedZones)
      ? parsed.protectedZones
          .filter((z) => Array.isArray(z.points) && z.points.length >= 3)
          .map((z, idx) => {
            const cat = normalizeProtectionCategory(String(z.category || ''));
            const pts: Point2D[] = (z.points as Array<Record<string, unknown>>).map(
              (pt) => ({
                x: clamp01(pt.x, 0.5),
                y: clamp01(pt.y, 0.3),
              })
            );
            const fz = (z.floorZone || {}) as Record<string, unknown>;
            return {
              id: String(z.id || `gem_mask_${idx + 1}`),
              category: cat,
              label: String(z.label || 'AI 辨識保護區'),
              shape: 'polygon',
              points: pts,
              autoDetected: true,
              floorZone: {
                xCm: Math.max(0, Math.round(Number(fz.xCm) || 60)),
                yCm: Math.max(0, Math.round(Number(fz.yCm) || 0)),
                wCm: Math.max(25, Math.round(Number(fz.wCm) || 110)),
                dCm: Math.max(20, Math.round(Number(fz.dCm) || 35)),
                elevationCm: Math.max(0, Math.round(Number(fz.elevationCm) || 60)),
                blocksHighCabinet: fz.blocksHighCabinet !== false,
              },
            };
          })
      : [];

    const c = parsed.constraints || {};
    const mergedConstraints: DesignConstraints = {
      pets: Number.isFinite(Number(c.pets))
        ? Number(c.pets)
        : deterministicConstraints.pets,
      scratchResistant:
        typeof c.scratchResistant === 'boolean'
          ? c.scratchResistant
          : deterministicConstraints.scratchResistant,
      catPathway:
        typeof c.catPathway === 'boolean'
          ? c.catPathway
          : deterministicConstraints.catPathway,
      maxBudgetTWD:
        c.maxBudgetTWD === null
          ? null
          : Number.isFinite(Number(c.maxBudgetTWD)) && Number(c.maxBudgetTWD) > 0
            ? Math.round(Number(c.maxBudgetTWD))
            : deterministicConstraints.maxBudgetTWD,
      preserveItems:
        Array.isArray(c.preserveItems) && c.preserveItems.length > 0
          ? c.preserveItems.map(String)
          : deterministicConstraints.preserveItems,
      entrywayDustZone:
        typeof c.entrywayDustZone === 'boolean'
          ? c.entrywayDustZone
          : deterministicConstraints.entrywayDustZone,
      extraStorage:
        typeof c.extraStorage === 'boolean'
          ? c.extraStorage
          : deterministicConstraints.extraStorage,
      accessibilityClearance:
        typeof c.accessibilityClearance === 'boolean'
          ? c.accessibilityClearance
          : deterministicConstraints.accessibilityClearance,
      naturalLightPriority:
        typeof c.naturalLightPriority === 'boolean'
          ? c.naturalLightPriority
          : deterministicConstraints.naturalLightPriority,
      customNotes:
        Array.isArray(c.customNotes) && c.customNotes.length > 0
          ? c.customNotes.map(String)
          : deterministicConstraints.customNotes,
    };

    const rearrangementPlans: RearrangementVariant[] = Array.isArray(
      parsed.rearrangementPlans
    )
      ? parsed.rearrangementPlans.slice(0, 3).map((plan, idx) => {
          const codeChar = (['A', 'B', 'C'][idx] || 'A') as 'A' | 'B' | 'C';
          const planFurniture = sanitizeFurnitureList(
            plan.furniture as Array<Record<string, unknown>>
          );
          return {
            id: `gem_var_${codeChar.toLowerCase()}`,
            code: codeChar,
            title: String(plan.title || `Gemini 方案 ${codeChar}`),
            subtitle: String(
              plan.subtitle || '依據採光面與人體工學優化配置'
            ),
            rationale: Array.isArray(plan.rationale)
              ? plan.rationale.map(String)
              : ['依據實際比例尺與保護遮罩最佳化調整動線。'],
            furniture: planFurniture.length > 0 ? planFurniture : furniture,
            score: Math.max(70, Math.min(99, Number(plan.score) || 92 - idx * 4)),
            mepSafe: plan.mepSafe !== false,
          };
        })
      : [];

    return {
      source: 'gemini',
      furniture,
      autoMasks,
      constraints: mergedConstraints,
      rearrangementPlans,
      ergonomicsNotes: parsed.ergonomicsAudit?.notes || [],
      walkwayEstimateCm: parsed.ergonomicsAudit?.walkwayMinCm,
      recommendedTvInches: parsed.ergonomicsAudit?.recommendedTvInches,
    };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.warn('[geminiService] analyzeSpaceAndConstraints fallback:', errMsg);
    return {
      source: 'fallback',
      furniture: [],
      autoMasks: [],
      constraints: deterministicConstraints,
      rearrangementPlans: [],
      ergonomicsNotes: [
        `Gemini 呼叫未完成，已自動降級為本地物理計算 (${errMsg.slice(0, 80)})`,
      ],
      errorNote: errMsg,
    };
  }
}

export interface InteriorRenderPromptParams {
  mode: DesignMode | 'lighting' | 'material_replace';
  styleId?: DesignStyleId;
  styleIntensity?: number;
  rearrangementGoal?: RearrangementGoal;
  variantTitle?: string;
  variantRationale?: string[];
  placedObjectName?: string;
  placedObjectImageUrl?: string | null;
  placedObjectDimensionsCm?: { widthCm: number; depthCm: number; heightCm: number };
  placedZoneLabel?: string;
  placedAnchor?: Point2D;
  lighting?: LightingState;
  appliedMaterials?: AppliedMaterials;
  protectionLabels?: string[];
  customPrompt?: string;
}

export interface InteriorRenderResult {
  source: 'gemini' | 'fallback';
  renderedImageUrl: string | null;
  textNote?: string;
  errorNote?: string;
}

/**
 * Core Method 2:
 * Uses gemini-2.5-flash-image to generate a photorealistic edited afterImage respecting:
 * - Structural & MEP protection mask (maskImageBase64)
 * - Mode: furniture rearrangement, style transfer (0..100%), new object placement synthesis,
 *   lighting & color temperature simulation, or local material inpainting.
 */
export async function generateInteriorRender(
  originalImageBase64: string,
  maskImageBase64: string | null | undefined,
  promptParams: InteriorRenderPromptParams
): Promise<InteriorRenderResult> {
  const ai = createGeminiClient();
  if (!ai) {
    return {
      source: 'fallback',
      renderedImageUrl: null,
      textNote: '未設定 Gemini API Key，已降級使用本地 Canvas 即時合成模擬。',
    };
  }

  try {
    const parts: Array<
      { inlineData: { data: string; mimeType: string } } | { text: string }
    > = [];

    const origInline = await imageSourceToInlineData(originalImageBase64, 1024);
    parts.push({ inlineData: origInline });

    if (maskImageBase64 && maskImageBase64.trim().length > 20) {
      const maskInline = await imageSourceToInlineData(maskImageBase64, 1024);
      parts.push({ inlineData: maskInline });
    }

    if (
      promptParams.mode === 'place_object' &&
      promptParams.placedObjectImageUrl
    ) {
      try {
        const objInline = await imageSourceToInlineData(
          promptParams.placedObjectImageUrl,
          768
        );
        parts.push({ inlineData: objInline });
      } catch {
        // Proceed with descriptive prompt if object image unreadable
      }
    }

    const styleSpec =
      DESIGN_STYLES.find((s) => s.id === promptParams.styleId) || DESIGN_STYLES[0];

    const materialDescriptions = promptParams.appliedMaterials
      ? (Object.entries(promptParams.appliedMaterials) as Array<[string, string | null]>)
          .filter(([, swatchId]) => Boolean(swatchId))
          .map(([surface, swatchId]) => {
            const sw = MATERIAL_SWATCHES.find((m) => m.id === swatchId);
            return sw ? `${surface}: ${sw.name} (${sw.subtitle})` : '';
          })
          .filter(Boolean)
      : [];

    const lightingSummary = promptParams.lighting
      ? `Daylight: ${promptParams.lighting.daylight}, Color temperature: ${promptParams.lighting.kelvin}K, Recessed anti-glare downlights: ${promptParams.lighting.recessedDownlights ? 'ON' : 'OFF'}, Indirect cove LED strip: ${promptParams.lighting.indirectCoveLed ? 'ON' : 'OFF'}, Intensity: ${promptParams.lighting.intensity}%.`
      : '';

    const protectionNote =
      maskImageBase64 && maskImageBase64.trim().length > 20
        ? `STRICT PROTECTION CONSTRAINT: The second reference image is a black-and-white structural/MEP protection mask. Any region painted WHITE in the mask (${promptParams.protectionLabels?.join(', ') || 'windows, beams, columns, AC indoor unit vents, electrical distribution panel'}) MUST remain 100% preserved, unobstructed, and unsealed. NEVER cover windows or block AC units/electrical panels with tall cabinets.`
        : `Preserve all structural beams, exterior windows, daylight openings, AC indoor units, and electrical panels without blocking them.`;

    let taskPrompt = '';
    if (promptParams.mode === 'rearrange') {
      taskPrompt = `TASK: Smart Furniture Rearrangement (維持現有傢俱但最佳化空間重排). Keep the exact camera viewpoint, room architecture, windows, walls, and existing furniture identity, and rearrange the furniture cleanly into an improved ergonomic layout: "${promptParams.variantTitle || '黃金採光與流暢動線配置'}". Design rationale: ${(promptParams.variantRationale || []).join('; ')}. Keep >= 75cm clear walkway.`;
    } else if (promptParams.mode === 'place_object') {
      const dims = promptParams.placedObjectDimensionsCm;
      const anchor = promptParams.placedAnchor;
      taskPrompt = `TASK: New Object Photorealistic Placement & Perspective Synthesis (新增單品去背透視合成). Seamlessly place and integrate the product object ("${promptParams.placedObjectName || 'furniture piece'}"${dims ? `, real physical dimensions ${dims.widthCm}W x ${dims.depthCm}D x ${dims.heightCm}H cm` : ''}) into the original room at ${promptParams.placedZoneLabel || 'recommended floor corner'}${anchor ? ` (normalized image floor contact around x=${anchor.x.toFixed(2)}, y=${anchor.y.toFixed(2)})` : ''}. Match perspective vanishing point, physical scale accurately, ambient occlusion floor shadows, and room light reflections. Do NOT alter existing furniture layout except around the contact floor.`;
    } else if (promptParams.mode === 'lighting') {
      taskPrompt = `TASK: Natural Daylight & Artificial Lighting Simulation (自然採光時段與人工照明色溫模擬). Maintain the exact furniture layout and materials, and relight the room realistically according to: ${lightingSummary}. Render authentic shadows, window sunlight beams (or evening twilight), recessed ceiling light cones, and indirect cove LED glow.`;
    } else if (promptParams.mode === 'material_replace') {
      taskPrompt = `TASK: Local Surface Material Inpainting (局部表面材質精準替換). Keep exact camera geometry, furniture shapes, shadows, and positions unchanged. ONLY replace the requested architectural surface materials cleanly: ${materialDescriptions.length > 0 ? materialDescriptions.join('; ') : 'upgrade floor and main feature wall to refined modern matte finishes'}. ${lightingSummary}`;
    } else {
      const intensity = promptParams.styleIntensity ?? 88;
      taskPrompt = `TASK: Architectural Interior Style Transfer (多元風格轉換). Transform this interior space into "${styleSpec.name} (${styleSpec.nameEn})" style (${styleSpec.tagline}) at transformation intensity ${intensity}% while strictly preserving room perspective, wall geometry, and ceiling height. ${materialDescriptions.length > 0 ? `Applied surface materials: ${materialDescriptions.join('; ')}. ` : ''}${lightingSummary}`;
    }

    const fullPrompt = [
      'You are a photorealistic architectural visualization renderer specializing in realistic Taiwanese apartments.',
      taskPrompt,
      protectionNote,
      promptParams.customPrompt
        ? `User custom constraints: ${promptParams.customPrompt}`
        : '',
      'Output a single cohesive, photorealistic interior design photograph with natural global illumination, clean geometry, zero watermarks, zero UI overlays, and no text annotations.',
    ]
      .filter(Boolean)
      .join('\n\n');

    parts.push({ text: fullPrompt });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: parts,
      config: {
        responseModalities: [Modality.IMAGE, Modality.TEXT],
      },
    });

    const candidateParts = response.candidates?.[0]?.content?.parts || [];
    let generatedDataUrl: string | null = null;
    const textNotes: string[] = [];

    for (const part of candidateParts) {
      if (part.inlineData?.data) {
        const mime = part.inlineData.mimeType || 'image/png';
        generatedDataUrl = `data:${mime};base64,${part.inlineData.data}`;
      } else if (part.text) {
        textNotes.push(part.text);
      }
    }

    if (!generatedDataUrl) {
      return {
        source: 'fallback',
        renderedImageUrl: null,
        errorNote: 'Gemini 影像模型未回傳圖片資料，已自動切換為本地模擬渲染。',
      };
    }

    return {
      source: 'gemini',
      renderedImageUrl: generatedDataUrl,
      textNote: textNotes.join(' ').trim() || undefined,
    };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.warn('[geminiService] generateInteriorRender fallback:', errMsg);
    return {
      source: 'fallback',
      renderedImageUrl: null,
      errorNote: `Gemini 生圖請求失敗，已自動降級為本地模擬 (${errMsg.slice(0, 90)})`,
    };
  }
}

export interface GeminiBomResult {
  source: 'gemini' | 'fallback';
  matchedProducts: MatchedProduct[];
  bomItems: BomLineItem[];
  summaryNote?: string;
  errorNote?: string;
}

/**
 * Core Method 3:
 * Uses gemini-2.5-flash (JSON mode) comparing before/after room images + ping area + budget limit
 * to output Taiwan-market soft-furnishing recommendations (with keyword search links)
 * and itemized rough BOM line items.
 */
export async function generateBomAndShoppingList(
  beforeImageBase64: string,
  afterImageBase64: string | null | undefined,
  areaPing: number,
  budgetLimit: number | null
): Promise<GeminiBomResult> {
  const ai = createGeminiClient();
  if (!ai) {
    return {
      source: 'fallback',
      matchedProducts: [],
      bomItems: [],
      summaryNote: '未設定 Gemini API Key，已使用內建 IKEA / MUJI / 宜得利台灣行情資料庫試算。',
    };
  }

  try {
    const beforeInline = await imageSourceToInlineData(beforeImageBase64, 1024);
    const parts: Array<
      { inlineData: { data: string; mimeType: string } } | { text: string }
    > = [{ inlineData: beforeInline }];

    if (
      afterImageBase64 &&
      afterImageBase64 !== beforeImageBase64 &&
      afterImageBase64.trim().length > 20
    ) {
      try {
        const afterInline = await imageSourceToInlineData(afterImageBase64, 1024);
        parts.push({ inlineData: afterInline });
      } catch {
        // Proceed cleanly with single image
      }
    }

    const prompt = `你是一位專精台灣居家裝潢估價與軟裝採購的設計師，請比對原況圖${afterImageBase64 ? '與模擬設計效果圖' : ''}之表面材質與軟裝差異，並依據以下參數輸出台灣市場行情的 JSON 採購與粗估工程 BOM 表（所有文字一律使用繁體中文）：

- 空間推算地坪：${areaPing} 坪
- 預算上限目標：${budgetLimit ? `NT$ ${budgetLimit.toLocaleString()} 台幣` : '無明確上限，以高性價比實務配置為主'}
- 注意：僅估算表面塗裝、地板鋪設、系統櫃體與軟裝單品，不含基礎泥作/水電/拆除工程。

請嚴格回傳 JSON：
{
  "matchedProducts": [
    {
      "id": "prod_1",
      "brand": "IKEA | 無印良品 MUJI | 宜得利 NITORI | 有情門 | MR. LIVING",
      "name": "繁體中文實體風格相近品名",
      "category": "sofa | coffee_table | tv_console | dining_table | bed | wardrobe | accent_chair | cat_tree | floor_lamp | storage_cabinet | rug",
      "widthCm": 210,
      "depthCm": 90,
      "heightCm": 82,
      "priceTWD": 18900,
      "material": "材質說明（如：防抓貓抓布 / 白橡木）",
      "petFriendly": true,
      "fitScore": 94,
      "targetSlotLabel": "對應空間擺放區（如：主牆沙發位）",
      "colorHex": "#D4C9B9",
      "searchKeyword": "IKEA 燕麥色 三人沙發"
    }
  ],
  "bomItems": [
    {
      "id": "bom_floor_diff",
      "category": "surface_floor | surface_wall | system_cabinet",
      "categoryLabel": "例如：地面表面材鋪設",
      "name": "例如：超耐磨木地板（卡扣連工帶料含收邊）",
      "quantityText": "${areaPing} 坪",
      "unitRateText": "NT$ 4,500~6,200 / 坪",
      "minTWD": 20000,
      "maxTWD": 28000,
      "note": "比對前後圖差異之施工面估算"
    }
  ],
  "summaryNote": "一句話總結與預算分配建議"
}`;

    parts.push({ text: prompt });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: parts,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.25,
      },
    });

    interface RawBomJson {
      matchedProducts?: Array<Record<string, unknown>>;
      bomItems?: Array<Record<string, unknown>>;
      summaryNote?: string;
    }

    const parsed = safeParseJson<RawBomJson>(response.text);
    if (!parsed) {
      throw new Error('Gemini BOM JSON 解析失敗');
    }

    const matchedProducts: MatchedProduct[] = Array.isArray(parsed.matchedProducts)
      ? parsed.matchedProducts.slice(0, 8).map((p, idx) => {
          const brand = String(p.brand || 'IKEA');
          const name = String(p.name || '推薦風格軟裝單品');
          const keyword = String(p.searchKeyword || `${brand} ${name}`);
          const cat = normalizeCategory(String(p.category || 'sofa'));
          return {
            id: String(p.id || `gem_prod_${idx + 1}`),
            brand,
            name,
            category: cat,
            widthCm: Math.max(25, Math.round(Number(p.widthCm) || 80)),
            depthCm: Math.max(25, Math.round(Number(p.depthCm) || 60)),
            heightCm: Math.max(30, Math.round(Number(p.heightCm) || 75)),
            priceTWD: Math.max(500, Math.round(Number(p.priceTWD) || 6900)),
            material: String(p.material || '實木 / 耐磨織物'),
            petFriendly: Boolean(p.petFriendly),
            fitScore: Math.max(70, Math.min(99, Math.round(Number(p.fitScore) || 91))),
            targetSlotLabel: String(p.targetSlotLabel || '模擬圖視覺偵測品項'),
            colorHex: String(p.colorHex || '#C8B9A6'),
            selectedForBom: true,
            urlSlug: buildRetailSearchUrl(brand, keyword),
            searchKeyword: keyword,
            searchUrl: buildRetailSearchUrl(brand, keyword),
          };
        })
      : [];

    const validBomCategories = [
      'surface_wall',
      'surface_floor',
      'system_cabinet',
      'soft_furnishing',
    ] as const;

    const bomItems: BomLineItem[] = Array.isArray(parsed.bomItems)
      ? parsed.bomItems.slice(0, 8).map((b, idx) => {
          const rawCat = String(b.category || 'surface_wall');
          const category = validBomCategories.includes(
            rawCat as (typeof validBomCategories)[number]
          )
            ? (rawCat as BomLineItem['category'])
            : 'surface_wall';
          const minTWD = Math.max(1000, Math.round(Number(b.minTWD) || 8000));
          const maxTWD = Math.max(minTWD, Math.round(Number(b.maxTWD) || minTWD));
          return {
            id: String(b.id || `gem_bom_${idx + 1}`),
            category,
            categoryLabel: String(b.categoryLabel || '表面工程項目'),
            name: String(b.name || '空間表面材質更新'),
            quantityText: String(b.quantityText || `${areaPing} 坪`),
            unitRateText: String(b.unitRateText || '依台灣市場行情估列'),
            minTWD,
            maxTWD,
            note: b.note ? String(b.note) : undefined,
          };
        })
      : [];

    return {
      source: 'gemini',
      matchedProducts,
      bomItems,
      summaryNote: parsed.summaryNote,
    };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.warn('[geminiService] generateBomAndShoppingList fallback:', errMsg);
    return {
      source: 'fallback',
      matchedProducts: [],
      bomItems: [],
      errorNote: `Gemini 預算與選品分析未完成，已降級使用本地台灣行情目錄 (${errMsg.slice(0, 80)})`,
    };
  }
}
