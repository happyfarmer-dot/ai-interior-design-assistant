import React, { useState } from 'react';
import { Printer, X } from 'lucide-react';
import { DESIGN_STYLES, MATERIAL_SWATCHES } from '../../data/presets';
import type {
  BomSummary,
  ErgonomicsReport,
  PlannerDesignState,
} from '../../types/planner';

interface ProposalPreviewModalProps {
  design: PlannerDesignState;
  ergonomics: ErgonomicsReport;
  bom: BomSummary;
  onClose: () => void;
}

export const ProposalPreviewModal: React.FC<ProposalPreviewModalProps> = ({
  design,
  ergonomics,
  bom,
  onClose,
}) => {
  const [exportDate] = useState(() => new Date().toLocaleDateString('zh-TW'));
  const styleSpec =
    DESIGN_STYLES.find((s) => s.id === design.styleId) || DESIGN_STYLES[0];
  const floorSwatch = MATERIAL_SWATCHES.find(
    (m) => m.id === design.appliedMaterials.floor
  );
  const wallSwatch = MATERIAL_SWATCHES.find(
    (m) => m.id === design.appliedMaterials.main_wall
  );
  const selectedProducts = design.matchedProducts.filter(
    (p) => p.selectedForBom
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto print:static print:p-0 print:bg-white">
      <div className="w-full max-w-4xl bg-white text-slate-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] print:max-h-none print:shadow-none print:rounded-none print-only-proposal">
        {/* Top Modal Action Bar (hidden during print) */}
        <div className="no-print px-6 py-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div>
            <div className="text-sm font-semibold">
              室內設計與裝潢輔助企劃書預覽（A4 列印 / PDF 匯出）
            </div>
            <div className="text-[11px] text-slate-400">
              支援瀏覽器「另存為 PDF」完整輸出繁體中文圖表與估算表格
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>列印 / 匯出 PDF 企劃書</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/10 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable A4 Proposal Body */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6 text-slate-800 print:overflow-visible print:p-2">
          {/* Header */}
          <div className="border-b-2 border-slate-900 pb-4 flex items-end justify-between">
            <div>
              <div className="text-xs font-mono-cad uppercase tracking-widest text-amber-700 font-semibold">
                AI INTERIOR & SPATIAL ENGINEERING PROPOSAL
              </div>
              <h1 className="text-2xl font-bold mt-1 text-slate-900">
                {design.roomName} — 空間設計與裝潢評估企劃書
              </h1>
            </div>
            <div className="text-right text-xs font-mono-cad text-slate-500">
              <div>產出日期：{exportDate}</div>
              <div>
                校準尺度：{design.calibration.roomWidthCm}×
                {design.calibration.roomDepthCm} cm（{bom.roomAreaPing} 坪）
              </div>
            </div>
          </div>

          {/* 1. Before / After Visual Comparison */}
          <section className="space-y-2">
            <h2 className="text-sm font-bold text-slate-900 border-l-4 border-amber-600 pl-2.5">
              一、空間現況與模擬效果對比
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <img
                  src={design.roomImageUrl}
                  alt="原始現況"
                  className="w-full aspect-[4/3] object-cover"
                />
                <div className="px-3 py-1.5 bg-slate-100 text-xs font-medium text-slate-700">
                  現況原圖（含 {design.protectionMasks.length} 處保護遮罩鎖定）
                </div>
              </div>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="relative w-full aspect-[4/3]">
                  <img
                    src={design.renderedImageUrl || design.roomImageUrl}
                    alt="設計模擬"
                    className="w-full h-full object-cover"
                  />
                  {design.mode === 'place_object' &&
                    !design.renderedByGemini &&
                    design.newObject &&
                    (design.customPlacedPos || design.placementZones[0]) && (() => {
                    const pos = design.customPlacedPos || design.placementZones[0].anchor;
                    return (
                      <img
                        src={design.newObject.cutoutDataUrl || design.newObject.rawImageUrl}
                        alt={design.newObject.name}
                        className="absolute -translate-x-1/2 -translate-y-full object-contain drop-shadow-lg"
                        style={{
                          left: `${pos.x * 100}%`,
                          top: `${pos.y * 100}%`,
                          width: `${Math.max(12, Math.min(28, (design.newObject.widthCm / 320) * 100))}%`,
                        }}
                      />
                    );
                  })()}
                </div>
                <div className="px-3 py-1.5 bg-amber-50 text-xs font-medium text-amber-900">
                  模擬規劃方案（{design.mode === 'place_object' ? `新增單品：${design.newObject?.name}` : styleSpec.name} · 色溫 {design.lighting.kelvin}K）
                </div>
              </div>
            </div>
          </section>

          {/* 2. Physical Calibration, Constraints & Ergonomics Audit */}
          <section className="grid grid-cols-2 gap-4">
            <div className="border border-slate-200 rounded-lg p-3.5 space-y-2">
              <h3 className="text-xs font-bold text-slate-900">
                空間尺度與設計約束條件
              </h3>
              <ul className="text-xs space-y-1 text-slate-700">
                <li>
                  • 物理比例尺：1 cm = {design.calibration.pxPerCm} px（牆面塗裝面積約{' '}
                  {bom.wallAreaPing} 坪）
                </li>
                <li>
                  • 鎖定保護區域：
                  {design.protectionMasks.map((m) => m.label).join('、') || '無'}
                </li>
                <li>
                  • 局部材質：{floorSwatch?.name || '預設木地板'} /{' '}
                  {wallSwatch?.name || '預設乳膠漆'}
                </li>
                <li>
                  • 客製需求：{design.promptText || '無額外文字補充'}
                </li>
              </ul>
            </div>

            <div className="border border-slate-200 rounded-lg p-3.5 space-y-2">
              <h3 className="text-xs font-bold text-slate-900">
                動線與人體工學物理檢核報告
              </h3>
              <div className="space-y-1.5">
                {ergonomics.metrics.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between text-xs border-b border-slate-100 pb-1"
                  >
                    <span className="font-medium">{m.label}</span>
                    <span
                      className={`font-mono-cad font-semibold ${
                        m.status === 'pass'
                          ? 'text-emerald-700'
                          : m.status === 'warn'
                            ? 'text-amber-700'
                            : 'text-red-700'
                      }`}
                    >
                      {m.valueText}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* 3. Matched Retail Soft Furnishings */}
          {selectedProducts.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-sm font-bold text-slate-900 border-l-4 border-amber-600 pl-2.5">
                二、推薦軟裝實體採購清單（依空間尺度比對）
              </h2>
              <table className="w-full text-xs border-collapse border border-slate-200">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="border border-slate-200 p-2 text-left">品牌</th>
                    <th className="border border-slate-200 p-2 text-left">品名與材質</th>
                    <th className="border border-slate-200 p-2 text-center">實體尺寸 (cm)</th>
                    <th className="border border-slate-200 p-2 text-center">適配度</th>
                    <th className="border border-slate-200 p-2 text-right">參考售價</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedProducts.map((p) => (
                    <tr key={p.id}>
                      <td className="border border-slate-200 p-2 font-medium">{p.brand}</td>
                      <td className="border border-slate-200 p-2">
                        <div>{p.name}</div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-2">
                          <span>{p.material}</span>
                          {(p.searchUrl || p.urlSlug) && (
                            <a
                              href={p.searchUrl || p.urlSlug}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-amber-700 underline"
                            >
                              關鍵字搜尋連結
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="border border-slate-200 p-2 text-center font-mono-cad">
                        {p.widthCm}×{p.depthCm}×{p.heightCm}
                      </td>
                      <td className="border border-slate-200 p-2 text-center font-mono-cad text-emerald-700 font-semibold">
                        {p.fitScore}%
                      </td>
                      <td className="border border-slate-200 p-2 text-right font-mono-cad font-semibold">
                        NT$ {p.priceTWD.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {/* 4. BOM Budget Table */}
          <section className="space-y-2">
            <h2 className="text-sm font-bold text-slate-900 border-l-4 border-amber-600 pl-2.5">
              三、工程表面材與軟裝粗估 BOM 預算表
            </h2>
            <table className="w-full text-xs border-collapse border border-slate-200">
              <thead className="bg-slate-100">
                <tr>
                  <th className="border border-slate-200 p-2 text-left">類別</th>
                  <th className="border border-slate-200 p-2 text-left">項目說明</th>
                  <th className="border border-slate-200 p-2 text-center">估算數量</th>
                  <th className="border border-slate-200 p-2 text-right">金額區間 (NT$)</th>
                </tr>
              </thead>
              <tbody>
                {bom.items.map((item) => (
                  <tr key={item.id}>
                    <td className="border border-slate-200 p-2">{item.categoryLabel}</td>
                    <td className="border border-slate-200 p-2">{item.name}</td>
                    <td className="border border-slate-200 p-2 text-center font-mono-cad">
                      {item.quantityText}
                    </td>
                    <td className="border border-slate-200 p-2 text-right font-mono-cad">
                      {item.minTWD === item.maxTWD
                        ? item.minTWD.toLocaleString()
                        : `${item.minTWD.toLocaleString()} ~ ${item.maxTWD.toLocaleString()}`}
                    </td>
                  </tr>
                ))}
                <tr className="bg-amber-50 font-bold">
                  <td colSpan={3} className="border border-slate-200 p-2.5 text-right">
                    粗估總預算區間
                  </td>
                  <td className="border border-slate-200 p-2.5 text-right font-mono-cad text-amber-800 text-sm">
                    NT$ {bom.totalMinTWD.toLocaleString()} ~{' '}
                    {bom.totalMaxTWD.toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
            <div className="p-2.5 bg-amber-50 border border-amber-300 rounded-lg text-xs text-amber-900 font-medium">
              ※ 備註聲明：{bom.disclaimer}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
