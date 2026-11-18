import type {
  AppliedMaterials,
  DesignConstraints,
  DesignStyleId,
  FurnitureItem,
  MatchedProduct,
  NewObjectCandidate,
  PlacementZone,
  ProtectionMask,
  RearrangementGoal,
  RearrangementVariant,
  RoomPreset,
  ScaleCalibration,
} from '../../types/planner';

export interface VisionDetectionResult {
  furniture: FurnitureItem[];
  autoMasks: ProtectionMask[];
}

export interface IVisionService {
  detectRoomElements(imageUrl: string, presetHint?: RoomPreset): Promise<VisionDetectionResult>;
  detectProtectionZones(imageUrl: string, presetHint?: RoomPreset): Promise<ProtectionMask[]>;
}

export interface IConstraintParserService {
  parsePromptToConstraints(prompt: string, selectedTags: string[]): Promise<DesignConstraints>;
}

export interface IRenderingService {
  generateRearrangements(params: {
    baseFurniture: FurnitureItem[];
    calibration: ScaleCalibration;
    masks: ProtectionMask[];
    constraints: DesignConstraints;
    goal: RearrangementGoal;
  }): Promise<RearrangementVariant[]>;

  renderStyleTransfer(params: {
    roomImageUrl: string;
    preset?: RoomPreset;
    styleId: DesignStyleId;
    styleIntensity: number;
    appliedMaterials: AppliedMaterials;
  }): Promise<{ renderedImageUrl: string; isPresetDirectMatch: boolean }>;

  analyzePlacementZones(params: {
    newObject: NewObjectCandidate;
    existingFurniture: FurnitureItem[];
    calibration: ScaleCalibration;
    masks: ProtectionMask[];
    constraints: DesignConstraints;
  }): Promise<PlacementZone[]>;
}

export interface IProductSearchService {
  matchProducts(params: {
    furniture: FurnitureItem[];
    newObject: NewObjectCandidate | null;
    constraints: DesignConstraints;
    styleId: DesignStyleId;
  }): Promise<MatchedProduct[]>;
}
