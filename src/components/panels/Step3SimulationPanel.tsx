import React from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  LampCeiling,
  LayoutGrid,
  PaintBucket,
  ShieldAlert,
  Sun,
} from 'lucide-react';
import { DESIGN_STYLES, MATERIAL_SWATCHES } from '../../data/presets';
import type {
  AppliedMaterials,
  CanvasTool,
  ColorTempKelvin,
  DaylightMode,
  DesignConstraints,
  DesignMode,
  DesignStyleId,
  ErgonomicsReport,
  LightingState,
  MaterialSurfaceType,
  PlacementZone,
  RearrangementVariant,
  ViewMode,
} from '../../types/planner';

interface Step3SimulationPanelProps {
  mode: DesignMode;
  styleId: DesignStyleId;
  styleIntensity: number;
  rearrangementVariants: RearrangementVariant[];
  activeVariantId: string | null;
  placementZones: PlacementZone[];
  selectedZoneId: string | null;
  ergonomics: ErgonomicsReport;
  lighting: LightingState;
  selectedMaterialSurface: MaterialSurfaceType;
  appliedMaterials: AppliedMaterials;
  constraints: DesignConstraints;
  activeTool: CanvasTool;
  viewMode: ViewMode;
  onSelectVariant: (id: string) => void;
  onSelectZone: (id: string) => void;
  onRefreshStyleLive: (styleId: DesignStyleId, intensity: number) => void;
  onUpdateLighting: (patch: Partial<LightingState>) => void;
  onSelectMaterialSurface: (surface: MaterialSurfaceType) => void;
  onApplyMaterial: (surface: MaterialSurfaceType, swatchId: string | null) => void;
  onSelectTool: (tool: CanvasTool) => void;
  onSetViewMode: (v: ViewMode) => void;
  onPrevStep: () => void;
  onNextStep: () => void;
}

const DAYLIGHT_MODES: { id: DaylightMode; label: string; sub: string }[] = [
  { id: 'east_morning', label: '東向晨光', sub: '柔和暖金斜射' },
  { id: 'west_afternoon', label: '西曬午後', sub: '濃郁暖橘斜陽' },
  { id: 'north_soft', label: '北向柔和光', sub: '均勻漫射自然白' },
  { id: 'night', label: '夜間模式', sub: '檢視人工光源層次' },
];

const KELVIN_MODES: { k: ColorTempKelvin; label: string; dot: string }[] = [
  { k: 3000, label: '3000K 暖黃光', dot: '#ffb866' },
  { k: 4000, label: '4000K 自然光', dot: '#fff1d9' },
  { k: 6000, label: '6000K 白光', dot: '#d7ecff' },
];

const SURFACE_TABS: { id: MaterialSurfaceType; label: string }[] = [
  { id: 'floor', label: '地板材質' },
  { id: 'main_wall', label: '主牆面' },
  { id: 'sofa', label: '沙發布料' },
  { id: 'curtain', label: '窗簾軟裝' },
];

