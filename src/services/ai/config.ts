import type { AiServiceConfig } from '../../types/planner';

export const USER_GEMINI_API_KEY_STORAGE = 'USER_GEMINI_API_KEY';

export function readInitialStoredKey(): string {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return '';
    return window.localStorage.getItem(USER_GEMINI_API_KEY_STORAGE)?.trim() || '';
  } catch {
    return '';
  }
}

export function createInitialAiConfig(): AiServiceConfig {
  const hasStoredKey = Boolean(readInitialStoredKey());
  return {
    mode: hasStoredKey ? 'live' : 'mock',
    geminiStatus: hasStoredKey ? 'connected' : 'unconfigured',
    geminiStatusDetail: hasStoredKey
      ? '已讀取本機儲存之 Gemini API 金鑰'
      : '尚未設定金鑰，目前使用本地 Canvas 模擬模式',
    visionEndpoint: 'https://generativelanguage.googleapis.com/v1beta',
    visionApiKey: '',
    renderEndpoint: 'https://generativelanguage.googleapis.com/v1beta',
    renderApiKey: '',
    llmEndpoint: 'https://generativelanguage.googleapis.com/v1beta',
    llmApiKey: '',
  };
}

export const DEFAULT_AI_CONFIG: AiServiceConfig = createInitialAiConfig();
