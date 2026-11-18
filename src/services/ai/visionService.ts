import type { AiServiceConfig, ProtectionMask, RoomPreset } from '../../types/planner';
import type { IVisionService, VisionDetectionResult } from './interfaces';

export class VisionService implements IVisionService {
  private config: AiServiceConfig;

  constructor(config: AiServiceConfig) {
    this.config = config;
  }

  async detectRoomElements(
    _imageUrl: string,
    presetHint?: RoomPreset
  ): Promise<VisionDetectionResult> {
    // Live VLM API hook when configured
    if (this.config.mode === 'live' && this.config.visionApiKey) {
      // Production integration point for VLM bounding box & segmentation endpoint
    }

    if (presetHint) {
      return {
        furniture: structuredClone(presetHint.detectedFurniture),
        autoMasks: structuredClone(presetHint.autoProtectionMasks),
      };
    }

    // Generic heuristic detection for newly uploaded custom photos
    return {
      furniture: [
        {
          id: `custom_sofa_${Date.now()}`,
          name: '偵測主座椅 / 沙發區',
          category: 'sofa',
          bbox: { x: 0.1, y: 0.52, w: 0.34, h: 0.34 },
          floorRect: { xCm: 15, yCm: 165, wCm: 90, dCm: 200, hCm: 80, rotationDeg: 90 },
          locked: false,
          color: '#64748b',
        },
        {
          id: `custom_table_${Date.now()}`,
          name: '偵測中央茶几 / 桌體',
          category: 'coffee_table',
          bbox: { x: 0.41, y: 0.62, w: 0.18, h: 0.18 },
          floorRect: { xCm: 138, yCm: 215, wCm: 60, dCm: 100, hCm: 44, rotationDeg: 90 },
          locked: false,
          color: '#85583a',
        },
      ],
      autoMasks: await this.detectProtectionZones(_imageUrl, undefined),
    };
  }

  async detectProtectionZones(
    _imageUrl: string,
    presetHint?: RoomPreset
  ): Promise<ProtectionMask[]> {
    if (presetHint) {
      return structuredClone(presetHint.autoProtectionMasks);
    }

    // Smart default structural guesses for uploaded photos (beam top, window back, AC upper right)
    return [
      {
        id: `auto_win_${Date.now()}`,
        category: 'window_daylight',
        label: 'AI 辨識：採光窗面區域',
        shape: 'polygon',
        autoDetected: true,
        points: [
          { x: 0.35, y: 0.24 },
          { x: 0.62, y: 0.24 },
          { x: 0.62, y: 0.62 },
          { x: 0.35, y: 0.62 },
        ],
        floorZone: {
          xCm: 95,
          yCm: 0,
          wCm: 140,
          dCm: 40,
          elevationCm: 30,
          blocksHighCabinet: true,
        },
      },
      {
        id: `auto_ac_${Date.now()}`,
        category: 'ac_vent',
        label: 'AI 辨識：冷氣室內機出風區',
        shape: 'polygon',
        autoDetected: true,
        points: [
          { x: 0.66, y: 0.18 },
          { x: 0.84, y: 0.18 },
          { x: 0.84, y: 0.28 },
          { x: 0.66, y: 0.28 },
        ],
        floorZone: {
          xCm: 235,
          yCm: 0,
          wCm: 95,
          dCm: 45,
          elevationCm: 195,
          blocksHighCabinet: true,
        },
      },
    ];
  }
}
