import React from 'react';
import { GenerationJob, ShotTake } from '../types/film';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Clock3,
  Film,
  Image as ImageIcon,
  RotateCcw,
  Star,
  X,
} from 'lucide-react';

interface VisualTakeReviewProps {
  takes: ShotTake[];
  selectedTakeUrl?: string;
  generationJobs?: GenerationJob[];
  isGenerating: boolean;
  onSelectTake: (takeUrl: string) => void;
  onApproveTake: (takeId: string) => void;
  onSetMasterTake: (takeId: string) => void;
  onRejectTake: (takeId: string) => void;
  onRegenerate: () => void;
}

type VisualTakeState = 'generated' | 'selected' | 'approved' | 'master' | 'rejected';

const getTakeState = (take: ShotTake, isSelected: boolean): VisualTakeState => {
  if (take.isMaster) return 'master';
  if (take.approved) return 'approved';
  if (take.rejected) return 'rejected';
  if (isSelected) return 'selected';
  return 'generated';
};

const getStateClass = (state: VisualTakeState): string => {
  switch (state) {
    case 'master':
      return 'bg-amber-950/80 text-amber-300 border-amber-500/60';
    case 'approved':
      return 'bg-emerald-950/80 text-emerald-300 border-emerald-500/60';
    case 'rejected':
      return 'bg-red-950/80 text-red-300 border-red-500/60';
    case 'selected':
      return 'bg-cyan-950/80 text-cyan-300 border-cyan-500/60';
    default:
      return 'bg-[#151619]/90 text-[#8E9299] border-[#2A2A2D]';
  }
};

const getJobStatus = (jobs: GenerationJob[]): string => {
  if (jobs.some(job => job.status === 'generating')) return 'GENERATING';
  if (jobs.some(job => job.status === 'queued')) return 'QUEUED';
  if (jobs.some(job => job.status === 'failed')) return 'FAILED';
  if (jobs.some(job => job.status === 'completed')) return 'COMPLETED';
  return 'NO ACTIVE JOB';
};

const formatCreatedAt = (createdAt: string): string => {
  const timestamp = new Date(createdAt);
  return Number.isNaN(timestamp.getTime()) ? createdAt : timestamp.toLocaleString();
};

