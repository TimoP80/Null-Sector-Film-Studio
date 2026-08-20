import React, { useState } from 'react';
import { FilmProject, ContinuityItem } from '../types/film';
import { 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Sparkles, 
  Eye, 
  ArrowRight, 
  RotateCcw, 
  Layers 
} from 'lucide-react';

interface ContinuityEngineProps {
  project: FilmProject;
  onUpdateContinuityItem: (item: ContinuityItem) => void;
  onFixPromptContinuity: (item: ContinuityItem) => void;
}

export const ContinuityEngine: React.FC<ContinuityEngineProps> = ({
  project,
  onUpdateContinuityItem,
  onFixPromptContinuity,
}) => {
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');

  const filteredItems = filterSeverity === 'ALL'
    ? project.continuityItems
    : project.continuityItems.filter(item => item.severity === filterSeverity);

  const errorCount = project.continuityItems.filter(i => i.severity === 'error' && i.status !== 'resolved').length;
  const warnCount = project.continuityItems.filter(i => i.severity === 'warning' && i.status !== 'resolved').length;
  const resolvedCount = project.continuityItems.filter(i => i.status === 'resolved').length;

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#0A0A0B] text-[#E0E0E0]">
      {/* Top Header */}
      <div className="h-11 bg-[#0E0E10] border-b border-[#222225] px-4 flex items-center justify-between shrink-0 font-mono">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-[#E0E0E0] text-xs font-semibold">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="uppercase tracking-wider">CONTINUITY ENGINE & 180° AXIS VALIDATOR</span>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="text-red-400">{errorCount} CRITICAL</span>
            <span className="text-[#CBA135]">{warnCount} WARNINGS</span>
            <span className="text-emerald-400">{resolvedCount} VERIFIED</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="bg-[#151619] border border-[#2A2A2D] rounded-sm px-2 py-1 text-[#8E9299] text-xs focus:outline-none focus:border-[#CBA135]"
          >
            <option value="ALL">ALL CHECKS ({project.continuityItems.length})</option>
            <option value="error">CRITICAL ERRORS</option>
            <option value="warning">WARNINGS</option>
            <option value="info">VERIFIED INFO</option>
          </select>
        </div>
      </div>

      {/* Main Checklist */}
      <div className="flex-1 p-5 overflow-y-auto space-y-3.5 max-w-5xl mx-auto w-full">
        <div className="p-3.5 bg-[#151619] border border-[#2A2A2D] rounded-sm space-y-1 font-mono">
          <h2 className="text-xs font-bold text-[#E0E0E0] flex items-center gap-2 uppercase tracking-wider">
            <Sparkles className="w-4 h-4 text-[#CBA135]" />
            AUTOMATED SCRIPT SUPERVISOR AUDIT LOG
          </h2>
          <p className="text-[11px] text-[#8E9299]">
            Enforces character wardrobe hashes, prop wear states, 180° spatial camera vectors, and lighting color temperatures across all sequences.
          </p>
        </div>

        <div className="space-y-2.5">
          {filteredItems.map((item) => {
            const isResolved = item.status === 'resolved';

            return (
              <div
                key={item.id}
                className={`p-3.5 rounded-sm border transition-all space-y-2.5 ${
                  isResolved
                    ? 'bg-[#0E0E10] border-[#222225] opacity-75'
                    : item.severity === 'error'
                    ? 'bg-[#261214]/60 border-red-500/40'
                    : 'bg-[#201B12]/60 border-[#CBA135]/40'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-sm uppercase ${
                        item.severity === 'error' 
                          ? 'bg-[#3A181A] text-red-300 border border-red-500/50' 
                          : 'bg-[#2E2413] text-[#CBA135] border border-[#CBA135]/50'
                      }`}>
                        {item.type.replace('_', ' ')}
                      </span>

                      <span className="text-xs font-bold text-[#E0E0E0] font-mono">{item.title}</span>
                    </div>

                    <p className="text-[11px] text-[#8E9299]">{item.description}</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 font-mono">
                    <button
                      onClick={() => onFixPromptContinuity(item)}
                      className="px-2.5 py-1 rounded-sm text-[10px] font-mono font-bold bg-[#151619] hover:bg-[#1E1F24] text-[#CBA135] border border-[#CBA135]/40 flex items-center gap-1.5 transition-colors uppercase"
                    >
                      <Sparkles className="w-3 h-3 text-[#CBA135]" />
                      <span>Auto-Sync Prompts</span>
                    </button>

                    <button
                      onClick={() => onUpdateContinuityItem({
                        ...item,
                        status: isResolved ? 'flagged' : 'resolved'
                      })}
                      className={`p-1.5 rounded-sm border transition-colors ${
                        isResolved
                          ? 'bg-[#122018] text-emerald-300 border-emerald-500/40'
                          : 'bg-[#151619] text-[#8E9299] border-[#2A2A2D] hover:text-[#E0E0E0]'
                      }`}
                      title={isResolved ? 'Mark as unresolved' : 'Mark as verified'}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 text-[9px] font-mono text-[#666] pt-2 border-t border-[#222225]">
                  <span className="uppercase">TARGET SHOTS:</span>
                  {item.shotIds.map((sid) => (
                    <span key={sid} className="px-1.5 py-0.5 rounded-sm bg-[#151619] text-[#CBA135] border border-[#2A2A2D]">
                      {sid}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
