import React from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Calculator,
  CheckSquare,
  FileDown,
  FileJson,
  RefreshCw,
  ShoppingBag,
  Square,
} from 'lucide-react';
import type { BomSummary, MatchedProduct } from '../../types/planner';

interface Step4ProcurementPanelProps {
  matchedProducts: MatchedProduct[];
  bomSummary: BomSummary;
  onRefreshProductSearch: () => void;
  onToggleProductInBom: (id: string) => void;
  onExportProposalPdf: () => void;
  onExportJson: () => void;
  onPrevStep: () => void;
}

export const Step4ProcurementPanel: React.FC<Step4ProcurementPanelProps> = ({
  matchedProducts,
  bomSummary,
  onRefreshProductSearch,
  onToggleProductInBom,
  onExportProposalPdf,
  onExportJson,
  onPrevStep,
}) => {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* 1. Visual Search & Product Matching (Feature 10) */}
        <section
          className="rounded-xl border p-3.5 space-y-3"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold flex items-center gap-1.5">
              <ShoppingBag className="w-4 h-4 text-amber-400" />
              <span>軟裝以圖搜物與規格比對（功能 10）</span>
            </h2>
            <button
              type="button"
              onClick={onRefreshProductSearch}
              className="flex items-center gap-1 px-2 py-1 rounded-md border text-[11px] cursor-pointer"
              style={{
                backgroundColor: 'var(--bg-panel)',
                borderColor: 'var(--border-strong)',
                color: 'var(--text-secondary)',
              }}
            >
              <RefreshCw className="w-3 h-3" />
              <span>重新檢索</span>
            </button>
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {matchedProducts.map((prod) => (
              <div
                key={prod.id}
                onClick={() => onToggleProductInBom(prod.id)}
                className="p-2.5 rounded-lg border cursor-pointer transition-all"
                style={{
                  backgroundColor: prod.selectedForBom
                    ? 'var(--accent-amber-soft)'
                    : 'var(--bg-panel)',
                  borderColor: prod.selectedForBom
                    ? 'var(--accent-amber)'
                    : 'var(--border-subtle)',
                }}
              >
                <div className="flex items-start gap-2">
                  <div className="mt-0.5 shrink-0">
                    {prod.selectedForBom ? (
                      <CheckSquare className="w-4 h-4 text-amber-400" />
                    ) : (
                      <Square
                        className="w-4 h-4"
                        style={{ color: 'var(--text-muted)' }}
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span
                        className="text-[10px] font-mono-cad px-1.5 py-0.5 rounded border"
                        style={{
                          borderColor: 'var(--border-strong)',
                          backgroundColor: 'var(--bg-surface)',
                        }}
                      >
                        {prod.brand}
                      </span>
                      <span className="text-[10px] font-mono-cad text-emerald-400">
                        尺寸適配 {prod.fitScore}%
                      </span>
                    </div>
                    <div className="text-xs font-semibold mt-1 leading-snug">
                      {prod.name}
                    </div>
                    <div
                      className="text-[10px] mt-0.5 flex flex-wrap items-center gap-2"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      <span className="font-mono-cad">
                        {prod.widthCm}×{prod.depthCm}×{prod.heightCm}cm
                      </span>
                      <span>· {prod.material}</span>
                      {prod.petFriendly && (
                        <span className="text-emerald-400 font-medium">
                          防抓耐磨 ✓
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-1.5">
                      <span
                        className="text-[10px]"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        對應位置：{prod.targetSlotLabel}
                      </span>
                      <span className="text-xs font-mono-cad font-semibold text-amber-400">
                        NT$ {prod.priceTWD.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 2. BOM & Rough Budget Estimator (Feature 11) */}
        <section
          className="rounded-xl border p-3.5 space-y-3"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold flex items-center gap-1.5">
              <Calculator className="w-4 h-4 text-blue-400" />
              <span>粗估工程與軟裝 BOM 預算（功能 11）</span>
            </h2>
            <span
              className="text-[10px] font-mono-cad"
              style={{ color: 'var(--text-muted)' }}
            >
              地坪 {bomSummary.roomAreaPing} 坪 · 牆 {bomSummary.wallAreaPing} 坪
            </span>
          </div>

          {/* Budget Summary Card */}
          <div
            className="p-3 rounded-xl border space-y-1.5"
            style={{
              backgroundColor: 'var(--bg-panel)',
              borderColor: bomSummary.withinBudget
                ? 'var(--status-pass)'
                : 'var(--status-warn)',
            }}
          >
            <div className="flex items-center justify-between text-xs">
              <span style={{ color: 'var(--text-secondary)' }}>
                預估總預算區間
              </span>
              {bomSummary.budgetCapTWD && (
                <span
                  className="text-[11px] font-mono-cad px-1.5 py-0.5 rounded"
                  style={{
                    backgroundColor: bomSummary.withinBudget
                      ? 'rgba(24,169,116,0.16)'
                      : 'rgba(229,169,59,0.18)',
                    color: bomSummary.withinBudget
                      ? 'var(--status-pass)'
                      : 'var(--status-warn)',
                  }}
                >
                  {bomSummary.withinBudget
                    ? `符合上限 NT$ ${(bomSummary.budgetCapTWD / 10000).toFixed(0)} 萬`
                    : `略高於上限 NT$ ${(bomSummary.budgetCapTWD / 10000).toFixed(0)} 萬`}
                </span>
              )}
            </div>
            <div className="text-lg font-mono-cad font-bold text-amber-400">
              NT$ {bomSummary.totalMinTWD.toLocaleString()} ~{' '}
              {bomSummary.totalMaxTWD.toLocaleString()}
            </div>
          </div>

          {/* Itemized Table */}
          <div className="space-y-1.5">
            {bomSummary.items.map((item) => (
              <div
                key={item.id}
                className="p-2 rounded-lg border text-[11px]"
                style={{
                  backgroundColor: 'var(--bg-panel)',
                  borderColor: 'var(--border-subtle)',
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded"
                    style={{
                      backgroundColor: 'var(--bg-surface)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {item.categoryLabel}
                  </span>
                  <span className="font-mono-cad font-semibold">
                    {item.minTWD === item.maxTWD
                      ? `NT$ ${item.minTWD.toLocaleString()}`
                      : `NT$ ${item.minTWD.toLocaleString()}~${item.maxTWD.toLocaleString()}`}
                  </span>
                </div>
                <div className="font-medium mt-1">{item.name}</div>
                <div
                  className="text-[10px] mt-0.5 font-mono-cad"
                  style={{ color: 'var(--text-muted)' }}
                >
                  估量：{item.quantityText} · 單價：{item.unitRateText}
                </div>
              </div>
            ))}
          </div>

          {/* Mandatory Taiwan Construction Disclaimer */}
          <div
            className="p-2.5 rounded-lg border text-[11px] flex items-start gap-2 leading-relaxed"
            style={{
              backgroundColor: 'rgba(229, 169, 59, 0.1)',
              borderColor: 'rgba(229, 169, 59, 0.45)',
              color: 'var(--status-warn)',
            }}
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="font-medium">{bomSummary.disclaimer}</span>
          </div>
        </section>
      </div>

      {/* Footer CTAs */}
      <div
        className="p-3.5 border-t space-y-2 shrink-0"
        style={{
          borderColor: 'var(--border-subtle)',
          backgroundColor: 'var(--bg-panel)',
        }}
      >
        <button
          type="button"
          onClick={onExportProposalPdf}
          className="w-full py-2.5 px-4 rounded-xl font-semibold text-xs text-white flex items-center justify-center gap-2 cursor-pointer shadow-sm"
          style={{ backgroundColor: 'var(--accent-amber)' }}
        >
          <FileDown className="w-4 h-4" />
          <span>生成並匯出 PDF 設計企劃書</span>
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onPrevStep}
            className="flex-1 py-2 px-3 rounded-lg border text-xs font-medium flex items-center justify-center gap-1 cursor-pointer"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-strong)',
              color: 'var(--text-secondary)',
            }}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>返回微調</span>
          </button>
          <button
            type="button"
            onClick={onExportJson}
            className="flex-1 py-2 px-3 rounded-lg border text-xs font-medium flex items-center justify-center gap-1 cursor-pointer"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-strong)',
              color: 'var(--text-secondary)',
            }}
          >
            <FileJson className="w-3.5 h-3.5" />
            <span>下載 JSON 規格</span>
          </button>
        </div>
      </div>
    </div>
  );
};
