import React, { useState } from 'react';
import {
  Brush,
  Eye,
  Grid,
  Hand,
  Layers,
  MousePointer2,
  PaintBucket,
  Pentagon,
  Ruler,
} from 'lucide-react';
import type { CanvasTool, LayerVisibility } from '../../types/planner';

interface LeftToolRailProps {
  activeTool: CanvasTool;
  layers: LayerVisibility;
  showPerspectiveGrid: boolean;
  onSelectTool: (tool: CanvasTool) => void;
  onToggleLayer: (layer: keyof LayerVisibility) => void;
  onTogglePerspectiveGrid: () => void;
}

const TOOLS: {
  id: CanvasTool;
  label: string;
  shortcut: string;
  icon: React.FC<{ className?: string }>;
}[] = [
  { id: 'select', label: '選取 / 拖拽物件', shortcut: 'V', icon: MousePointer2 },
  { id: 'pan', label: '平移視口', shortcut: 'H', icon: Hand },
  { id: 'scale', label: '空間尺度校準線', shortcut: 'S', icon: Ruler },
  { id: 'mask_brush', label: '不可更動筆刷遮罩', shortcut: 'B', icon: Brush },
  { id: 'mask_polygon', label: '多邊形結構遮罩', shortcut: 'P', icon: Pentagon },
  { id: 'material_pick', label: '局部材質點選替換', shortcut: 'M', icon: PaintBucket },
];

const LAYER_LABELS: { key: keyof LayerVisibility; label: string }[] = [
  { key: 'detectedFurniture', label: '偵測傢俱輪廓框' },
  { key: 'protectionMasks', label: '結構與機電保護區' },
  { key: 'lightingOverlay', label: '自然採光與色溫模擬' },
  { key: 'materialOverlay', label: '局部材質重繪層' },
  { key: 'placedObject', label: '新增單品透視合成' },
  { key: 'ergonomicCallouts', label: '動線尺度標註線' },
];

export const LeftToolRail: React.FC<LeftToolRailProps> = ({
  activeTool,
  layers,
  showPerspectiveGrid,
  onSelectTool,
  onToggleLayer,
  onTogglePerspectiveGrid,
}) => {
  const [layersOpen, setLayersOpen] = useState(false);

  return (
    <aside
      className="no-print relative w-13 shrink-0 border-r flex flex-col items-center py-3 justify-between select-none z-20"
      style={{
        backgroundColor: 'var(--bg-panel)',
        borderColor: 'var(--border-subtle)',
      }}
    >
      <div className="flex flex-col items-center gap-1.5">
        {TOOLS.map((tool) => {
          const Icon = tool.icon;
          const isActive = activeTool === tool.id;
          return (
            <button
              key={tool.id}
              type="button"
              onClick={() => onSelectTool(tool.id)}
              title={`${tool.label} (${tool.shortcut})`}
              className="w-9 h-9 rounded-lg flex items-center justify-center transition-all cursor-pointer border"
              style={{
                backgroundColor: isActive
                  ? 'var(--accent-amber-soft)'
                  : 'transparent',
                borderColor: isActive ? 'var(--accent-amber)' : 'transparent',
                color: isActive
                  ? 'var(--accent-amber)'
                  : 'var(--text-secondary)',
              }}
            >
              <Icon className="w-4 h-4" />
            </button>
          );
        })}
      </div>

      <div className="flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={onTogglePerspectiveGrid}
          title="切換 3D 透視校準網格"
          className="w-9 h-9 rounded-lg flex items-center justify-center transition-all cursor-pointer border"
          style={{
            backgroundColor: showPerspectiveGrid
              ? 'var(--accent-cobalt-soft)'
              : 'transparent',
            borderColor: showPerspectiveGrid
              ? 'var(--accent-cobalt)'
              : 'transparent',
            color: showPerspectiveGrid
              ? 'var(--accent-cobalt)'
              : 'var(--text-secondary)',
          }}
        >
          <Grid className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => setLayersOpen((o) => !o)}
          title="圖層顯示控制"
          className="w-9 h-9 rounded-lg flex items-center justify-center transition-all cursor-pointer border"
          style={{
            backgroundColor: layersOpen
              ? 'var(--bg-elevated)'
              : 'transparent',
            borderColor: layersOpen ? 'var(--border-strong)' : 'transparent',
            color: layersOpen ? 'var(--text-primary)' : 'var(--text-secondary)',
          }}
        >
          <Layers className="w-4 h-4" />
        </button>
      </div>

      {layersOpen && (
        <div
          className="absolute left-14 bottom-3 w-56 rounded-xl border p-3 shadow-2xl z-30"
          style={{
            backgroundColor: 'var(--bg-panel)',
            borderColor: 'var(--border-strong)',
          }}
        >
          <div className="flex items-center justify-between mb-2 pb-1.5 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
            <span className="text-xs font-semibold flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5" />
              圖層可視控制
            </span>
            <button
              type="button"
              onClick={() => setLayersOpen(false)}
              className="text-[11px] cursor-pointer"
              style={{ color: 'var(--text-muted)' }}
            >
              關閉
            </button>
          </div>
          <div className="space-y-1.5">
            {LAYER_LABELS.map((item) => (
              <label
                key={item.key}
                className="flex items-center justify-between text-xs py-1 px-1.5 rounded hover:bg-white/5 cursor-pointer"
              >
                <span style={{ color: 'var(--text-secondary)' }}>
                  {item.label}
                </span>
                <input
                  type="checkbox"
                  checked={layers[item.key]}
                  onChange={() => onToggleLayer(item.key)}
                  className="accent-amber-500 cursor-pointer"
                />
              </label>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
};
