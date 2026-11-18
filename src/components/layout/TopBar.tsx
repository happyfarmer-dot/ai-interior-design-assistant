import React from 'react';
import {
  Camera,
  Check,
  Cpu,
  FileDown,
  History,
  Moon,
  Redo2,
  Sun,
  Undo2,
} from 'lucide-react';
import type {
  AiServiceConfig,
  ScaleCalibration,
  WorkflowStep,
} from '../../types/planner';

interface TopBarProps {
  step: WorkflowStep;
  roomName: string;
  calibration: ScaleCalibration;
  canUndo: boolean;
  canRedo: boolean;
  snapshotCount: number;
  theme: 'dark' | 'light';
  aiConfig: AiServiceConfig;
  onSelectStep: (step: WorkflowStep) => void;
  onUndo: () => void;
  onRedo: () => void;
  onSaveSnapshot: () => void;
  onOpenSnapshots: () => void;
  onOpenAiSettings: () => void;
  onToggleTheme: () => void;
  onOpenProposal: () => void;
}

const STEPS: { id: WorkflowStep; num: string; title: string; subtitle: string }[] = [
  { id: 1, num: '01', title: '匯入與尺度校準', subtitle: '比例尺・保護遮罩' },
  { id: 2, num: '02', title: '模式與需求設定', subtitle: '重排・風格・擺放・約束' },
  { id: 3, num: '03', title: '模擬與物理檢測', subtitle: '動線・光影・局部換材' },
  { id: 4, num: '04', title: '選品與預算 BOM', subtitle: '以圖搜物・匯出企劃' },
];