export const VisualTakeReview: React.FC<VisualTakeReviewProps> = ({
  takes,
  selectedTakeUrl,
  generationJobs = [],
  isGenerating,
  onSelectTake,
  onApproveTake,
  onSetMasterTake,
  onRejectTake,
  onRegenerate,
}) => (
  <div className="mt-4">
    <div className="text-[10px] uppercase font-bold tracking-wider text-[#8E9299] mb-2 flex items-center justify-between">
      <span className="flex items-center gap-1.5">
        <Film className="w-3 h-3 text-[#CBA135]" />
        VISUAL TAKE REVIEW ({takes.length})
      </span>
      <span className="text-[8px] text-[#666]">JOB: {getJobStatus(generationJobs)}</span>
    </div>

    <div className="flex items-center justify-between gap-2 mb-2 px-2 py-1.5 rounded-sm bg-[#121316] border border-[#222225]">
      <div className="flex items-center gap-2 text-[9px] font-mono text-[#8E9299] uppercase">
        <span className="text-emerald-400"><CheckCircle2 className="w-3 h-3 inline mr-1" />Approved</span>
        <span className="text-amber-300"><Star className="w-3 h-3 inline mr-1" />Master</span>
        <span className="text-red-300"><X className="w-3 h-3 inline mr-1" />Rejected</span>
      </div>
      <button
        onClick={onRegenerate}
        disabled={isGenerating}
        className="shrink-0 px-2 py-1 rounded-sm bg-[#1A1A1E] hover:bg-[#222226] text-[#CBA135] border border-[#2A2A2D] text-[9px] font-mono uppercase flex items-center gap-1"
      >
        <RotateCcw className={`w-3 h-3 ${isGenerating ? 'animate-spin' : ''}`} />
        Regenerate
      </button>
    </div>

    {takes.length === 0 ? (
      <div className="p-3 rounded-sm border border-dashed border-[#2A2A2D] text-center text-[10px] text-[#666] font-mono">
        <ImageIcon className="w-5 h-5 mx-auto mb-1 text-[#444]" />
        NO GENERATED TAKES
      </div>
    ) : (
      <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
        {takes.map((take) => {
          const isSelected = selectedTakeUrl === take.url;
          const state = getTakeState(take, isSelected);
          const isVideo = take.type === 'video';
          const generationProvider = take.provider || generationJobs[0]?.provider || '—';
          const generationModel = take.model || generationJobs[0]?.model || '—';

          return (
            <div
              key={take.id}
              className={`rounded-sm border overflow-hidden ${
                isSelected ? 'border-[#CBA135] ring-1 ring-[#CBA135]' : 'border-[#222225]'
              } bg-[#121316]`}
            >
              <div
                role="button"
                tabIndex={0}
                onClick={() => onSelectTake(take.url)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') onSelectTake(take.url);
                }}
                className="w-full text-left"
              >
                <div className="aspect-video bg-[#0A0A0B] relative">
                  {isVideo ? (
                    <video
                      src={take.url}
                      controls
                      preload="metadata"
                      className="w-full h-full object-contain"
                      onClick={(event) => event.stopPropagation()}
                    />
                  ) : take.url ? (
                    <img src={take.url} alt={`Take ${take.takeNumber}`} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#555]">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                  )}
                  <div className="absolute top-1.5 left-1.5 flex items-center gap-1">
                    <span className="px-1.5 py-0.5 rounded-sm bg-black/85 text-[#CBA135] text-[9px] font-mono font-bold">
                      TAKE {take.takeNumber}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded-sm border text-[8px] font-mono font-bold uppercase ${getStateClass(state)}`}>
                      {state}
                    </span>
                  </div>
                  {isSelected && state !== 'selected' && (
                    <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded-sm bg-cyan-950/90 text-cyan-300 border border-cyan-500/50 text-[8px] font-mono font-bold uppercase">
                      SELECTED
                    </span>
                  )}
                </div>
              </div>

              <div className="p-2 space-y-1.5 font-mono">
                <div className="flex items-center justify-between text-[9px] text-[#AAA]">
                  <span className="flex items-center gap-1">
                    <Clock3 className="w-3 h-3 text-[#666]" />
                    {take.durationSec ? `${take.durationSec}s` : isVideo ? 'VIDEO' : 'IMAGE'}
                  </span>
                  <span className="text-[#666]">{formatCreatedAt(take.createdAt)}</span>
                </div>
                <div className="grid grid-cols-2 gap-x-2 text-[9px] text-[#8E9299] uppercase">
                  <span>Provider: <strong className="text-[#D0D0D0]">{generationProvider}</strong></span>
                  <span>Model: <strong className="text-[#D0D0D0]">{generationModel}</strong></span>
                  {take.seed !== undefined && <span>Seed: <strong className="text-[#D0D0D0]">{take.seed}</strong></span>}
                  {take.costUsd !== undefined && <span>Cost: <strong className="text-[#D0D0D0]">${take.costUsd.toFixed(2)}</strong></span>}
                </div>
                {take.notes && <div className="text-[9px] text-[#666] line-clamp-2">{take.notes}</div>}
                {(take.sourceImage || take.providerJobId || take.generationParameters) && (
                  <details className="text-[9px] text-[#8E9299]">
                    <summary className="cursor-pointer uppercase text-cyan-300">Generation Info</summary>
                    <div className="mt-1 grid grid-cols-2 gap-1 border-t border-[#222225] pt-1">
                      {take.sourceImage && <span>Source image: linked</span>}
                      {take.providerJobId && <span>Job: {take.providerJobId}</span>}
                      {take.generationParameters && <span className="col-span-2">Parameters: {Object.entries(take.generationParameters).map(([key, value]) => `${key}=${String(value)}`).join(' • ')}</span>}
                    </div>
                  </details>
                )}

                <div className="flex items-center gap-1 pt-1 border-t border-[#222225]">
                  <button
                    onClick={() => onSelectTake(take.url)}
                    className="flex-1 px-1.5 py-1 rounded-sm bg-[#1A1A1E] hover:bg-[#222226] text-cyan-300 border border-cyan-500/30 text-[8px] font-bold uppercase"
                  >
                    Select
                  </button>
                  <button
                    onClick={() => onApproveTake(take.id)}
                    disabled={take.approved && !take.isMaster}
                    className="px-1.5 py-1 rounded-sm bg-[#122018] hover:bg-[#193322] text-emerald-300 border border-emerald-500/30 text-[8px] font-bold uppercase disabled:opacity-50"
                  >
                    <Check className="w-3 h-3 inline mr-0.5" />Approve
                  </button>
                  <button
                    onClick={() => onSetMasterTake(take.id)}
                    disabled={take.isMaster}
                    className="px-1.5 py-1 rounded-sm bg-[#201B12] hover:bg-[#302514] text-amber-300 border border-amber-500/30 text-[8px] font-bold uppercase disabled:opacity-50"
                  >
                    <Star className="w-3 h-3 inline mr-0.5" />Master
                  </button>
                  <button
                    onClick={() => onRejectTake(take.id)}
                    disabled={take.rejected}
                    className="px-1.5 py-1 rounded-sm bg-[#261214] hover:bg-[#3A181A] text-red-300 border border-red-500/30 text-[8px] font-bold uppercase disabled:opacity-50"
                  >
                    <AlertTriangle className="w-3 h-3 inline mr-0.5" />Reject
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    )}
  </div>
);
