import { useCallback, useEffect, useMemo, useReducer } from 'react';
import {
  BUILT_IN_NEW_OBJECTS,
  DESIGN_STYLES,
  ROOM_PRESETS,
} from '../data/presets';
import { DEFAULT_AI_CONFIG } from '../services/ai/config';
import { ConstraintParserService } from '../services/ai/constraintParser';
import {
  computeBomSummary,
  ProductSearchService,
} from '../services/ai/productSearchService';
import { RenderingService } from '../services/ai/renderingService';
import { VisionService } from '../services/ai/visionService';
import { evaluateErgonomics } from '../services/physics/ergonomicsEngine';
import { computeScaleFromCalibration } from '../services/physics/scaleEngine';
import type {
  AiServiceConfig,
  BomSummary,
  CanvasTool,
  DesignConstraints,
  DesignMode,
  DesignSnapshot,
  DesignStyleId,
  ErgonomicsReport,
  FurnitureItem,
  LayerVisibility,
  LightingState,
  MaterialSurfaceType,
  NewObjectCandidate,
  PlacementZone,
  PlannerDesignState,
  PlannerStoreState,
  Point2D,
  ProtectionCategory,
  ProtectionMask,
  RearrangementGoal,
  RearrangementVariant,
  RoomPreset,
  ScaleCalibration,
  ViewMode,
  WorkflowStep,
} from '../types/planner';
import { removeBackgroundFromImageUrl } from '../utils/imageProcessing';

const INITIAL_CONSTRAINTS: DesignConstraints = {
  pets: 0,
  scratchResistant: false,
  catPathway: false,
  maxBudgetTWD: 300000,
  preserveItems: [],
  entrywayDustZone: false,
  extraStorage: false,
  accessibilityClearance: false,
  naturalLightPriority: true,
  customNotes: [],
};

function createDesignStateFromPreset(preset: RoomPreset): PlannerDesignState {
  return {
    activeRoomId: preset.id,
    roomName: preset.name,
    roomImageUrl: preset.imageUrl,
    calibration: structuredClone(preset.defaultCalibration),
    protectionMasks: structuredClone(preset.autoProtectionMasks),
    doorSwings: structuredClone(preset.doorSwings),
    surfaceRegions: structuredClone(preset.surfaceRegions),
    mode: 'style',
    rearrangementGoal: 'traffic_flow',
    detectedFurniture: structuredClone(preset.detectedFurniture),
    rearrangementVariants: [],
    activeVariantId: null,
    styleId: 'scandinavian',
    styleIntensity: 88,
    newObject: structuredClone(BUILT_IN_NEW_OBJECTS[0]),
    placementZones: [],
    selectedZoneId: null,
    customPlacedPos: null,
    customPlacedScale: 1,
    promptText: '預算上限 30 萬台幣，保持採光通風流暢',
    selectedTags: ['budget_300k'],
    constraints: structuredClone(INITIAL_CONSTRAINTS),
    lighting: {
      daylight: 'east_morning',
      kelvin: 4000,
      recessedDownlights: true,
      indirectCoveLed: false,
      intensity: 80,
    },
    selectedMaterialSurface: 'floor',
    appliedMaterials: {
      floor: null,
      main_wall: null,
      sofa: null,
      curtain: null,
    },
    hasGenerated: false,
    renderedImageUrl: null,
    matchedProducts: [],
  };
}

const initialPreset = ROOM_PRESETS[0];
const initialPresent = createDesignStateFromPreset(initialPreset);