export const Step3SimulationPanel: React.FC<Step3SimulationPanelProps> = ({
  mode,
  styleId,
  styleIntensity,
  rearrangementVariants,
  activeVariantId,
  placementZones,
  selectedZoneId,
  ergonomics,
  lighting,
  selectedMaterialSurface,
  appliedMaterials,
  constraints,
  activeTool,
  viewMode,
  onSelectVariant,
  onSelectZone,
  onRefreshStyleLive,
  onUpdateLighting,
  onSelectMaterialSurface,
  onApplyMaterial,
  onSelectTool,
  onSetViewMode,
  onPrevStep,
  onNextStep,
}) => {
  const surfaceSwatches = MATERIAL_SWATCHES.filter(
    (s) => s.surface === selectedMaterialSurface
  );

  const statusMeta = {
    pass: { color: 'var(--status-pass)', label: '通過（綠燈）', icon: CheckCircle2 },
    warn: { color: 'var(--status-warn)', label: '偏窄（黃燈）', icon: AlertTriangle },
    fail: { color: 'var(--status-fail)', label: '警告（紅燈）', icon: ShieldAlert },
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* 1. Mode Results Summary (Rearrangement Variants / Style Quick Switch / Placement Zones) */}
        {mode === 'rearrange' && rearrangementVariants.length > 0 && (
          <section className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h2
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'var(--text-secondary)' }}
              >
                最佳化重排方案（共 {rearrangementVariants.length} 組）
              </h2>
              <button
                type="button"
                onClick={() =>
                  onSetViewMode(
                    viewMode === 'floorplan' ? 'perspective' : 'floorplan'
                  )
                }
                className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-md border cursor-pointer"
                style={{
                  borderColor: 'var(--border-strong)',
                  color: 'var(--accent-cobalt)',
                  backgroundColor: 'var(--accent-cobalt-soft)',
                }}
              >
                <LayoutGrid className="w-3 h-3" />
                <span>
                  {viewMode === 'floorplan' ? '看透視模擬' : '看 2D 平面圖'}
                </span>
              </button>
            </div>
            <div className="space-y-2">
              {rearrangementVariants.map((v) => {
                const active = v.id === activeVariantId;
                return (
                  <div
                    key={v.id}
                    onClick={() => onSelectVariant(v.id)}
                    className="p-3 rounded-xl border cursor-pointer transition-all"
                    style={{
                      backgroundColor: active
                        ? 'var(--accent-cobalt-soft)'
                        : 'var(--bg-surface)',
                      borderColor: active
                        ? 'var(--accent-cobalt)'
                        : 'var(--border-subtle)',
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold">{v.title}</span>
                      <span className="text-[11px] font-mono-cad px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400">
                        評分 {v.score}
                      </span>
                    </div>
                    <div
                      className="text-[11px] mt-1"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {v.subtitle}
                    </div>
                    {active && (
                      <ul
                        className="mt-2 pt-2 border-t space-y-1 text-[11px] list-disc pl-4"
                        style={{
                          borderColor: 'var(--border-subtle)',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        {v.rationale.map((line, i) => (
                          <li key={i}>{line}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {mode === 'style' && (
          <section
            className="rounded-xl border p-3.5 space-y-2.5"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <div className="flex items-center justify-between text-xs font-semibold">
              <span>快速切換風格與融合強度</span>
              <span className="font-mono-cad text-amber-400">
                {styleIntensity}%
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {DESIGN_STYLES.map((s) => {
                const active = styleId === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => onRefreshStyleLive(s.id, styleIntensity)}
                    className="px-2 py-1 rounded-md border text-[11px] cursor-pointer"
                    style={{
                      backgroundColor: active
                        ? 'var(--accent-amber)'
                        : 'var(--bg-panel)',
                      borderColor: active
                        ? 'var(--accent-amber)'
                        : 'var(--border-subtle)',
                      color: active ? '#ffffff' : 'var(--text-secondary)',
                    }}
                  >
                    {s.name}
                  </button>
                );
              })}
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={styleIntensity}
              onChange={(e) =>
                onRefreshStyleLive(styleId, Number(e.target.value))
              }
              className="w-full accent-amber-500 cursor-pointer"
            />
          </section>
        )}

        {mode === 'place_object' && placementZones.length > 0 && (
          <section
            className="rounded-xl border p-3.5 space-y-2"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <div className="text-xs font-semibold">
              已推薦擺放熱區（可於畫布直接拖曳微調）
            </div>
            {placementZones.map((z) => {
              const sel = z.id === selectedZoneId;
              return (
                <button
                  key={z.id}
                  type="button"
                  onClick={() => onSelectZone(z.id)}
                  className="w-full p-2 rounded-lg border text-left text-[11px] cursor-pointer"
                  style={{
                    backgroundColor: sel
                      ? 'var(--accent-amber-soft)'
                      : 'var(--bg-panel)',
                    borderColor: !z.mepClear
                      ? 'var(--status-fail)'
                      : sel
                        ? 'var(--accent-amber)'
                        : 'var(--border-subtle)',
                  }}
                >
                  <div className="flex justify-between font-semibold">
                    <span>{z.label}</span>
                    <span className="font-mono-cad">{z.suitabilityScore}%</span>
                  </div>
                  {z.warning && (
                    <div className="text-[10px] text-red-400 mt-0.5">
                      {z.warning}
                    </div>
                  )}
                </button>
              );
            })}
          </section>
        )}

        {/* 2. Traffic Flow & Ergonomics Check (Feature 6) */}
        <section
          className="rounded-xl border p-3.5 space-y-2.5"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>動線淨寬與人體工學檢測（功能 6）</span>
            </h2>
            <span
              className="px-2 py-0.5 rounded-full text-[10px] font-semibold text-white"
              style={{
                backgroundColor: statusMeta[ergonomics.overallStatus].color,
              }}
            >
              {statusMeta[ergonomics.overallStatus].label}
            </span>
          </div>

          <div className="space-y-2">
            {ergonomics.metrics.map((m) => {
              const meta = statusMeta[m.status];
              const Icon = meta.icon;
              return (
                <div
                  key={m.id}
                  className="p-2.5 rounded-lg border space-y-1"
                  style={{
                    backgroundColor: 'var(--bg-panel)',
                    borderColor:
                      m.status === 'fail'
                        ? 'var(--status-fail)'
                        : 'var(--border-subtle)',
                  }}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium flex items-center gap-1.5">
                      <Icon
                        className="w-3.5 h-3.5 shrink-0"
                        style={{ color: meta.color }}
                      />
                      {m.label}
                    </span>
                    <span
                      className="font-mono-cad font-semibold"
                      style={{ color: meta.color }}
                    >
                      {m.valueText}
                    </span>
                  </div>
                  <div
                    className="text-[10px] font-mono-cad"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    基準：{m.benchmarkText}
                  </div>
                  <div
                    className="text-[11px] leading-relaxed"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {m.detail}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 3. Daylight & Artificial Lighting Color Temp Panel (Feature 8) */}
        <section
          className="rounded-xl border p-3.5 space-y-3"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <h2 className="text-xs font-semibold flex items-center gap-1.5">
            <Sun className="w-4 h-4 text-amber-400" />
            <span>採光時段與照明色溫模擬（功能 8）</span>
          </h2>

          <div className="grid grid-cols-2 gap-1.5">
            {DAYLIGHT_MODES.map((d) => {
              const active = lighting.daylight === d.id;
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => onUpdateLighting({ daylight: d.id })}
                  className="p-2 rounded-lg border text-left cursor-pointer"
                  style={{
                    backgroundColor: active
                      ? 'var(--accent-amber-soft)'
                      : 'var(--bg-panel)',
                    borderColor: active
                      ? 'var(--accent-amber)'
                      : 'var(--border-subtle)',
                  }}
                >
                  <div className="text-[11px] font-semibold">{d.label}</div>
                  <div
                    className="text-[10px]"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {d.sub}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="space-y-1.5">
            <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              人工光源色溫切換
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {KELVIN_MODES.map((km) => {
                const active = lighting.kelvin === km.k;
                return (
                  <button
                    key={km.k}
                    type="button"
                    onClick={() => onUpdateLighting({ kelvin: km.k })}
                    className="py-1.5 px-1.5 rounded-lg border flex items-center justify-center gap-1.5 text-[11px] font-mono-cad cursor-pointer"
                    style={{
                      backgroundColor: active
                        ? 'var(--bg-elevated)'
                        : 'var(--bg-panel)',
                      borderColor: active
                        ? 'var(--accent-amber)'
                        : 'var(--border-subtle)',
                    }}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full border border-black/30 shrink-0"
                      style={{ backgroundColor: km.dot }}
                    />
                    <span>{km.k}K</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5 pt-1">
            <label className="flex items-center justify-between text-xs cursor-pointer">
              <span className="flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                <LampCeiling className="w-3.5 h-3.5" />
                無主燈深防眩嵌燈照明
              </span>
              <input
                type="checkbox"
                checked={lighting.recessedDownlights}
                onChange={(e) =>
                  onUpdateLighting({ recessedDownlights: e.target.checked })
                }
                className="accent-amber-500 cursor-pointer"
              />
            </label>
            <label className="flex items-center justify-between text-xs cursor-pointer">
              <span className="flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                <LampCeiling className="w-3.5 h-3.5" />
                天花板間接 LED 燈帶光暈
              </span>
              <input
                type="checkbox"
                checked={lighting.indirectCoveLed}
                onChange={(e) =>
                  onUpdateLighting({ indirectCoveLed: e.target.checked })
                }
                className="accent-amber-500 cursor-pointer"
              />
            </label>
            <div className="flex items-center gap-2 text-[11px] pt-1">
              <span style={{ color: 'var(--text-muted)' }}>照明亮度</span>
              <input
                type="range"
                min={20}
                max={100}
                value={lighting.intensity}
                onChange={(e) =>
                  onUpdateLighting({ intensity: Number(e.target.value) })
                }
                className="flex-1 accent-amber-500 cursor-pointer"
              />
              <span className="font-mono-cad w-9 text-right">
                {lighting.intensity}%
              </span>
            </div>
          </div>
        </section>

        {/* 4. Local Material Inpainting (Feature 9) */}
        <section
          className="rounded-xl border p-3.5 space-y-3"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold flex items-center gap-1.5">
              <PaintBucket className="w-4 h-4 text-sky-400" />
              <span>局部材質精準替換（功能 9）</span>
            </h2>
            <button
              type="button"
              onClick={() =>
                onSelectTool(
                  activeTool === 'material_pick' ? 'select' : 'material_pick'
                )
              }
              className="text-[11px] px-2 py-0.5 rounded border cursor-pointer"
              style={{
                backgroundColor:
                  activeTool === 'material_pick'
                    ? 'var(--accent-cobalt)'
                    : 'var(--bg-panel)',
                borderColor:
                  activeTool === 'material_pick'
                    ? 'var(--accent-cobalt)'
                    : 'var(--border-strong)',
                color:
                  activeTool === 'material_pick'
                    ? '#ffffff'
                    : 'var(--text-secondary)',
              }}
            >
              {activeTool === 'material_pick' ? '點選畫布表面中' : '畫布點選表面'}
            </button>
          </div>

          <div className="grid grid-cols-4 gap-1">
            {SURFACE_TABS.map((tab) => {
              const active = selectedMaterialSurface === tab.id;
              const hasApplied = Boolean(appliedMaterials[tab.id]);
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onSelectMaterialSurface(tab.id)}
                  className="py-1.5 px-1 rounded-md border text-[11px] font-medium cursor-pointer relative"
                  style={{
                    backgroundColor: active
                      ? 'var(--accent-cobalt-soft)'
                      : 'var(--bg-panel)',
                    borderColor: active
                      ? 'var(--accent-cobalt)'
                      : 'var(--border-subtle)',
                    color: active
                      ? 'var(--accent-cobalt)'
                      : 'var(--text-secondary)',
                  }}
                >
                  {tab.label}
                  {hasApplied && (
                    <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-amber-400" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="space-y-1.5">
            {appliedMaterials[selectedMaterialSurface] && (
              <button
                type="button"
                onClick={() => onApplyMaterial(selectedMaterialSurface, null)}
                className="w-full py-1 rounded border text-[11px] cursor-pointer"
                style={{
                  borderColor: 'var(--border-strong)',
                  color: 'var(--text-muted)',
                }}
              >
                恢復此表面預設材質
              </button>
            )}
            {surfaceSwatches.map((swatch) => {
              const isSelected =
                appliedMaterials[selectedMaterialSurface] === swatch.id;
              return (
                <button
                  key={swatch.id}
                  type="button"
                  onClick={() =>
                    onApplyMaterial(
                      selectedMaterialSurface,
                      isSelected ? null : swatch.id
                    )
                  }
                  className="w-full p-2 rounded-lg border flex items-center gap-2.5 text-left cursor-pointer"
                  style={{
                    backgroundColor: isSelected
                      ? 'var(--accent-amber-soft)'
                      : 'var(--bg-panel)',
                    borderColor: isSelected
                      ? 'var(--accent-amber)'
                      : 'var(--border-subtle)',
                  }}
                >
                  <span
                    className="w-7 h-7 rounded-md border border-black/25 shrink-0"
                    style={{ backgroundColor: swatch.colorHex }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-medium truncate">
                        {swatch.name}
                      </span>
                      {constraints.scratchResistant && swatch.petFriendly && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 shrink-0">
                          防抓 ✓
                        </span>
                      )}
                    </div>
                    <div
                      className="text-[10px] truncate"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {swatch.subtitle} · NT${' '}
                      {swatch.unitPriceMinTWD.toLocaleString()}~/
                      {swatch.unitLabel.split(' ')[0]}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      </div>

      {/* Footer CTAs */}
      <div
        className="p-3.5 border-t flex items-center gap-2 shrink-0"
        style={{
          borderColor: 'var(--border-subtle)',
          backgroundColor: 'var(--bg-panel)',
        }}
      >
        <button
          type="button"
          onClick={onPrevStep}
          className="px-3 py-2.5 rounded-xl border text-xs font-medium flex items-center gap-1 cursor-pointer"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-strong)',
            color: 'var(--text-secondary)',
          }}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>調整需求</span>
        </button>
        <button
          type="button"
          onClick={onNextStep}
          className="flex-1 py-2.5 px-4 rounded-xl font-semibold text-xs text-white flex items-center justify-center gap-2 cursor-pointer shadow-sm"
          style={{ backgroundColor: 'var(--accent-amber)' }}
        >
          <span>前往步驟 4：搜物清單與預算 BOM</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
