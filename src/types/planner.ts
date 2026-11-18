export type WorkflowStep = 1 | 2 | 3 | 4;

export type DesignMode = 'rearrange' | 'style' | 'place_object';

export type CanvasTool =
  | 'select'
  | 'pan'
  | 'scale'
  | 'mask_brush'
  | 'mask_polygon'
  | 'material_pick';

export type ViewMode = 'perspective' | 'floorplan';

export type ProtectionCategory =
  | 'beam_column'
  | 'window_daylight'
  | 'ac_vent'
  | 'electrical_panel'
  | 'outlet';

export interface Point2D {
  x: number; // normalized 0..1 relative to image width
  y: number; // normalized 0..1 relative to image height
}

export interface BoundingBox {
  x: number; // normalized 0..1
  y: number; // normalized 0..1
  w: number; // normalized 0..1
  h: number; // normalized 0..1
}

export interface FloorPlanBox {
  xCm: number; // distance from room left wall in cm
  yCm: number; // distance from room back wall (window wall) in cm
  wCm: number; // width in cm
  dCm: number; // depth in cm
  hCm: number; // height in cm
  rotationDeg: number; // 0 | 90 | 180 | 270
}

export type FurnitureCategory =
  | 'sofa'
  | 'coffee_table'
  | 'tv_console'
  | 'dining_table'
  | 'bed'
  | 'wardrobe'
  | 'accent_chair'
  | 'cat_tree'
  | 'floor_lamp'
  | 'storage_cabinet'
  | 'rug';

export interface FurnitureItem {
  id: string;
  name: string;
  category: FurnitureCategory;
  bbox: BoundingBox; // perspective canvas bounding box
  floorRect: FloorPlanBox; // physical 2D floor plan footprint
  locked: boolean; // keep original item / lock position
  color: string;
  isNewObject?: boolean;
  materialNote?: string;
}

export interface ProtectionMask {
  id: string;
  category: ProtectionCategory;
  label: string;
  shape: 'polygon' | 'brush';
  points: Point2D[];
  brushRadius?: number; // normalized width fraction
  floorZone?: {
    xCm: number;
    yCm: number;
    wCm: number;
    dCm: number;
    elevationCm: number; // height from floor
    blocksHighCabinet: boolean;
  };
  autoDetected?: boolean;
}

export type CalibrationPresetId = 'door_210' | 'outlet_12' | 'a4_29_7' | 'custom';

export interface ScaleCalibration {
  p1: Point2D;
  p2: Point2D;
  knownCm: number;
  presetId: CalibrationPresetId;
  imageWidthPx: number;
  imageHeightPx: number;
  pxPerCm: number;
  roomWidthCm: number;
  roomDepthCm: number;
  ceilingHeightCm: number;
  vanishingPoint: Point2D;
  horizonY: number; // normalized 0..1
  showPerspectiveGrid: boolean;
  calibrated: boolean;
}

export interface DoorSwingArc {
  id: string;
  label: string;
  hingeXCm: number;
  hingeYCm: number;
  radiusCm: number;
  startAngleDeg: number;
  endAngleDeg: number;
}

export interface RoomPreset {
  id: string;
  name: string;
  subtitle: string;
  imageUrl: string;
  widthPx: number;
  heightPx: number;
  defaultCalibration: ScaleCalibration;
  detectedFurniture: FurnitureItem[];
  autoProtectionMasks: ProtectionMask[];
  doorSwings: DoorSwingArc[];
  surfaceRegions: Record<MaterialSurfaceType, Point2D[]>;
  styleRenders: Partial<Record<DesignStyleId, string>>;
}

export type DesignStyleId =
  | 'scandinavian'
  | 'wabi_sabi'
  | 'modern_minimalist'
  | 'industrial'
  | 'muji'
  | 'modern_luxury';

export interface DesignStyleSpec {
  id: DesignStyleId;
  name: string;
  nameEn: string;
  tagline: string;
  palette: [string, string, string, string];
  lutFilter: string;
  tintColor: string;
  tintOpacity: number;
  wallColorDefault: string;
  floorMaterialDefault: string;
}

export interface DesignConstraints {
  pets: number;
  scratchResistant: boolean;
  catPathway: boolean;
  maxBudgetTWD: number | null;
  preserveItems: string[];
  entrywayDustZone: boolean;
  extraStorage: boolean;
  accessibilityClearance: boolean;
  naturalLightPriority: boolean;
  customNotes: string[];
}

export type RearrangementGoal = 'daylight_ventilation' | 'traffic_flow' | 'pet_storage_friendly';

export interface RearrangementVariant {
  id: string;
  code: 'A' | 'B' | 'C';
  title: string;
  subtitle: string;
  rationale: string[];
  furniture: FurnitureItem[];
  score: number;
  mepSafe: boolean;
}

export interface NewObjectCandidate {
  id: string;
  name: string;
  category: FurnitureCategory;
  rawImageUrl: string;
  cutoutDataUrl: string | null;
  bgRemoved: boolean;
  bgThreshold: number;
  widthCm: number;
  depthCm: number;
  heightCm: number;
  priceTWD?: number;
}

export interface PlacementZone {
  id: string;
  label: string;
  description: string;
  anchor: Point2D; // bottom-center normalized point in perspective canvas
  floorPosCm: { xCm: number; yCm: number; rotationDeg: number };
  scaleFactor: number;
  suitabilityScore: number;
  mepClear: boolean;
  warning?: string;
}