export const TopBar: React.FC<TopBarProps> = ({
  step,
  roomName,
  calibration,
  canUndo,
  canRedo,
  snapshotCount,
  theme,
  aiConfig,
  onSelectStep,
  onUndo,
  onRedo,
  onSaveSnapshot,
  onOpenSnapshots,
  onOpenAiSettings,
  onToggleTheme,
  onOpenProposal,
}) => {
  return (
    <header
      className="no-print h-14 shrink-0 border-b px-3 lg:px-4 flex items-center justify-between gap-3 select-none"
      style={{
        backgroundColor: 'var(--bg-panel)',
        borderColor: 'var(--border-subtle)',
      }}
    >
      {/* Left: Brand & Room Telemetry */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center gap-2.5 shrink-0">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm tracking-tight border"
            style={{
              backgroundColor: 'var(--accent-amber-soft)',
              borderColor: 'var(--accent-amber)',
              color: 'var(--accent-amber)',
            }}
          >
            築
          </div>
          <div className="hidden sm:block">
            <div className="text-sm font-semibold tracking-tight leading-tight flex items-center gap-1.5">
              <span>築境 AI</span>
              <span
                className="text-[10px] font-mono-cad px-1.5 py-0.5 rounded border"
                style={{
                  borderColor: 'var(--border-strong)',
                  color: 'var(--text-secondary)',
                  backgroundColor: 'var(--bg-surface)',
                }}
              >
                SPATIAL CAD
              </span>
            </div>
            <div
              className="text-[11px] truncate max-w-[180px]"
              style={{ color: 'var(--text-muted)' }}
            >
              {roomName}
            </div>
          </div>
        </div>

        <div
          className="hidden 2xl:flex items-center gap-2 px-2.5 py-1 rounded-md border text-[11px] font-mono-cad whitespace-nowrap"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-subtle)',
            color: 'var(--text-secondary)',
          }}
        >
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{
              backgroundColor: calibration.calibrated
                ? 'var(--status-pass)'
                : 'var(--status-warn)',
            }}
          />
          <span>
            {calibration.roomWidthCm}×{calibration.roomDepthCm}cm
          </span>
          <span style={{ color: 'var(--text-muted)' }}>|</span>
          <span>1cm = {calibration.pxPerCm}px</span>
        </div>
      </div>

      {/* Center: 4-Step Workflow Stepper */}
      <nav
        aria-label="設計流程步驟"
        className="flex items-center gap-1 overflow-x-auto py-1 min-w-0"
      >
        {STEPS.map((s, idx) => {
          const isActive = step === s.id;
          const isDone = step > s.id;
          return (
            <React.Fragment key={s.id}>
              <button
                type="button"
                onClick={() => onSelectStep(s.id)}
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-left transition-colors cursor-pointer shrink-0 border"
                style={{
                  backgroundColor: isActive
                    ? 'var(--accent-amber-soft)'
                    : 'transparent',
                  borderColor: isActive
                    ? 'var(--accent-amber)'
                    : 'transparent',
                }}
              >
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-mono-cad font-semibold shrink-0"
                  style={{
                    backgroundColor: isActive
                      ? 'var(--accent-amber)'
                      : isDone
                        ? 'var(--status-pass)'
                        : 'var(--bg-elevated)',
                    color:
                      isActive || isDone ? '#ffffff' : 'var(--text-secondary)',
                  }}
                >
                  {isDone ? <Check className="w-3 h-3" /> : s.num}
                </span>
                <div className="leading-tight">
                  <div
                    className="text-xs font-medium whitespace-nowrap"
                    style={{
                      color: isActive
                        ? 'var(--text-primary)'
                        : 'var(--text-secondary)',
                    }}
                  >
                    {s.title}
                  </div>
                  <div
                    className="hidden xl:block text-[10px] whitespace-nowrap"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {s.subtitle}
                  </div>
                </div>
              </button>
              {idx < STEPS.length - 1 && (
                <div
                  className="hidden sm:block w-2 h-px shrink-0"
                  style={{ backgroundColor: 'var(--border-strong)' }}
                />
              )}
            </React.Fragment>
          );
        })}
      </nav>

      {/* Right: Undo/Redo, Snapshots, AI Pipeline, Theme, Export */}
      <div className="flex items-center gap-1.5 shrink-0">
        <div
          className="flex items-center rounded-lg border p-0.5"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            title="復原 (Ctrl/Cmd + Z)"
            className="p-1.5 rounded-md transition-opacity disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed hover:bg-black/10"
            style={{ color: 'var(--text-primary)' }}
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            title="重做 (Ctrl/Cmd + Shift + Z)"
            className="p-1.5 rounded-md transition-opacity disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed hover:bg-black/10"
            style={{ color: 'var(--text-primary)' }}
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </div>

        <button
          type="button"
          onClick={onSaveSnapshot}
          title="儲存目前版本快照"
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-colors"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-subtle)',
            color: 'var(--text-secondary)',
          }}
        >
          <Camera className="w-3.5 h-3.5" />
          <span className="hidden lg:inline">儲存快照</span>
        </button>

        <button
          type="button"
          onClick={onOpenSnapshots}
          title="版本快照歷史紀錄"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium cursor-pointer"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-subtle)',
            color: 'var(--text-primary)',
          }}
        >
          <History className="w-3.5 h-3.5" />
          <span className="font-mono-cad text-[11px]">{snapshotCount}</span>
        </button>

        <button
          type="button"
          onClick={onOpenAiSettings}
          title="AI 管線服務設定 (VLM / Diffusion / LLM)"
          className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium cursor-pointer"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-subtle)',
            color: 'var(--text-secondary)',
          }}
        >
          <Cpu className="w-3.5 h-3.5" />
          <span className="font-mono-cad text-[11px]">
            {aiConfig.mode === 'live' ? 'LIVE API' : 'MOCK AI'}
          </span>
        </button>

        <button
          type="button"
          onClick={onToggleTheme}
          title="切換深色 / 淺色建築工作台"
          className="p-1.5 rounded-lg border cursor-pointer"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-subtle)',
            color: 'var(--text-secondary)',
          }}
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4" />
          ) : (
            <Moon className="w-4 h-4" />
          )}
        </button>

        <button
          type="button"
          onClick={onOpenProposal}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white cursor-pointer shadow-sm transition-transform active:scale-[0.98]"
          style={{ backgroundColor: 'var(--accent-amber)' }}
        >
          <FileDown className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">匯出企劃書</span>
        </button>
      </div>
    </header>
  );
};
