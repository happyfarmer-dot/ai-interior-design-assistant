import React, { useRef, useState } from 'react';
import {
  ArrowRight,
  Brush,
  Camera,
  Grid,
  Pentagon,
  Ruler,
  ScanSearch,
  ShieldAlert,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  CALIBRATION_PRESETS,
  PROTECTION_CATEGORIES,
  ROOM_PRESETS,
} from '../../data/presets';
import { estimateFloorAreaPing } from '../../services/physics/scaleEngine';
import type {
  CalibrationPresetId,
  CanvasTool,
  ProtectionCategory,
  ProtectionMask,
  ScaleCalibration,
} from '../../types/planner';
import { readImageFile } from '../../utils/imageProcessing';
import {
  isNativeCapacitor,
  pickPhotoWithCapacitor,
} from '../../utils/nativePlatform';

interface Step1CalibrationPanelProps {
  activeRoomId: string;
  calibration: ScaleCalibration;
  protectionMasks: ProtectionMask[];
  activeTool: CanvasTool;
  activeMaskCategory: ProtectionCategory;
  brushRadiusPx: number;
  onLoadPreset: (id: string) => void;
  onUploadRoom: (dataUrl: string, name: string, w: number, h: number) => void;
  onUpdateCalibration: (patch: Partial<ScaleCalibration>) => void;
  onSelectTool: (tool: CanvasTool) => void;
  onSelectMaskCategory: (cat: ProtectionCategory) => void;
  onSetBrushRadius: (r: number) => void;
  onRemoveMask: (id: string) => void;
  onAutoDetectMasks: () => void;
  onNextStep: () => void;
}

