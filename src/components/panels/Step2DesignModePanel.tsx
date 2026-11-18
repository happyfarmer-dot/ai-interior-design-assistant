import React, { useRef, useState } from 'react';
import {
  ArrowLeft,
  Box,
  CheckCircle2,
  Code2,
  Lock,
  Move3d,
  Palette,
  Scissors,
  Sparkles,
  Unlock,
  Upload,
  Wand2,
} from 'lucide-react';
import {
  BUILT_IN_NEW_OBJECTS,
  CONSTRAINT_TAG_OPTIONS,
  DESIGN_STYLES,
} from '../../data/presets';
import type {
  DesignConstraints,
  DesignMode,
  DesignStyleId,
  FurnitureItem,
  NewObjectCandidate,
  PlacementZone,
  RearrangementGoal,
} from '../../types/planner';
import { readImageFile } from '../../utils/imageProcessing';

interface Step2DesignModePanelProps {
  mode: DesignMode;
  rearrangementGoal: RearrangementGoal;
  detectedFurniture: FurnitureItem[];
  styleId: DesignStyleId;
  styleIntensity: number;
  newObject: NewObjectCandidate | null;
  placementZones: PlacementZone[];
  selectedZoneId: string | null;
  promptText: string;
  selectedTags: string[];
  constraints: DesignConstraints;
  onSetMode: (m: DesignMode) => void;
  onSetGoal: (g: RearrangementGoal) => void;
  onToggleFurnitureLock: (id: string) => void;
  onSelectStyle: (id: DesignStyleId) => void;
  onSetStyleIntensity: (val: number) => void;
  onSelectNewObject: (obj: NewObjectCandidate) => void;
  onUpdateNewObjectSpecs: (
    patch: Partial<NewObjectCandidate>,
    recomputeCutout?: boolean
  ) => void;
  onAnalyzeZones: () => void;
  onSelectZone: (id: string) => void;
  onUpdatePromptTags: (prompt: string, tags: string[]) => void;
  onParseConstraints: (prompt?: string, tags?: string[]) => void;
  onPrevStep: () => void;
  onGenerate: () => void;
}