const INITIAL_STORE_STATE: PlannerStoreState = {
  step: 1,
  activeTool: 'select',
  activeMaskCategory: 'window_daylight',
  brushRadiusPx: 26,
  viewMode: 'perspective',
  showBeforeAfter: true,
  beforeAfterRatio: 52,
  theme: 'dark',
  layers: {
    detectedFurniture: true,
    protectionMasks: true,
    perspectiveGrid: false,
    ergonomicCallouts: true,
    lightingOverlay: true,
    materialOverlay: true,
    placedObject: true,
  },
  isProcessing: false,
  processingMessage: '',
  present: initialPresent,
  past: [],
  future: [],
  snapshots: [
    {
      id: 'snap_init',
      label: '原始現況基準 (Baseline)',
      createdAt: new Date().toLocaleTimeString('zh-TW', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      step: 1,
      mode: 'style',
      styleId: 'scandinavian',
      stateDigest: structuredClone(initialPresent),
    },
  ],
  aiConfig: DEFAULT_AI_CONFIG,
};

type Action =
  | { type: 'SET_STEP'; step: WorkflowStep }
  | { type: 'SET_TOOL'; tool: CanvasTool }
  | { type: 'SET_MASK_CATEGORY'; category: ProtectionCategory }
  | { type: 'SET_BRUSH_RADIUS'; radius: number }
  | { type: 'SET_VIEW_MODE'; viewMode: ViewMode }
  | { type: 'SET_BEFORE_AFTER'; show?: boolean; ratio?: number }
  | { type: 'TOGGLE_THEME' }
  | { type: 'TOGGLE_LAYER'; layer: keyof LayerVisibility }
  | { type: 'SET_PROCESSING'; isProcessing: boolean; message?: string }
  | { type: 'UPDATE_AI_CONFIG'; config: Partial<AiServiceConfig> }
  | {
      type: 'MUTATE_DESIGN';
      recordHistory?: boolean;
      updater: (prev: PlannerDesignState) => PlannerDesignState;
    }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'SAVE_SNAPSHOT'; label: string }
  | { type: 'RESTORE_SNAPSHOT'; id: string }
  | { type: 'DELETE_SNAPSHOT'; id: string };

const MAX_HISTORY = 40;

function pushHistory(
  past: PlannerDesignState[],
  current: PlannerDesignState
): PlannerDesignState[] {
  const next = [...past, structuredClone(current)];
  if (next.length > MAX_HISTORY) next.shift();
  return next;
}

