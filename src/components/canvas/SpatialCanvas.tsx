import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Check,
  Columns2,
  Eye,
  LayoutGrid,
  Maximize2,
  Move,
  SlidersHorizontal,
  Sparkles,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import {
  MATERIAL_SWATCHES,
  PROTECTION_CATEGORIES,
} from '../../data/presets';
import {
  computePixelLength,
  generatePerspectiveGrid,
} from '../../services/physics/scaleEngine';
import type {
  AppliedMaterials,
  CanvasTool,
  DesignMode,
  DoorSwingArc,
  ErgonomicsReport,
  FurnitureItem,
  LayerVisibility,
  LightingState,
  MaterialSurfaceType,
  NewObjectCandidate,
  PlacementZone,
  Point2D,
  ProtectionCategory,
  ProtectionMask,
  RearrangementVariant,
  ScaleCalibration,
  ViewMode,
  WorkflowStep,
} from '../../types/planner';
import { FloorPlan2D } from './FloorPlan2D';

interface SpatialCanvasProps {
  step: WorkflowStep;
  activeTool: CanvasTool;
  activeMaskCategory: ProtectionCategory;
  brushRadiusPx: number;
  viewMode: ViewMode;
  showBeforeAfter: boolean;
  beforeAfterRatio: number;
  layers: LayerVisibility;
  roomImageUrl: string;
  renderedImageUrl: string | null;
  hasGenerated: boolean;
  mode: DesignMode;
  calibration: ScaleCalibration;
  protectionMasks: ProtectionMask[];
  doorSwings: DoorSwingArc[];
  furniture: FurnitureItem[];
  rearrangementVariants: RearrangementVariant[];
  activeVariantId: string | null;
  lighting: LightingState;
  surfaceRegions: Record<MaterialSurfaceType, Point2D[]>;
  appliedMaterials: AppliedMaterials;
  selectedMaterialSurface: MaterialSurfaceType;
  newObject: NewObjectCandidate | null;
  placementZones: PlacementZone[];
  selectedZoneId: string | null;
  customPlacedPos: Point2D | null;
  ergonomics: ErgonomicsReport;
  isProcessing: boolean;
  processingMessage: string;
  onSetViewMode: (v: ViewMode) => void;
  onSetBeforeAfter: (show?: boolean, ratio?: number) => void;
  onUpdateCalibration: (patch: Partial<ScaleCalibration>, record?: boolean) => void;
  onAddProtectionMask: (mask: ProtectionMask) => void;
  onSelectMaterialSurface: (surface: MaterialSurfaceType) => void;
  onSelectZone: (zoneId: string) => void;
  onMovePlacedObject: (pos: Point2D, record?: boolean) => void;
  onSelectVariant: (id: string) => void;
  onMoveFloorItem: (id: string, xCm: number, yCm: number, commit: boolean) => void;
  onRotateFloorItem: (id: string) => void;
}

const SURFACE_LABELS: Record<MaterialSurfaceType, string> = {
  floor: '地板表面',
  main_wall: '主牆面塗料',
  sofa: '沙發布料',
  curtain: '窗簾布藝',
};

