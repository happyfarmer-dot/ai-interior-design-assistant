import React, { useState } from 'react';
import {
  CheckCircle2,
  Cpu,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Settings,
  ShieldCheck,
  Sparkles,
  Trash2,
  Wifi,
  X,
  XCircle,
} from 'lucide-react';
import {
  getStoredGeminiApiKey,
  setStoredGeminiApiKey,
  testGeminiConnection,
} from '../../services/geminiService';
import type {
  AiServiceConfig,
  GeminiConnectionStatus,
} from '../../types/planner';
import { getCapacitorPlatform, isNativeCapacitor } from '../../utils/nativePlatform';

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
  const [apiKeyInput, setApiKeyInput] = useState<string>(() =>
    getStoredGeminiApiKey()
  );
  const [showKey, setShowKey] = useState(false);
  const [status, setStatus] = useState<GeminiConnectionStatus>(() =>
    getStoredGeminiApiKey() ? config.geminiStatus : 'unconfigured'
  );
  const [statusMessage, setStatusMessage] = useState<string>(() =>
    getStoredGeminiApiKey()
      ? config.geminiStatusDetail || '已載入本地端 USER_GEMINI_API_KEY 金鑰。'
      : '尚未輸入金鑰：系統將自動降級（Fallback）使用本地 Canvas 模擬引擎。'
  );

  const handleTestConnection = async () => {
    const trimmed = apiKeyInput.trim();
    if (!trimmed) {
      setStatus('unconfigured');
      setStatusMessage(
        '請先貼上 Gemini API Key 再進行測試；若不輸入金鑰可直接使用本地模擬模式。'
      );
      return;
    }

    setStatus('testing');
    setStatusMessage('正在連線 Google Gemini API 驗證金鑰權限...');
    const res = await testGeminiConnection(trimmed);
    if (res.ok) {
      setStoredGeminiApiKey(trimmed);
      setStatus('connected');
      setStatusMessage(res.message);
      onSave({
        mode: 'live',
        geminiStatus: 'connected',
        geminiStatusDetail: res.message,
      });
    } else {
      setStatus('error');
      setStatusMessage(res.message);
      onSave({
        geminiStatus: 'error',
        geminiStatusDetail: res.message,
      });
    }
  };

  const handleClearKey = () => {
    setApiKeyInput('');
    setStoredGeminiApiKey('');
    const fallbackDetail =
      '已移除本機 API Key，系統已切換至本地 Canvas 離線模擬模式。';
    setStatus('unconfigured');
    setStatusMessage(fallbackDetail);
    onSave({
      mode: 'mock',
      geminiStatus: 'unconfigured',
      geminiStatusDetail: fallbackDetail,
    });
  };

  const handleSaveAndClose = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = apiKeyInput.trim();
    setStoredGeminiApiKey(trimmed);

    if (!trimmed) {
      onSave({
        mode: 'mock',
        geminiStatus: 'unconfigured',
        geminiStatusDetail: '尚未輸入金鑰（本地 Canvas 模擬模式）',
      });
    } else {
      const nextStatus: GeminiConnectionStatus =
        status === 'error' ? 'error' : 'connected';
      onSave({
        mode: 'live',
        geminiStatus: nextStatus,
        geminiStatusDetail: statusMessage,
      });
    }
    onClose();
  };

  const statusIndicator = (() => {
    switch (status) {
      case 'connected':
        return {
          color: '#18a974',
          bg: 'rgba(24, 169, 116, 0.14)',
          border: 'rgba(24, 169, 116, 0.45)',
          label: '連線已驗證 / Live 模式',
          Icon: CheckCircle2,
        };
      case 'testing':
        return {
          color: '#3b82f6',
          bg: 'rgba(59, 130, 246, 0.14)',
          border: 'rgba(59, 130, 246, 0.45)',
          label: '測試連線中…',
          Icon: Loader2,
        };
      case 'error':
        return {
          color: '#e04f5f',
          bg: 'rgba(224, 79, 95, 0.14)',
          border: 'rgba(224, 79, 95, 0.45)',
          label: '驗證失敗（操作時自動降級）',
          Icon: XCircle,
        };
      default:
        return {
          color: '#e5a93b',
          bg: 'rgba(229, 169, 59, 0.12)',
          border: 'rgba(229, 169, 59, 0.4)',
          label: '本地模擬 Fallback 模式',
          Icon: Cpu,
        };
    }
  })();

  const StatusIcon = statusIndicator.Icon;
  const nativePlatform = isNativeCapacitor()
    ? `Capacitor Native (${getCapacitorPlatform()})`
    : 'Web Browser (Static SPA)';

  return (
    <div className="no-print fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-4">
      <form
        onSubmit={handleSaveAndClose}
        className="w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden flex flex-col"
        style={{
          backgroundColor: 'var(--bg-panel)',
          borderColor: 'var(--border-strong)',
        }}
      >
        {/* Header */}
        <div
          className="px-5 py-3.5 border-b flex items-center justify-between"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div className="flex items-center gap-2 font-semibold text-sm">
            <Settings className="w-4 h-4 text-amber-400" />
            <span>API 設定與安全隔離（Gemini SDK）</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="關閉設定視窗"
            className="p-1 rounded-lg hover:bg-white/10 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 text-xs overflow-y-auto max-h-[75vh]">
          {/* Connection Status Indicator Light Card */}
          <div
            className="p-3 rounded-xl border flex items-start gap-2.5"
            style={{
              backgroundColor: statusIndicator.bg,
              borderColor: statusIndicator.border,
            }}
          >
            <span
              className={`w-2.5 h-2.5 rounded-full mt-1 shrink-0 ${
                status === 'testing' ? 'animate-pulse' : ''
              }`}
              style={{ backgroundColor: statusIndicator.color }}
            />
            <div className="flex-1 min-w-0 space-y-1">
              <div
                className="font-semibold flex items-center gap-1.5"
                style={{ color: statusIndicator.color }}
              >
                <StatusIcon
                  className={`w-3.5 h-3.5 ${
                    status === 'testing' ? 'animate-spin' : ''
                  }`}
                />
                <span>{statusIndicator.label}</span>
              </div>
              <div
                className="text-[11px] leading-relaxed break-words"
                style={{ color: 'var(--text-secondary)' }}
              >
                {statusMessage}
              </div>
            </div>
          </div>

          {/* Local Storage API Key Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="gemini-api-key-input"
                className="font-semibold flex items-center gap-1.5"
              >
                <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                <span>Google Gemini API Key</span>
              </label>
              <span
                className="text-[10px] font-mono-cad px-1.5 py-0.5 rounded border"
                style={{
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-muted)',
                  backgroundColor: 'var(--bg-surface)',
                }}
              >
                localStorage: USER_GEMINI_API_KEY
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <div className="relative flex-1">
                <input
                  id="gemini-api-key-input"
                  type={showKey ? 'text' : 'password'}
                  value={apiKeyInput}
                  onChange={(e) => {
                    setApiKeyInput(e.target.value);
                    if (!e.target.value.trim()) {
                      setStatus('unconfigured');
                      setStatusMessage(
                        '空白金鑰將自動使用本地 Canvas 模擬引擎（不會崩潰報錯）。'
                      );
                    }
                  }}
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="貼上您的 AIza... Gemini API Key（選填）"
                  className="w-full pl-3 pr-9 py-2 rounded-lg border font-mono-cad text-[11px]"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    borderColor: 'var(--border-strong)',
                    color: 'var(--text-primary)',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowKey((s) => !s)}
                  title={showKey ? '隱藏金鑰' : '顯示金鑰'}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-black/15 cursor-pointer"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {showKey ? (
                    <EyeOff className="w-3.5 h-3.5" />
                  ) : (
                    <Eye className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              <button
                type="button"
                onClick={handleTestConnection}
                disabled={status === 'testing'}
                className="px-3 py-2 rounded-lg border font-medium text-xs flex items-center gap-1.5 cursor-pointer shrink-0 disabled:opacity-50"
                style={{
                  backgroundColor: 'var(--accent-cobalt-soft)',
                  borderColor: 'var(--accent-cobalt)',
                  color: 'var(--accent-cobalt)',
                }}
              >
                {status === 'testing' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Wifi className="w-3.5 h-3.5" />
                )}
                <span>測試連線</span>
              </button>
            </div>

            {apiKeyInput.trim() && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleClearKey}
                  className="inline-flex items-center gap-1 text-[11px] text-red-400 hover:underline cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>清除已存金鑰（切回本地模擬模式）</span>
                </button>
              </div>
            )}
          </div>

          {/* Security Isolation Guarantee */}
          <div
            className="p-3 rounded-xl border space-y-1.5 leading-relaxed"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-secondary)',
            }}
          >
            <div className="font-semibold flex items-center gap-1.5 text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              <span>端點安全隔離保證 (Zero-Hardcoded Secret)</span>
            </div>
            <p className="text-[11px]">
              您的金鑰僅儲存於使用者端裝置的{' '}
              <code className="font-mono-cad text-amber-400">
                localStorage[&quot;USER_GEMINI_API_KEY&quot;]
              </code>{' '}
              並直接透過 <code className="font-mono-cad">@google/genai</code>{' '}
              向 Google 官方 API 請求，原始碼與封裝 APK 內<strong>絕不寫死任何金鑰</strong>
              ；未填寫金鑰時會自動平滑降級為離線 Canvas 模擬渲染模式。
            </p>
          </div>

          {/* Active Model Pipeline Mapping */}
          <div
            className="p-3 rounded-xl border space-y-2"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>模型任務路由配置</span>
              </span>
              <span
                className="font-mono-cad text-[10px]"
                style={{ color: 'var(--text-muted)' }}
              >
                {nativePlatform}
              </span>
            </div>
            <div
              className="grid grid-cols-1 gap-1 text-[11px] font-mono-cad"
              style={{ color: 'var(--text-secondary)' }}
            >
              <div className="flex justify-between">
                <span>1. 空間分析與人體工學 JSON</span>
                <span className="text-blue-400">gemini-2.5-flash</span>
              </div>
              <div className="flex justify-between">
                <span>2. 重排／風格／擺放／光影換材</span>
                <span className="text-amber-400">gemini-2.5-flash-image</span>
              </div>
              <div className="flex justify-between">
                <span>3. 以圖搜物與台灣行情 BOM 表</span>
                <span className="text-emerald-400">gemini-2.5-flash</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
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
            儲存金鑰並套用
          </button>
        </div>
      </form>
    </div>
  );
};