export type DaylightMode = 'east_morning' | 'west_afternoon' | 'north_soft' | 'night';
export type ColorTempKelvin = 3000 | 4000 | 6000;

export interface LightingState {
  daylight: DaylightMode;
  kelvin: ColorTempKelvin;
  recessedDownlights: boolean;
  indirectCoveLed: boolean;
  intensity: number; // 0..100
}

export type MaterialSurfaceType = 'floor' | 'main_wall' | 'sofa' | 'curtain';

export interface MaterialSwatch {
  id: string;
  surface: MaterialSurfaceType;
  name: string;
  subtitle: string;
  colorHex: string;
  patternType:
    | 'oak_plank'
    | 'herringbone_walnut'
    | 'microcement'
    | 'terrazzo'
    | 'limewash'
    | 'matte_paint'
    | 'boucle_fabric'
    | 'tech_fabric_pet'
    | 'linen_sheer'
    | 'velvet_drape';
  unitPriceMinTWD: number;
  unitPriceMaxTWD: number;
  unitLabel: string;
  petFriendly: boolean;
}

export interface AppliedMaterials {
  floor: string | null;
  main_wall: string | null;
  sofa: string | null;
  curtain: string | null;
}

export type TrafficStatus = 'pass' | 'warn' | 'fail';

export interface ErgonomicMetric {
  id: string;
  label: string;
  valueText: string;
  benchmarkText: string;
  status: TrafficStatus;
  detail: string;
}

export interface ErgonomicsReport {
  overallStatus: TrafficStatus;
  walkwayMinCm: number;
  walkwayRequiredCm: number;
  doorBlocked: boolean;
  doorBlockingItem?: string;
  mepConflictCount: number;
  mepConflictDetails: string[];
  tvDistanceCm: number;
  recommendedTvInches: string;
  metrics: ErgonomicMetric[];
}

export interface MatchedProduct {
  id: string;
  brand: 'IKEA' | '無印良品 MUJI' | '宜得利 NITORI' | '有情門' | 'MR. LIVING';
  name: string;
  category: FurnitureCategory;
  widthCm: number;
  depthCm: number;
  heightCm: number;
  priceTWD: number;
  material: string;
  petFriendly: boolean;
  fitScore: number; // 0..100 based on calibrated room target dimensions
  targetSlotLabel: string;
  colorHex: string;
  selectedForBom: boolean;
  urlSlug: string;
}

export interface BomLineItem {
  id: string;
  category: 'surface_wall' | 'surface_floor' | 'system_cabinet' | 'soft_furnishing';
  categoryLabel: string;
  name: string;
  quantityText: string;
  unitRateText: string;
  minTWD: number;
  maxTWD: number;
  note?: string;
}

export interface BomSummary {
  items: BomLineItem[];
  totalMinTWD: number;
  totalMaxTWD: number;
  roomAreaPing: number;
  wallAreaPing: number;
  budgetCapTWD: number | null;
  withinBudget: boolean;
  disclaimer: string;
}

export interface LayerVisibility {
  detectedFurniture: boolean;
  protectionMasks: boolean;
  perspectiveGrid: boolean;
  ergonomicCallouts: boolean;
  lightingOverlay: boolean;
  materialOverlay: boolean;
  placedObject: boolean;
}

export interface DesignSnapshot {
  id: string;
  label: string;
  createdAt: string;
  step: WorkflowStep;
  mode: DesignMode;
  styleId: DesignStyleId;
  stateDigest: PlannerDesignState;
}

export interface AiServiceConfig {
  mode: 'mock' | 'live';
  visionEndpoint: string;
  visionApiKey: string;
  renderEndpoint: string;
  renderApiKey: string;
  llmEndpoint: string;
  llmApiKey: string;
}

/**
 * Undoable design document state
 */
export interface PlannerDesignState {
  activeRoomId: string;
  roomName: string;
  roomImageUrl: string;
  calibration: ScaleCalibration;
  protectionMasks: ProtectionMask[];
  doorSwings: DoorSwingArc[];
  surfaceRegions: Record<MaterialSurfaceType, Point2D[]>;

  mode: DesignMode;
  rearrangementGoal: RearrangementGoal;
  detectedFurniture: FurnitureItem[];
  rearrangementVariants: RearrangementVariant[];
  activeVariantId: string | null;

  styleId: DesignStyleId;
  styleIntensity: number; // 0..100 (% style transformation vs original structure)

  newObject: NewObjectCandidate | null;
  placementZones: PlacementZone[];
  selectedZoneId: string | null;
  customPlacedPos: Point2D | null;
  customPlacedScale: number;

  promptText: string;
  selectedTags: string[];
  constraints: DesignConstraints;

  lighting: LightingState;
  selectedMaterialSurface: MaterialSurfaceType;
  appliedMaterials: AppliedMaterials;

  hasGenerated: boolean;
  renderedImageUrl: string | null;
  matchedProducts: MatchedProduct[];
}

export interface PlannerStoreState {
  step: WorkflowStep;
  activeTool: CanvasTool;
  activeMaskCategory: ProtectionCategory;
  brushRadiusPx: number;
  viewMode: ViewMode;
  showBeforeAfter: boolean;
  beforeAfterRatio: number; // 0..100
  theme: 'dark' | 'light';
  layers: LayerVisibility;
  isProcessing: boolean;
  processingMessage: string;

  present: PlannerDesignState;
  past: PlannerDesignState[];
  future: PlannerDesignState[];
  snapshots: DesignSnapshot[];
  aiConfig: AiServiceConfig;
}
