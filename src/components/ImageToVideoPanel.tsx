import React, { useMemo, useState } from 'react';
import { videoJobRuntime } from '../videoJobRuntime';
import { Cpu, Film, RotateCcw, Sparkles } from 'lucide-react';
import { Shot } from '../types/film';
import { FilmStudioApiClient } from '../services/apiClient';
import { buildImageToVideoPrompt } from '../videoPromptBuilder';
import { ShotMotionSpecification, VideoGenerationJob } from '../videoTypes';

interface Props {
  shot: Shot;
  continuityInstructions?: string[];
  onUpdateShot: (shot: Shot) => void;
  onQueueJob?: (job: any) => void;
}

export const ImageToVideoPanel: React.FC<Props> = ({ shot, continuityInstructions = [], onUpdateShot, onQueueJob }) => {
  const [provider, setProvider] = useState<'local' | 'veo'>('local');
  const [duration, setDuration] = useState(4);
  const [resolution, setResolution] = useState('480p');
  const [takes, setTakes] = useState(1);
  const [motionStrength, setMotionStrength] = useState(35);
  const [subjectMovement, setSubjectMovement] = useState(shot.subject.action || 'Subtle natural movement');
  const [environmentalMovement, setEnvironmentalMovement] = useState(shot.environment.backgroundActivity || 'Subtle atmospheric motion');
  const [editingPrompt, setEditingPrompt] = useState(false);
  const [promptOverride, setPromptOverride] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const motion: ShotMotionSpecification = useMemo(() => ({
    cameraMovement: shot.camera.movement.replace(/_/g, ' '),
    cameraSpeed: shot.camera.movementSpeed,
    lens: shot.camera.lens,
    framing: shot.camera.framing,
    subjectMovement,
    environmentalMovement,
    lightingMovement: shot.environment.practicals,
    atmosphere: shot.environment.atmosphere,
    motionStrength,
    duration,
    negativeMotionInstructions: 'No morphing, identity changes, wardrobe changes, sudden movements, camera shake, or composition drift.',
  }), [shot, subjectMovement, environmentalMovement, motionStrength, duration]);

  const generatedPrompt = useMemo(() => buildImageToVideoPrompt(shot, motion, continuityInstructions), [shot, motion, continuityInstructions]);
  const prompt = promptOverride ?? generatedPrompt;
  const sourceImage = shot.storyboardImageUrl;
  const unavailable = provider !== 'local';

  const generate = async () => {
    if (!sourceImage) return setError('Select or generate a storyboard image before creating video.');
    if (unavailable) return setError('Veo is not configured in this panel. Select LTX — Local or configure a cloud provider in Settings.');
    setBusy(true); setError(null);
    try {
      for (let i = 0; i < takes; i += 1) {
        if (onQueueJob) {
          const job = {
            id: `video_${shot.id}_${Date.now()}_${i}`,
            projectId: undefined,
            sceneId: shot.sceneId,
            shotId: shot.id,
            providerId: 'local', modelId: 'ltx-video', status: 'queued' as const,
            sourceImage, prompt, duration, resolution,
            createdAt: new Date().toISOString(),
            motionSpecification: motion,
            generationParameters: { aspectRatio: '16:9', takeNumber: i + 1 },
          } satisfies VideoGenerationJob;
          // The application-level caller assigns project context and enqueues the job.
          onQueueJob({
            id: job.id, title: `${shot.id} — Image to Video Take ${i + 1}`,
            targetType: 'video', targetId: shot.id, shotId: shot.id, sceneId: shot.sceneId,
            provider: 'Local (ComfyUI)', model: 'ltx-video', prompt, status: 'queued', progress: 0,
            createdAt: job.createdAt, costEstimateUsd: 0,
          });
        } else {
          const result = await FilmStudioApiClient.generateLocalVideo(prompt, duration, shot.id, sourceImage, '16:9', resolution, undefined, 'webp');
          const take = {
            id: `take_video_${Date.now()}_${i}`, takeNumber: (shot.takes?.length || 0) + i + 1,
            type: 'video' as const, url: result.videoUrl, prompt, provider: result.provider,
            model: result.model, sourceImage, providerJobId: result.operationId,
            generationParameters: { duration, resolution, motion }, createdAt: new Date().toISOString(), approved: false, isMaster: false,
            durationSec: result.durationSec,
          };
          onUpdateShot({ ...shot, videoUrl: result.videoUrl, status: 'review', takes: [...(shot.takes || []), take] });
        }
      }
    } catch (e) { setError(e instanceof Error ? e.message : 'Video generation failed'); }
    finally { setBusy(false); }
  };

  return <section className="p-4 rounded-sm bg-[#121316] border border-[#222225] space-y-3 font-mono">
    <div className="flex items-center justify-between border-b border-[#222225] pb-2">
      <div className="flex items-center gap-2 text-xs font-bold uppercase text-[#E0E0E0]"><Film className="w-4 h-4 text-cyan-400" /> Image → Video</div>
      <span className="text-[9px] text-emerald-400">TAKE REVIEW REQUIRED</span>
    </div>
    {sourceImage ? <img src={sourceImage} alt="Shot storyboard" className="w-full aspect-video object-cover rounded-sm border border-[#2A2A2D]" /> : <div className="aspect-video flex items-center justify-center border border-dashed border-[#2A2A2D] text-[10px] text-[#666]">NO STORYBOARD IMAGE</div>}
    <div className="grid grid-cols-2 gap-2 text-[10px]">
      <label>ENGINE<select value={provider} onChange={e => setProvider(e.target.value as 'local' | 'veo')} className="field w-full"><option value="local">LTX — Local ComfyUI</option><option value="veo">Veo — Cloud (not configured)</option></select></label>
      <label>MODEL<select disabled={provider !== 'local'} className="field w-full"><option>LTX Video</option></select></label>
      <label>DURATION<select value={duration} onChange={e => setDuration(Number(e.target.value))} className="field w-full"><option value={2}>2 sec</option><option value={4}>4 sec</option><option value={5}>5 sec</option><option value={8}>8 sec</option></select></label>
      <label>RESOLUTION<select value={resolution} onChange={e => setResolution(e.target.value)} className="field w-full"><option>480p</option><option>720p</option><option>1080p</option></select></label>
      <label className="col-span-2">SUBJECT MOVEMENT<input value={subjectMovement} onChange={e => setSubjectMovement(e.target.value)} className="field w-full" /></label>
      <label className="col-span-2">ENVIRONMENT MOVEMENT<input value={environmentalMovement} onChange={e => setEnvironmentalMovement(e.target.value)} className="field w-full" /></label>
      <label>TAKES<select value={takes} onChange={e => setTakes(Number(e.target.value))} className="field w-full"><option>1</option><option>2</option><option>4</option><option>8</option></select></label>
      <label>MOTION STRENGTH <input type="range" min="0" max="100" value={motionStrength} onChange={e => setMotionStrength(Number(e.target.value))} className="w-full" /><span>{motionStrength}%</span></label>
    </div>
    <div><div className="flex items-center justify-between text-[10px] text-[#8E9299]"><span>GENERATED PROMPT</span><button onClick={() => { setPromptOverride(null); setEditingPrompt(false); }} className="text-cyan-300 uppercase">Reset to generated</button></div><textarea value={prompt} readOnly={!editingPrompt} onChange={e => setPromptOverride(e.target.value)} rows={6} className="field w-full mt-1" /></div>
    {error && <div className="text-[10px] text-red-300 border border-red-500/30 p-2">{error}</div>}
    <div className="flex items-center justify-between"><span className="text-[9px] text-[#666]">{provider === 'local' ? 'LOCAL • no cloud API required' : 'Unavailable provider'}</span><div className="flex gap-2"><button onClick={() => setEditingPrompt(!editingPrompt)} className="button">{editingPrompt ? 'LOCK PROMPT' : 'EDIT PROMPT'}</button><button disabled={busy || !sourceImage || unavailable} onClick={generate} className="button-primary"><Cpu className="w-3 h-3" />{busy ? 'GENERATING…' : 'GENERATE VIDEO'}</button></div></div>
  </section>;
};
