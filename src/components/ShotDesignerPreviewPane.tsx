import React from 'react';
import { GenerationJob, Shot } from '../types/film';
import { Image as ImageIcon, Sparkles } from 'lucide-react';
import { VisualTakeReview } from './VisualTakeReview';

interface ShotDesignerPreviewPaneProps {
  currentShot: Shot;
  isGeneratingImage: boolean;
  generationJobs: GenerationJob[];
  onGenerateVisual: () => void;
  onSelectTake: (takeUrl: string) => void;
  onApproveTake: (takeId: string) => void;
  onSetMasterTake: (takeId: string) => void;
  onRejectTake: (takeId: string) => void;
}

export const ShotDesignerPreviewPane: React.FC<ShotDesignerPreviewPaneProps> = ({
  currentShot,
  isGeneratingImage,
  generationJobs,
  onGenerateVisual,
  onSelectTake,
  onApproveTake,
  onSetMasterTake,
  onRejectTake,
}) => (
  <div className="lg:w-96 bg-[#0A0A0B] border-r border-[#222225] p-4 flex flex-col justify-between shrink-0 overflow-y-auto space-y-4">
    <div>
      <div className="text-[10px] uppercase font-bold tracking-wider text-[#8E9299] mb-2 flex items-center justify-between">
        <span>VIEWPORT RENDER</span>
        <span className="font-mono text-[#CBA135] text-[10px]">2.39:1 CINEMASCOPE</span>
      </div>

      {/* Viewport Frame */}
      <div className="w-full aspect-video rounded-sm bg-[#151619] border border-[#2A2A2D] overflow-hidden relative shadow-lg group">
        {currentShot.storyboardImageUrl ? (
          <img
            src={currentShot.storyboardImageUrl}
            alt={currentShot.title}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-[#666]">
            <ImageIcon className="w-8 h-8 mb-2 text-[#444]" />
            <span className="text-xs">NO VISUAL RENDERED</span>
            <span className="text-[10px] text-[#555] mt-1">Configure optics and render take</span>
          </div>
        )}

        {/* Overlays */}
        <div className="absolute top-2 left-2 bg-black/80 backdrop-blur-xs px-2 py-0.5 rounded text-[9px] text-[#CBA135] border border-white/10">
          {currentShot.camera.focalLength || currentShot.camera.lens} • {currentShot.camera.aperture || 'T1.3'}
        </div>

        <div className="absolute bottom-2 left-2 bg-black/80 backdrop-blur-xs px-2 py-0.5 rounded text-[9px] text-cyan-300 border border-white/10">
          MOVE: {currentShot.camera.movement.toUpperCase()}
        </div>

        <div className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-xs px-2 py-0.5 rounded text-[9px] text-amber-300 border border-white/10">
          {currentShot.environment.colorTempKelvin || 3200}K
        </div>

        {/* Aspect Ratio Guides */}
        <div className="absolute inset-0 border border-[#CBA135]/20 pointer-events-none" />
        <div className="absolute inset-x-0 top-1/3 border-t border-dashed border-white/10 pointer-events-none" />
        <div className="absolute inset-x-0 bottom-1/3 border-t border-dashed border-white/10 pointer-events-none" />
        <div className="absolute inset-y-0 left-1/3 border-l border-dashed border-white/10 pointer-events-none" />
        <div className="absolute inset-y-0 right-1/3 border-l border-dashed border-white/10 pointer-events-none" />
      </div>

      {/* Render Controls */}
      <div className="mt-3 space-y-2">
        <button
          onClick={onGenerateVisual}
          disabled={isGeneratingImage}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-sm text-xs font-bold bg-[#CBA135] hover:bg-[#DFB548] text-black transition-all uppercase tracking-wider shadow"
        >
          <Sparkles className={`w-3.5 h-3.5 ${isGeneratingImage ? 'animate-spin' : ''}`} />
          <span>{isGeneratingImage ? 'NEURAL RENDERING TAKE...' : 'RENDER SHOT VISUAL (IMAGEN 3)'}</span>
        </button>
      </div>

      {/* Live Cinematography Summary Card */}
      <div className="mt-4 p-3 rounded-sm bg-[#121316] border border-[#222225] space-y-2 text-[10px]">
        <div className="text-[#8E9299] font-bold uppercase tracking-wider flex items-center justify-between border-b border-[#1E1F24] pb-1">
          <span>Cinematography Blueprint</span>
          <span className="text-[#CBA135]">ASC SPEC</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5 text-[#AAA]">
          <div><span className="text-[#666]">LENS:</span> <strong className="text-[#E0E0E0]">{currentShot.camera.focalLength || '35mm'} {currentShot.camera.lensFamily}</strong></div>
          <div><span className="text-[#666]">APERTURE:</span> <strong className="text-[#E0E0E0]">{currentShot.camera.aperture}</strong></div>
          <div><span className="text-[#666]">MOTION:</span> <strong className="text-cyan-300">{currentShot.camera.movement.replace(/_/g, ' ')}</strong></div>
          <div><span className="text-[#666]">RIG:</span> <strong className="text-[#E0E0E0]">{currentShot.camera.cameraRig?.replace(/_/g, ' ') || 'Tripod'}</strong></div>
          <div><span className="text-[#666]">LIGHTING:</span> <strong className="text-amber-300">{currentShot.environment.lightingSetup || 'Rembrandt'}</strong></div>
          <div><span className="text-[#666]">KELVIN:</span> <strong className="text-[#E0E0E0]">{currentShot.environment.colorTempKelvin || 3200}K</strong></div>
        </div>
      </div>
    </div>

    <VisualTakeReview
      takes={currentShot.takes || []}
      selectedTakeUrl={currentShot.storyboardImageUrl}
      generationJobs={generationJobs}
      isGenerating={isGeneratingImage}
      onSelectTake={onSelectTake}
      onApproveTake={onApproveTake}
      onSetMasterTake={onSetMasterTake}
      onRejectTake={onRejectTake}
      onRegenerate={onGenerateVisual}
    />
  </div>
);
