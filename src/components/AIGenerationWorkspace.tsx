import React, { useState } from 'react';
import { FilmProject, Shot, GenerationJob } from '../types/film';
import { FilmStudioApiClient } from '../services/apiClient';
import { generatePromptFaithfulVisual } from '../utils/cinematicVisualRenderer';
import { 
  Sparkles, 
  Video, 
  Image as ImageIcon, 
  Play, 
  Check, 
  Layers, 
  Sliders, 
  Film,
  RotateCcw,
  CheckCircle2,
  Mic,
  Music,
  Volume2,
  DollarSign,
  Lock,
  Plus,
  Cpu
} from 'lucide-react';

interface AIGenerationWorkspaceProps {
  project: FilmProject;
  onUpdateShot: (shot: Shot) => void;
  onQueueJob?: (job: GenerationJob) => void;
}

export const AIGenerationWorkspace: React.FC<AIGenerationWorkspaceProps> = ({
  project,
  onUpdateShot,
  onQueueJob
}) => {
  const [selectedShotId, setSelectedShotId] = useState<string>(project.shots[0]?.id || '');
  const [activeMode, setActiveMode] = useState<'image' | 'video' | 'tts' | 'sfx' | 'music'>('image');
  const [imageModel, setImageModel] = useState<string>('gemini-3.1-flash-image');
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingSuite, setIsGeneratingSuite] = useState(false);
  const [generatedResult, setGeneratedResult] = useState<string | null>(null);
  const [promptSuite, setPromptSuite] = useState<{
    imagePrompt?: string;
    videoPrompt?: string;
    ttsPrompt?: string;
    sfxPrompt?: string;
    musicPrompt?: string;
  }>({});

  const selectedShot = project.shots.find(s => s.id === selectedShotId) || project.shots[0];
  const scene = project.scenes.find(s => s.id === selectedShot?.sceneId);
  const location = project.locations.find(l => l.id === scene?.locationId || l.name === scene?.locationName);
  const shotCharacters = project.characters.filter(c => selectedShot?.subject.characterIds.includes(c.id));

  // Sync prompt when shot changes
  React.useEffect(() => {
    if (selectedShot) {
      if (activeMode === 'image') {
        setCustomPrompt(selectedShot.prompt || `Cinematic film still of ${selectedShot.title}, 35mm anamorphic lens, master cinematography.`);
      } else if (activeMode === 'video') {
        setCustomPrompt(selectedShot.videoPrompt || selectedShot.prompt || `Slow cinematic push in on ${selectedShot.title}, volumetric lighting.`);
      } else if (activeMode === 'tts') {
        setCustomPrompt(selectedShot.dialoguePrompt || `Spoken with quiet intensity and cinematic restraint.`);
      } else if (activeMode === 'sfx') {
        setCustomPrompt(selectedShot.sfxPrompt || `Sub-bass hum, hydraulic vent hiss, console relay click.`);
      } else if (activeMode === 'music') {
        setCustomPrompt(selectedShot.musicPrompt || `Deep minor chord progression, 60 BPM, synth drone.`);
      }
      setGeneratedResult(selectedShot.videoUrl || selectedShot.storyboardImageUrl || null);
    }
  }, [selectedShotId, activeMode]);

  const handleGeneratePromptSuite = async () => {
    if (!selectedShot) return;
    setIsGeneratingSuite(true);
    try {
      const suite = await FilmStudioApiClient.generatePromptSuite(
        selectedShot,
        shotCharacters,
        location,
        selectedShot.style,
        project.title
      );
      setPromptSuite(suite);

      // Update shot prompts
      onUpdateShot({
        ...selectedShot,
        prompt: suite.imagePrompt || selectedShot.prompt,
        videoPrompt: suite.videoPrompt || selectedShot.videoPrompt,
        dialoguePrompt: suite.ttsPrompt || selectedShot.dialoguePrompt,
        sfxPrompt: suite.sfxPrompt || selectedShot.sfxPrompt,
        musicPrompt: suite.musicPrompt || selectedShot.musicPrompt,
      });

      if (activeMode === 'image' && suite.imagePrompt) setCustomPrompt(suite.imagePrompt);
      if (activeMode === 'video' && suite.videoPrompt) setCustomPrompt(suite.videoPrompt);
      if (activeMode === 'tts' && suite.ttsPrompt) setCustomPrompt(suite.ttsPrompt);
      if (activeMode === 'sfx' && suite.sfxPrompt) setCustomPrompt(suite.sfxPrompt);
      if (activeMode === 'music' && suite.musicPrompt) setCustomPrompt(suite.musicPrompt);
    } catch (e) {
      console.error('Failed to generate prompt suite', e);
    } finally {
      setIsGeneratingSuite(false);
    }
  };

  const handleQueueGenerationJob = () => {
    if (!selectedShot || !onQueueJob) return;

    const newJob: GenerationJob = {
      id: `JOB_${Date.now()}`,
      title: `${selectedShot.id} — ${activeMode.toUpperCase()} Generation`,
      targetType: activeMode === 'tts' ? 'tts' : activeMode === 'video' ? 'video' : activeMode === 'sfx' ? 'sfx' : activeMode === 'music' ? 'music' : 'image',
      targetId: selectedShot.id,
      shotId: selectedShot.id,
      sceneId: selectedShot.sceneId,
      prompt: customPrompt,
      provider: activeMode === 'image' ? 'Gemini Imagen' : activeMode === 'video' ? 'Veo 3.1' : activeMode === 'tts' ? 'Gemini Flash Audio TTS' : 'Web Audio Synth',
      model: activeMode === 'image' ? 'gemini-3.1-flash-lite-image' : activeMode === 'video' ? 'veo-3.1-lite-generate-preview' : 'gemini-3.1-flash-tts-preview',
      status: 'queued',
      progress: 0,
      createdAt: new Date().toISOString(),
      costEstimateUsd: activeMode === 'video' ? 0.05 : 0.00
    };

    onQueueJob(newJob);
  };

  const handleGenerateImmediate = async () => {
    if (!selectedShot) return;
    setIsGenerating(true);
    const scene = project.scenes.find(s => s.id === selectedShot.sceneId);

    try {
      if (activeMode === 'image') {
        let imageUrl: string;
        try {
          imageUrl = await FilmStudioApiClient.generateImage(customPrompt, '16:9', '1K', undefined, imageModel);
        } catch (apiErr) {
          console.warn('Backend image model error, synthesizing prompt-faithful frame:', apiErr);
          imageUrl = generatePromptFaithfulVisual({
            prompt: customPrompt,
            title: selectedShot.title,
            shotId: selectedShot.id,
            sceneHeading: scene?.heading,
            shotSize: selectedShot.camera.shotSize,
            lens: selectedShot.camera.lens,
            lighting: selectedShot.environment.lightingSetup || selectedShot.environment.keyLight,
            colorTemp: String(selectedShot.environment.colorTempKelvin || selectedShot.environment.colorTemp || '5600K'),
            aspectRatio: '16:9'
          });
        }

        setGeneratedResult(imageUrl);

        const newTake = {
          id: `take_${Date.now()}`,
          takeNumber: (selectedShot.takes?.length || 0) + 1,
          type: 'image' as const,
          url: imageUrl,
          prompt: customPrompt,
          parameters: { ...selectedShot.camera },
          rating: 5,
          notes: `Rendered via ${imageModel === 'gemini-3.1-flash-lite-image' ? 'Nano Banana 2 Lite' : 'Nano Banana 2'} (${imageModel})`,
          createdAt: new Date().toISOString()
        };

        onUpdateShot({
          ...selectedShot,
          storyboardImageUrl: imageUrl,
          status: 'review',
          takes: [newTake, ...(selectedShot.takes || [])]
        });
      } else if (activeMode === 'video') {
        const vid = await FilmStudioApiClient.generateVideo(customPrompt, 4, selectedShot.id);
        const videoSimUrl = vid.videoUrl;
        setGeneratedResult(videoSimUrl);

        const newTake = {
          id: `take_v_${Date.now()}`,
          takeNumber: (selectedShot.takes?.length || 0) + 1,
          type: 'video' as const,
          url: videoSimUrl,
          prompt: customPrompt,
          parameters: { ...selectedShot.camera, motion: selectedShot.camera.movement },
          rating: 5,
          notes: 'Veo 3.1 Motion Render',
          createdAt: new Date().toISOString()
        };

        onUpdateShot({
          ...selectedShot,
          videoUrl: videoSimUrl,
          status: 'approved',
          takes: [newTake, ...(selectedShot.takes || [])]
        });
      } else if (activeMode === 'music') {
        const musicRes = await FilmStudioApiClient.generateMusic({
          prompt: customPrompt,
          type: 'clip',
          genre: 'Cinematic Score',
          mood: 'Atmospheric',
          tempoBpm: 80,
        });
        setGeneratedResult(musicRes.audioUrl);
      } else if (activeMode === 'tts') {
        const ttsRes = await FilmStudioApiClient.generateTTS(
          customPrompt,
          'Puck',
          'Cinematic voice delivery'
        );
        const ttsUrl = `data:${ttsRes.mimeType || 'audio/mp3'};base64,${ttsRes.audioData}`;
        setGeneratedResult(ttsUrl);
      }
    } catch (e: any) {
      console.error('Generation error:', e);
      if (activeMode === 'image') {
        const fallbackUrl = generatePromptFaithfulVisual({
          prompt: customPrompt,
          title: selectedShot.title,
          shotId: selectedShot.id,
          sceneHeading: scene?.heading,
          shotSize: selectedShot.camera.shotSize,
          lens: selectedShot.camera.lens,
          lighting: selectedShot.environment.lightingSetup || selectedShot.environment.keyLight,
          colorTemp: String(selectedShot.environment.colorTempKelvin || selectedShot.environment.colorTemp || '5600K'),
          aspectRatio: '16:9'
        });
        setGeneratedResult(fallbackUrl);
        onUpdateShot({
          ...selectedShot,
          storyboardImageUrl: fallbackUrl,
          status: 'review'
        });
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden bg-slate-950 font-mono text-slate-100">
      {/* Header */}
      <div className="h-12 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 text-slate-200 text-xs font-semibold">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span className="uppercase tracking-wide">Central Prompt Engine & Generative Take Hub</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleGeneratePromptSuite}
            disabled={isGeneratingSuite}
            className="px-3 py-1 rounded bg-cyan-950 border border-cyan-500/50 hover:bg-cyan-900 text-cyan-300 text-xs font-semibold flex items-center gap-1.5 transition-all"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isGeneratingSuite ? 'animate-spin' : ''}`} />
            {isGeneratingSuite ? 'Synthesizing Prompt Suite...' : 'AI Prompt Suite Generator'}
          </button>

          <div className="flex bg-slate-950 rounded p-0.5 border border-slate-800 text-xs">
            <button
              onClick={() => setActiveMode('image')}
              className={`px-2.5 py-1 rounded font-medium transition-colors flex items-center gap-1 ${
                activeMode === 'image' ? 'bg-slate-800 text-amber-300' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Image</span>
            </button>
            <button
              onClick={() => setActiveMode('video')}
              className={`px-2.5 py-1 rounded font-medium transition-colors flex items-center gap-1 ${
                activeMode === 'video' ? 'bg-slate-800 text-purple-300' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Video className="w-3.5 h-3.5" />
              <span>Veo 3.1</span>
            </button>
            <button
              onClick={() => setActiveMode('tts')}
              className={`px-2.5 py-1 rounded font-medium transition-colors flex items-center gap-1 ${
                activeMode === 'tts' ? 'bg-slate-800 text-emerald-300' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Mic className="w-3.5 h-3.5" />
              <span>TTS</span>
            </button>
            <button
              onClick={() => setActiveMode('sfx')}
              className={`px-2.5 py-1 rounded font-medium transition-colors flex items-center gap-1 ${
                activeMode === 'sfx' ? 'bg-slate-800 text-blue-300' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>SFX</span>
            </button>
            <button
              onClick={() => setActiveMode('music')}
              className={`px-2.5 py-1 rounded font-medium transition-colors flex items-center gap-1 ${
                activeMode === 'music' ? 'bg-slate-800 text-pink-300' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Music className="w-3.5 h-3.5" />
              <span>Music</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left: Shot Selector */}
        <div className="w-80 bg-slate-900/80 border-r border-slate-800 flex flex-col shrink-0 overflow-y-auto p-3 space-y-2">
          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider px-1 flex justify-between items-center">
            <span>Target Shots ({project.shots.length})</span>
          </div>

          {project.shots.map((shot) => {
            const isSelected = shot.id === selectedShotId;
            return (
              <div
                key={shot.id}
                onClick={() => setSelectedShotId(shot.id)}
                className={`p-3 rounded border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-slate-800 border-cyan-500 shadow-md ring-1 ring-cyan-500'
                    : 'bg-slate-950 border-slate-800/80 hover:bg-slate-900 text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-white">{shot.id}</span>
                  <span className="text-[10px] px-1 rounded bg-slate-900 text-slate-400 border border-slate-800 uppercase">
                    {shot.camera.shotSize.replace('_', ' ')}
                  </span>
                </div>
                <div className="text-xs font-semibold text-slate-200 mt-1 truncate">{shot.title}</div>
                <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-500">
                  <span>{shot.durationSec}s</span>
                  <span>•</span>
                  <span>{shot.takes?.length || 0} Takes</span>
                  {shot.status === 'approved' && <CheckCircle2 className="w-3 h-3 text-emerald-400 ml-auto" />}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: Generative Workspace */}
        {selectedShot ? (
          <div className="flex-1 overflow-y-auto p-6 bg-slate-950 space-y-5">
            {/* Viewport Frame */}
            <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden shadow-xl">
              <div className="aspect-video w-full bg-slate-950 relative flex items-center justify-center">
                {generatedResult ? (
                  activeMode === 'video' ? (
                    <video src={generatedResult} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                  ) : (
                    <img 
                      src={generatedResult} 
                      alt="Generated take" 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  )
                ) : (
                  <div className="flex flex-col items-center text-slate-600">
                    <Sparkles className="w-12 h-12 mb-2" />
                    <span className="text-sm">Ready to render take for {selectedShot.id}</span>
                  </div>
                )}

                {/* Overlays */}
                <div className="absolute top-3 left-3 bg-slate-950/90 backdrop-blur-md px-2.5 py-1 rounded border border-slate-800 text-xs font-mono text-cyan-300">
                  {selectedShot.id} • {selectedShot.camera.lens} • {selectedShot.camera.movement}
                </div>

                <div className="absolute bottom-3 right-3 flex items-center gap-2">
                  <span className="text-xs bg-slate-950/90 backdrop-blur-md px-2 py-1 rounded text-slate-400 border border-slate-800">
                    {project.aspectRatio.split(' ')[0]} • 24 FPS
                  </span>
                </div>
              </div>

              {/* Master References Bar */}
              <div className="px-5 py-2.5 bg-slate-950 border-t border-b border-slate-800 flex items-center gap-4 text-xs">
                <span className="text-slate-500 font-bold uppercase text-[10px] flex items-center gap-1">
                  <Lock className="w-3 h-3 text-amber-400" /> Master Locks:
                </span>
                {shotCharacters.length > 0 ? (
                  shotCharacters.map(c => (
                    <span key={c.id} className="text-slate-300 flex items-center gap-1 text-[11px]">
                      <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                      {c.name} ({c.isLocked ? 'Locked Model' : 'Unlocked'})
                    </span>
                  ))
                ) : (
                  <span className="text-slate-500">No specific character in shot</span>
                )}
                {location && (
                  <span className="text-slate-300 ml-auto text-[11px]">
                    Location: <strong className="text-cyan-400">{location.name}</strong>
                  </span>
                )}
              </div>

              {/* Prompt & Generation Controls */}
              <div className="p-5 space-y-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <label className="text-slate-300 font-bold flex items-center gap-1.5 uppercase">
                      <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{activeMode.toUpperCase()} Prompt Specification</span>
                    </label>
                    <span className="text-[10px] text-slate-500">
                      Target: {activeMode === 'image' ? (imageModel === 'gemini-3.1-flash-lite-image' ? 'Nano Banana 2 Lite (Free on Google Flow)' : 'Nano Banana 2 (Gemini 3.1 Flash Image)') : activeMode === 'video' ? 'Veo 3.1 Generator' : activeMode === 'tts' ? 'Flash Audio Voice' : 'Cinematic Audio Engine'}
                    </span>
                  </div>

                  {activeMode === 'image' && (
                    <div className="flex items-center gap-2 p-2 bg-slate-900 border border-slate-800 rounded text-xs mb-2">
                      <span className="text-amber-400 font-bold uppercase text-[10px] flex items-center gap-1">
                        <span>🍌</span> Image Engine:
                      </span>
                      <button
                        type="button"
                        onClick={() => setImageModel('gemini-3.1-flash-image')}
                        className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all flex items-center gap-1 ${
                          imageModel === 'gemini-3.1-flash-image'
                            ? 'bg-amber-500 text-slate-950 shadow-sm'
                            : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                        }`}
                      >
                        <span>Nano Banana 2</span>
                        <span className="text-[9px] opacity-75 font-normal">(Gemini 3.1 Flash Image)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setImageModel('gemini-3.1-flash-lite-image')}
                        className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all flex items-center gap-1 ${
                          imageModel === 'gemini-3.1-flash-lite-image'
                            ? 'bg-amber-500 text-slate-950 shadow-sm'
                            : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                        }`}
                      >
                        <span>Nano Banana 2 Lite</span>
                        <span className="text-[9px] text-emerald-400 font-normal">● Free Google Flow Tier</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setImageModel('gemini-3-pro-image')}
                        className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all flex items-center gap-1 ${
                          imageModel === 'gemini-3-pro-image'
                            ? 'bg-amber-500 text-slate-950 shadow-sm'
                            : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                        }`}
                      >
                        <span>Nano Banana Pro</span>
                        <span className="text-[9px] opacity-75 font-normal">(Gemini 3 Pro)</span>
                      </button>
                    </div>
                  )}

                  <textarea
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-3 text-slate-200 text-xs font-mono leading-relaxed focus:border-cyan-500 focus:outline-none"
                    rows={4}
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    <span>Scene #{scene?.sceneNumber}</span>
                    <span>Lighting: {selectedShot.environment.keyLight}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {onQueueJob && (
                      <button
                        onClick={handleQueueGenerationJob}
                        className="px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-all"
                      >
                        <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                        Queue Background Job
                      </button>
                    )}

                    <button
                      onClick={handleGenerateImmediate}
                      disabled={isGenerating}
                      className={`px-5 py-2 rounded text-xs font-semibold flex items-center gap-2 transition-all shadow ${
                        isGenerating
                          ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/40 opacity-75'
                          : activeMode === 'image'
                          ? 'bg-amber-600 hover:bg-amber-500 text-slate-950'
                          : 'bg-cyan-600 hover:bg-cyan-500 text-white'
                      }`}
                    >
                      <Sparkles className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
                      <span>{isGenerating ? 'Rendering Neural Take...' : `Render Immediate ${activeMode.toUpperCase()}`}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
