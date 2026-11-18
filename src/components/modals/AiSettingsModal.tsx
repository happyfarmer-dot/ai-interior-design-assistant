import React, { useState } from 'react';
import { Cpu, X } from 'lucide-react';
import type { AiServiceConfig } from '../../types/planner';

interface AiSettingsModalProps {
  config: AiServiceConfig;
  onSave: (patch: Partial<AiServiceConfig>) => void;
  onClose: () => void;
}

export const AiSettingsModal: React.FC<AiSettingsModalProps> = ({
  config,
  onSave,
  onClose,
}) => {
  const [draft, setDraft] = useState<AiServiceConfig>(config);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(draft);
    onClose();
  };

  return (
    <div className="no-print fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-4">
      <form
        onSubmit={handleSave}
        className="w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden flex flex-col"
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
            <Cpu className="w-4 h-4 text-blue-400" />
            <span>AI 管線抽象層與 API 介接設定</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs overflow-y-auto max-h-[75vh]">
          <div
            className="p-3 rounded-xl border leading-relaxed"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-secondary)',
            }}
          >
            本系統採用 <code className="font-mono-cad text-amber-400">IVisionService</code>、
            <code className="font-mono-cad text-amber-400">IRenderingService</code> 與{' '}
            <code className="font-mono-cad text-amber-400">IConstraintParserService</code>{' '}
            模組化介面設計。預設為離線 <strong>Mock 演示引擎</strong>（無須 API Key 即可完整互動）；切換至 Live 模式並填入端點與金鑰即可串接真實雲端推論。
          </div>

          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'mock' as const, label: 'Mock 內建演算引擎 (預設)' },
              { id: 'live' as const, label: 'Live 外部 API 串接模式' },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setDraft({ ...draft, mode: opt.id })}
                className="py-2 px-3 rounded-lg border font-medium cursor-pointer"
                style={{
                  backgroundColor:
                    draft.mode === opt.id
                      ? 'var(--accent-cobalt-soft)'
                      : 'var(--bg-surface)',
                  borderColor:
                    draft.mode === opt.id
                      ? 'var(--accent-cobalt)'
                      : 'var(--border-subtle)',
                  color:
                    draft.mode === opt.id
                      ? 'var(--accent-cobalt)'
                      : 'var(--text-secondary)',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            <div>
              <label className="block mb-1 font-medium">
                1. VLM 視覺辨識端點 (Vision API Endpoint)
              </label>
              <input
                type="text"
                value={draft.visionEndpoint}
                onChange={(e) =>
                  setDraft({ ...draft, visionEndpoint: e.target.value })
                }
                className="w-full px-3 py-1.5 rounded-lg border font-mono-cad text-[11px]"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-strong)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>

            <div>
              <label className="block mb-1 font-medium">
                2. Diffusion / Inpainting 生成端點 (Render API Endpoint)
              </label>
              <input
                type="text"
                value={draft.renderEndpoint}
                onChange={(e) =>
                  setDraft({ ...draft, renderEndpoint: e.target.value })
                }
                className="w-full px-3 py-1.5 rounded-lg border font-mono-cad text-[11px]"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-strong)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>

            <div>
              <label className="block mb-1 font-medium">
                3. LLM 約束解析端點 (LLM Endpoint)
              </label>
              <input
                type="text"
                value={draft.llmEndpoint}
                onChange={(e) =>
                  setDraft({ ...draft, llmEndpoint: e.target.value })
                }
                className="w-full px-3 py-1.5 rounded-lg border font-mono-cad text-[11px]"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-strong)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>

            <div>
              <label className="block mb-1 font-medium">
                LLM / Vision API Key（僅暫存於前端記憶體）
              </label>
              <input
                type="password"
                value={draft.llmApiKey}
                placeholder="sk-..."
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    llmApiKey: e.target.value,
                    visionApiKey: e.target.value,
                  })
                }
                className="w-full px-3 py-1.5 rounded-lg border font-mono-cad text-[11px]"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-strong)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
          </div>
        </div>

        <div
          className="px-5 py-3 border-t flex justify-end gap-2"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg border text-xs cursor-pointer"
            style={{
              borderColor: 'var(--border-strong)',
              color: 'var(--text-secondary)',
            }}
          >
            取消
          </button>
          <button
            type="submit"
            className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white cursor-pointer"
            style={{ backgroundColor: 'var(--accent-amber)' }}
          >
            套用管線設定
          </button>
        </div>
      </form>
    </div>
  );
};
