import React, { useState } from 'react';
import { FilmProject, Shot } from '../types/film';
import { FilmStudioApiClient } from '../services/apiClient';
import { generatePromptFaithfulVisual } from '../utils/cinematicVisualRenderer';
import { 
  LayoutGrid, 
  Sparkles, 
  Check, 
  RotateCcw, 
  Lock, 
  Eye, 
  Layers, 
  CheckCircle2, 
  Film,
  SlidersHorizontal,
  Plus,
  Wand2
} from 'lucide-react';

interface StoryboardWorkspaceProps {
  project: FilmProject;
  onUpdateShot: (shot: Shot) => void;
  onOpenShotDesigner: (shot: Shot) => void;
  onBatchGenerateAll: () => void;
  onOpenImageStudio?: (shot?: Shot) => void;
}

export const StoryboardWorkspace: React.FC<StoryboardWorkspaceProps> = ({
  project,
  onUpdateShot,
  onOpenShotDesigner,
  onBatchGenerateAll,
  onOpenImageStudio,
}) => {
  const [selectedSceneFilter, setSelectedSceneFilter] = useState<string>('ALL');
  const [generatingShotId, setGeneratingShotId] = useState<string | null>(null);

  const filteredShots = selectedSceneFilter === 'ALL'
    ? project.shots
    : project.shots.filter(s => s.sceneId === selectedSceneFilter);

  const handleGenerateStoryboard = async (shot: Shot) => {
    setGeneratingShotId(shot.id);
    const scene = project.scenes.find(s => s.id === shot.sceneId);
    const fullPrompt = shot.prompt || `Cinematic film still, ${shot.title}. ${shot.description || ''}. Shot on ${shot.camera.lens}, ${shot.camera.shotSize} framing, ${shot.environment.lightingSetup || shot.environment.keyLight || 'cinematic atmospheric lighting'}, ${shot.style.colorTreatment || 'rich color grade'}, 8K resolution master cinematography.`;
    
    try {
      let imageUrl: string;
      try {
        imageUrl = await FilmStudioApiClient.generateImage(fullPrompt, '16:9');
      } catch (apiErr) {
        console.warn('Backend image model unavailable or error, synthesizing prompt-faithful cinematic frame:', apiErr);
        imageUrl = generatePromptFaithfulVisual({
          prompt: fullPrompt,
          title: shot.title,
          shotId: shot.id,
          sceneHeading: scene?.heading,
          shotSize: shot.camera.shotSize,
          lens: shot.camera.lens,
          lighting: shot.environment?.lightingSetup || shot.environment?.keyLight,
          colorTemp: shot.environment?.colorTemp,
          aspectRatio: '16:9'
        });
      }

      const newTake = {
        id: `take_${Date.now()}`,
        takeNumber: (shot.takes?.length || 0) + 1,
        type: 'image' as const,
        url: imageUrl,
        prompt: fullPrompt,
        parameters: { ...shot.camera },
        rating: 5,
        notes: 'Rendered via Storyboard Studio (gemini-3.1-flash-image)',
        createdAt: new Date().toISOString()
      };

      onUpdateShot({
        ...shot,
        storyboardImageUrl: imageUrl,
        status: 'review',
        takes: [newTake, ...(shot.takes || [])]
      });
    } catch (e: any) {
      console.error('Storyboard generation error:', e);
      const scene = project.scenes.find(s => s.id === shot.sceneId);
      const fallbackVisual = generatePromptFaithfulVisual({
        prompt: fullPrompt,
        title: shot.title,
        shotId: shot.id,
        sceneHeading: scene?.heading,
        shotSize: shot.camera.shotSize,
        lens: shot.camera.lens,
        lighting: shot.environment?.lightingSetup || shot.environment?.keyLight,
        colorTemp: shot.environment?.colorTemp,
        aspectRatio: '16:9'
      });
      onUpdateShot({
        ...shot,
        storyboardImageUrl: fallbackVisual,
        status: 'review'
      });
    } finally {
      setGeneratingShotId(null);
    }
  };

  const handleToggleApprove = (shot: Shot) => {
    onUpdateShot({
      ...shot,
      status: shot.status === 'approved' ? 'review' : 'approved'
    });
  };

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#0A0A0B] text-[#E0E0E0]">
      {/* Header & Controls */}
      <div className="h-11 bg-[#0E0E10] border-b border-[#222225] px-4 flex items-center justify-between shrink-0 font-mono">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-[#E0E0E0] text-xs font-semibold">
            <LayoutGrid className="w-4 h-4 text-[#CBA135]" />
            <span className="uppercase tracking-wider">VISUAL STORYBOARD & PREVIZ MATRIX</span>
          </div>

          <select
            value={selectedSceneFilter}
            onChange={(e) => setSelectedSceneFilter(e.target.value)}
            className="bg-[#151619] border border-[#2A2A2D] rounded-sm px-2 py-1 text-[#8E9299] text-xs focus:outline-none focus:border-[#CBA135]"
          >
            <option value="ALL">ALL SCENES ({project.shots.length} SHOTS)</option>
            {project.scenes.map(s => (
              <option key={s.id} value={s.id}>SCENE #{s.sceneNumber}: {s.heading.substring(0, 24)}...</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          {onOpenImageStudio && (
            <button
              onClick={() => onOpenImageStudio()}
              className="px-2.5 py-1 rounded-sm text-xs font-mono font-medium bg-[#0E1B24] hover:bg-[#162734] text-cyan-300 border border-cyan-500/40 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Wand2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>IMAGE STUDIO / RETOUCH</span>
            </button>
          )}

          <button
            onClick={onBatchGenerateAll}
            className="px-2.5 py-1 rounded-sm text-xs font-mono font-medium bg-[#151619] hover:bg-[#1E1F24] text-[#CBA135] border border-[#CBA135]/40 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#CBA135]" />
            <span>RENDER ALL UNGENERATED ({project.shots.filter(s => !s.storyboardImageUrl).length})</span>
          </button>
        </div>
      </div>

      {/* Storyboard Grid */}
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {filteredShots.map((shot) => {
            const scene = project.scenes.find(s => s.id === shot.sceneId);
            const isGenerating = generatingShotId === shot.id;
            const dialogues = project.dialogueSegments.filter(d => shot.dialogueIds?.includes(d.id));

            return (
              <div 
                key={shot.id}
                className={`bg-[#121215] border rounded-sm overflow-hidden flex flex-col transition-all group ${
                  shot.status === 'approved' 
                    ? 'border-emerald-500/40 shadow-sm' 
                    : 'border-[#222225] hover:border-[#333338]'
                }`}
              >
                {/* Visual Frame */}
                <div className="aspect-video bg-black relative border-b border-[#222225] overflow-hidden group">
                  {shot.storyboardImageUrl ? (
                    <img 
                      src={shot.storyboardImageUrl} 
                      alt={shot.title} 
                      className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300" 
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-[#555] p-4 text-center">
                      <LayoutGrid className="w-7 h-7 mb-1.5 text-[#333]" />
                      <span className="text-[10px] font-mono uppercase tracking-wider text-[#666]">UNRENDERED FRAME</span>
                    </div>
                  )}

                  {/* Badges Over Image */}
                  <div className="absolute top-2 left-2 flex items-center gap-1.5">
                    <span className="text-[9px] font-mono font-bold bg-black/85 px-1.5 py-0.5 rounded-sm text-[#CBA135] border border-[#2A2A2D]">
                      {shot.id}
                    </span>
                    <span className="text-[9px] font-mono bg-black/85 px-1.5 py-0.5 rounded-sm text-[#8E9299] border border-[#2A2A2D] uppercase">
                      {shot.camera.shotSize.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="absolute top-2 right-2 flex items-center gap-1">
                    {onOpenImageStudio && (
                      <button
                        onClick={() => onOpenImageStudio(shot)}
                        className="p-1 rounded-sm border backdrop-blur-md bg-black/80 text-cyan-300 border-cyan-500/40 hover:bg-[#162734] transition-all"
                        title="Edit / Retouch frame in Image Studio"
                      >
                        <Wand2 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      onClick={() => handleToggleApprove(shot)}
                      className={`p-1 rounded-sm border backdrop-blur-md transition-all ${
                        shot.status === 'approved' 
                          ? 'bg-[#122018]/90 text-emerald-400 border-emerald-500/50' 
                          : 'bg-black/80 text-[#8E9299] border-[#2A2A2D] hover:text-[#E0E0E0]'
                      }`}
                      title={shot.status === 'approved' ? 'Approved for timeline' : 'Click to approve'}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="absolute bottom-2 left-2 text-[9px] font-mono bg-black/85 px-1.5 py-0.5 rounded-sm text-[#8E9299] border border-[#2A2A2D]">
                    {shot.camera.lens} • {shot.durationSec}s
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-3 flex-1 flex flex-col justify-between space-y-2.5">
                  <div>
                    <div className="flex items-center justify-between text-[10px] text-[#666] font-mono">
                      <span>SCENE #{scene?.sceneNumber} • {scene?.heading.substring(0, 18)}</span>
                      <span className="capitalize">{shot.camera.movement}</span>
                    </div>

                    <h3 className="text-xs font-bold text-[#E0E0E0] mt-1 truncate">{shot.title}</h3>
                    <p className="text-[10px] text-[#8E9299] line-clamp-2 mt-0.5 font-mono">{shot.description}</p>

                    {/* Dialogue Line preview if present */}
                    {dialogues.length > 0 && (
                      <div className="mt-2 p-1.5 rounded-sm bg-[#0E0E10] border border-[#222225] text-[10px] text-emerald-400/90 font-mono italic truncate">
                        "{dialogues[0].text}"
                      </div>
                    )}
                  </div>

                  {/* Actions Footer */}
                  <div className="pt-2 border-t border-[#222225] flex items-center justify-between gap-2">
                    <button
                      onClick={() => onOpenShotDesigner(shot)}
                      className="px-2 py-1 rounded-sm bg-[#0E0E10] hover:bg-[#1E1F24] text-[#8E9299] hover:text-[#E0E0E0] border border-[#2A2A2D] text-[10px] font-mono font-medium transition-colors flex items-center gap-1.5"
                    >
                      <SlidersHorizontal className="w-3 h-3 text-[#CBA135]" />
                      <span>DESIGN</span>
                    </button>

                    <button
                      onClick={() => handleGenerateStoryboard(shot)}
                      disabled={isGenerating}
                      className="px-2.5 py-1 rounded-sm text-[10px] font-mono font-medium bg-[#151619] hover:bg-[#1E1F24] text-[#CBA135] border border-[#CBA135]/40 transition-all flex items-center gap-1.5"
                    >
                      <Sparkles className={`w-3 h-3 ${isGenerating ? 'animate-spin' : ''}`} />
                      <span>{isGenerating ? 'GENERATING...' : shot.storyboardImageUrl ? 'REGENERATE' : 'GENERATE'}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
