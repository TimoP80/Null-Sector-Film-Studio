import React from 'react';
import { FilmProject } from '../types/film';
import { ShotListNavigationOptions } from '../utils/shotReadiness';
import { ProductionSupervisorPanel } from './ProductionSupervisorPanel';
import { 
  Film, 
  Layers, 
  Camera, 
  Image as ImageIcon, 
  Video, 
  MessageSquareQuote, 
  Volume2, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Play,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  FileCheck,
  FolderOpen,
  DollarSign,
  Lock,
  Cpu,
  Tv
} from 'lucide-react';

interface ProjectDashboardProps {
  project: FilmProject;
  onNavigate: (tab: string) => void;
  onBatchGenerate: (action: string) => void;
  onOpenShotList: (options?: ShotListNavigationOptions) => void;
  onOpenShot?: (shotId: string, takeId?: string) => void;
}

export const ProjectDashboard: React.FC<ProjectDashboardProps> = ({
  project,
  onNavigate,
  onBatchGenerate,
  onOpenShotList,
  onOpenShot,
}) => {
  const totalShots = project.shots.length;
  const completedShots = project.shots.filter(s => s.status === 'approved').length;
  const inProgressShots = project.shots.filter(s => s.status === 'generating' || s.status === 'review').length;
  const pendingShots = project.shots.filter(s => s.status === 'pending').length;

  const totalStoryboardImages = project.shots.filter(s => !!s.storyboardImageUrl).length;
  const totalVideos = project.shots.filter(s => !!s.videoUrl).length;
  const totalDialogues = project.dialogueSegments.length;
  const readyDialogues = project.dialogueSegments.filter(d => d.status === 'approved' || !!d.audioUrl).length;
  const totalAudioAssets = project.sfxCues.length + project.musicCues.length;
  const readyAudioAssets = project.sfxCues.filter(s => !!s.audioUrl || (s.volume !== undefined && s.volume > 0)).length + project.musicCues.filter(m => m.status === 'ready').length;

  const lockedCharacters = project.characters.filter(c => c.isLocked).length;
  const totalCharacters = project.characters.length;
  const lockedLocations = project.locations.filter(l => l.isLocked).length;
  const totalLocations = project.locations.length;
  const shotsWithPrompts = project.shots.filter(s => !!s.prompt && s.prompt.length > 20).length;

  const progressPct = totalShots > 0 ? Math.round((completedShots / totalShots) * 100) : 0;

  // Zero-Budget calculation
  const totalAssetsCount = (project.assets?.length || 0) + totalStoryboardImages + totalVideos;
  const estimatedCost = (project.generationJobs || []).reduce((acc, j) => acc + (j.costEstimateUsd || 0), 0);

  return (
    <div className="p-5 space-y-5 max-w-7xl mx-auto overflow-y-auto text-[#E0E0E0] font-mono">
      {/* Top Banner: Project Telemetry & Spec Summary */}
      <div className="panel p-5 relative overflow-hidden bg-[#151619] border border-[#2A2A2D] rounded-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="px-2 py-0.5 rounded-sm text-[9px] uppercase font-bold tracking-widest bg-[#CBA135]/15 text-[#CBA135] border border-[#CBA135]/40">
                {project.status.toUpperCase()}
              </span>
              <span className="text-[10px] text-[#666] tracking-wider">PROJ_ID: {project.id}</span>
              {project.zeroBudgetSettings?.enabled && (
                <span className="px-2 py-0.5 rounded-sm text-[9px] uppercase font-bold tracking-widest bg-emerald-950 text-emerald-400 border border-emerald-800/60 flex items-center gap-1">
                  <DollarSign className="w-3 h-3" /> ZERO-BUDGET WORKFLOW
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-[#FFFFFF] mt-1.5 tracking-wider uppercase">{project.title}</h1>
            <p className="text-xs text-[#8E9299] mt-1 max-w-3xl leading-relaxed font-sans">{project.logline}</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center shrink-0">
            <div className="bg-[#0A0A0B] border border-[#222225] px-3 py-1.5 rounded-sm">
              <div className="text-[9px] uppercase tracking-wider text-[#666]">Genre</div>
              <div className="text-xs font-semibold text-[#E0E0E0] truncate">{project.genre}</div>
            </div>
            <div className="bg-[#0A0A0B] border border-[#222225] px-3 py-1.5 rounded-sm">
              <div className="text-[9px] uppercase tracking-wider text-[#666]">Runtime</div>
              <div className="text-xs font-semibold text-[#E0E0E0]">{project.runtimeMin} MIN</div>
            </div>
            <div className="bg-[#0A0A0B] border border-[#222225] px-3 py-1.5 rounded-sm">
              <div className="text-[9px] uppercase tracking-wider text-[#666]">Format</div>
              <div className="text-xs font-semibold text-[#E0E0E0]">{project.resolution}</div>
            </div>
            <div className="bg-[#0A0A0B] border border-[#222225] px-3 py-1.5 rounded-sm">
              <div className="text-[9px] uppercase tracking-wider text-[#666]">Aspect Ratio</div>
              <div className="text-xs font-semibold text-[#CBA135]">{project.aspectRatio.split(' ')[0]}</div>
            </div>
          </div>
        </div>

        {/* Global Progress Bar */}
        <div className="mt-5 pt-4 border-t border-[#222225] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex justify-between items-center text-xs mb-1.5">
              <span className="text-[#8E9299] flex items-center gap-2 text-[11px] uppercase tracking-wider">
                <TrendingUp className="w-3.5 h-3.5 text-[#CBA135]" />
                Production Completion Matrix
              </span>
              <span className="text-[#CBA135] font-bold text-xs">{progressPct}% APPROVED</span>
            </div>
            <div className="w-full bg-[#0A0A0B] rounded-full h-2 overflow-hidden border border-[#222225]">
              <div 
                className="bg-[#CBA135] h-full transition-all duration-500" 
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-4 text-[11px] shrink-0">
            <div className="flex items-center gap-1.5 text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{completedShots} Approved</span>
            </div>
            <div className="flex items-center gap-1.5 text-[#CBA135]">
              <Clock className="w-3.5 h-3.5" />
              <span>{inProgressShots} Processing</span>
            </div>
            <div className="flex items-center gap-1.5 text-[#666]">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{pendingShots} Queue</span>
            </div>
          </div>
        </div>
      </div>

      <ProductionSupervisorPanel
        project={project}
        onNavigate={onNavigate}
        onOpenShotList={onOpenShotList}
        onOpenShot={onOpenShot}
      />

      {/* Production Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Storyboard Frames */}
        <div className="panel p-3.5 flex flex-col justify-between bg-[#151619] border border-[#2A2A2D] rounded-md">
          <div>
            <div className="flex items-center justify-between text-[#8E9299] text-xs mb-2">
              <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-[#E0E0E0]">
                <ImageIcon className="w-3.5 h-3.5 text-[#CBA135]" />
                Storyboards
              </span>
              <span className="text-[#CBA135] text-[11px] font-bold">{totalStoryboardImages} / {totalShots}</span>
            </div>
            <div className="w-full bg-[#0A0A0B] rounded-full h-1 overflow-hidden border border-[#222225] my-2">
              <div 
                className="bg-[#CBA135] h-full" 
                style={{ width: `${totalShots ? (totalStoryboardImages / totalShots) * 100 : 0}%` }}
              />
            </div>
            <p className="text-[10px] text-[#8E9299] mt-1 leading-relaxed">
              Visual continuity frames keyed to master character models.
            </p>
          </div>
          <button
            onClick={() => onNavigate('STORYBOARD')}
            className="mt-3 flex items-center justify-between text-[11px] text-[#CBA135] hover:text-[#DFB548] transition-colors pt-2 border-t border-[#222225]"
          >
            <span className="uppercase tracking-wider">Open Studio</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* Video Takes */}
        <div className="panel p-3.5 flex flex-col justify-between bg-[#151619] border border-[#2A2A2D] rounded-md">
          <div>
            <div className="flex items-center justify-between text-[#8E9299] text-xs mb-2">
              <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-[#E0E0E0]">
                <Video className="w-3.5 h-3.5 text-cyan-400" />
                Video Takes
              </span>
              <span className="text-cyan-400 text-[11px] font-bold">{totalVideos} / {totalShots}</span>
            </div>
            <div className="w-full bg-[#0A0A0B] rounded-full h-1 overflow-hidden border border-[#222225] my-2">
              <div 
                className="bg-cyan-500 h-full" 
                style={{ width: `${totalShots ? (totalVideos / totalShots) * 100 : 0}%` }}
              />
            </div>
            <p className="text-[10px] text-[#8E9299] mt-1 leading-relaxed">
              Cinematic video clips rendered with camera & motion control.
            </p>
          </div>
          <button
            onClick={() => onNavigate('AI_GENERATION')}
            className="mt-3 flex items-center justify-between text-[11px] text-cyan-400 hover:text-cyan-300 transition-colors pt-2 border-t border-[#222225]"
          >
            <span className="uppercase tracking-wider">Open Generator</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* Dialogue Voice Dept */}
        <div className="panel p-3.5 flex flex-col justify-between bg-[#151619] border border-[#2A2A2D] rounded-md">
          <div>
            <div className="flex items-center justify-between text-[#8E9299] text-xs mb-2">
              <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-[#E0E0E0]">
                <MessageSquareQuote className="w-3.5 h-3.5 text-emerald-400" />
                Voice Synthetics
              </span>
              <span className="text-emerald-400 text-[11px] font-bold">{readyDialogues} / {totalDialogues}</span>
            </div>
            <div className="w-full bg-[#0A0A0B] rounded-full h-1 overflow-hidden border border-[#222225] my-2">
              <div 
                className="bg-emerald-500 h-full" 
                style={{ width: `${totalDialogues ? (readyDialogues / totalDialogues) * 100 : 0}%` }}
              />
            </div>
            <p className="text-[10px] text-[#8E9299] mt-1 leading-relaxed">
              Character voice models locked with emotional acoustic delivery.
            </p>
          </div>
          <button
            onClick={() => onNavigate('DIALOGUE')}
            className="mt-3 flex items-center justify-between text-[11px] text-emerald-400 hover:text-emerald-300 transition-colors pt-2 border-t border-[#222225]"
          >
            <span className="uppercase tracking-wider">Open Dialogue</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* Audio & Score */}
        <div className="panel p-3.5 flex flex-col justify-between bg-[#151619] border border-[#2A2A2D] rounded-md">
          <div>
            <div className="flex items-center justify-between text-[#8E9299] text-xs mb-2">
              <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-[#E0E0E0]">
                <Volume2 className="w-3.5 h-3.5 text-[#CBA135]" />
                SFX & Score
              </span>
              <span className="text-[#CBA135] text-[11px] font-bold">{readyAudioAssets} / {totalAudioAssets}</span>
            </div>
            <div className="w-full bg-[#0A0A0B] rounded-full h-1 overflow-hidden border border-[#222225] my-2">
              <div 
                className="bg-[#CBA135] h-full" 
                style={{ width: `${totalAudioAssets ? (readyAudioAssets / totalAudioAssets) * 100 : 0}%` }}
              />
            </div>
            <p className="text-[10px] text-[#8E9299] mt-1 leading-relaxed">
              Sub-harmonic drone cues, hydraulic SFX, and adaptive score.
            </p>
          </div>
          <button
            onClick={() => onNavigate('AUDIO')}
            className="mt-3 flex items-center justify-between text-[11px] text-[#CBA135] hover:text-[#DFB548] transition-colors pt-2 border-t border-[#222225]"
          >
            <span className="uppercase tracking-wider">Open Sound</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Production Readiness & Health Checklist Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-8 panel p-4 bg-[#151619] border border-[#2A2A2D] rounded-md">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#222225]">
            <h2 className="text-xs font-bold text-[#FFFFFF] flex items-center gap-2 uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Production Pre-Flight & Health Checklist
            </h2>
            <span className="text-[10px] text-slate-400">
              11 Automated Verification Dimensions
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
            {/* Screenplay status */}
            <div className="bg-[#0E0E10] border border-[#222225] p-2.5 rounded flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <div className="font-bold text-white text-[11px]">Screenplay & Narrative</div>
                  <div className="text-[10px] text-slate-500">100% Parsed ({project.scenes.length} Scenes)</div>
                </div>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 bg-emerald-950 text-emerald-300 rounded border border-emerald-800">READY</span>
            </div>

            {/* Shot List */}
            <div className="bg-[#0E0E10] border border-[#222225] p-2.5 rounded flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <div className="font-bold text-white text-[11px]">Cinematography Coverage</div>
                  <div className="text-[10px] text-slate-500">{totalShots} Shots Designed</div>
                </div>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 bg-emerald-950 text-emerald-300 rounded border border-emerald-800">READY</span>
            </div>

            {/* Character Continuity Locks */}
            <div className="bg-[#0E0E10] border border-[#222225] p-2.5 rounded flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-[#CBA135] shrink-0" />
                <div>
                  <div className="font-bold text-white text-[11px]">Character Master References</div>
                  <div className="text-[10px] text-slate-500">{lockedCharacters} / {totalCharacters} Models Locked</div>
                </div>
              </div>
              <button
                onClick={() => onNavigate('CHARACTERS')}
                className="text-[10px] text-[#CBA135] hover:underline"
              >
                Inspect
              </button>
            </div>

            {/* Location Continuity Locks */}
            <div className="bg-[#0E0E10] border border-[#222225] p-2.5 rounded flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-[#CBA135] shrink-0" />
                <div>
                  <div className="font-bold text-white text-[11px]">Location Master References</div>
                  <div className="text-[10px] text-slate-500">{lockedLocations} / {totalLocations} Environments Locked</div>
                </div>
              </div>
              <button
                onClick={() => onNavigate('LOCATIONS')}
                className="text-[10px] text-[#CBA135] hover:underline"
              >
                Inspect
              </button>
            </div>

            {/* Prompt Coverage */}
            <div className="bg-[#0E0E10] border border-[#222225] p-2.5 rounded flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
                <div>
                  <div className="font-bold text-white text-[11px]">Prompt Suite Generation</div>
                  <div className="text-[10px] text-slate-500">{shotsWithPrompts} / {totalShots} Complete</div>
                </div>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 bg-cyan-950 text-cyan-300 rounded border border-cyan-800">
                {Math.round((shotsWithPrompts / (totalShots || 1)) * 100)}%
              </span>
            </div>

            {/* Timeline Multi-Track Status */}
            <div className="bg-[#0E0E10] border border-[#222225] p-2.5 rounded flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-400 shrink-0" />
                <div>
                  <div className="font-bold text-white text-[11px]">Timeline Multi-Track</div>
                  <div className="text-[10px] text-slate-500">Video 1/2 • Dialogue • SFX • Music</div>
                </div>
              </div>
              <button
                onClick={() => onNavigate('TIMELINE')}
                className="text-[10px] text-purple-400 hover:underline"
              >
                Open Timeline
              </button>
            </div>
          </div>
        </div>

        {/* Quick Workstations & Zero-Budget Box */}
        <div className="lg:col-span-4 panel p-4 bg-[#151619] border border-[#2A2A2D] rounded-md flex flex-col justify-between space-y-3">
          <div>
            <h2 className="text-xs font-bold text-[#FFFFFF] flex items-center gap-2 uppercase tracking-wider mb-2">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              Specialized Studio Modules
            </h2>

            <div className="space-y-2">
              <button
                onClick={() => onNavigate('ASSET_BROWSER')}
                className="w-full text-left p-2.5 rounded bg-[#0E0E10] border border-[#222225] hover:border-cyan-500/60 hover:bg-[#151619] text-xs transition-all group flex items-center justify-between"
              >
                <div>
                  <div className="font-bold text-white group-hover:text-cyan-400 flex items-center gap-1.5">
                    <FolderOpen className="w-3.5 h-3.5 text-cyan-400" />
                    Asset Browser & Library
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    Manage {totalAssetsCount} media takes & metadata
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-cyan-400" />
              </button>

              <button
                onClick={() => onNavigate('STUDIO_BRANDING')}
                className="w-full text-left p-2.5 rounded bg-[#0E0E10] border border-[#222225] hover:border-amber-500/60 hover:bg-[#151619] text-xs transition-all group flex items-center justify-between"
              >
                <div>
                  <div className="font-bold text-white group-hover:text-amber-400 flex items-center gap-1.5">
                    <Tv className="w-3.5 h-3.5 text-amber-400" />
                    Studio Branding & Title Card
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    Procedural CRT shaders & audio stingers
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-amber-400" />
              </button>

              <button
                onClick={() => onNavigate('EXPORT')}
                className="w-full text-left p-2.5 rounded bg-[#0E0E10] border border-[#222225] hover:border-emerald-500/60 hover:bg-[#151619] text-xs transition-all group flex items-center justify-between"
              >
                <div>
                  <div className="font-bold text-white group-hover:text-emerald-400 flex items-center gap-1.5">
                    <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
                    OpenMontage Package Export
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    Full JSON / CSV production deliverables
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-emerald-400" />
              </button>
            </div>
          </div>

          {/* Zero-Budget cost box */}
          <div className="p-2.5 rounded bg-slate-950 border border-slate-800 text-[10px] text-slate-400">
            <div className="flex justify-between items-center mb-1">
              <span className="text-slate-300 font-bold flex items-center gap-1">
                <DollarSign className="w-3 h-3 text-emerald-400" /> Spend Tracker:
              </span>
              <span className="font-bold text-emerald-400 font-mono">${estimatedCost.toFixed(2)} USD</span>
            </div>
            <p className="text-slate-500 leading-normal">
              Zero-budget policy active: uses Gemini Flash, Veo previews, and Web Audio Synth to minimize API costs.
            </p>
          </div>
        </div>
      </div>

      {/* Acts Breakdown Grid */}
      <div className="panel p-4 bg-[#151619] border border-[#2A2A2D] rounded-md">
        <div className="flex items-center justify-between mb-3.5 pb-2 border-b border-[#222225]">
          <h2 className="text-xs font-bold text-[#FFFFFF] flex items-center gap-2 uppercase tracking-wider">
            <Layers className="w-4 h-4 text-[#CBA135]" />
            Act Structure & Sequence Progression
          </h2>
          <button
            onClick={() => onNavigate('SHOT_LIST')}
            className="text-[11px] text-[#CBA135] hover:text-[#DFB548] flex items-center gap-1 uppercase tracking-wider"
          >
            <span>View Shot Matrix</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {project.acts.map((act) => {
            const actScenes = project.scenes.filter(s => s.actId === act.id);
            const actShots = project.shots.filter(s => s.actId === act.id);
            const actApproved = actShots.filter(s => s.status === 'approved').length;
            const actPct = actShots.length > 0 ? Math.round((actApproved / actShots.length) * 100) : 0;

            return (
              <div 
                key={act.id} 
                className="bg-[#0E0E10] border border-[#222225] rounded p-3 hover:border-[#2A2A2D] transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#E0E0E0] uppercase">{act.title}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#151619] text-[#8E9299] border border-[#222225]">
                        {actScenes.length} SCENES
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#151619] text-[#8E9299] border border-[#222225]">
                        {actShots.length} SHOTS
                      </span>
                    </div>
                    <p className="text-[10px] text-[#666] mt-0.5 font-sans line-clamp-1">{act.description}</p>
                  </div>
                  <div className="text-right shrink-0 text-xs">
                    <span className="text-[#CBA135] font-bold">{actApproved}</span>
                    <span className="text-[#555]">/{actShots.length} OK</span>
                  </div>
                </div>

                <div className="w-full bg-[#050505] rounded-full h-1 overflow-hidden border border-[#222225] mt-2.5">
                  <div 
                    className="bg-[#CBA135] h-full" 
                    style={{ width: `${actPct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
