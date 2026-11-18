import type {
  BomSummary,
  ErgonomicsReport,
  PlannerDesignState,
} from '../types/planner';

export function exportProjectJson(
  design: PlannerDesignState,
  ergonomics: ErgonomicsReport,
  bom: BomSummary
): void {
  const payload = {
    exportedAt: new Date().toISOString(),
    application: '築境 AI｜專業室內空間設計與物理尺度規劃助手',
    roomName: design.roomName,
    calibration: design.calibration,
    protectionMasks: design.protectionMasks,
    constraints: design.constraints,
    mode: design.mode,
    styleId: design.styleId,
    lighting: design.lighting,
    appliedMaterials: design.appliedMaterials,
    ergonomicsReport: ergonomics,
    matchedProducts: design.matchedProducts.filter((p) => p.selectedForBom),
    bomSummary: bom,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${design.roomName || 'interior-plan'}-spec.json`;
  a.click();
  URL.revokeObjectURL(url);
}
