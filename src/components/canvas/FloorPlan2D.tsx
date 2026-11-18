import React, { useRef, useState } from 'react';
import { RotateCw } from 'lucide-react';
import { getOrientedBounds } from '../../services/physics/ergonomicsEngine';
import type {
  DoorSwingArc,
  ErgonomicsReport,
  FurnitureItem,
  ProtectionMask,
  ScaleCalibration,
} from '../../types/planner';

interface FloorPlan2DProps {
  calibration: ScaleCalibration;
  furniture: FurnitureItem[];
  protectionMasks: ProtectionMask[];
  doorSwings: DoorSwingArc[];
  ergonomics: ErgonomicsReport;
  onMoveItem: (id: string, xCm: number, yCm: number, commit: boolean) => void;
  onRotateItem: (id: string) => void;
}

export const FloorPlan2D: React.FC<FloorPlan2DProps> = ({
  calibration,
  furniture,
  protectionMasks,
  doorSwings,
  ergonomics,
  onMoveItem,
  onRotateItem,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragging, setDragging] = useState<{
    id: string;
    offsetXCm: number;
    offsetYCm: number;
  } | null>(null);

  const pad = 48;
  const rw = calibration.roomWidthCm;
  const rd = calibration.roomDepthCm;
  const vbW = rw + pad * 2;
  const vbH = rd + pad * 2;

  const clientToCm = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { xCm: 0, yCm: 0 };
    const rect = svg.getBoundingClientRect();
    const xSvg = ((clientX - rect.left) / rect.width) * vbW;
    const ySvg = ((clientY - rect.top) / rect.height) * vbH;
    return {
      xCm: xSvg - pad,
      yCm: ySvg - pad,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!dragging) return;
    const pt = clientToCm(e.clientX, e.clientY);
    onMoveItem(
      dragging.id,
      pt.xCm - dragging.offsetXCm,
      pt.yCm - dragging.offsetYCm,
      false
    );
  };

  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!dragging) return;
    const pt = clientToCm(e.clientX, e.clientY);
    onMoveItem(
      dragging.id,
      pt.xCm - dragging.offsetXCm,
      pt.yCm - dragging.offsetYCm,
      true
    );
    setDragging(null);
  };

  const statusColor =
    ergonomics.overallStatus === 'pass'
      ? '#18a974'
      : ergonomics.overallStatus === 'warn'
        ? '#e5a93b'
        : '#e04f5f';

  // Compute TV sightline endpoints if both sofa/bed and TV exist
  const sofa = furniture.find((f) => f.category === 'sofa' || f.category === 'bed');
  const tv = furniture.find((f) => f.category === 'tv_console');
  const sofaB = sofa ? getOrientedBounds(sofa.floorRect) : null;
  const tvB = tv ? getOrientedBounds(tv.floorRect) : null;

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4 overflow-hidden">
      <div
        className="relative w-full max-w-3xl h-full max-h-[620px] rounded-xl border flex flex-col overflow-hidden"
        style={{
          backgroundColor: 'var(--bg-panel)',
          borderColor: 'var(--border-strong)',
        }}
      >
        {/* Top CAD Blueprint Legend */}
        <div
          className="px-4 py-2.5 border-b flex flex-wrap items-center justify-between gap-2 text-xs"
          style={{
            borderColor: 'var(--border-subtle)',
            backgroundColor: 'var(--bg-surface)',
          }}
        >
          <div className="flex items-center gap-2 font-medium">
            <span
              className="px-2 py-0.5 rounded font-mono-cad text-[11px]"
              style={{
                backgroundColor: 'var(--accent-cobalt-soft)',
                color: 'var(--accent-cobalt)',
              }}
            >
              2D CAD 平面配置
            </span>
            <span style={{ color: 'var(--text-secondary)' }}>
              可直接在平面圖拖曳傢俱或點選旋轉，即時演算動線淨寬與開門半徑
            </span>
          </div>
          <div className="flex items-center gap-3 font-mono-cad text-[11px]">
            <span style={{ color: statusColor }}>
              主走道：{ergonomics.walkwayMinCm} cm (標準 ≥ {ergonomics.walkwayRequiredCm}cm)
            </span>
            {selectedId && (
              <button
                type="button"
                onClick={() => onRotateItem(selectedId)}
                className="flex items-center gap-1 px-2 py-1 rounded border cursor-pointer"
                style={{
                  borderColor: 'var(--accent-amber)',
                  color: 'var(--accent-amber)',
                  backgroundColor: 'var(--accent-amber-soft)',
                }}
              >
                <RotateCw className="w-3 h-3" />
                旋轉 90°
              </button>
            )}
          </div>
        </div>

        {/* SVG Blueprint Canvas */}
        <div className="flex-1 min-h-0 flex items-center justify-center p-3">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${vbW} ${vbH}`}
            className="w-full h-full max-h-full select-none touch-none"
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          >
            <defs>
              <pattern
                id="cadGrid2D"
                width="50"
                height="50"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 50 0 L 0 0 0 50"
                  fill="none"
                  stroke="rgba(148,163,184,0.14)"
                  strokeWidth="0.7"
                />
              </pattern>
              <pattern
                id="mepHatch2D"
                width="10"
                height="10"
                patternTransform="rotate(45)"
                patternUnits="userSpaceOnUse"
              >
                <line
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="10"
                  stroke="rgba(245, 158, 11, 0.55)"
                  strokeWidth="2.5"
                />
              </pattern>
            </defs>

            {/* Room Floor Area */}
            <g transform={`translate(${pad}, ${pad})`}>
              <rect
                x={0}
                y={0}
                width={rw}
                height={rd}
                fill="url(#cadGrid2D)"
                stroke="#64748b"
                strokeWidth="4"
                rx="2"
              />

              {/* Top Window Wall Label */}
              <text
                x={rw / 2}
                y={-18}
                textAnchor="middle"
                fill="#94a3b8"
                fontSize="12"
                className="font-mono-cad"
              >
                採光陽台 / 窗戶牆面 ({rw} cm)
              </text>

              {/* Left Wall Width */}
              <text
                x={-16}
                y={rd / 2}
                textAnchor="middle"
                transform={`rotate(-90 -16 ${rd / 2})`}
                fill="#94a3b8"
                fontSize="12"
                className="font-mono-cad"
              >
                空間縱深 {rd} cm
              </text>

              {/* Protection Mask Floor Zones (Feature 7) */}
              {protectionMasks
                .filter((m) => m.floorZone)
                .map((m) => {
                  const z = m.floorZone!;
                  const strokeCol =
                    m.category === 'window_daylight'
                      ? '#38bdf8'
                      : m.category === 'ac_vent'
                        ? '#f59e0b'
                        : '#f97316';
                  return (
                    <g key={m.id}>
                      <rect
                        x={z.xCm}
                        y={z.yCm}
                        width={z.wCm}
                        height={z.dCm}
                        fill="url(#mepHatch2D)"
                        stroke={strokeCol}
                        strokeWidth="1.5"
                        strokeDasharray="4 3"
                      />
                      <text
                        x={z.xCm + z.wCm / 2}
                        y={z.yCm + z.dCm / 2 + 4}
                        textAnchor="middle"
                        fill={strokeCol}
                        fontSize="10"
                        fontWeight="600"
                      >
                        {m.label}
                      </text>
                    </g>
                  );
                })}

              {/* Door Swing Arcs (Feature 6) */}
              {doorSwings.map((door) => {
                const r = door.radiusCm;
                const a1 = (door.startAngleDeg * Math.PI) / 180;
                const a2 = (door.endAngleDeg * Math.PI) / 180;
                const x1 = door.hingeXCm + r * Math.cos(a1);
                const y1 = door.hingeYCm + r * Math.sin(a1);
                const x2 = door.hingeXCm + r * Math.cos(a2);
                const y2 = door.hingeYCm + r * Math.sin(a2);
                const blocked = ergonomics.doorBlocked;
                return (
                  <g key={door.id}>
                    <path
                      d={`M ${door.hingeXCm} ${door.hingeYCm} L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z`}
                      fill={
                        blocked
                          ? 'rgba(224, 79, 95, 0.24)'
                          : 'rgba(24, 169, 116, 0.14)'
                      }
                      stroke={blocked ? '#e04f5f' : '#18a974'}
                      strokeWidth="1.6"
                      strokeDasharray="5 3"
                    />
                    <line
                      x1={door.hingeXCm}
                      y1={door.hingeYCm}
                      x2={x2}
                      y2={y2}
                      stroke={blocked ? '#e04f5f' : '#18a974'}
                      strokeWidth="3"
                    />
                    <text
                      x={door.hingeXCm - r * 0.45}
                      y={door.hingeYCm - 10}
                      textAnchor="middle"
                      fill={blocked ? '#f87171' : '#34d399'}
                      fontSize="10"
                      fontWeight="600"
                    >
                      {blocked ? '⚠ 開門受阻' : '開門半徑 85cm'}
                    </text>
                  </g>
                );
              })}

              {/* Furniture Footprints */}
              {furniture.map((item) => {
                const b = getOrientedBounds(item.floorRect);
                const w = b.x2 - b.x1;
                const d = b.y2 - b.y1;
                const isSelected = selectedId === item.id;
                const displayName =
                  w < 55
                    ? item.name.slice(0, 4)
                    : w < 85 && item.name.length > 7
                      ? item.name.slice(0, 6) + '…'
                      : item.name.slice(0, 10);
                return (
                  <g
                    key={item.id}
                    className="cursor-move"
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      setSelectedId(item.id);
                      if (item.locked || item.isNewObject) return;
                      const pt = clientToCm(e.clientX, e.clientY);
                      setDragging({
                        id: item.id,
                        offsetXCm: pt.xCm - item.floorRect.xCm,
                        offsetYCm: pt.yCm - item.floorRect.yCm,
                      });
                    }}
                  >
                    <rect
                      x={b.x1}
                      y={b.y1}
                      width={w}
                      height={d}
                      rx="4"
                      fill={
                        item.isNewObject
                          ? 'rgba(217, 130, 43, 0.32)'
                          : 'rgba(59, 130, 246, 0.22)'
                      }
                      stroke={
                        isSelected
                          ? '#f59e0b'
                          : item.isNewObject
                            ? '#d9822b'
                            : '#60a5fa'
                      }
                      strokeWidth={isSelected ? '3' : '1.8'}
                    />
                    <text
                      x={b.x1 + w / 2}
                      y={b.y1 + d / 2 - 4}
                      textAnchor="middle"
                      fill="#f8fafc"
                      fontSize={w < 70 ? '9.5' : '11'}
                      fontWeight="600"
                    >
                      {displayName}
                    </text>
                    <text
                      x={b.x1 + w / 2}
                      y={b.y1 + d / 2 + 12}
                      textAnchor="middle"
                      fill="#cbd5e1"
                      fontSize={w < 70 ? '9' : '10'}
                      className="font-mono-cad"
                    >
                      {Math.round(w)}×{Math.round(d)}cm
                    </text>
                    {item.locked && (
                      <g transform={`translate(${b.x2 - 14}, ${b.y1 + 4})`}>
                        <circle r="8" cx="5" cy="5" fill="#d9822b" />
                        <text
                          x="5"
                          y="8.5"
                          textAnchor="middle"
                          fontSize="9"
                          fill="#ffffff"
                        >
                          🔒
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}

              {/* TV Sightline (rendered on top in clear walkway corridor) */}
              {sofaB && tvB && (() => {
                const sx = (sofaB.x1 + sofaB.x2) / 2;
                const sy = (sofaB.y1 + sofaB.y2) / 2;
                const tx = (tvB.x1 + tvB.x2) / 2;
                const ty = (tvB.y1 + tvB.y2) / 2;
                const bx = sx + (tx - sx) * 0.74;
                const by = sy + (ty - sy) * 0.74;
                return (
                  <g className="pointer-events-none">
                    <line
                      x1={sx}
                      y1={sy}
                      x2={tx}
                      y2={ty}
                      stroke="#3b82f6"
                      strokeOpacity="0.65"
                      strokeWidth="1.5"
                      strokeDasharray="6 4"
                    />
                    <rect
                      x={bx - 42}
                      y={by - 11}
                      width="84"
                      height="20"
                      rx="4"
                      fill="#0f172a"
                      stroke="#3b82f6"
                      strokeWidth="1"
                    />
                    <text
                      x={bx}
                      y={by + 3}
                      textAnchor="middle"
                      fill="#93c5fd"
                      fontSize="10"
                      className="font-mono-cad"
                    >
                      視距 {ergonomics.tvDistanceCm}cm
                    </text>
                  </g>
                );
              })()}

              {/* Bottom Entryway Reference */}
              <text
                x={rw / 2}
                y={rd + 22}
                textAnchor="middle"
                fill="#94a3b8"
                fontSize="11"
                className="font-mono-cad"
              >
                主入口 / 攝影視角方向
              </text>
            </g>
          </svg>
        </div>
      </div>
    </div>
  );
};
