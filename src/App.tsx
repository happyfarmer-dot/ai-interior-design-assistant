import { useState } from 'react';
import { LeftToolRail } from './components/layout/LeftToolRail';
import { RightInspector } from './components/layout/RightInspector';
import { TopBar } from './components/layout/TopBar';
import { SpatialCanvas } from './components/canvas/SpatialCanvas';
import { AiSettingsModal } from './components/modals/AiSettingsModal';
import { ProposalPreviewModal } from './components/modals/ProposalPreviewModal';
import { VersionHistoryModal } from './components/modals/VersionHistoryModal';
import { usePlannerStore } from './state/usePlannerStore';
import { exportBomCsv, exportProjectJson } from './utils/proposalExport';

export function App() {
  const {
    state,
    activeFurniture,
    ergonomicsReport,
    bomSummary,
    canUndo,
    canRedo,
    actions,
  } = usePlannerStore();

  const [snapshotsOpen, setSnapshotsOpen] = useState(false);
  const [aiSettingsOpen, setAiSettingsOpen] = useState(false);
  const [proposalOpen, setProposalOpen] = useState(false);

  const handleQuickSaveSnapshot = () => {
    const label = `設計方案快照 #${state.snapshots.length + 1}`;
    actions.saveSnapshot(label);
  };

  return (
    <div
      className={`h-screen w-screen flex flex-col overflow-hidden ${
        state.theme === 'light' ? 'theme-light' : ''
      }`}
      style={{
        backgroundColor: 'var(--bg-app)',
        color: 'var(--text-primary)',
      }}
    >
      <TopBar
        step={state.step}
        roomName={state.present.roomName}
        calibration={state.present.calibration}
        canUndo={canUndo}
        canRedo={canRedo}
        snapshotCount={state.snapshots.length}
        theme={state.theme}
        aiConfig={state.aiConfig}
        onSelectStep={actions.setStep}
        onUndo={actions.undo}
        onRedo={actions.redo}
        onSaveSnapshot={handleQuickSaveSnapshot}
        onOpenSnapshots={() => setSnapshotsOpen(true)}
        onOpenAiSettings={() => setAiSettingsOpen(true)}
        onToggleTheme={actions.toggleTheme}
        onOpenProposal={() => setProposalOpen(true)}
      />

      <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
        <div className="flex-1 min-w-0 min-h-0 flex overflow-hidden">
          <LeftToolRail
            activeTool={state.activeTool}
            layers={state.layers}
            showPerspectiveGrid={state.present.calibration.showPerspectiveGrid}
            onSelectTool={actions.setTool}
            onToggleLayer={actions.toggleLayer}
            onTogglePerspectiveGrid={() =>
              actions.updateCalibration(
                {
                  showPerspectiveGrid:
                    !state.present.calibration.showPerspectiveGrid,
                },
                true
              )
            }
          />

          <SpatialCanvas
            step={state.step}
            activeTool={state.activeTool}
            activeMaskCategory={state.activeMaskCategory}
            brushRadiusPx={state.brushRadiusPx}
            viewMode={state.viewMode}
            showBeforeAfter={state.showBeforeAfter}
            beforeAfterRatio={state.beforeAfterRatio}
            layers={state.layers}
            roomImageUrl={state.present.roomImageUrl}
            renderedImageUrl={state.present.renderedImageUrl}
            renderedByGemini={state.present.renderedByGemini}
            hasGenerated={state.present.hasGenerated}
            mode={state.present.mode}
            calibration={state.present.calibration}
            protectionMasks={state.present.protectionMasks}
            doorSwings={state.present.doorSwings}
            furniture={activeFurniture}
            rearrangementVariants={state.present.rearrangementVariants}
            activeVariantId={state.present.activeVariantId}
            lighting={state.present.lighting}
            surfaceRegions={state.present.surfaceRegions}
            appliedMaterials={state.present.appliedMaterials}
            selectedMaterialSurface={state.present.selectedMaterialSurface}
            newObject={state.present.newObject}
            placementZones={state.present.placementZones}
            selectedZoneId={state.present.selectedZoneId}
            customPlacedPos={state.present.customPlacedPos}
            ergonomics={ergonomicsReport}
            isProcessing={state.isProcessing}
            processingMessage={state.processingMessage}
            onSetViewMode={actions.setViewMode}
            onSetBeforeAfter={actions.setBeforeAfter}
            onUpdateCalibration={actions.updateCalibration}
            onAddProtectionMask={actions.addProtectionMask}
            onSelectMaterialSurface={actions.setSelectedMaterialSurface}
            onSelectZone={actions.selectPlacementZone}
            onMovePlacedObject={actions.movePlacedObjectCanvas}
            onSelectVariant={actions.selectVariant}
            onMoveFloorItem={actions.moveFurnitureFloorPos}
            onRotateFloorItem={actions.rotateFurnitureFloor}
          />
        </div>

        <RightInspector
          state={state}
          ergonomics={ergonomicsReport}
          bomSummary={bomSummary}
          actions={actions}
          onOpenProposal={() => setProposalOpen(true)}
          onExportCsv={() =>
            exportBomCsv(state.present, ergonomicsReport, bomSummary)
          }
          onExportJson={() =>
            exportProjectJson(state.present, ergonomicsReport, bomSummary)
          }
        />
      </div>

      {snapshotsOpen && (
        <VersionHistoryModal
          snapshots={state.snapshots}
          onSaveSnapshot={actions.saveSnapshot}
          onRestoreSnapshot={actions.restoreSnapshot}
          onDeleteSnapshot={actions.deleteSnapshot}
          onClose={() => setSnapshotsOpen(false)}
        />
      )}

      {aiSettingsOpen && (
        <AiSettingsModal
          config={state.aiConfig}
          onSave={actions.updateAiConfig}
          onClose={() => setAiSettingsOpen(false)}
        />
      )}

      {proposalOpen && (
        <ProposalPreviewModal
          design={state.present}
          ergonomics={ergonomicsReport}
          bom={bomSummary}
          onClose={() => setProposalOpen(false)}
        />
      )}
    </div>
  );
}

export default App;
