import React from 'react';
import { FilmProject, ProviderStatus } from '../types/film';
import { 
  Settings, 
  Film, 
  Cpu, 
  Eye, 
  Layers, 
  CheckCircle2, 
  Check 
} from 'lucide-react';

interface SettingsWorkspaceProps {
  project: FilmProject;
  onUpdateProject: (updated: Partial<FilmProject>) => void;
  providerStatus: ProviderStatus | null;
}

export const SettingsWorkspace: React.FC<SettingsWorkspaceProps> = ({
  project,
  onUpdateProject,
  providerStatus,
}) => {
  return (
    <div className="h-full flex flex-col overflow-hidden bg-neutral-950">
      {/* Header */}
      <div className="h-12 bg-neutral-900/90 border-b border-neutral-800 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 text-neutral-200 text-xs font-semibold">
          <Settings className="w-4 h-4 text-amber-400" />
          <span>Production Studio Settings & Pipeline Configurations</span>
        </div>
      </div>

      <div className="flex-1 p-6 overflow-y-auto max-w-4xl mx-auto space-y-6">
        {/* Project Technical Specifications */}
        <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-bold text-neutral-100 flex items-center gap-2">
            <Film className="w-4 h-4 text-amber-400" />
            Master Delivery Specifications
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="space-y-1">
              <label className="text-neutral-500 uppercase tracking-wider text-[10px]">Aspect Ratio</label>
              <select
                value={project.aspectRatio}
                onChange={(e) => onUpdateProject({ aspectRatio: e.target.value })}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-neutral-200"
              >
                <option value="2.39:1 (Cinemascope)">2.39:1 (Cinemascope Anamorphic)</option>
                <option value="16:9 (Widescreen)">16:9 (Widescreen UHD)</option>
                <option value="1.85:1 (Flat Theatrical)">1.85:1 (Flat Theatrical)</option>
                <option value="4:3 (Academy Standard)">4:3 (Academy Standard)</option>
                <option value="9:16 (Vertical Cinematic)">9:16 (Vertical Cinematic)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-neutral-500 uppercase tracking-wider text-[10px]">Master Resolution</label>
              <select
                value={project.resolution}
                onChange={(e) => onUpdateProject({ resolution: e.target.value })}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-neutral-200"
              >
                <option value="4K UHD (3840x2160)">4K UHD (3840x2160)</option>
                <option value="2K DCI (2048x1080)">2K DCI (2048x1080)</option>
                <option value="8K DCI (8192x4320)">8K DCI (8192x4320)</option>
                <option value="1080p FHD (1920x1080)">1080p FHD (1920x1080)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-neutral-500 uppercase tracking-wider text-[10px]">Master Frame Rate</label>
              <select
                value={project.frameRate}
                onChange={(e) => onUpdateProject({ frameRate: Number(e.target.value) })}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-neutral-200"
              >
                <option value={24}>24.00 fps (Cinematic Standard)</option>
                <option value={23.976}>23.976 fps (NTSC Cinema)</option>
                <option value={25}>25.00 fps (PAL Cinema)</option>
                <option value={60}>60.00 fps (HFR Motion)</option>
              </select>
            </div>
          </div>
        </div>

        {/* AI Engine Providers Status */}
        <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-bold text-neutral-100 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-cyan-400" />
            Active AI Engine Model Routing
          </h2>

          <div className="space-y-2.5">
            <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800 flex items-center justify-between text-xs">
              <div>
                <div className="font-semibold text-neutral-200">Storyboard & Image Provider</div>
                <div className="text-[11px] text-neutral-500 font-mono">Model: {providerStatus?.imageProvider?.model || 'gemini-3.1-flash-lite-image'}</div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/40">
                ACTIVE
              </span>
            </div>

            <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800 flex items-center justify-between text-xs">
              <div>
                <div className="font-semibold text-neutral-200">Video Generation Provider</div>
                <div className="text-[11px] text-neutral-500 font-mono">Model: {providerStatus?.videoProvider?.model || 'veo-3.1-lite-generate-preview'}</div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/40">
                ACTIVE
              </span>
            </div>

            <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800 flex items-center justify-between text-xs">
              <div>
                <div className="font-semibold text-neutral-200">Speech & TTS Voice Synthesis</div>
                <div className="text-[11px] text-neutral-500 font-mono">Model: {providerStatus?.ttsProvider?.model || 'gemini-3.1-flash-tts-preview'}</div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/40">
                ACTIVE
              </span>
            </div>

            <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800 flex items-center justify-between text-xs">
              <div>
                <div className="font-semibold text-neutral-200">Score & Audio Synthesizer</div>
                <div className="text-[11px] text-neutral-500 font-mono">Engine: Web Audio API Realtime Synthesizer</div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/40">
                ACTIVE
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
