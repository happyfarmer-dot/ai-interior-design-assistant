import React from 'react';
import type {
  BomSummary,
  ErgonomicsReport,
  PlannerStoreState,
} from '../../types/planner';
import type { usePlannerStore } from '../../state/usePlannerStore';
import { Step1CalibrationPanel } from '../panels/Step1CalibrationPanel';
import { Step2DesignModePanel } from '../panels/Step2DesignModePanel';
import { Step3SimulationPanel } from '../panels/Step3SimulationPanel';
import { Step4ProcurementPanel } from '../panels/Step4ProcurementPanel';

interface RightInspectorProps {
  state: PlannerStoreState;
  ergonomics: ErgonomicsReport;
  bomSummary: BomSummary;
  actions: ReturnType<typeof usePlannerStore>['actions'];
  onOpenProposal: () => void;
  onExportJson: () => void;
}

export const RightInspector: React.FC<RightInspectorProps> = ({
  state,
  ergonomics,
  bomSummary,
  actions,
  onOpenProposal,
  onExportJson,
}) => {
  const { present, step } = state;

  return (
    <aside
      className="no-print w-full lg:w-[390px] xl:w-[420px] shrink-0 border-t lg:border-t-0 lg:border-l h-[46vh] lg:h-full overflow-hidden flex flex-col"
      style={{
        backgroundColor: 'var(--bg-panel)',
        borderColor: 'var(--border-subtle)',
      }}
    >
      {step === 1 && (
        <Step1CalibrationPanel
          activeRoomId={present.activeRoomId}
          calibration={present.calibration}
          protectionMasks={present.protectionMasks}
          activeTool={state.activeTool}
          activeMaskCategory={state.activeMaskCategory}
          brushRadiusPx={state.brushRadiusPx}
          onLoadPreset={actions.loadPresetRoom}
          onUploadRoom={actions.loadUploadedRoom}
          onUpdateCalibration={(p) => actions.updateCalibration(p, true)}
          onSelectTool={actions.setTool}
          onSelectMaskCategory={actions.setMaskCategory}
          onSetBrushRadius={actions.setBrushRadius}
          onRemoveMask={actions.removeProtectionMask}
          onAutoDetectMasks={actions.runAutoDetectProtectionMasks}
          onNextStep={() => actions.setStep(2)}
        />
      )}

      {step === 2 && (
        <Step2DesignModePanel
          mode={present.mode}
          rearrangementGoal={present.rearrangementGoal}
          detectedFurniture={present.detectedFurniture}
          styleId={present.styleId}
          styleIntensity={present.styleIntensity}
          newObject={present.newObject}
          placementZones={present.placementZones}
          selectedZoneId={present.selectedZoneId}
          promptText={present.promptText}
          selectedTags={present.selectedTags}
          constraints={present.constraints}
          onSetMode={actions.setMode}
          onSetGoal={actions.setRearrangementGoal}
          onToggleFurnitureLock={actions.toggleFurnitureLock}
          onSelectStyle={actions.setStyle}
          onSetStyleIntensity={(val) => actions.setStyleIntensity(val, false)}
          onSelectNewObject={actions.selectNewObject}
          onUpdateNewObjectSpecs={actions.updateNewObjectSpecs}
          onAnalyzeZones={actions.analyzeNewObjectZones}
          onSelectZone={actions.selectPlacementZone}
          onUpdatePromptTags={actions.updatePromptAndTags}
          onParseConstraints={actions.parseConstraints}
          onPrevStep={() => actions.setStep(1)}
          onGenerate={actions.executeSimulationPipeline}
        />
      )}

      {step === 3 && (
        <Step3SimulationPanel
          mode={present.mode}
          styleId={present.styleId}
          styleIntensity={present.styleIntensity}
          rearrangementVariants={present.rearrangementVariants}
          activeVariantId={present.activeVariantId}
          placementZones={present.placementZones}
          selectedZoneId={present.selectedZoneId}
          ergonomics={ergonomics}
          lighting={present.lighting}
          selectedMaterialSurface={present.selectedMaterialSurface}
          appliedMaterials={present.appliedMaterials}
          constraints={present.constraints}
          activeTool={state.activeTool}
          viewMode={state.viewMode}
          onSelectVariant={actions.selectVariant}
          onSelectZone={actions.selectPlacementZone}
          onRefreshStyleLive={actions.refreshStyleRenderLive}
          onUpdateLighting={actions.updateLighting}
          onSelectMaterialSurface={actions.setSelectedMaterialSurface}
          onApplyMaterial={actions.applyMaterialSwatch}
          onSelectTool={actions.setTool}
          onSetViewMode={actions.setViewMode}
          onPrevStep={() => actions.setStep(2)}
          onNextStep={() => actions.setStep(4)}
        />
      )}

      {step === 4 && (
        <Step4ProcurementPanel
          matchedProducts={present.matchedProducts}
          bomSummary={bomSummary}
          onRefreshProductSearch={actions.runProductVisualSearch}
          onToggleProductInBom={actions.toggleProductInBom}
          onExportProposalPdf={onOpenProposal}
          onExportJson={onExportJson}
          onPrevStep={() => actions.setStep(3)}
        />
      )}
    </aside>
  );
};
