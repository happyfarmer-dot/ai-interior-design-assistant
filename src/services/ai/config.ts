import type { AiServiceConfig } from '../../types/planner';

export const DEFAULT_AI_CONFIG: AiServiceConfig = {
  mode:
    import.meta.env.VITE_AI_PIPELINE_MODE === 'live' ? 'live' : 'mock',
  visionEndpoint:
    import.meta.env.VITE_VISION_API_ENDPOINT ||
    'https://api.openai.com/v1/chat/completions',
  visionApiKey: import.meta.env.VITE_VISION_API_KEY || '',
  renderEndpoint:
    import.meta.env.VITE_RENDER_API_ENDPOINT ||
    'https://api.replicate.com/v1/predictions',
  renderApiKey: import.meta.env.VITE_RENDER_API_KEY || '',
  llmEndpoint:
    import.meta.env.VITE_LLM_API_ENDPOINT ||
    'https://api.openai.com/v1/chat/completions',
  llmApiKey: import.meta.env.VITE_LLM_API_KEY || '',
};
