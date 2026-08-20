import React from 'react';
import { FilmProject, ProviderStatus } from '../types/film';
import { 
  Clapperboard, 
  Sparkles, 
  AlertTriangle, 
  Download, 
  FolderSync, 
  Layers, 
  Film,
  Play,
  RotateCcw,
  CheckCircle2
} from 'lucide-react';

interface HeaderNavProps {
  project: FilmProject;
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onOpenAssistant: () => void;
  onOpenLiveVoice?: () => void;
  onOpenImageStudio?: () => void;
  onOpenValidation: () => void;
  onOpenAIEditor: () => void;
  validationCount: number;
  providerStatus: ProviderStatus | null;
  onResetDemo: () => void;
  onNewProject: () => void;
}

export const HeaderNav: React.FC<HeaderNavProps> = ({
  project,
  currentTab,
  onSelectTab,
  onOpenAssistant,
  onOpenLiveVoice,
  onOpenImageStudio,
  onOpenValidation,
  onOpenAIEditor,
  validationCount,
  providerStatus,
  onResetDemo,
  onNewProject,
}) => {
  const completedShots = project.shots.filter(s => s.status === 'approved').length;
  const totalShots = project.shots.length;
  const progressPct = totalShots > 0 ? Math.round((completedShots / totalShots) * 100) : 0;

  return (
    <header className="h-14 bg-[#0E0E10] border-b border-[#222225] px-4 flex items-center justify-between text-[#E0E0E0] select-none z-30 shrink-0">
      {/* Left: Brand & Project Spec Header */}
      <div className="flex items-center gap-3.5">
        <div className="flex items-center gap-2 bg-[#151619] text-[#CBA135] px-2.5 py-1 rounded-sm border border-[#CBA135]/40 shadow-sm">
          <Clapperboard className="w-3.5 h-3.5 text-[#CBA135]" />
          <span className="font-bold text-[11px] tracking-widest uppercase font-mono">CINE//STUDIO</span>
        </div>

        <div className="h-4 w-px bg-[#2A2A2D]" />

        <div className="flex items-center gap-2.5">
          <span className="text-[10px] font-mono text-[#666] tracking-wider uppercase">PROJ:</span>
          <span className="font-bold text-sm text-[#FFFFFF] tracking-wider uppercase font-mono">{project.title}</span>
          <span className="px-1.5 py-0.5 border border-[#CBA135]/50 bg-[#CBA135]/10 text-[9px] text-[#CBA135] font-mono rounded-sm tracking-wider uppercase">
            {project.status || 'PRODUCTION'}
          </span>
        </div>
      </div>

      {/* Middle: Data Grid Metrics */}
      <div className="hidden lg:flex items-center gap-6 text-xs text-[#8E9299]">
        <div className="flex flex-col items-start gap-1">
          <div className="flex items-center justify-between w-32">
            <span className="text-[9px] text-[#666] uppercase tracking-wider font-mono">Progress</span>
            <span className="text-[10px] font-mono text-[#CBA135] font-bold">{progressPct}%</span>
          </div>
          <div className="w-32 h-1 bg-[#222225] rounded-full overflow-hidden border border-[#2A2A2D]">
            <div 
              className="bg-[#CBA135] h-full transition-all duration-300" 
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        <div className="h-5 w-px bg-[#222225]" />

        <div className="flex flex-col items-center">
          <span className="text-[9px] text-[#666] uppercase tracking-wider font-mono">Resolution</span>
          <span className="text-[11px] font-mono text-[#E0E0E0]">{project.resolution}</span>
        </div>

        <div className="flex flex-col items-center">
          <span className="text-[9px] text-[#666] uppercase tracking-wider font-mono">Frame Rate</span>
          <span className="text-[11px] font-mono text-[#E0E0E0]">{project.frameRate} FPS</span>
        </div>

        <div className="flex flex-col items-center">
          <span className="text-[9px] text-[#666] uppercase tracking-wider font-mono">Ratio</span>
          <span className="text-[11px] font-mono text-[#E0E0E0]">{project.aspectRatio.split(' ')[0]}</span>
        </div>

        <div className="h-5 w-px bg-[#222225]" />

        <div className="flex items-center gap-3 font-mono text-[11px]">
          <span className="text-[#8E9299]">
            <strong className="text-[#CBA135]">{project.scenes.length}</strong> SC
          </span>
          <span className="text-[#444]">•</span>
          <span className="text-[#8E9299]">
            <strong className="text-[#E0E0E0]">{completedShots}</strong>/{totalShots} SH
          </span>
          <span className="text-[#444]">•</span>
          <span className="text-[#8E9299]">
            <strong className="text-[#CBA135]">{project.dialogueSegments.length}</strong> DL
          </span>
        </div>
      </div>

      {/* Right: Technical Actions */}
      <div className="flex items-center gap-2">
        {/* Live Voice Director Action */}
        {onOpenLiveVoice && (
          <button
            onClick={onOpenLiveVoice}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-[11px] font-mono font-medium bg-[#1F180B] hover:bg-[#2E230E] text-amber-300 border border-amber-500/50 hover:border-amber-400 transition-colors shadow-sm cursor-pointer"
            title="Live Voice Director (Live API)"
          >
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="hidden sm:inline uppercase tracking-wider">Live Voice</span>
          </button>
        )}

        {/* Image Studio Action */}
        {onOpenImageStudio && (
          <button
            onClick={onOpenImageStudio}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-[11px] font-mono font-medium bg-[#0E1B24] hover:bg-[#162734] text-cyan-300 border border-cyan-500/40 hover:border-cyan-400 transition-colors shadow-sm cursor-pointer"
            title="Image Generation & Neural Retouch (gemini-3.1-flash-image-preview)"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline uppercase tracking-wider">Image Studio</span>
          </button>
        )}

        {/* AI Rough Cut Action */}
        <button
          onClick={onOpenAIEditor}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-[11px] font-mono font-medium bg-[#151619] hover:bg-[#1E1F24] text-[#CBA135] border border-[#CBA135]/40 hover:border-[#CBA135] transition-colors shadow-sm"
          title="AI Rough Cut Engine"
        >
          <Film className="w-3.5 h-3.5 text-[#CBA135]" />
          <span className="hidden sm:inline uppercase tracking-wider">AI Edit</span>
        </button>

        {/* Production Validation Pill */}
        <button
          onClick={onOpenValidation}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-[11px] font-mono font-medium transition-colors border ${
            validationCount > 0 
              ? 'bg-[#1F1510] text-[#E5A84B] border-[#CBA135]/50 hover:bg-[#2A1D15]' 
              : 'bg-[#151619] text-[#8E9299] border-[#2A2A2D] hover:bg-[#1E1F24] hover:text-[#E0E0E0]'
          }`}
        >
          {validationCount > 0 ? (
            <AlertTriangle className="w-3.5 h-3.5 text-[#CBA135] animate-pulse" />
          ) : (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          )}
          <span className="font-mono">{validationCount} CHECKS</span>
        </button>

        {/* Persistent AI Assistant Toggle */}
        <button
          onClick={onOpenAssistant}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-[11px] font-mono font-medium bg-[#151619] text-[#E0E0E0] border border-[#2A2A2D] hover:border-[#CBA135]/70 hover:text-[#CBA135] transition-all shadow-sm"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#CBA135]" />
          <span className="uppercase tracking-wider">AI Copilot</span>
        </button>

        <div className="h-4 w-px bg-[#2A2A2D]" />

        {/* Demo Reload & Reset */}
        <button
          onClick={onResetDemo}
          className="p-1.5 rounded-sm text-[#666] hover:text-[#E0E0E0] hover:bg-[#1E1F24] border border-transparent hover:border-[#2A2A2D] transition-colors"
          title="Reload Canonical Demo Project"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