function plannerReducer(
  state: PlannerStoreState,
  action: Action
): PlannerStoreState {
  switch (action.type) {
    case 'SET_STEP':
      return {
        ...state,
        step: action.step,
        activeTool: action.step === 1 ? state.activeTool : 'select',
      };
    case 'SET_TOOL':
      return { ...state, activeTool: action.tool };
    case 'SET_MASK_CATEGORY':
      return { ...state, activeMaskCategory: action.category };
    case 'SET_BRUSH_RADIUS':
      return { ...state, brushRadiusPx: action.radius };
    case 'SET_VIEW_MODE':
      return { ...state, viewMode: action.viewMode };
    case 'SET_BEFORE_AFTER':
      return {
        ...state,
        showBeforeAfter: action.show ?? state.showBeforeAfter,
        beforeAfterRatio: action.ratio ?? state.beforeAfterRatio,
      };
    case 'TOGGLE_THEME':
      return {
        ...state,
        theme: state.theme === 'dark' ? 'light' : 'dark',
      };
    case 'TOGGLE_LAYER':
      return {
        ...state,
        layers: {
          ...state.layers,
          [action.layer]: !state.layers[action.layer],
        },
      };
    case 'SET_PROCESSING':
      return {
        ...state,
        isProcessing: action.isProcessing,
        processingMessage: action.message || '',
      };
    case 'UPDATE_AI_CONFIG':
      return {
        ...state,
        aiConfig: { ...state.aiConfig, ...action.config },
      };
    case 'MUTATE_DESIGN': {
      const nextPresent = action.updater(state.present);
      if (action.recordHistory === false) {
        return { ...state, present: nextPresent };
      }
      return {
        ...state,
        past: pushHistory(state.past, state.present),
        present: nextPresent,
        future: [],
      };
    }
    case 'UNDO': {
      if (state.past.length === 0) return state;
      const previous = state.past[state.past.length - 1];
      const newPast = state.past.slice(0, -1);
      return {
        ...state,
        past: newPast,
        present: previous,
        future: [structuredClone(state.present), ...state.future].slice(
          0,
          MAX_HISTORY
        ),
      };
    }
    case 'REDO': {
      if (state.future.length === 0) return state;
      const next = state.future[0];
      const newFuture = state.future.slice(1);
      return {
        ...state,
        past: pushHistory(state.past, state.present),
        present: next,
        future: newFuture,
      };
    }
    case 'SAVE_SNAPSHOT': {
      const snap: DesignSnapshot = {
        id: `snap_${Date.now()}`,
        label: action.label,
        createdAt: new Date().toLocaleTimeString('zh-TW', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
        step: state.step,
        mode: state.present.mode,
        styleId: state.present.styleId,
        stateDigest: structuredClone(state.present),
      };
      return {
        ...state,
        snapshots: [snap, ...state.snapshots],
      };
    }
    case 'RESTORE_SNAPSHOT': {
      const target = state.snapshots.find((s) => s.id === action.id);
      if (!target) return state;
      return {
        ...state,
        step: target.step,
        past: pushHistory(state.past, state.present),
        present: structuredClone(target.stateDigest),
        future: [],
      };
    }
    case 'DELETE_SNAPSHOT':
      return {
        ...state,
        snapshots: state.snapshots.filter((s) => s.id !== action.id),
      };
    default:
      return state;
  }
}

export function usePlannerStore() {
  const [state, dispatch] = useReducer(plannerReducer, INITIAL_STORE_STATE);

  // Sync keyboard Undo/Redo
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          dispatch({ type: 'REDO' });
        } else {
          dispatch({ type: 'UNDO' });
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        dispatch({ type: 'REDO' });
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Derive active furniture list (rearranged variant + newly placed object if applicable)
  const activeFurniture = useMemo<FurnitureItem[]>(() => {
    const p = state.present;
    let base = p.detectedFurniture;
    if (p.mode === 'rearrange' && p.activeVariantId) {
      const variant = p.rearrangementVariants.find(
        (v) => v.id === p.activeVariantId
      );
      if (variant) base = variant.furniture;
    }

    if (p.mode === 'place_object' && p.newObject && p.selectedZoneId) {
      const zone = p.placementZones.find((z) => z.id === p.selectedZoneId);
      if (zone) {
        const placedItem: FurnitureItem = {
          id: `placed_${p.newObject.id}`,
          name: `新增：${p.newObject.name}`,
          category: p.newObject.category,
          bbox: {
            x: (p.customPlacedPos?.x ?? zone.anchor.x) - 0.08,
            y: (p.customPlacedPos?.y ?? zone.anchor.y) - 0.2,
            w: 0.16,
            h: 0.22,
          },
          floorRect: {
            xCm: zone.floorPosCm.xCm,
            yCm: zone.floorPosCm.yCm,
            wCm: p.newObject.widthCm,
            dCm: p.newObject.depthCm,
            hCm: p.newObject.heightCm,
            rotationDeg: zone.floorPosCm.rotationDeg,
          },
          locked: false,
          color: '#d9822b',
          isNewObject: true,
        };
        return [...base, placedItem];
      }
    }
    return base;
  }, [state.present]);

  // Real-time Ergonomics Traffic-Light Report (Feature 6 & 7)
  const ergonomicsReport = useMemo<ErgonomicsReport>(() => {
    return evaluateErgonomics(
      activeFurniture,
      state.present.calibration,
      state.present.protectionMasks,
      state.present.doorSwings,
      state.present.constraints
    );
  }, [
    activeFurniture,
    state.present.calibration,
    state.present.protectionMasks,
    state.present.doorSwings,
    state.present.constraints,
  ]);

  // Real-time BOM & Rough Budget Summary (Feature 11)
  const bomSummary = useMemo<BomSummary>(() => {
    return computeBomSummary({
      calibration: state.present.calibration,
      appliedMaterials: state.present.appliedMaterials,
      lighting: state.present.lighting,
      constraints: state.present.constraints,
      matchedProducts: state.present.matchedProducts,
      mode: state.present.mode,
    });
  }, [
    state.present.calibration,
    state.present.appliedMaterials,
    state.present.lighting,
    state.present.constraints,
    state.present.matchedProducts,
    state.present.mode,
  ]);

  // Actions
  const setStep = useCallback((step: WorkflowStep) => {
    dispatch({ type: 'SET_STEP', step });
  }, []);

  const setTool = useCallback((tool: CanvasTool) => {
    dispatch({ type: 'SET_TOOL', tool });
  }, []);

  const setMaskCategory = useCallback((category: ProtectionCategory) => {
    dispatch({ type: 'SET_MASK_CATEGORY', category });
  }, []);

  const setBrushRadius = useCallback((radius: number) => {
    dispatch({ type: 'SET_BRUSH_RADIUS', radius });
  }, []);

  const setViewMode = useCallback((viewMode: ViewMode) => {
    dispatch({ type: 'SET_VIEW_MODE', viewMode });
  }, []);

  const setBeforeAfter = useCallback((show?: boolean, ratio?: number) => {
    dispatch({ type: 'SET_BEFORE_AFTER', show, ratio });
  }, []);

  const toggleTheme = useCallback(() => {
    dispatch({ type: 'TOGGLE_THEME' });
  }, []);

  const toggleLayer = useCallback((layer: keyof LayerVisibility) => {
    dispatch({ type: 'TOGGLE_LAYER', layer });
  }, []);

  const updateAiConfig = useCallback((config: Partial<AiServiceConfig>) => {
    dispatch({ type: 'UPDATE_AI_CONFIG', config });
  }, []);

  const undo = useCallback(() => dispatch({ type: 'UNDO' }), []);
  const redo = useCallback(() => dispatch({ type: 'REDO' }), []);

  const saveSnapshot = useCallback((label: string) => {
    dispatch({ type: 'SAVE_SNAPSHOT', label });
  }, []);

  const restoreSnapshot = useCallback((id: string) => {
    dispatch({ type: 'RESTORE_SNAPSHOT', id });
  }, []);

  const deleteSnapshot = useCallback((id: string) => {
    dispatch({ type: 'DELETE_SNAPSHOT', id });
  }, []);

  const loadPresetRoom = useCallback((presetId: string) => {
    const preset = ROOM_PRESETS.find((r) => r.id === presetId);
    if (!preset) return;
    const next = createDesignStateFromPreset(preset);
    dispatch({
      type: 'MUTATE_DESIGN',
      updater: () => next,
    });
  }, []);

  const loadUploadedRoom = useCallback(
    async (fileDataUrl: string, fileName: string, w: number, h: number) => {
      dispatch({
        type: 'SET_PROCESSING',
        isProcessing: true,
        message: '正在透過視覺辨識管線解析空間傢俱與機電保護點位...',
      });
      const vision = new VisionService(state.aiConfig);
      const result = await vision.detectRoomElements(fileDataUrl);

      const defaultCal: ScaleCalibration = {
        p1: { x: 0.85, y: 0.16 },
        p2: { x: 0.85, y: 0.88 },
        knownCm: 210,
        presetId: 'door_210',
        imageWidthPx: w,
        imageHeightPx: h,
        pxPerCm: Number(((0.72 * h) / 210).toFixed(2)),
        roomWidthCm: 340,
        roomDepthCm: 420,
        ceilingHeightCm: 275,
        vanishingPoint: { x: 0.5, y: 0.44 },
        horizonY: 0.44,
        showPerspectiveGrid: false,
        calibrated: true,
      };

      dispatch({
        type: 'MUTATE_DESIGN',
        updater: (prev) => ({
          ...prev,
          activeRoomId: `custom_${Date.now()}`,
          roomName: fileName.replace(/\.[^.]+$/, ''),
          roomImageUrl: fileDataUrl,
          calibration: computeScaleFromCalibration(defaultCal),
          protectionMasks: result.autoMasks,
          detectedFurniture: result.furniture,
          doorSwings: [
            {
              id: 'custom_door',
              label: '入口房門開啟半徑 (85cm)',
              hingeXCm: 340,
              hingeYCm: 345,
              radiusCm: 85,
              startAngleDeg: 90,
              endAngleDeg: 180,
            },
          ],
          hasGenerated: false,
          renderedImageUrl: null,
          rearrangementVariants: [],
          activeVariantId: null,
          placementZones: [],
          selectedZoneId: null,
        }),
      });
      dispatch({ type: 'SET_PROCESSING', isProcessing: false });
    },
    [state.aiConfig]
  );

  const updateCalibration = useCallback(
    (
      patch: Partial<ScaleCalibration>,
      recordHistory = true
    ) => {
      dispatch({
        type: 'MUTATE_DESIGN',
        recordHistory,
        updater: (prev) => {
          const basePreset = ROOM_PRESETS.find(
            (r) => r.id === prev.activeRoomId
          );
          const merged = { ...prev.calibration, ...patch };
          const computed = computeScaleFromCalibration(
            merged,
            basePreset?.defaultCalibration.pxPerCm,
            basePreset?.defaultCalibration.roomWidthCm,
            basePreset?.defaultCalibration.roomDepthCm
          );
          return { ...prev, calibration: computed };
        },
      });
    },
    []
  );

  const addProtectionMask = useCallback((mask: ProtectionMask) => {
    dispatch({
      type: 'MUTATE_DESIGN',
      updater: (prev) => ({
        ...prev,
        protectionMasks: [...prev.protectionMasks, mask],
      }),
    });
  }, []);

  const removeProtectionMask = useCallback((id: string) => {
    dispatch({
      type: 'MUTATE_DESIGN',
      updater: (prev) => ({
        ...prev,
        protectionMasks: prev.protectionMasks.filter((m) => m.id !== id),
      }),
    });
  }, []);

  const runAutoDetectProtectionMasks = useCallback(async () => {
    dispatch({
      type: 'SET_PROCESSING',
      isProcessing: true,
      message: 'AI 正在掃描結構樑柱、對外窗戶、冷氣與配電箱...',
    });
    const vision = new VisionService(state.aiConfig);
    const preset = ROOM_PRESETS.find(
      (r) => r.id === state.present.activeRoomId
    );
    const detected = await vision.detectProtectionZones(
      state.present.roomImageUrl,
      preset
    );
    dispatch({
      type: 'MUTATE_DESIGN',
      updater: (prev) => ({
        ...prev,
        protectionMasks: detected,
      }),
    });
    dispatch({ type: 'SET_PROCESSING', isProcessing: false });
  }, [state.aiConfig, state.present.activeRoomId, state.present.roomImageUrl]);

  const setMode = useCallback((mode: DesignMode) => {
    dispatch({
      type: 'MUTATE_DESIGN',
      updater: (prev) => ({ ...prev, mode }),
    });
  }, []);

  const setRearrangementGoal = useCallback((goal: RearrangementGoal) => {
    dispatch({
      type: 'MUTATE_DESIGN',
      updater: (prev) => ({ ...prev, rearrangementGoal: goal }),
    });
  }, []);

  const toggleFurnitureLock = useCallback((id: string) => {
    dispatch({
      type: 'MUTATE_DESIGN',
      updater: (prev) => ({
        ...prev,
        detectedFurniture: prev.detectedFurniture.map((f) =>
          f.id === id ? { ...f, locked: !f.locked } : f
        ),
      }),
    });
  }, []);

  const moveFurnitureFloorPos = useCallback(
    (id: string, xCm: number, yCm: number, recordHistory = false) => {
      dispatch({
        type: 'MUTATE_DESIGN',
        recordHistory,
        updater: (prev) => {
          const clampX = Math.max(0, Math.min(prev.calibration.roomWidthCm - 40, xCm));
          const clampY = Math.max(0, Math.min(prev.calibration.roomDepthCm - 40, yCm));
          const updateList = (list: FurnitureItem[]) =>
            list.map((item) =>
              item.id === id
                ? {
                    ...item,
                    floorRect: {
                      ...item.floorRect,
                      xCm: Math.round(clampX),
                      yCm: Math.round(clampY),
                    },
                  }
                : item
            );
          return {
            ...prev,
            detectedFurniture: updateList(prev.detectedFurniture),
            rearrangementVariants: prev.rearrangementVariants.map((v) =>
              v.id === prev.activeVariantId
                ? { ...v, furniture: updateList(v.furniture) }
                : v
            ),
          };
        },
      });
    },
    []
  );

  const rotateFurnitureFloor = useCallback((id: string) => {
    dispatch({
      type: 'MUTATE_DESIGN',
      updater: (prev) => {
        const rotateList = (list: FurnitureItem[]) =>
          list.map((item) =>
            item.id === id
              ? {
                  ...item,
                  floorRect: {
                    ...item.floorRect,
                    rotationDeg: (item.floorRect.rotationDeg + 90) % 360,
                  },
                }
              : item
          );
        return {
          ...prev,
          detectedFurniture: rotateList(prev.detectedFurniture),
          rearrangementVariants: prev.rearrangementVariants.map((v) =>
            v.id === prev.activeVariantId
              ? { ...v, furniture: rotateList(v.furniture) }
              : v
          ),
        };
      },
    });
  }, []);

  const setStyle = useCallback((styleId: DesignStyleId) => {
    dispatch({
      type: 'MUTATE_DESIGN',
      updater: (prev) => ({ ...prev, styleId }),
    });
  }, []);

  const setStyleIntensity = useCallback(
    (styleIntensity: number, recordHistory = false) => {
      dispatch({
        type: 'MUTATE_DESIGN',
        recordHistory,
        updater: (prev) => ({ ...prev, styleIntensity }),
      });
    },
    []
  );

  const selectNewObject = useCallback(
    async (candidate: NewObjectCandidate) => {
      let cutoutDataUrl = candidate.cutoutDataUrl;
      if (candidate.bgRemoved && !cutoutDataUrl) {
        try {
          cutoutDataUrl = await removeBackgroundFromImageUrl(
            candidate.rawImageUrl,
            candidate.bgThreshold
          );
        } catch {
          cutoutDataUrl = candidate.rawImageUrl;
        }
      }
      dispatch({
        type: 'MUTATE_DESIGN',
        updater: (prev) => ({
          ...prev,
          newObject: { ...candidate, cutoutDataUrl },
          placementZones: [],
          selectedZoneId: null,
          customPlacedPos: null,
        }),
      });
    },
    []
  );

  const updateNewObjectSpecs = useCallback(
    async (patch: Partial<NewObjectCandidate>, recomputeCutout = false) => {
      const curr = state.present.newObject;
      if (!curr) return;
      const merged = { ...curr, ...patch };
      if (recomputeCutout) {
        if (merged.bgRemoved) {
          try {
            merged.cutoutDataUrl = await removeBackgroundFromImageUrl(
              merged.rawImageUrl,
              merged.bgThreshold
            );
          } catch {
            merged.cutoutDataUrl = merged.rawImageUrl;
          }
        } else {
          merged.cutoutDataUrl = null;
        }
      }
      dispatch({
        type: 'MUTATE_DESIGN',
        updater: (prev) => ({ ...prev, newObject: merged }),
      });
    },
    [state.present.newObject]
  );

  const analyzeNewObjectZones = useCallback(async () => {
    if (!state.present.newObject) return;
    dispatch({
      type: 'SET_PROCESSING',
      isProcessing: true,
      message: '依據比例尺與保護區遮罩，計算畸零空間最佳擺放熱區...',
    });
    const renderer = new RenderingService(state.aiConfig);
    const zones = await renderer.analyzePlacementZones({
      newObject: state.present.newObject,
      existingFurniture: state.present.detectedFurniture,
      calibration: state.present.calibration,
      masks: state.present.protectionMasks,
      constraints: state.present.constraints,
    });
    dispatch({
      type: 'MUTATE_DESIGN',
      updater: (prev) => ({
        ...prev,
        placementZones: zones,
        selectedZoneId: zones[0]?.id ?? null,
        customPlacedPos: zones[0]?.anchor ?? null,
      }),
    });
    dispatch({ type: 'SET_PROCESSING', isProcessing: false });
  }, [
    state.aiConfig,
    state.present.newObject,
    state.present.detectedFurniture,
    state.present.calibration,
    state.present.protectionMasks,
    state.present.constraints,
  ]);

  const selectPlacementZone = useCallback((zoneId: string) => {
    dispatch({
      type: 'MUTATE_DESIGN',
      updater: (prev) => {
        const zone = prev.placementZones.find((z) => z.id === zoneId);
        return {
          ...prev,
          selectedZoneId: zoneId,
          customPlacedPos: zone ? { ...zone.anchor } : prev.customPlacedPos,
        };
      },
    });
  }, []);

  const movePlacedObjectCanvas = useCallback(
    (pos: Point2D, recordHistory = false) => {
      dispatch({
        type: 'MUTATE_DESIGN',
        recordHistory,
        updater: (prev) => ({
          ...prev,
          customPlacedPos: {
            x: Math.max(0.08, Math.min(0.92, pos.x)),
            y: Math.max(0.35, Math.min(0.95, pos.y)),
          },
        }),
      });
    },
    []
  );

  const updatePromptAndTags = useCallback(
    (promptText: string, selectedTags: string[]) => {
      dispatch({
        type: 'MUTATE_DESIGN',
        recordHistory: false,
        updater: (prev) => ({ ...prev, promptText, selectedTags }),
      });
    },
    []
  );

  const parseConstraints = useCallback(
    async (promptOverride?: string, tagsOverride?: string[]) => {
      const parser = new ConstraintParserService(state.aiConfig);
      const pText = promptOverride ?? state.present.promptText;
      const tList = tagsOverride ?? state.present.selectedTags;
      const parsed = await parser.parsePromptToConstraints(pText, tList);
      dispatch({
        type: 'MUTATE_DESIGN',
        updater: (prev) => ({
          ...prev,
          promptText: pText,
          selectedTags: tList,
          constraints: parsed,
        }),
      });
      return parsed;
    },
    [state.aiConfig, state.present.promptText, state.present.selectedTags]
  );

  const updateLighting = useCallback((patch: Partial<LightingState>) => {
    dispatch({
      type: 'MUTATE_DESIGN',
      updater: (prev) => ({
        ...prev,
        lighting: { ...prev.lighting, ...patch },
      }),
    });
  }, []);

  const setSelectedMaterialSurface = useCallback(
    (surface: MaterialSurfaceType) => {
      dispatch({
        type: 'MUTATE_DESIGN',
        recordHistory: false,
        updater: (prev) => ({ ...prev, selectedMaterialSurface: surface }),
      });
    },
    []
  );

  const applyMaterialSwatch = useCallback(
    (surface: MaterialSurfaceType, swatchId: string | null) => {
      dispatch({
        type: 'MUTATE_DESIGN',
        updater: (prev) => ({
          ...prev,
          appliedMaterials: {
            ...prev.appliedMaterials,
            [surface]: swatchId,
          },
        }),
      });
    },
    []
  );

  const selectVariant = useCallback((variantId: string) => {
    dispatch({
      type: 'MUTATE_DESIGN',
      updater: (prev) => ({
        ...prev,
        activeVariantId: variantId,
      }),
    });
  }, []);

  const toggleProductInBom = useCallback((productId: string) => {
    dispatch({
      type: 'MUTATE_DESIGN',
      updater: (prev) => ({
        ...prev,
        matchedProducts: prev.matchedProducts.map((p) =>
          p.id === productId ? { ...p, selectedForBom: !p.selectedForBom } : p
        ),
      }),
    });
  }, []);

  /**
   * Master AI Simulation Execution Pipeline (Step 2 -> Step 3)
   */
  const executeSimulationPipeline = useCallback(async () => {
    const p = state.present;
    dispatch({
      type: 'SET_PROCESSING',
      isProcessing: true,
      message:
        p.mode === 'rearrange'
          ? '正在運算 3 組空間重排配置、採光動線與人體工學物理檢核...'
          : p.mode === 'style'
            ? `正在保留透視幾何並渲染「${DESIGN_STYLES.find((s) => s.id === p.styleId)?.name || '北歐簡約'}」模擬圖...`
            : '正在執行物件去背透視合成、光影融合與物理尺度校驗...',
    });

    const parser = new ConstraintParserService(state.aiConfig);
    const parsedConstraints = await parser.parsePromptToConstraints(
      p.promptText,
      p.selectedTags
    );

    const renderer = new RenderingService(state.aiConfig);
    const preset = ROOM_PRESETS.find((r) => r.id === p.activeRoomId);

    let variants: RearrangementVariant[] = p.rearrangementVariants;
    let activeVariantId = p.activeVariantId;
    let renderedImageUrl = p.renderedImageUrl || p.roomImageUrl;
    let placementZones: PlacementZone[] = p.placementZones;
    let selectedZoneId = p.selectedZoneId;
    let newObjPrepared = p.newObject;

    if (p.mode === 'rearrange') {
      variants = await renderer.generateRearrangements({
        baseFurniture: p.detectedFurniture,
        calibration: p.calibration,
        masks: p.protectionMasks,
        constraints: parsedConstraints,
        goal: p.rearrangementGoal,
      });
      activeVariantId = variants[0]?.id ?? null;
      // Also render clean light style refresh or keep room image
      renderedImageUrl = p.roomImageUrl;
    } else if (p.mode === 'style') {
      const styleRes = await renderer.renderStyleTransfer({
        roomImageUrl: p.roomImageUrl,
        preset,
        styleId: p.styleId,
        styleIntensity: p.styleIntensity,
        appliedMaterials: p.appliedMaterials,
      });
      renderedImageUrl = styleRes.renderedImageUrl;
    } else if (p.mode === 'place_object') {
      if (newObjPrepared && newObjPrepared.bgRemoved && !newObjPrepared.cutoutDataUrl) {
        try {
          const cutout = await removeBackgroundFromImageUrl(
            newObjPrepared.rawImageUrl,
            newObjPrepared.bgThreshold
          );
          newObjPrepared = { ...newObjPrepared, cutoutDataUrl: cutout };
        } catch {
          // ignore
        }
      }
      if (newObjPrepared) {
        placementZones = await renderer.analyzePlacementZones({
          newObject: newObjPrepared,
          existingFurniture: p.detectedFurniture,
          calibration: p.calibration,
          masks: p.protectionMasks,
          constraints: parsedConstraints,
        });
        if (!selectedZoneId || !placementZones.some((z) => z.id === selectedZoneId)) {
          selectedZoneId = placementZones[0]?.id ?? null;
        }
      }
      renderedImageUrl = p.roomImageUrl;
    }

    // Visual product matching (Feature 10)
    const searcher = new ProductSearchService();
    const matchedProducts = await searcher.matchProducts({
      furniture:
        p.mode === 'rearrange' && variants[0]
          ? variants[0].furniture
          : p.detectedFurniture,
      newObject: p.mode === 'place_object' ? newObjPrepared : null,
      constraints: parsedConstraints,
      styleId: p.styleId,
    });

    dispatch({
      type: 'MUTATE_DESIGN',
      updater: (prev) => ({
        ...prev,
        constraints: parsedConstraints,
        rearrangementVariants: variants,
        activeVariantId,
        renderedImageUrl,
        newObject: newObjPrepared,
        placementZones,
        selectedZoneId,
        customPlacedPos:
          prev.customPlacedPos ||
          placementZones.find((z) => z.id === selectedZoneId)?.anchor ||
          null,
        matchedProducts,
        hasGenerated: true,
      }),
    });

    // Automatically capture a version snapshot on generation
    const modeLabel =
      p.mode === 'rearrange'
        ? '傢俱重排優化'
        : p.mode === 'style'
          ? `風格轉換：${DESIGN_STYLES.find((s) => s.id === p.styleId)?.name}`
          : `置入單品：${newObjPrepared?.name ?? '新物件'}`;
    dispatch({
      type: 'SAVE_SNAPSHOT',
      label: modeLabel,
    });

    dispatch({
      type: 'SET_VIEW_MODE',
      viewMode: p.mode === 'rearrange' ? 'floorplan' : 'perspective',
    });
    dispatch({ type: 'SET_STEP', step: 3 });
    dispatch({ type: 'SET_PROCESSING', isProcessing: false });
  }, [state.aiConfig, state.present]);

  const refreshStyleRenderLive = useCallback(
    async (nextStyleId: DesignStyleId, nextIntensity: number) => {
      const p = state.present;
      const renderer = new RenderingService(state.aiConfig);
      const preset = ROOM_PRESETS.find((r) => r.id === p.activeRoomId);
      const res = await renderer.renderStyleTransfer({
        roomImageUrl: p.roomImageUrl,
        preset,
        styleId: nextStyleId,
        styleIntensity: nextIntensity,
        appliedMaterials: p.appliedMaterials,
      });
      dispatch({
        type: 'MUTATE_DESIGN',
        recordHistory: false,
        updater: (prev) => ({
          ...prev,
          styleId: nextStyleId,
          styleIntensity: nextIntensity,
          renderedImageUrl: res.renderedImageUrl,
          hasGenerated: true,
        }),
      });
    },
    [state.aiConfig, state.present]
  );

  const runProductVisualSearch = useCallback(async () => {
    dispatch({
      type: 'SET_PROCESSING',
      isProcessing: true,
      message: '正在比對 IKEA / 無印良品 / 宜得利 實體尺寸規格並計算 BOM 預算...',
    });
    const searcher = new ProductSearchService();
    const matched = await searcher.matchProducts({
      furniture: activeFurniture,
      newObject:
        state.present.mode === 'place_object' ? state.present.newObject : null,
      constraints: state.present.constraints,
      styleId: state.present.styleId,
    });
    dispatch({
      type: 'MUTATE_DESIGN',
      updater: (prev) => ({
        ...prev,
        matchedProducts: matched,
      }),
    });
    dispatch({ type: 'SET_PROCESSING', isProcessing: false });
  }, [
    activeFurniture,
    state.present.constraints,
    state.present.mode,
    state.present.newObject,
    state.present.styleId,
  ]);

  return {
    state,
    activeFurniture,
    ergonomicsReport,
    bomSummary,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
    actions: {
      setStep,
      setTool,
      setMaskCategory,
      setBrushRadius,
      setViewMode,
      setBeforeAfter,
      toggleTheme,
      toggleLayer,
      updateAiConfig,
      undo,
      redo,
      saveSnapshot,
      restoreSnapshot,
      deleteSnapshot,
      loadPresetRoom,
      loadUploadedRoom,
      updateCalibration,
      addProtectionMask,
      removeProtectionMask,
      runAutoDetectProtectionMasks,
      setMode,
      setRearrangementGoal,
      toggleFurnitureLock,
      moveFurnitureFloorPos,
      rotateFurnitureFloor,
      setStyle,
      setStyleIntensity,
      selectNewObject,
      updateNewObjectSpecs,
      analyzeNewObjectZones,
      selectPlacementZone,
      movePlacedObjectCanvas,
      updatePromptAndTags,
      parseConstraints,
      updateLighting,
      setSelectedMaterialSurface,
      applyMaterialSwatch,
      selectVariant,
      toggleProductInBom,
      executeSimulationPipeline,
      refreshStyleRenderLive,
      runProductVisualSearch,
    },
  };
}