export const SpatialCanvas: React.FC<SpatialCanvasProps> = ({
  step,
  activeTool,
  activeMaskCategory,
  brushRadiusPx,
  viewMode,
  showBeforeAfter,
  beforeAfterRatio,
  layers,
  roomImageUrl,
  renderedImageUrl,
  hasGenerated,
  mode,
  calibration,
  protectionMasks,
  doorSwings,
  furniture,
  rearrangementVariants,
  activeVariantId,
  lighting,
  surfaceRegions,
  appliedMaterials,
  selectedMaterialSurface,
  newObject,
  placementZones,
  selectedZoneId,
  customPlacedPos,
  ergonomics,
  isProcessing,
  processingMessage,
  onSetViewMode,
  onSetBeforeAfter,
  onUpdateCalibration,
  onAddProtectionMask,
  onSelectMaterialSurface,
  onSelectZone,
  onMovePlacedObject,
  onSelectVariant,
  onMoveFloorItem,
  onRotateFloorItem,
}) => {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [cursorNorm, setCursorNorm] = useState<Point2D | null>(null);

  // Interactive tool drag state
  const [dragAction, setDragAction] = useState<
    | null
    | { kind: 'pan'; startX: number; startY: number; origPanX: number; origPanY: number }
    | { kind: 'scale_handle'; which: 'p1' | 'p2' }
    | { kind: 'scale_draw'; p1: Point2D }
    | { kind: 'vanishing' }
    | { kind: 'split_slider' }
    | { kind: 'placed_object' }
    | { kind: 'brush'; points: Point2D[] }
  >(null);

  const [polyDraft, setPolyDraft] = useState<Point2D[]>([]);

  const getNormalizedPoint = useCallback(
    (clientX: number, clientY: number): Point2D => {
      const el = stageRef.current;
      if (!el) return { x: 0.5, y: 0.5 };
      const rect = el.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
      return { x, y };
    },
    []
  );

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (viewMode === 'floorplan') return;
    if (e.ctrlKey || e.metaKey || Math.abs(e.deltaY) > 0) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.08 : 0.08;
      setZoom((z) => Math.max(0.55, Math.min(2.6, Number((z + delta).toFixed(2)))));
    }
  };

  const handleStagePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const pt = getNormalizedPoint(e.clientX, e.clientY);

    // Panning via Pan tool or Middle Mouse Button
    if (activeTool === 'pan' || e.button === 1) {
      e.preventDefault();
      setDragAction({
        kind: 'pan',
        startX: e.clientX,
        startY: e.clientY,
        origPanX: pan.x,
        origPanY: pan.y,
      });
      return;
    }

    if (activeTool === 'scale') {
      setDragAction({ kind: 'scale_draw', p1: pt });
      onUpdateCalibration({ p1: pt, p2: pt }, false);
      return;
    }

    if (activeTool === 'mask_brush') {
      setDragAction({ kind: 'brush', points: [pt] });
      return;
    }

    if (activeTool === 'mask_polygon') {
      // Check if clicking close to first vertex to close polygon
      if (polyDraft.length >= 3) {
        const first = polyDraft[0];
        const dist = Math.hypot(pt.x - first.x, pt.y - first.y);
        if (dist < 0.025) {
          finishPolygonMask(polyDraft);
          return;
        }
      }
      setPolyDraft((prev) => [...prev, pt]);
    }
  };

  const finishPolygonMask = (pts: Point2D[]) => {
    if (pts.length < 3) return;
    const catMeta = PROTECTION_CATEGORIES.find((c) => c.id === activeMaskCategory);
    onAddProtectionMask({
      id: `mask_${Date.now()}`,
      category: activeMaskCategory,
      label: `${catMeta?.label || '保護遮罩'} (自繪)`,
      shape: 'polygon',
      points: pts,
      autoDetected: false,
    });
    setPolyDraft([]);
  };

  const handleViewportPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const pt = getNormalizedPoint(e.clientX, e.clientY);
    setCursorNorm(pt);

    if (!dragAction) return;
    if (dragAction.kind === 'pan') {
      setPan({
        x: dragAction.origPanX + (e.clientX - dragAction.startX),
        y: dragAction.origPanY + (e.clientY - dragAction.startY),
      });
    } else if (dragAction.kind === 'scale_handle') {
      onUpdateCalibration(
        dragAction.which === 'p1' ? { p1: pt } : { p2: pt },
        false
      );
    } else if (dragAction.kind === 'scale_draw') {
      onUpdateCalibration({ p1: dragAction.p1, p2: pt }, false);
    } else if (dragAction.kind === 'vanishing') {
      onUpdateCalibration({ vanishingPoint: pt, horizonY: pt.y }, false);
    } else if (dragAction.kind === 'split_slider') {
      onSetBeforeAfter(true, Math.round(pt.x * 100));
    } else if (dragAction.kind === 'placed_object') {
      onMovePlacedObject(pt, false);
    } else if (dragAction.kind === 'brush') {
      setDragAction((prev) =>
        prev && prev.kind === 'brush'
          ? { ...prev, points: [...prev.points, pt] }
          : prev
      );
    }
  };

  const handleViewportPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragAction) return;
    const pt = getNormalizedPoint(e.clientX, e.clientY);

    if (dragAction.kind === 'scale_handle') {
      onUpdateCalibration(
        dragAction.which === 'p1' ? { p1: pt } : { p2: pt },
        true
      );
    } else if (dragAction.kind === 'scale_draw') {
      onUpdateCalibration({ p1: dragAction.p1, p2: pt }, true);
    } else if (dragAction.kind === 'vanishing') {
      onUpdateCalibration({ vanishingPoint: pt, horizonY: pt.y }, true);
    } else if (dragAction.kind === 'placed_object') {
      onMovePlacedObject(pt, true);
    } else if (dragAction.kind === 'brush') {
      if (dragAction.points.length >= 2) {
        const catMeta = PROTECTION_CATEGORIES.find(
          (c) => c.id === activeMaskCategory
        );
        onAddProtectionMask({
          id: `brush_${Date.now()}`,
          category: activeMaskCategory,
          label: `${catMeta?.label || '保護區'} (筆刷)`,
          shape: 'brush',
          points: dragAction.points,
          brushRadius: brushRadiusPx / 1200,
          autoDetected: false,
        });
      }
    }
    setDragAction(null);
  };

  const perspectiveGrid = useMemo(
    () => generatePerspectiveGrid(calibration),
    [calibration]
  );

  const scalePixelLen = useMemo(
    () =>
      Math.round(
        computePixelLength(
          calibration.p1,
          calibration.p2,
          calibration.imageWidthPx,
          calibration.imageHeightPx
        )
      ),
    [calibration]
  );

  const displayRenderedUrl = renderedImageUrl || roomImageUrl;
  const activeSplitView =
    mode === 'style' &&
    hasGenerated &&
    showBeforeAfter &&
    viewMode === 'perspective' &&
    Boolean(renderedImageUrl);

  const placedPos =
    customPlacedPos ||
    placementZones.find((z) => z.id === selectedZoneId)?.anchor ||
    null;

  const placedZone = placementZones.find((z) => z.id === selectedZoneId);

  // Lighting color tint calculation (Feature 8)
  const kelvinTint =
    lighting.kelvin === 3000
      ? 'rgba(255, 178, 92, 0.24)'
      : lighting.kelvin === 4000
        ? 'rgba(255, 246, 234, 0.06)'
        : 'rgba(196, 224, 255, 0.2)';

  const statusBadgeColor =
    ergonomics.overallStatus === 'pass'
      ? 'var(--status-pass)'
      : ergonomics.overallStatus === 'warn'
        ? 'var(--status-warn)'
        : 'var(--status-fail)';

  const statusBadgeLabel =
    ergonomics.overallStatus === 'pass'
      ? '人體工學・動線綠燈'
      : ergonomics.overallStatus === 'warn'
        ? '動線偏窄黃燈提醒'
        : '紅燈動線 / MEP 衝突警告';

  return (
    <main className="relative flex-1 min-w-0 h-full studio-canvas-bg flex flex-col overflow-hidden select-none">
      {/* Top Floating Viewport Switcher & Status Pill */}
      <div className="no-print absolute top-3 left-3 right-3 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        <div
          className="pointer-events-auto flex items-center gap-1 p-1 rounded-xl border shadow-lg backdrop-blur-md"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--bg-panel) 90%, transparent)',
            borderColor: 'var(--border-strong)',
          }}
        >
          <button
            type="button"
            onClick={() => onSetViewMode('perspective')}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors"
            style={{
              backgroundColor:
                viewMode === 'perspective' ? 'var(--accent-amber)' : 'transparent',
              color:
                viewMode === 'perspective' ? '#ffffff' : 'var(--text-secondary)',
            }}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>透視模擬圖</span>
          </button>
          <button
            type="button"
            onClick={() => onSetViewMode('floorplan')}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors"
            style={{
              backgroundColor:
                viewMode === 'floorplan' ? 'var(--accent-amber)' : 'transparent',
              color:
                viewMode === 'floorplan' ? '#ffffff' : 'var(--text-secondary)',
            }}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>2D 俯視平面圖</span>
          </button>

          {hasGenerated && viewMode === 'perspective' && mode === 'style' && (
            <>
              <div
                className="w-px h-4 mx-1"
                style={{ backgroundColor: 'var(--border-strong)' }}
              />
              <button
                type="button"
                onClick={() => onSetBeforeAfter(!showBeforeAfter)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer"
                style={{
                  backgroundColor: showBeforeAfter
                    ? 'var(--accent-cobalt-soft)'
                    : 'transparent',
                  color: showBeforeAfter
                    ? 'var(--accent-cobalt)'
                    : 'var(--text-secondary)',
                }}
              >
                <Columns2 className="w-3.5 h-3.5" />
                <span>Before / After 對比</span>
              </button>
            </>
          )}
        </div>

        {/* Rearrangement Variant Switcher + Live Ergonomic Traffic-Light Badge */}
        <div className="pointer-events-auto flex items-center gap-2">
          {mode === 'rearrange' && rearrangementVariants.length > 0 && (
            <div
              className="flex items-center gap-1 p-1 rounded-xl border shadow-lg backdrop-blur-md"
              style={{
                backgroundColor:
                  'color-mix(in srgb, var(--bg-panel) 90%, transparent)',
                borderColor: 'var(--border-strong)',
              }}
            >
              {rearrangementVariants.map((v) => {
                const active = v.id === activeVariantId;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => onSelectVariant(v.id)}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer"
                    style={{
                      backgroundColor: active
                        ? 'var(--accent-cobalt)'
                        : 'transparent',
                      color: active ? '#ffffff' : 'var(--text-secondary)',
                    }}
                  >
                    方案 {v.code}
                  </button>
                );
              })}
            </div>
          )}

          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border shadow-lg backdrop-blur-md text-xs font-medium"
            style={{
              backgroundColor:
                'color-mix(in srgb, var(--bg-panel) 92%, transparent)',
              borderColor: 'var(--border-strong)',
            }}
          >
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: statusBadgeColor }}
            />
            <span>{statusBadgeLabel}</span>
            <span
              className="font-mono-cad text-[11px] px-1.5 py-0.5 rounded"
              style={{
                backgroundColor: 'var(--bg-surface)',
                color: 'var(--text-secondary)',
              }}
            >
              走道 {ergonomics.walkwayMinCm}cm
            </span>
          </div>
        </div>
      </div>

      {/* Polygon Drawing Helper Pill */}
      {activeTool === 'mask_polygon' && (
        <div
          className="no-print absolute top-16 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full border shadow-lg text-xs"
          style={{
            backgroundColor: 'var(--bg-panel)',
            borderColor: 'var(--accent-amber)',
          }}
        >
          <span>
            多邊形遮罩模式：點擊畫面新增頂點（已標記 {polyDraft.length} 點）
          </span>
          {polyDraft.length >= 3 && (
            <button
              type="button"
              onClick={() => finishPolygonMask(polyDraft)}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-white font-medium cursor-pointer"
              style={{ backgroundColor: 'var(--status-pass)' }}
            >
              <Check className="w-3 h-3" />
              閉合完成
            </button>
          )}
          {polyDraft.length > 0 && (
            <button
              type="button"
              onClick={() => setPolyDraft([])}
              className="text-xs underline cursor-pointer"
              style={{ color: 'var(--text-muted)' }}
            >
              取消
            </button>
          )}
        </div>
      )}

      {/* Main Viewport: Either Perspective Photo Studio OR Interactive 2D CAD FloorPlan */}
      {viewMode === 'floorplan' ? (
        <div className="flex-1 min-h-0 pt-12 pb-9">
          <FloorPlan2D
            calibration={calibration}
            furniture={furniture}
            protectionMasks={protectionMasks}
            doorSwings={doorSwings}
            ergonomics={ergonomics}
            onMoveItem={onMoveFloorItem}
            onRotateItem={onRotateFloorItem}
          />
        </div>
      ) : (
        <div
          className="flex-1 min-h-0 flex items-center justify-center p-6 pt-16 pb-12 overflow-hidden"
          onWheel={handleWheel}
          onPointerMove={handleViewportPointerMove}
          onPointerUp={handleViewportPointerUp}
          onPointerLeave={() => {
            setCursorNorm(null);
            if (dragAction) setDragAction(null);
          }}
          style={{
            cursor:
              activeTool === 'pan'
                ? 'grab'
                : activeTool === 'scale' || activeTool === 'mask_polygon'
                  ? 'crosshair'
                  : activeTool === 'mask_brush'
                    ? 'cell'
                    : 'default',
          }}
        >
          {/* Scalable & Pannable 4:3 Stage */}
          <div
            ref={stageRef}
            onPointerDown={handleStagePointerDown}
            onDoubleClick={() => {
              if (activeTool === 'mask_polygon' && polyDraft.length >= 3) {
                finishPolygonMask(polyDraft);
              }
            }}
            className="relative w-full max-w-[920px] aspect-[4/3] rounded-xl overflow-hidden shadow-2xl border touch-none"
            style={{
              borderColor: 'var(--border-strong)',
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: 'center center',
            }}
          >
            {/* 1. Base Original Room Image */}
            <img
              src={roomImageUrl}
              alt="現況室內照片"
              draggable={false}
              className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            />

            {/* 2. Rendered Simulation Layer (clipped by Before/After slider if active) */}
            {hasGenerated && (
              <div
                className="absolute inset-0 overflow-hidden pointer-events-none"
                style={{
                  clipPath: activeSplitView
                    ? `inset(0 0 0 ${beforeAfterRatio}%)`
                    : undefined,
                }}
              >
                <img
                  src={displayRenderedUrl}
                  alt="AI 空間模擬效果"
                  draggable={false}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* 3. Local Material Inpainting SVG Overlay (Feature 9) */}
            {layers.materialOverlay && (
              <svg
                viewBox="0 0 1000 750"
                preserveAspectRatio="none"
                className="absolute inset-0 w-full h-full"
                style={{
                  pointerEvents:
                    activeTool === 'material_pick' || step === 3
                      ? 'auto'
                      : 'none',
                }}
              >
                <defs>
                  {/* Procedural Material Patterns */}
                  <pattern
                    id="mat_oak_plank"
                    width="60"
                    height="18"
                    patternUnits="userSpaceOnUse"
                  >
                    <rect width="60" height="18" fill="#C9A87C" />
                    <line
                      x1="0"
                      y1="0"
                      x2="60"
                      y2="0"
                      stroke="rgba(90,55,25,0.32)"
                      strokeWidth="1.2"
                    />
                    <line
                      x1="30"
                      y1="0"
                      x2="30"
                      y2="18"
                      stroke="rgba(90,55,25,0.22)"
                      strokeWidth="1"
                    />
                  </pattern>
                  <pattern
                    id="mat_herringbone_walnut"
                    width="24"
                    height="24"
                    patternUnits="userSpaceOnUse"
                    patternTransform="rotate(45)"
                  >
                    <rect width="24" height="24" fill="#8E6443" />
                    <path
                      d="M0 12 H24 M12 0 V24"
                      stroke="rgba(45,24,10,0.38)"
                      strokeWidth="1.2"
                    />
                  </pattern>
                  <pattern
                    id="mat_microcement"
                    width="40"
                    height="40"
                    patternUnits="userSpaceOnUse"
                  >
                    <rect width="40" height="40" fill="#A7A39A" />
                    <circle cx="8" cy="12" r="1.2" fill="rgba(255,255,255,0.2)" />
                    <circle cx="26" cy="30" r="1.5" fill="rgba(40,40,40,0.15)" />
                  </pattern>
                  <pattern
                    id="mat_terrazzo"
                    width="36"
                    height="36"
                    patternUnits="userSpaceOnUse"
                  >
                    <rect width="36" height="36" fill="#C7C5C0" />
                    <polygon points="6,8 11,10 8,14" fill="#7D7870" />
                    <polygon points="22,6 27,9 24,12" fill="#A88A64" />
                    <polygon points="15,24 20,22 19,28" fill="#5F6368" />
                    <polygon points="28,25 32,28 27,31" fill="#ECEAE4" />
                  </pattern>
                  <pattern
                    id="mat_linen_sheer"
                    width="14"
                    height="20"
                    patternUnits="userSpaceOnUse"
                  >
                    <rect width="14" height="20" fill="#F3EFE7" />
                    <line
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="20"
                      stroke="rgba(160,150,135,0.35)"
                      strokeWidth="2"
                    />
                  </pattern>
                </defs>

                {(
                  Object.keys(surfaceRegions) as MaterialSurfaceType[]
                ).map((surface) => {
                  const pts = surfaceRegions[surface];
                  if (!pts || pts.length < 3) return null;
                  const swatchId = appliedMaterials[surface];
                  const swatch = MATERIAL_SWATCHES.find(
                    (s) => s.id === swatchId
                  );
                  const polyPoints = pts
                    .map((p) => `${p.x * 1000},${p.y * 750}`)
                    .join(' ');
                  const isInteractive =
                    activeTool === 'material_pick' ||
                    (step === 3 && activeTool === 'select');
                  const isSelectedSurf = selectedMaterialSurface === surface;

                  let fillValue = 'transparent';
                  if (swatch) {
                    if (
                      swatch.patternType === 'oak_plank' ||
                      swatch.patternType === 'herringbone_walnut' ||
                      swatch.patternType === 'microcement' ||
                      swatch.patternType === 'terrazzo' ||
                      swatch.patternType === 'linen_sheer'
                    ) {
                      fillValue = `url(#mat_${swatch.patternType})`;
                    } else {
                      fillValue = swatch.colorHex;
                    }
                  }

                  return (
                    <polygon
                      key={surface}
                      points={polyPoints}
                      fill={fillValue}
                      fillOpacity={swatch ? 0.52 : 0}
                      style={{
                        mixBlendMode: swatch ? 'multiply' : 'normal',
                        cursor: isInteractive ? 'pointer' : 'default',
                      }}
                      stroke={
                        activeTool === 'material_pick' && isSelectedSurf
                          ? '#38bdf8'
                          : activeTool === 'material_pick'
                            ? 'rgba(255,255,255,0.45)'
                            : 'none'
                      }
                      strokeWidth={isSelectedSurf ? 3 : 1.5}
                      strokeDasharray={isSelectedSurf ? '6 4' : undefined}
                      onClick={(e) => {
                        if (!isInteractive) return;
                        e.stopPropagation();
                        onSelectMaterialSurface(surface);
                      }}
                    >
                      <title>{SURFACE_LABELS[surface]}</title>
                    </polygon>
                  );
                })}
              </svg>
            )}

            {/* 4. Natural Daylight & Artificial Lighting Simulation Layer (Feature 8) */}
            {layers.lightingOverlay && (
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {/* Daylight directional atmosphere */}
                {lighting.daylight === 'east_morning' && (
                  <div
                    className="absolute inset-0"
                    style={{
                      background:
                        'linear-gradient(125deg, rgba(255,232,179,0.22) 0%, rgba(255,214,138,0.12) 45%, rgba(20,30,50,0.06) 100%)',
                      mixBlendMode: 'screen',
                    }}
                  />
                )}
                {lighting.daylight === 'west_afternoon' && (
                  <div
                    className="absolute inset-0"
                    style={{
                      background:
                        'linear-gradient(235deg, rgba(255,154,68,0.28) 0%, rgba(255,190,118,0.14) 50%, rgba(30,20,25,0.12) 100%)',
                      mixBlendMode: 'soft-light',
                    }}
                  />
                )}
                {lighting.daylight === 'north_soft' && (
                  <div
                    className="absolute inset-0"
                    style={{
                      background:
                        'linear-gradient(180deg, rgba(215,232,255,0.16) 0%, rgba(230,240,255,0.06) 100%)',
                      mixBlendMode: 'soft-light',
                    }}
                  />
                )}
                {lighting.daylight === 'night' && (
                  <div
                    className="absolute inset-0"
                    style={{
                      background:
                        'radial-gradient(circle at 50% 42%, rgba(16,22,36,0.25) 0%, rgba(8,12,24,0.62) 100%)',
                    }}
                  />
                )}

                {/* Artificial Kelvin Color Temperature Shift */}
                <div
                  className="absolute inset-0 transition-colors duration-300"
                  style={{
                    backgroundColor: kelvinTint,
                    opacity: (lighting.intensity / 100) * 0.9,
                    mixBlendMode: 'soft-light',
                  }}
                />

                {/* Recessed Ceiling Downlight Cones */}
                {lighting.recessedDownlights && (
                  <div
                    className="absolute inset-0"
                    style={{
                      opacity: (lighting.intensity / 100) * 0.85,
                      background: `
                        radial-gradient(ellipse 14% 26% at 25% 18%, ${
                          lighting.kelvin === 3000
                            ? 'rgba(255,205,130,0.52)'
                            : lighting.kelvin === 4000
                              ? 'rgba(255,244,225,0.45)'
                              : 'rgba(225,240,255,0.45)'
                        } 0%, transparent 72%),
                        radial-gradient(ellipse 14% 26% at 74% 18%, ${
                          lighting.kelvin === 3000
                            ? 'rgba(255,205,130,0.52)'
                            : lighting.kelvin === 4000
                              ? 'rgba(255,244,225,0.45)'
                              : 'rgba(225,240,255,0.45)'
                        } 0%, transparent 72%),
                        radial-gradient(ellipse 16% 24% at 50% 14%, ${
                          lighting.kelvin === 3000
                            ? 'rgba(255,205,130,0.42)'
                            : 'rgba(255,248,238,0.35)'
                        } 0%, transparent 72%)
                      `,
                      mixBlendMode: 'screen',
                    }}
                  />
                )}

                {/* Indirect Cove LED Strip Glow */}
                {lighting.indirectCoveLed && (
                  <div
                    className="absolute inset-x-0 top-0 h-[28%]"
                    style={{
                      opacity: (lighting.intensity / 100) * 0.9,
                      background: `linear-gradient(180deg, ${
                        lighting.kelvin === 3000
                          ? 'rgba(255,180,90,0.46)'
                          : lighting.kelvin === 4000
                            ? 'rgba(255,235,200,0.36)'
                            : 'rgba(210,234,255,0.36)'
                      } 0%, transparent 100%)`,
                      mixBlendMode: 'screen',
                    }}
                  />
                )}
              </div>
            )}

            {/* 5. New Object Smart Placement Highlight Zones & Synthesized Object (Feature 3) */}
            {mode === 'place_object' && layers.placedObject && (
              <>
                {/* Highlight Placement Zones */}
                {placementZones.map((zone) => {
                  const isSel = zone.id === selectedZoneId;
                  return (
                    <button
                      key={zone.id}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectZone(zone.id);
                      }}
                      className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all group z-10"
                      style={{
                        left: `${zone.anchor.x * 100}%`,
                        top: `${zone.anchor.y * 100}%`,
                      }}
                    >
                      <div
                        className="w-16 h-9 rounded-[50%] border-2 flex items-center justify-center shadow-lg transition-transform group-hover:scale-110"
                        style={{
                          borderColor: !zone.mepClear
                            ? '#e04f5f'
                            : isSel
                              ? '#d9822b'
                              : '#38bdf8',
                          backgroundColor: !zone.mepClear
                            ? 'rgba(224,79,95,0.25)'
                            : isSel
                              ? 'rgba(217,130,43,0.32)'
                              : 'rgba(56,189,248,0.22)',
                        }}
                      >
                        <span className="text-[10px] font-mono-cad font-bold text-white drop-shadow">
                          {zone.suitabilityScore}%
                        </span>
                      </div>
                      <div
                        className="mt-1 px-2 py-0.5 rounded text-[10px] font-medium whitespace-nowrap text-white shadow"
                        style={{
                          backgroundColor: !zone.mepClear
                            ? 'rgba(224,79,95,0.92)'
                            : isSel
                              ? 'rgba(217,130,43,0.95)'
                              : 'rgba(15,23,42,0.85)',
                        }}
                      >
                        {zone.label.split('｜')[0]}
                      </div>
                    </button>
                  );
                })}

                {/* Synthesized Background-Removed Cutout Object */}
                {newObject && placedPos && (
                  <div
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      setDragAction({ kind: 'placed_object' });
                    }}
                    title="拖曳微調擺放位置"
                    className="absolute -translate-x-1/2 -translate-y-full cursor-move z-10 group"
                    style={{
                      left: `${placedPos.x * 100}%`,
                      top: `${placedPos.y * 100}%`,
                      width: `${Math.max(
                        11,
                        Math.min(
                          32,
                          (newObject.widthCm / 320) *
                            100 *
                            (placedZone?.scaleFactor ?? 0.85) *
                            (0.65 + placedPos.y * 0.55)
                        )
                      )}%`,
                    }}
                  >
                    {/* Realistic ambient occlusion contact shadow */}
                    <div
                      className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-[82%] h-5 rounded-[50%] pointer-events-none"
                      style={{
                        background:
                          'radial-gradient(ellipse at center, rgba(0,0,0,0.52) 0%, rgba(0,0,0,0) 72%)',
                      }}
                    />
                    <img
                      src={newObject.cutoutDataUrl || newObject.rawImageUrl}
                      alt={newObject.name}
                      draggable={false}
                      className="relative w-full h-auto object-contain drop-shadow-[0_10px_14px_rgba(0,0,0,0.32)]"
                      style={{
                        filter:
                          lighting.kelvin === 3000
                            ? 'sepia(0.14) brightness(0.98)'
                            : lighting.kelvin === 6000
                              ? 'hue-rotate(-4deg) brightness(1.03)'
                              : undefined,
                      }}
                    />
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-6 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-black/80 text-white text-[10px] whitespace-nowrap flex items-center gap-1 pointer-events-none">
                      <Move className="w-2.5 h-2.5" />
                      拖曳微調位置 ({newObject.widthCm}×{newObject.depthCm}cm)
                    </div>
                  </div>
                )}
              </>
            )}

            {/* 6. SVG CAD Overlay: Perspective Grid + Protection Masks + Detected Furniture + Scale Ruler */}
            <svg
              viewBox="0 0 1000 750"
              preserveAspectRatio="none"
              className="absolute inset-0 w-full h-full pointer-events-none"
            >
              <defs>
                {PROTECTION_CATEGORIES.map((cat) => (
                  <pattern
                    key={cat.id}
                    id={`hatch_${cat.id}`}
                    width="12"
                    height="12"
                    patternTransform="rotate(45)"
                    patternUnits="userSpaceOnUse"
                  >
                    <rect width="12" height="12" fill={cat.bgAlpha} />
                    <line
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="12"
                      stroke={cat.color}
                      strokeWidth="2.5"
                      strokeOpacity="0.7"
                    />
                  </pattern>
                ))}
              </defs>

              {/* 3D Perspective Grid (Feature 5) */}
              {calibration.showPerspectiveGrid && (
                <g>
                  {perspectiveGrid.convergingRays.map((ray, idx) => (
                    <line
                      key={`ray_${idx}`}
                      x1={ray.x1 * 1000}
                      y1={ray.y1 * 750}
                      x2={ray.x2 * 1000}
                      y2={ray.y2 * 750}
                      stroke="#38bdf8"
                      strokeWidth="1.1"
                      strokeOpacity="0.55"
                      strokeDasharray="5 4"
                    />
                  ))}
                  {perspectiveGrid.horizontalLines.map((hl, idx) => (
                    <g key={`hl_${idx}`}>
                      <line
                        x1={hl.x1 * 1000}
                        y1={hl.y1 * 750}
                        x2={hl.x2 * 1000}
                        y2={hl.y2 * 750}
                        stroke="#38bdf8"
                        strokeWidth="1"
                        strokeOpacity="0.45"
                      />
                      <text
                        x={16}
                        y={hl.y1 * 750 - 4}
                        fill="#7dd3fc"
                        fontSize="11"
                        className="font-mono-cad"
                      >
                        {hl.depthCm}cm
                      </text>
                    </g>
                  ))}
                  {/* Draggable Vanishing Point */}
                  <g
                    className="pointer-events-auto cursor-move"
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      setDragAction({ kind: 'vanishing' });
                    }}
                  >
                    <circle
                      cx={calibration.vanishingPoint.x * 1000}
                      cy={calibration.vanishingPoint.y * 750}
                      r="9"
                      fill="rgba(56, 189, 248, 0.25)"
                      stroke="#38bdf8"
                      strokeWidth="2"
                    />
                    <circle
                      cx={calibration.vanishingPoint.x * 1000}
                      cy={calibration.vanishingPoint.y * 750}
                      r="3"
                      fill="#ffffff"
                    />
                    <text
                      x={calibration.vanishingPoint.x * 1000 + 14}
                      y={calibration.vanishingPoint.y * 750 + 4}
                      fill="#7dd3fc"
                      fontSize="11"
                      fontWeight="600"
                    >
                      透視消失點 (VP)
                    </text>
                  </g>
                </g>
              )}

              {/* Protection Masks (Feature 7) */}
              {layers.protectionMasks &&
                protectionMasks.map((mask) => {
                  const catMeta = PROTECTION_CATEGORIES.find(
                    (c) => c.id === mask.category
                  );
                  const col = catMeta?.color || '#f59e0b';
                  if (mask.shape === 'brush') {
                    const d = mask.points
                      .map(
                        (p, i) =>
                          `${i === 0 ? 'M' : 'L'} ${p.x * 1000} ${p.y * 750}`
                      )
                      .join(' ');
                    return (
                      <g key={mask.id}>
                        <path
                          d={d}
                          fill="none"
                          stroke={col}
                          strokeOpacity="0.45"
                          strokeWidth={(mask.brushRadius ?? 0.025) * 1800}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </g>
                    );
                  }
                  const ptsStr = mask.points
                    .map((p) => `${p.x * 1000},${p.y * 750}`)
                    .join(' ');
                  const cx =
                    (mask.points.reduce((s, p) => s + p.x, 0) /
                      Math.max(1, mask.points.length)) *
                    1000;
                  const cy =
                    (mask.points.reduce((s, p) => s + p.y, 0) /
                      Math.max(1, mask.points.length)) *
                    750;
                  return (
                    <g key={mask.id}>
                      <polygon
                        points={ptsStr}
                        fill={`url(#hatch_${mask.category})`}
                        stroke={col}
                        strokeWidth="1.8"
                        strokeDasharray="6 3"
                      />
                      <rect
                        x={cx - 56}
                        y={cy - 11}
                        width="112"
                        height="20"
                        rx="4"
                        fill="rgba(15, 23, 42, 0.85)"
                        stroke={col}
                        strokeWidth="1"
                      />
                      <text
                        x={cx}
                        y={cy + 3}
                        textAnchor="middle"
                        fill="#ffffff"
                        fontSize="10.5"
                        fontWeight="600"
                      >
                        🔒 {mask.label.slice(0, 10)}
                      </text>
                    </g>
                  );
                })}

              {/* Active Brush Stroke Preview */}
              {dragAction?.kind === 'brush' && dragAction.points.length > 1 && (
                <path
                  d={dragAction.points
                    .map(
                      (p, i) =>
                        `${i === 0 ? 'M' : 'L'} ${p.x * 1000} ${p.y * 750}`
                    )
                    .join(' ')}
                  fill="none"
                  stroke="#f59e0b"
                  strokeOpacity="0.55"
                  strokeWidth={brushRadiusPx * 1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Active Polygon Draft Preview */}
              {polyDraft.length > 0 && (
                <g>
                  <polyline
                    points={polyDraft
                      .map((p) => `${p.x * 1000},${p.y * 750}`)
                      .join(' ')}
                    fill="rgba(217, 130, 43, 0.18)"
                    stroke="#d9822b"
                    strokeWidth="2"
                    strokeDasharray="4 3"
                  />
                  {polyDraft.map((p, idx) => (
                    <circle
                      key={idx}
                      cx={p.x * 1000}
                      cy={p.y * 750}
                      r={idx === 0 ? 6 : 4}
                      fill={idx === 0 ? '#18a974' : '#d9822b'}
                      stroke="#ffffff"
                      strokeWidth="1.5"
                    />
                  ))}
                </g>
              )}

              {/* Detected Furniture CAD Callout Brackets (Step 1, 2, 4) */}
              {layers.detectedFurniture &&
                (step === 1 || step === 2 || step === 4) &&
                furniture.map((item) => {
                  const x = item.bbox.x * 1000;
                  const y = item.bbox.y * 750;
                  const w = item.bbox.w * 1000;
                  const h = item.bbox.h * 750;
                  const cLen = 14;
                  const strokeCol = item.locked
                    ? '#d9822b'
                    : step === 4
                      ? '#10b981'
                      : '#60a5fa';
                  return (
                    <g key={item.id}>
                      {/* Corner CAD brackets */}
                      <path
                        d={`
                          M ${x} ${y + cLen} V ${y} H ${x + cLen}
                          M ${x + w - cLen} ${y} H ${x + w} V ${y + cLen}
                          M ${x} ${y + h - cLen} V ${y + h} H ${x + cLen}
                          M ${x + w - cLen} ${y + h} H ${x + w} V ${y + h - cLen}
                        `}
                        fill="none"
                        stroke={strokeCol}
                        strokeWidth="2.4"
                      />
                      <rect
                        x={x}
                        y={Math.max(4, y - 22)}
                        width={Math.min(220, item.name.length * 10.5 + 78)}
                        height="20"
                        rx="4"
                        fill="rgba(15, 23, 42, 0.9)"
                        stroke={strokeCol}
                        strokeWidth="1"
                      />
                      <text
                        x={x + 7}
                        y={Math.max(17, y - 9)}
                        fill="#f8fafc"
                        fontSize="10.5"
                        fontWeight="600"
                      >
                        {item.locked ? '🔒 ' : ''}
                        {item.name.slice(0, 12)} · {item.floorRect.wCm}×
                        {item.floorRect.dCm}cm
                      </text>
                    </g>
                  );
                })}

              {/* Scale Calibration Ruler (Feature 5) */}
              {(step === 1 || activeTool === 'scale' || layers.ergonomicCallouts) && (
                <g>
                  <line
                    x1={calibration.p1.x * 1000}
                    y1={calibration.p1.y * 750}
                    x2={calibration.p2.x * 1000}
                    y2={calibration.p2.y * 750}
                    stroke="#3b82f6"
                    strokeWidth="2.6"
                  />
                  {/* Dimension Label Pill */}
                  <g
                    transform={`translate(${
                      ((calibration.p1.x + calibration.p2.x) / 2) * 1000 - 68
                    }, ${
                      ((calibration.p1.y + calibration.p2.y) / 2) * 750 - 12
                    })`}
                  >
                    <rect
                      width="136"
                      height="24"
                      rx="5"
                      fill="rgba(30, 58, 138, 0.92)"
                      stroke="#60a5fa"
                      strokeWidth="1.2"
                    />
                    <text
                      x="68"
                      y="16"
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="11"
                      className="font-mono-cad"
                      fontWeight="600"
                    >
                      {calibration.knownCm}cm ({scalePixelLen}px)
                    </text>
                  </g>
                  {/* Draggable Endpoint Handles */}
                  {(['p1', 'p2'] as const).map((which) => {
                    const pt = calibration[which];
                    return (
                      <g
                        key={which}
                        className="pointer-events-auto cursor-grab"
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          setDragAction({ kind: 'scale_handle', which });
                        }}
                      >
                        <circle
                          cx={pt.x * 1000}
                          cy={pt.y * 750}
                          r="10"
                          fill="rgba(59, 130, 246, 0.35)"
                          stroke="#93c5fd"
                          strokeWidth="2"
                        />
                        <circle
                          cx={pt.x * 1000}
                          cy={pt.y * 750}
                          r="3.5"
                          fill="#ffffff"
                        />
                      </g>
                    );
                  })}
                </g>
              )}
            </svg>

            {/* 7. Before / After Interactive Split Divider Handle (Feature 2) */}
            {activeSplitView && (
              <div
                onPointerDown={(e) => {
                  e.stopPropagation();
                  setDragAction({ kind: 'split_slider' });
                }}
                className="absolute inset-y-0 z-20 w-0.5 bg-white shadow-[0_0_8px_rgba(0,0,0,0.8)] cursor-ew-resize"
                style={{ left: `${beforeAfterRatio}%` }}
              >
                <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white text-slate-900 shadow-xl border border-slate-300 flex items-center justify-center">
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
                <div className="absolute top-3 right-3 px-2 py-0.5 rounded bg-black/75 text-white text-[11px] font-medium whitespace-nowrap">
                  現況原圖
                </div>
                <div className="absolute top-3 left-3 px-2 py-0.5 rounded bg-amber-600/90 text-white text-[11px] font-medium whitespace-nowrap">
                  AI 模擬圖
                </div>
              </div>
            )}

            {/* Processing Overlay */}
            {isProcessing && (
              <div className="absolute inset-0 z-30 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-3 text-white p-6 text-center">
                <div className="w-10 h-10 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>{processingMessage || 'AI 空間管線計算中...'}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bottom Floating Telemetry & Zoom Controls */}
      <div
        className="no-print h-9 shrink-0 border-t px-3 flex items-center justify-between text-[11px] font-mono-cad"
        style={{
          backgroundColor: 'var(--bg-panel)',
          borderColor: 'var(--border-subtle)',
          color: 'var(--text-secondary)',
        }}
      >
        <div className="flex items-center gap-3 truncate">
          <span>
            空間尺寸：{calibration.roomWidthCm} × {calibration.roomDepthCm} cm
          </span>
          <span className="hidden sm:inline" style={{ color: 'var(--text-muted)' }}>
            |
          </span>
          <span className="hidden sm:inline">
            比例尺：{calibration.pxPerCm} px/cm
          </span>
          {cursorNorm && (
            <>
              <span className="hidden md:inline" style={{ color: 'var(--text-muted)' }}>
                |
              </span>
              <span className="hidden md:inline">
                座標：{Math.round(cursorNorm.x * calibration.roomWidthCm)}cm,{' '}
                {Math.round(cursorNorm.y * calibration.roomDepthCm)}cm
              </span>
            </>
          )}
        </div>

        {viewMode === 'perspective' && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.55, Number((z - 0.15).toFixed(2))))}
              className="p-1 rounded hover:bg-white/10 cursor-pointer"
              title="縮小畫布"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="w-11 text-center">{Math.round(zoom * 100)}%</span>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(2.6, Number((z + 0.15).toFixed(2))))}
              className="p-1 rounded hover:bg-white/10 cursor-pointer"
              title="放大畫布"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                setZoom(1);
                setPan({ x: 0, y: 0 });
              }}
              className="p-1 rounded hover:bg-white/10 cursor-pointer ml-1"
              title="重置視口 (100%)"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </main>
  );
};