export const Step2DesignModePanel: React.FC<Step2DesignModePanelProps> = ({
  mode,
  rearrangementGoal,
  detectedFurniture,
  styleId,
  styleIntensity,
  newObject,
  placementZones,
  selectedZoneId,
  promptText,
  selectedTags,
  constraints,
  onSetMode,
  onSetGoal,
  onToggleFurnitureLock,
  onSelectStyle,
  onSetStyleIntensity,
  onSelectNewObject,
  onUpdateNewObjectSpecs,
  onAnalyzeZones,
  onSelectZone,
  onUpdatePromptTags,
  onParseConstraints,
  onPrevStep,
  onGenerate,
}) => {
  const itemFileRef = useRef<HTMLInputElement | null>(null);
  const [showJson, setShowJson] = useState(true);

  const handleToggleTag = (tagId: string) => {
    const exists = selectedTags.includes(tagId);
    const nextTags = exists
      ? selectedTags.filter((t) => t !== tagId)
      : [...selectedTags, tagId];

    // Also reflect tag snippets nicely in prompt text if toggled on
    const opt = CONSTRAINT_TAG_OPTIONS.find((o) => o.id === tagId);
    let nextPrompt = promptText;
    if (!exists && opt && !promptText.includes(opt.promptSnippet)) {
      nextPrompt = promptText
        ? `${promptText}、${opt.promptSnippet}`
        : opt.promptSnippet;
    }
    onUpdatePromptTags(nextPrompt, nextTags);
    onParseConstraints(nextPrompt, nextTags);
  };

  const handleUploadObjectPhoto = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const res = await readImageFile(file);
    const candidate: NewObjectCandidate = {
      id: `custom_obj_${Date.now()}`,
      name: file.name.replace(/\.[^.]+$/, ''),
      category: 'accent_chair',
      rawImageUrl: res.dataUrl,
      cutoutDataUrl: null,
      bgRemoved: true,
      bgThreshold: 234,
      widthCm: 75,
      depthCm: 75,
      heightCm: 85,
      priceTWD: 8500,
    };
    await onSelectNewObject(candidate);
    e.target.value = '';
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* 1. Core Mode Selection */}
        <section className="space-y-2.5">
          <h2
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: 'var(--text-secondary)' }}
          >
            1. 選擇核心規劃任務模式
          </h2>
          <div className="grid grid-cols-3 gap-1.5">
            {[
              {
                id: 'rearrange' as DesignMode,
                title: '傢俱重排',
                sub: '功能 1',
                icon: Move3d,
              },
              {
                id: 'style' as DesignMode,
                title: '風格轉換',
                sub: '功能 2',
                icon: Palette,
              },
              {
                id: 'place_object' as DesignMode,
                title: '置入單品',
                sub: '功能 3',
                icon: Box,
              },
            ].map((m) => {
              const Icon = m.icon;
              const active = mode === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onSetMode(m.id)}
                  className="p-2.5 rounded-xl border text-center cursor-pointer transition-all"
                  style={{
                    backgroundColor: active
                      ? 'var(--accent-amber-soft)'
                      : 'var(--bg-surface)',
                    borderColor: active
                      ? 'var(--accent-amber)'
                      : 'var(--border-subtle)',
                  }}
                >
                  <Icon
                    className="w-4 h-4 mx-auto mb-1"
                    style={{
                      color: active
                        ? 'var(--accent-amber)'
                        : 'var(--text-secondary)',
                    }}
                  />
                  <div className="text-xs font-semibold">{m.title}</div>
                  <div
                    className="text-[10px]"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {m.sub}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Mode A: Smart Furniture Rearrangement (Feature 1) */}
        {mode === 'rearrange' && (
          <section
            className="rounded-xl border p-3.5 space-y-3"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <div className="text-xs font-semibold">
              現有傢俱偵測清單與優先優化目標（功能 1）
            </div>

            <div className="space-y-1.5">
              <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                最佳化演算權重
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'traffic_flow', label: '動線淨寬' },
                  { id: 'daylight_ventilation', label: '採光通風' },
                  { id: 'pet_storage_friendly', label: '玄關與寵物' },
                ].map((g) => {
                  const active = rearrangementGoal === g.id;
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => onSetGoal(g.id as RearrangementGoal)}
                      className="py-1.5 px-2 rounded-lg border text-[11px] font-medium cursor-pointer"
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
                      {g.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                已偵測現有傢俱（點擊鎖定「固定原位不移動」）
              </div>
              {detectedFurniture.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between px-2.5 py-2 rounded-lg border text-xs"
                  style={{
                    backgroundColor: 'var(--bg-panel)',
                    borderColor: item.locked
                      ? 'var(--accent-amber)'
                      : 'var(--border-subtle)',
                  }}
                >
                  <div className="min-w-0">
                    <div className="font-medium truncate">{item.name}</div>
                    <div
                      className="text-[10px] font-mono-cad"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {item.floorRect.wCm}×{item.floorRect.dCm}×
                      {item.floorRect.hCm} cm
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onToggleFurnitureLock(item.id)}
                    className="flex items-center gap-1 px-2 py-1 rounded-md border text-[11px] cursor-pointer shrink-0"
                    style={{
                      backgroundColor: item.locked
                        ? 'var(--accent-amber-soft)'
                        : 'transparent',
                      borderColor: item.locked
                        ? 'var(--accent-amber)'
                        : 'var(--border-strong)',
                      color: item.locked
                        ? 'var(--accent-amber)'
                        : 'var(--text-secondary)',
                    }}
                  >
                    {item.locked ? (
                      <>
                        <Lock className="w-3 h-3" />
                        <span>已鎖定</span>
                      </>
                    ) : (
                      <>
                        <Unlock className="w-3 h-3" />
                        <span>可重排</span>
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Mode B: Style Transfer & Rendering (Feature 2) */}
        {mode === 'style' && (
          <section
            className="rounded-xl border p-3.5 space-y-3"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <div className="text-xs font-semibold">
              多元風格選擇器（功能 2）
            </div>
            <div className="grid grid-cols-2 gap-2">
              {DESIGN_STYLES.map((style) => {
                const active = styleId === style.id;
                return (
                  <button
                    key={style.id}
                    type="button"
                    onClick={() => onSelectStyle(style.id)}
                    className="p-2.5 rounded-xl border text-left cursor-pointer transition-all"
                    style={{
                      backgroundColor: active
                        ? 'var(--accent-amber-soft)'
                        : 'var(--bg-panel)',
                      borderColor: active
                        ? 'var(--accent-amber)'
                        : 'var(--border-subtle)',
                    }}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-semibold">{style.name}</span>
                      <div className="flex -space-x-1">
                        {style.palette.map((hex, idx) => (
                          <span
                            key={idx}
                            className="w-3 h-3 rounded-full border border-black/20"
                            style={{ backgroundColor: hex }}
                          />
                        ))}
                      </div>
                    </div>
                    <div
                      className="text-[10px] mt-1 line-clamp-2"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {style.tagline}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Style Intensity Slider */}
            <div className="pt-2 border-t space-y-1.5" style={{ borderColor: 'var(--border-subtle)' }}>
              <div className="flex items-center justify-between text-xs">
                <span style={{ color: 'var(--text-secondary)' }}>
                  風格轉換強度（保留原格局比例）
                </span>
                <span className="font-mono-cad font-semibold text-amber-400">
                  {styleIntensity}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={styleIntensity}
                onChange={(e) => onSetStyleIntensity(Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
              <div
                className="flex justify-between text-[10px]"
                style={{ color: 'var(--text-muted)' }}
              >
                <span>0% 保留現況原圖</span>
                <span>100% 全面材質軟裝重塑</span>
              </div>
            </div>
          </section>
        )}

        {/* Mode C: New Object Smart Placement (Feature 3) */}
        {mode === 'place_object' && (
          <section
            className="rounded-xl border p-3.5 space-y-3"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold">
                欲添購單品選擇與去背合成（功能 3）
              </span>
              <button
                type="button"
                onClick={() => itemFileRef.current?.click()}
                className="flex items-center gap-1 px-2 py-1 rounded-md border text-[11px] cursor-pointer"
                style={{
                  backgroundColor: 'var(--bg-panel)',
                  borderColor: 'var(--border-strong)',
                  color: 'var(--text-primary)',
                }}
              >
                <Upload className="w-3 h-3" />
                <span>上傳單品圖</span>
              </button>
              <input
                ref={itemFileRef}
                type="file"
                accept="image/*"
                onChange={handleUploadObjectPhoto}
                className="hidden"
              />
            </div>

            {/* Built-in Objects */}
            <div className="grid grid-cols-3 gap-1.5">
              {BUILT_IN_NEW_OBJECTS.map((obj) => {
                const active = newObject?.id === obj.id;
                return (
                  <button
                    key={obj.id}
                    type="button"
                    onClick={() => onSelectNewObject(obj)}
                    className="p-1.5 rounded-lg border text-center cursor-pointer"
                    style={{
                      backgroundColor: active
                        ? 'var(--accent-amber-soft)'
                        : 'var(--bg-panel)',
                      borderColor: active
                        ? 'var(--accent-amber)'
                        : 'var(--border-subtle)',
                    }}
                  >
                    <img
                      src={obj.rawImageUrl}
                      alt={obj.name}
                      className="w-full h-14 object-contain rounded bg-white"
                    />
                    <div className="text-[10px] font-medium mt-1 truncate">
                      {obj.name}
                    </div>
                  </button>
                );
              })}
            </div>

            {newObject && (
              <div
                className="p-2.5 rounded-lg border space-y-2.5"
                style={{
                  backgroundColor: 'var(--bg-panel)',
                  borderColor: 'var(--border-subtle)',
                }}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-16 h-16 rounded-lg checkerboard-bg border flex items-center justify-center overflow-hidden shrink-0" style={{ borderColor: 'var(--border-subtle)' }}>
                    <img
                      src={
                        newObject.bgRemoved && newObject.cutoutDataUrl
                          ? newObject.cutoutDataUrl
                          : newObject.rawImageUrl
                      }
                      alt={newObject.name}
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="text-xs font-semibold truncate">
                      {newObject.name}
                    </div>
                    <label className="flex items-center gap-1.5 text-[11px] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newObject.bgRemoved}
                        onChange={(e) =>
                          onUpdateNewObjectSpecs(
                            { bgRemoved: e.target.checked },
                            true
                          )
                        }
                        className="accent-amber-500"
                      />
                      <Scissors className="w-3 h-3 text-amber-400" />
                      <span>自動智慧去背 (Alpha Cutout)</span>
                    </label>
                    {newObject.bgRemoved && (
                      <div className="flex items-center gap-1.5 text-[10px]">
                        <span style={{ color: 'var(--text-muted)' }}>容差</span>
                        <input
                          type="range"
                          min={205}
                          max={250}
                          value={newObject.bgThreshold}
                          onChange={(e) =>
                            onUpdateNewObjectSpecs(
                              { bgThreshold: Number(e.target.value) },
                              true
                            )
                          }
                          className="flex-1 accent-amber-500"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Manual W/D/H cm Inputs */}
                <div className="grid grid-cols-3 gap-1.5 text-[11px]">
                  {[
                    { key: 'widthCm' as const, label: '寬 (cm)' },
                    { key: 'depthCm' as const, label: '深 (cm)' },
                    { key: 'heightCm' as const, label: '高 (cm)' },
                  ].map((dim) => (
                    <div key={dim.key}>
                      <div
                        className="text-[10px] mb-0.5"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        {dim.label}
                      </div>
                      <input
                        type="number"
                        min={15}
                        max={300}
                        value={newObject[dim.key]}
                        onChange={(e) =>
                          onUpdateNewObjectSpecs({
                            [dim.key]: Math.max(15, Number(e.target.value) || 50),
                          })
                        }
                        className="w-full px-2 py-1 rounded border font-mono-cad text-xs"
                        style={{
                          backgroundColor: 'var(--bg-surface)',
                          borderColor: 'var(--border-strong)',
                          color: 'var(--text-primary)',
                        }}
                      />
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={onAnalyzeZones}
                  className="w-full py-1.5 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer"
                  style={{
                    backgroundColor: 'var(--accent-cobalt-soft)',
                    borderColor: 'var(--accent-cobalt)',
                    color: 'var(--accent-cobalt)',
                  }}
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  <span>分析畸零空間・標示 1~3 個推薦擺放熱區</span>
                </button>

                {placementZones.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    {placementZones.map((zone) => {
                      const sel = zone.id === selectedZoneId;
                      return (
                        <button
                          key={zone.id}
                          type="button"
                          onClick={() => onSelectZone(zone.id)}
                          className="w-full p-2 rounded-lg border text-left text-[11px] cursor-pointer"
                          style={{
                            backgroundColor: sel
                              ? 'var(--accent-amber-soft)'
                              : 'var(--bg-surface)',
                            borderColor: !zone.mepClear
                              ? 'var(--status-fail)'
                              : sel
                                ? 'var(--accent-amber)'
                                : 'var(--border-subtle)',
                          }}
                        >
                          <div className="flex items-center justify-between font-semibold">
                            <span>{zone.label}</span>
                            <span className="font-mono-cad">
                              適配 {zone.suitabilityScore}%
                            </span>
                          </div>
                          <div
                            className="mt-0.5"
                            style={{ color: 'var(--text-secondary)' }}
                          >
                            {zone.description}
                          </div>
                          {zone.warning && (
                            <div className="mt-1 text-[10px] text-red-400 font-medium">
                              {zone.warning}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* 4. Custom Design Prompt & LLM JSON Constraints (Feature 4) */}
        <section
          className="rounded-xl border p-3.5 space-y-3"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold flex items-center gap-1.5">
              <Code2 className="w-4 h-4 text-emerald-400" />
              <span>客製化需求解析與約束條件（功能 4）</span>
            </h2>
            <button
              type="button"
              onClick={() => setShowJson((s) => !s)}
              className="text-[11px] underline cursor-pointer"
              style={{ color: 'var(--text-muted)' }}
            >
              {showJson ? '隱藏 JSON' : '檢視 JSON'}
            </button>
          </div>

          {/* Preset Tags */}
          <div className="flex flex-wrap gap-1.5">
            {CONSTRAINT_TAG_OPTIONS.map((tag) => {
              const active = selectedTags.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => handleToggleTag(tag.id)}
                  className="px-2 py-1 rounded-md border text-[11px] cursor-pointer transition-colors"
                  style={{
                    backgroundColor: active
                      ? 'var(--accent-amber-soft)'
                      : 'var(--bg-panel)',
                    borderColor: active
                      ? 'var(--accent-amber)'
                      : 'var(--border-subtle)',
                    color: active
                      ? 'var(--accent-amber)'
                      : 'var(--text-secondary)',
                  }}
                >
                  {active ? '✓ ' : '+ '}
                  {tag.label}
                </button>
              );
            })}
          </div>

          {/* Free Text Prompt */}
          <div className="space-y-2">
            <textarea
              rows={2}
              value={promptText}
              onChange={(e) =>
                onUpdatePromptTags(e.target.value, selectedTags)
              }
              placeholder="輸入需求，例如：家中有兩隻貓需防抓耐磨材質與貓跳台動線、預算上限 30 萬台幣、保留原有實木餐桌..."
              className="w-full p-2.5 rounded-lg border text-xs resize-none leading-relaxed"
              style={{
                backgroundColor: 'var(--bg-panel)',
                borderColor: 'var(--border-strong)',
                color: 'var(--text-primary)',
              }}
            />
            <button
              type="button"
              onClick={() => onParseConstraints()}
              className="w-full py-1.5 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer"
              style={{
                backgroundColor: 'var(--bg-panel)',
                borderColor: 'var(--border-strong)',
                color: 'var(--text-primary)',
              }}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>LLM 即時解析自然語言為設計約束 JSON</span>
            </button>
          </div>

          {showJson && (
            <pre
              className="p-2.5 rounded-lg border text-[10px] font-mono-cad overflow-x-auto leading-relaxed"
              style={{
                backgroundColor: 'var(--bg-canvas)',
                borderColor: 'var(--border-subtle)',
                color: '#86efac',
              }}
            >
              {JSON.stringify(constraints, null, 2)}
            </pre>
          )}
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
          <span>上一步</span>
        </button>
        <button
          type="button"
          onClick={onGenerate}
          className="flex-1 py-2.5 px-4 rounded-xl font-semibold text-xs text-white flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-transform active:scale-[0.99]"
          style={{ backgroundColor: 'var(--accent-amber)' }}
        >
          <Sparkles className="w-4 h-4" />
          <span>生成模擬與執行物理檢測</span>
        </button>
      </div>
    </div>
  );
};
