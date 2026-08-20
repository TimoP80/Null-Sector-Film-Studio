import React, { useState } from 'react';
import { FilmProject, Scene, Shot } from '../types/film';
import { FilmStudioApiClient } from '../services/apiClient';
import { 
  Layers, 
  Sparkles, 
  MapPin, 
  Users, 
  Clock, 
  CloudSun, 
  Film, 
  CheckCircle2, 
  Plus,
  ArrowRight,
  ListOrdered
} from 'lucide-react';

interface SceneBreakdownProps {
  project: FilmProject;
  onUpdateScene: (scene: Scene) => void;
  onAddGeneratedShots: (sceneId: string, shots: Shot[]) => void;
  onSelectShot: (shot: Shot) => void;
}

export const SceneBreakdown: React.FC<SceneBreakdownProps> = ({
  project,
  onUpdateScene,
  onAddGeneratedShots,
  onSelectShot,
}) => {
  const [selectedSceneId, setSelectedSceneId] = useState<string>(project.scenes[0]?.id || '');
  const [isGeneratingShots, setIsGeneratingShots] = useState(false);
  const [generationMsg, setGenerationMsg] = useState<string | null>(null);

  const selectedScene = project.scenes.find(s => s.id === selectedSceneId) || project.scenes[0];
  const location = project.locations.find(l => l.id === selectedScene?.locationId);
  const characters = project.characters.filter(c => selectedScene?.characterIds.includes(c.id));
  const sceneShots = project.shots.filter(s => s.sceneId === selectedScene?.id);
  const dialogues = project.dialogueSegments.filter(d => d.sceneId === selectedScene?.id);

  const handleGenerateShotList = async () => {
    if (!selectedScene) return;
    setIsGeneratingShots(true);
    setGenerationMsg(null);

    try {
      const rawShots = await FilmStudioApiClient.generateShotsForScene(
        selectedScene,
        characters,
        location,
        project.title
      );

      const formattedShots: Shot[] = rawShots.map((raw: any, index: number) => {
        const shotNumber = (sceneShots.length || 0) + index + 1;
        const shotId = `${project.id.replace('proj_', 'TLS').toUpperCase()}_${selectedScene.actId}_${selectedScene.id}_SH${String(shotNumber).padStart(3, '0')}`;
        
        return {
          id: raw.id || shotId,
          sceneId: selectedScene.id,
          actId: selectedScene.actId,
          shotNumber,
          title: raw.title || `Shot ${shotNumber}`,
          description: raw.description || '',
          durationSec: raw.durationSec || 4.5,
          status: 'pending',
          camera: raw.camera || {
            shotSize: 'medium',
            angle: 'eye_level',
            lens: '35mm Prime',
            depthOfField: 'shallow',
            position: 'Standard',
            movement: 'static',
            framing: 'Balanced',
            composition: 'Standard'
          },
          subject: raw.subject || {
            characterIds: selectedScene.characterIds,
            pose: '',
            expression: '',
            action: '',
            wardrobe: '',
            props: selectedScene.props
          },
          environment: raw.environment || {
            locationId: selectedScene.locationId,
            timeOfDay: selectedScene.timeOfDay,
            weather: selectedScene.weather,
            atmosphere: '',
            backgroundActivity: '',
            keyLight: 'Directional',
            fillLight: 'Ambient',
            rimLight: 'Subtle',
            practicals: 'None',
            colorTemp: '5600K',
            contrast: 'high',
            mood: 'Dramatic'
          },
          style: raw.style || {
            cinematicStyle: 'Cinematic',
            colorTreatment: 'High contrast',
            filmStock: 'Kodak Vision3 500T',
            texture: 'Subtle grain',
            visualReferences: []
          },
          prompt: raw.prompt || `Cinematic film still of ${selectedScene.heading}, ${raw.description}, 35mm lens, masterpiece cinematography.`,
          storyboardImageUrl: '',
          videoUrl: '',
          dialogueSegmentIds: [],
          takes: [],
          continuityFlags: []
        };
      });

      onAddGeneratedShots(selectedScene.id, formattedShots);
      setGenerationMsg(`Successfully generated ${formattedShots.length} cinematic shots for Scene #${selectedScene.sceneNumber}!`);
    } catch (e: any) {
      console.error(e);
      setGenerationMsg(`Shot generation error: ${e.message}`);
    } finally {
      setIsGeneratingShots(false);
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden bg-neutral-950">
      {/* Top Bar */}
      <div className="h-12 bg-neutral-900/90 border-b border-neutral-800 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 text-neutral-200 text-xs font-semibold">
          <Layers className="w-4 h-4 text-amber-400" />
          <span>Scene Breakdown & Shot List Director</span>
        </div>

        <button
          onClick={handleGenerateShotList}
          disabled={isGeneratingShots}
          className={`flex items-center gap-2 px-3 py-1 rounded text-xs font-semibold transition-all shadow-sm ${
            isGeneratingShots 
              ? 'bg-amber-950 text-amber-300 border border-amber-500/40 opacity-75' 
              : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-neutral-950'
          }`}
        >
          <Sparkles className={`w-3.5 h-3.5 ${isGeneratingShots ? 'animate-spin' : ''}`} />
          <span>{isGeneratingShots ? 'Director AI Generating Shots...' : 'AI Generate Shot List'}</span>
        </button>
      </div>

      {generationMsg && (
        <div className="bg-amber-950/60 border-b border-amber-500/40 px-4 py-2 text-xs text-amber-200 flex justify-between items-center">
          <span>{generationMsg}</span>
          <button onClick={() => setGenerationMsg(null)} className="text-amber-400 hover:text-amber-300">Dismiss</button>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        {/* Left: Scenes List */}
        <div className="w-80 bg-neutral-900/70 border-r border-neutral-800 flex flex-col shrink-0 overflow-y-auto p-3 space-y-2">
          <div className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider px-1">
            Production Scenes ({project.scenes.length})
          </div>

          {project.scenes.map((scene) => {
            const isSelected = scene.id === selectedSceneId;
            const shots = project.shots.filter(s => s.sceneId === scene.id);
            const approved = shots.filter(s => s.status === 'approved').length;

            return (
              <div
                key={scene.id}
                onClick={() => setSelectedSceneId(scene.id)}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-neutral-800/90 border-amber-500/50 shadow-md'
                    : 'bg-neutral-950/70 border-neutral-800/80 hover:bg-neutral-900 text-neutral-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-neutral-200">
                    Scene #{scene.sceneNumber}
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-900 text-emerald-400 border border-neutral-800">
                    {approved}/{shots.length} Shots
                  </span>
                </div>
                <div className="font-mono text-[11px] text-amber-400/90 truncate mt-1">
                  {scene.heading}
                </div>
                <p className="text-[11px] text-neutral-400 line-clamp-2 mt-1">{scene.storyPurpose}</p>
              </div>
            );
          })}
        </div>

        {/* Right: Scene Breakdown Details */}
        {selectedScene ? (
          <div className="flex-1 overflow-y-auto p-6 bg-neutral-950 space-y-6">
            {/* Scene Header Card */}
            <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-5 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-neutral-800 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-amber-400 font-bold">
                      {selectedScene.actId} • SCENE #{selectedScene.sceneNumber}
                    </span>
                    <span className="text-neutral-600">•</span>
                    <span className="text-xs text-neutral-400 font-mono">{selectedScene.estimatedRuntimeSec}s Est. Runtime</span>
                  </div>
                  <h2 className="text-xl font-bold font-mono text-neutral-100 mt-1">{selectedScene.heading}</h2>
                </div>
              </div>

              {/* Grid of parameters */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800">
                  <div className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold mb-1 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-amber-400" />
                    Location & Set
                  </div>
                  <div className="font-semibold text-neutral-200">{location?.name || 'Default Set'}</div>
                  <div className="text-[11px] text-neutral-400 mt-1">{selectedScene.timeOfDay} • {selectedScene.weather}</div>
                </div>

                <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800">
                  <div className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold mb-1 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-cyan-400" />
                    Characters In Scene
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {characters.map(c => (
                      <span key={c.id} className="px-1.5 py-0.5 rounded bg-neutral-900 text-cyan-300 border border-neutral-800 text-[10px]">
                        {c.name}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800">
                  <div className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold mb-1 flex items-center gap-1.5">
                    <ListOrdered className="w-3.5 h-3.5 text-emerald-400" />
                    Key Props & Dressing
                  </div>
                  <div className="text-[11px] text-neutral-300">
                    {selectedScene.props.join(', ') || 'Standard set dress'}
                  </div>
                </div>
              </div>

              {/* Story Purpose & Actions */}
              <div className="space-y-3 pt-2 text-xs">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold">Story Purpose</span>
                  <p className="text-neutral-300 mt-0.5">{selectedScene.storyPurpose}</p>
                </div>

                <div>
                  <span className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold">Key Actions & Blocking</span>
                  <ul className="list-disc list-inside text-neutral-400 space-y-0.5 mt-1">
                    {selectedScene.actions.map((act, i) => (
                      <li key={i}>{act}</li>
                    ))}
                  </ul>
                </div>

                {selectedScene.continuityNotes && (
                  <div className="p-2.5 rounded-lg bg-amber-950/30 border border-amber-500/30 text-amber-300 text-[11px]">
                    <strong>Continuity Flag:</strong> {selectedScene.continuityNotes}
                  </div>
                )}
              </div>
            </div>

            {/* Required Shots Coverage Grid */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-neutral-200 flex items-center gap-2">
                  <Film className="w-4 h-4 text-amber-400" />
                  Coverage Shot Breakdown ({sceneShots.length} Shots)
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {sceneShots.map((shot) => (
                  <div
                    key={shot.id}
                    onClick={() => onSelectShot(shot)}
                    className="p-3 bg-neutral-900 border border-neutral-800 hover:border-amber-500/50 rounded-xl cursor-pointer transition-all space-y-2 group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-amber-400">{shot.id}</span>
                        <span className="text-[10px] font-mono px-1 rounded bg-neutral-950 text-neutral-400 border border-neutral-800 uppercase">
                          {shot.camera.shotSize.replace('_', ' ')}
                        </span>
                      </div>
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded uppercase font-semibold ${
                        shot.status === 'approved' 
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40' 
                          : 'bg-neutral-950 text-neutral-400 border border-neutral-800'
                      }`}>
                        {shot.status}
                      </span>
                    </div>

                    <p className="text-xs text-neutral-200 font-medium">{shot.title}</p>
                    <p className="text-[11px] text-neutral-400 line-clamp-2">{shot.description}</p>

                    <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between text-[10px] text-neutral-500 font-mono">
                      <span>{shot.camera.lens} • {shot.camera.movement}</span>
                      <span className="text-amber-400 group-hover:underline flex items-center gap-1">
                        Edit Shot Designer →
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
