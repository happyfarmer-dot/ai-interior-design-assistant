import React, { useState } from 'react';
import { Camera, History, RotateCcw, Trash2, X } from 'lucide-react';
import { DESIGN_STYLES } from '../../data/presets';
import type { DesignSnapshot } from '../../types/planner';

interface VersionHistoryModalProps {
  snapshots: DesignSnapshot[];
  onSaveSnapshot: (label: string) => void;
  onRestoreSnapshot: (id: string) => void;
  onDeleteSnapshot: (id: string) => void;
  onClose: () => void;
}

export const VersionHistoryModal: React.FC<VersionHistoryModalProps> = ({
  snapshots,
  onSaveSnapshot,
  onRestoreSnapshot,
  onDeleteSnapshot,
  onClose,
}) => {
  const [labelInput, setLabelInput] = useState('');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const name = labelInput.trim() || `設計快照 ${snapshots.length + 1}`;
    onSaveSnapshot(name);
    setLabelInput('');
  };

  return (
    <div className="no-print fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        className="w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[82vh]"
        style={{
          backgroundColor: 'var(--bg-panel)',
          borderColor: 'var(--border-strong)',
        }}
      >
        <div
          className="px-5 py-3.5 border-b flex items-center justify-between"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div className="flex items-center gap-2 font-semibold text-sm">
            <History className="w-4 h-4 text-amber-400" />
            <span>設計版本快照歷史紀錄 (Version History)</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form
          onSubmit={handleSave}
          className="p-4 border-b flex items-center gap-2"
          style={{
            borderColor: 'var(--border-subtle)',
            backgroundColor: 'var(--bg-surface)',
          }}
        >
          <input
            type="text"
            value={labelInput}
            onChange={(e) => setLabelInput(e.target.value)}
            placeholder="輸入快照名稱，例如：北歐風+貓跳台方案..."
            className="flex-1 px-3 py-1.5 rounded-lg border text-xs"
            style={{
              backgroundColor: 'var(--bg-panel)',
              borderColor: 'var(--border-strong)',
              color: 'var(--text-primary)',
            }}
          />
          <button
            type="submit"
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white flex items-center gap-1.5 cursor-pointer"
            style={{ backgroundColor: 'var(--accent-amber)' }}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>建立快照</span>
          </button>
        </form>

        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {snapshots.map((snap) => {
            const styleName =
              DESIGN_STYLES.find((s) => s.id === snap.styleId)?.name ||
              snap.styleId;
            return (
              <div
                key={snap.id}
                className="p-3 rounded-xl border flex items-center justify-between gap-3"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-subtle)',
                }}
              >
                <div className="min-w-0">
                  <div className="text-xs font-semibold truncate">
                    {snap.label}
                  </div>
                  <div
                    className="text-[11px] font-mono-cad mt-0.5 flex items-center gap-2"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    <span>{snap.createdAt}</span>
                    <span>· 步驟 {snap.step}</span>
                    <span>· {styleName}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      onRestoreSnapshot(snap.id);
                      onClose();
                    }}
                    className="px-2.5 py-1 rounded-lg border text-xs font-medium flex items-center gap-1 cursor-pointer"
                    style={{
                      backgroundColor: 'var(--accent-cobalt-soft)',
                      borderColor: 'var(--accent-cobalt)',
                      color: 'var(--accent-cobalt)',
                    }}
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>切換還原</span>
                  </button>
                  {snapshots.length > 1 && (
                    <button
                      type="button"
                      onClick={() => onDeleteSnapshot(snap.id)}
                      className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/15 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