export const Step1CalibrationPanel: React.FC<Step1CalibrationPanelProps> = ({
  activeRoomId,
  calibration,
  protectionMasks,
  activeTool,
  activeMaskCategory,
  brushRadiusPx,
  onLoadPreset,
  onUploadRoom,
  onUpdateCalibration,
  onSelectTool,
  onSelectMaskCategory,
  onSetBrushRadius,
  onRemoveMask,
  onAutoDetectMasks,
  onNextStep,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCameraError(null);
    const result = await readImageFile(file);
    onUploadRoom(result.dataUrl, file.name, result.widthPx, result.heightPx);
    e.target.value = '';
  };

  const handleNativeCameraOrGallery = async (source: 'camera' | 'photos') => {
    setCameraError(null);
    // On desktop browsers, regular upload opens file picker directly for zero-friction UX
    if (source === 'photos' && !isNativeCapacitor()) {
      fileInputRef.current?.click();
      return;
    }
    try {
      const picked = await pickPhotoWithCapacitor(source);
      if (picked.cancelled || !picked.dataUrl) return;
      onUploadRoom(
        picked.dataUrl,
        picked.fileName,
        picked.widthPx,
        picked.heightPx
      );
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : '無法啟動相機或存取相簿';
      setCameraError(msg);
    }
  };

  const handlePresetCalChange = (presetId: CalibrationPresetId) => {
    const found = CALIBRATION_PRESETS.find((p) => p.id === presetId);
    onUpdateCalibration({
      presetId,
      knownCm: found && presetId !== 'custom' ? found.cm : calibration.knownCm,
    });
  };

  const areaPing = estimateFloorAreaPing(calibration);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* 1. Room Import & Presets */}
        <section className="space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <h2
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--text-secondary)' }}
            >
              1. 匯入室內現況照片
            </h2>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleNativeCameraOrGallery('camera')}
                title="使用手機相機現場拍攝室內照片"
                className="flex items-center gap-1 px-2 py-1 rounded-lg border text-xs font-medium cursor-pointer transition-colors"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-strong)',
                  color: 'var(--text-primary)',
                }}
              >
                <Camera className="w-3.5 h-3.5 text-amber-400" />
                <span>拍照</span>
              </button>
              <button
                type="button"
                onClick={() => handleNativeCameraOrGallery('photos')}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-medium cursor-pointer transition-colors"
                style={{
                  backgroundColor: 'var(--accent-amber-soft)',
                  borderColor: 'var(--accent-amber)',
                  color: 'var(--accent-amber)',
                }}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>上傳實景照</span>
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
          {cameraError && (
            <div className="p-2 rounded-lg border border-red-500/40 bg-red-500/10 text-[11px] text-red-300">
              {cameraError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            {ROOM_PRESETS.map((preset) => {
              const isSelected = activeRoomId === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => onLoadPreset(preset.id)}
                  className="text-left rounded-lg border overflow-hidden cursor-pointer transition-all"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    borderColor: isSelected
                      ? 'var(--accent-amber)'
                      : 'var(--border-subtle)',
                  }}
                >
                  <img
                    src={preset.imageUrl}
                    alt={preset.name}
                    className="w-full h-16 object-cover"
                  />
                  <div className="p-2">
                    <div className="text-xs font-semibold truncate">
                      {preset.name}
                    </div>
                    <div
                      className="text-[10px] truncate mt-0.5"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {preset.subtitle.split('・')[0]}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* 2. Spatial Scale Calibration (Feature 5) */}
        <section
          className="rounded-xl border p-3.5 space-y-3"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold flex items-center gap-1.5">
              <Ruler className="w-4 h-4 text-blue-400" />
              <span>空間尺度校準（功能 5）</span>
            </h2>
            <button
              type="button"
              onClick={() =>
                onSelectTool(activeTool === 'scale' ? 'select' : 'scale')
              }
              className="px-2 py-1 rounded-md text-[11px] font-medium border cursor-pointer"
              style={{
                backgroundColor:
                  activeTool === 'scale'
                    ? 'var(--accent-cobalt)'
                    : 'var(--bg-elevated)',
                borderColor:
                  activeTool === 'scale'
                    ? 'var(--accent-cobalt)'
                    : 'var(--border-strong)',
                color:
                  activeTool === 'scale' ? '#ffffff' : 'var(--text-primary)',
              }}
            >
              {activeTool === 'scale' ? '繪製校準線中…' : '畫布重拉校準線'}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            {CALIBRATION_PRESETS.map((p) => {
              const active = calibration.presetId === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handlePresetCalChange(p.id)}
                  className="px-2 py-1.5 rounded-lg border text-left cursor-pointer"
                  style={{
                    backgroundColor: active
                      ? 'var(--accent-cobalt-soft)'
                      : 'var(--bg-panel)',
                    borderColor: active
                      ? 'var(--accent-cobalt)'
                      : 'var(--border-subtle)',
                  }}
                >
                  <div className="text-[11px] font-medium">{p.label}</div>
                  <div
                    className="text-[10px] font-mono-cad"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {p.id === 'custom' ? '自由輸入' : `${p.cm} cm`}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs shrink-0" style={{ color: 'var(--text-secondary)' }}>
              參照物實長 (cm)
            </label>
            <input
              type="number"
              min={5}
              max={600}
              step={0.1}
              value={calibration.knownCm}
              onChange={(e) =>
                onUpdateCalibration({
                  presetId: 'custom',
                  knownCm: Math.max(5, Number(e.target.value) || 100),
                })
              }
              className="w-full px-2.5 py-1 rounded-md border text-xs font-mono-cad"
              style={{
                backgroundColor: 'var(--bg-panel)',
                borderColor: 'var(--border-strong)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          {/* Real-time Telemetry Summary */}
          <div
            className="grid grid-cols-3 gap-2 pt-2 border-t text-center"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <div className="p-1.5 rounded-md" style={{ backgroundColor: 'var(--bg-panel)' }}>
              <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                物理比例尺
              </div>
              <div className="text-xs font-mono-cad font-semibold text-blue-400">
                {calibration.pxPerCm} px/cm
              </div>
            </div>
            <div className="p-1.5 rounded-md" style={{ backgroundColor: 'var(--bg-panel)' }}>
              <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                推算空間尺寸
              </div>
              <div className="text-xs font-mono-cad font-semibold">
                {calibration.roomWidthCm}×{calibration.roomDepthCm}
              </div>
            </div>
            <div className="p-1.5 rounded-md" style={{ backgroundColor: 'var(--bg-panel)' }}>
              <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                預估坪數
              </div>
              <div className="text-xs font-mono-cad font-semibold">
                {areaPing} 坪
              </div>
            </div>
          </div>

          <label className="flex items-center justify-between pt-1 cursor-pointer text-xs">
            <span className="flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
              <Grid className="w-3.5 h-3.5 text-blue-400" />
              顯示 3D 地面透視校準網格
            </span>
            <input
              type="checkbox"
              checked={calibration.showPerspectiveGrid}
              onChange={(e) =>
                onUpdateCalibration({ showPerspectiveGrid: e.target.checked })
              }
              className="accent-blue-500 cursor-pointer"
            />
          </label>
        </section>

        {/* 3. Structural & MEP Protection Mask (Feature 7) */}
        <section
          className="rounded-xl border p-3.5 space-y-3"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>不可更動結構與機電鎖定（功能 7）</span>
            </h2>
          </div>

          <button
            type="button"
            onClick={onAutoDetectMasks}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border text-xs font-medium cursor-pointer transition-colors"
            style={{
              backgroundColor: 'var(--bg-panel)',
              borderColor: 'var(--border-strong)',
              color: 'var(--text-primary)',
            }}
          >
            <ScanSearch className="w-3.5 h-3.5 text-amber-400" />
            <span>AI 自動辨識樑柱、窗戶、冷氣與配電箱</span>
          </button>

          {/* Mask Drawing Mode */}
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() =>
                onSelectTool(
                  activeTool === 'mask_brush' ? 'select' : 'mask_brush'
                )
              }
              className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg border text-xs font-medium cursor-pointer"
              style={{
                backgroundColor:
                  activeTool === 'mask_brush'
                    ? 'var(--accent-amber-soft)'
                    : 'var(--bg-panel)',
                borderColor:
                  activeTool === 'mask_brush'
                    ? 'var(--accent-amber)'
                    : 'var(--border-subtle)',
                color:
                  activeTool === 'mask_brush'
                    ? 'var(--accent-amber)'
                    : 'var(--text-secondary)',
              }}
            >
              <Brush className="w-3.5 h-3.5" />
              <span>筆刷遮罩</span>
            </button>
            <button
              type="button"
              onClick={() =>
                onSelectTool(
                  activeTool === 'mask_polygon' ? 'select' : 'mask_polygon'
                )
              }
              className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg border text-xs font-medium cursor-pointer"
              style={{
                backgroundColor:
                  activeTool === 'mask_polygon'
                    ? 'var(--accent-amber-soft)'
                    : 'var(--bg-panel)',
                borderColor:
                  activeTool === 'mask_polygon'
                    ? 'var(--accent-amber)'
                    : 'var(--border-subtle)',
                color:
                  activeTool === 'mask_polygon'
                    ? 'var(--accent-amber)'
                    : 'var(--text-secondary)',
              }}
            >
              <Pentagon className="w-3.5 h-3.5" />
              <span>多邊形框選</span>
            </button>
          </div>

          {activeTool === 'mask_brush' && (
            <div className="flex items-center gap-2 text-xs">
              <span style={{ color: 'var(--text-muted)' }}>筆刷半徑</span>
              <input
                type="range"
                min={12}
                max={48}
                value={brushRadiusPx}
                onChange={(e) => onSetBrushRadius(Number(e.target.value))}
                className="flex-1 accent-amber-500"
              />
              <span className="font-mono-cad w-10 text-right">
                {brushRadiusPx}px
              </span>
            </div>
          )}

          {/* Protection Categories */}
          <div className="flex flex-wrap gap-1.5">
            {PROTECTION_CATEGORIES.map((cat) => {
              const active = activeMaskCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => onSelectMaskCategory(cat.id)}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-md border text-[11px] cursor-pointer"
                  style={{
                    backgroundColor: active ? cat.bgAlpha : 'var(--bg-panel)',
                    borderColor: active ? cat.color : 'var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          {/* Active Protection Masks List */}
          <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
            {protectionMasks.map((mask) => {
              const cat = PROTECTION_CATEGORIES.find(
                (c) => c.id === mask.category
              );
              return (
                <div
                  key={mask.id}
                  className="flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-xs"
                  style={{
                    backgroundColor: 'var(--bg-panel)',
                    borderColor: 'var(--border-subtle)',
                  }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: cat?.color || '#f59e0b' }}
                    />
                    <span className="truncate">{mask.label}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemoveMask(mask.id)}
                    title="移除此保護區"
                    className="p-1 rounded hover:bg-red-500/15 text-red-400 cursor-pointer shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Footer CTA */}
      <div
        className="p-3.5 border-t shrink-0"
        style={{
          borderColor: 'var(--border-subtle)',
          backgroundColor: 'var(--bg-panel)',
        }}
      >
        <button
          type="button"
          onClick={onNextStep}
          className="w-full py-2.5 px-4 rounded-xl font-semibold text-xs text-white flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-transform active:scale-[0.99]"
          style={{ backgroundColor: 'var(--accent-amber)' }}
        >
          <span>完成物理校準・前往步驟 2：模式與需求設定</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
