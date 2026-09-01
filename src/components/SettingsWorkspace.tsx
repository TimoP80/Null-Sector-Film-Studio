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
                <div className="mt-1 flex flex-wrap gap-2 text-[9px] font-mono uppercase">
                  <span className={providerStatus?.imageProvider?.configured ? 'text-emerald-400' : 'text-red-400'}>● Configured</span>
                  <span className={providerStatus?.imageProvider?.available ? 'text-emerald-400' : 'text-red-400'}>{providerStatus?.imageProvider?.available ? '● API Access' : '✕ API Access'}</span>
                  <span className={providerStatus?.imageProvider?.quotaStatus === 'exhausted' ? 'text-red-400' : providerStatus?.imageProvider?.quotaStatus === 'available' ? 'text-emerald-400' : 'text-amber-400'}>{providerStatus?.imageProvider?.quotaStatus === 'exhausted' ? '✕ Quota Exhausted' : providerStatus?.imageProvider?.quotaStatus === 'available' ? '● Quota Available' : '? Quota Unknown'}</span>
                </div>
              </div>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                providerStatus?.imageProvider?.available
                  ? 'bg-emerald-950 text-emerald-400 border-emerald-500/40'
                  : 'bg-red-950 text-red-400 border-red-500/40'
              }`}>
                {providerStatus?.imageProvider?.available ? 'ACTIVE' : 'UNAVAILABLE'}
              </span>
            </div>

            <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800 flex items-center justify-between text-xs">
              <div>
                <div className="font-semibold text-neutral-200">Video Generation Provider</div>
                <div className="text-[11px] text-neutral-500 font-mono">Model: {providerStatus?.videoProvider?.model || 'veo-3.1-generate-preview'}</div>
              </div>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                providerStatus?.videoProvider?.available
                  ? 'bg-emerald-950 text-emerald-400 border-emerald-500/40'
                  : 'bg-red-950 text-red-400 border-red-500/40'
              }`}>
                {providerStatus?.videoProvider?.available ? 'ACTIVE' : 'VEO NOT CONFIGURED / UNAVAILABLE'}
              </span>
            </div>

            <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800 flex items-center justify-between text-xs">
              <div>
                <div className="font-semibold text-neutral-200">Local Image Generator (ComfyUI / Flux)</div>
                <div className="text-[11px] text-neutral-500 font-mono">Backend: {providerStatus?.localImageProvider?.url || 'http://127.0.0.1:8188'}</div>
                <div className="mt-1 flex flex-wrap gap-2 text-[9px] font-mono uppercase">
                  <span className={providerStatus?.localImageProvider?.configured ? 'text-emerald-400' : 'text-amber-400'}>{providerStatus?.localImageProvider?.configured ? '● Configured' : '○ Not Configured'}</span>
                  <span className={providerStatus?.localImageProvider?.available ? 'text-emerald-400' : 'text-red-400'}>{providerStatus?.localImageProvider?.available ? '● Backend Running' : '✕ Backend Unavailable'}</span>
                  {providerStatus?.localImageProvider?.gpu && (
                    <span className="text-cyan-400">GPU: {providerStatus.localImageProvider.gpu}</span>
                  )}
                  {providerStatus?.localImageProvider?.vram && (
                    <span className="text-cyan-400">VRAM: {providerStatus.localImageProvider.vram}</span>
                  )}
                  {providerStatus?.localImageProvider?.systemRamMb !== undefined && (
                    <span className="text-cyan-400">RAM: {Math.round(providerStatus.localImageProvider.systemRamMb / 1024)} GB</span>
                  )}
                  {providerStatus?.localImageProvider?.vramSufficient === false && (
                    <span className="text-amber-400">⚠ VRAM MAY BE INSUFFICIENT</span>
                  )}
                  <span className={providerStatus?.localImageProvider?.modelAvailable === 'available' ? 'text-emerald-400' : providerStatus?.localImageProvider?.modelAvailable === 'not_found' ? 'text-red-400' : 'text-amber-400'}>
                    {providerStatus?.localImageProvider?.modelAvailable === 'available' ? '● Model Verified' : providerStatus?.localImageProvider?.modelAvailable === 'not_found' ? '✕ Model Not Installed' : '? Model Unverified'}
                  </span>
                  {providerStatus?.localImageProvider?.capabilities?.imageToImage === false && (
                    <span className="text-neutral-500">IMG→IMG ✕</span>
                  )}
                </div>
                {providerStatus?.localImageProvider?.description && (
                  <div className="mt-1 text-[10px] text-neutral-600 font-mono">{providerStatus.localImageProvider.description}</div>
                )}
              </div>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                providerStatus?.localImageProvider?.available
                  ? 'bg-emerald-950 text-emerald-400 border-emerald-500/40'
                  : providerStatus?.localImageProvider?.configured
                  ? 'bg-amber-950 text-amber-400 border-amber-500/40'
                  : 'bg-neutral-950 text-neutral-500 border-neutral-700'
              }`}>
                {providerStatus?.localImageProvider?.available ? 'ACTIVE' : providerStatus?.localImageProvider?.configured ? 'BACKEND OFFLINE' : 'NOT CONFIGURED'}
              </span>
            </div>

            <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800 flex items-center justify-between text-xs">
              <div>
                <div className="font-semibold text-neutral-200">Local Video Generator (ComfyUI / LTX-Video)</div>
                <div className="text-[11px] text-neutral-500 font-mono">Backend: {providerStatus?.localVideoProvider?.url || 'http://127.0.0.1:8188'}</div>
                <div className="mt-1 flex flex-wrap gap-2 text-[9px] font-mono uppercase">
                  <span className={providerStatus?.localVideoProvider?.configured ? 'text-emerald-400' : 'text-amber-400'}>{providerStatus?.localVideoProvider?.configured ? '● Configured' : '○ Not Configured'}</span>
                  <span className={providerStatus?.localVideoProvider?.available ? 'text-emerald-400' : 'text-red-400'}>{providerStatus?.localVideoProvider?.available ? '● Backend Running' : '✕ Backend Unavailable'}</span>
                  {providerStatus?.localVideoProvider?.gpu && (
                    <span className="text-cyan-400">GPU: {providerStatus.localVideoProvider.gpu}</span>
                  )}
                  {providerStatus?.localVideoProvider?.vram && (
                    <span className="text-cyan-400">VRAM: {providerStatus.localVideoProvider.vram}</span>
                  )}
                  {providerStatus?.localVideoProvider?.vramSufficient === false && (
                    <span className="text-amber-400">⚠ VRAM May Be Insufficient</span>
                  )}
                  {providerStatus?.localVideoProvider?.capabilities && (
                    <span className="text-purple-400">Output: {providerStatus.localVideoProvider.capabilities.mp4 ? 'MP4 + WEBP' : 'WEBP'}</span>
                  )}
                </div>
                {providerStatus?.localVideoProvider?.description && (
                  <div className="mt-1 text-[10px] text-neutral-600 font-mono">{providerStatus.localVideoProvider.description}</div>
                )}
              </div>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                providerStatus?.localVideoProvider?.available
                  ? 'bg-emerald-950 text-emerald-400 border-emerald-500/40'
                  : providerStatus?.localVideoProvider?.configured
                  ? 'bg-amber-950 text-amber-400 border-amber-500/40'
                  : 'bg-neutral-950 text-neutral-500 border-neutral-700'
              }`}>
                {providerStatus?.localVideoProvider?.available ? 'ACTIVE' : providerStatus?.localVideoProvider?.configured ? 'BACKEND OFFLINE' : 'NOT CONFIGURED'}
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
