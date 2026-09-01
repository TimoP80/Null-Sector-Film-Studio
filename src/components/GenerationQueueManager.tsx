import React, { useState, useEffect } from 'react';
import { FilmProject, GenerationJob } from '../types/film';
import {
  Cpu,
  Play,
  Pause,
  RotateCcw,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronUp,
  X,
  Layers,
  DollarSign
} from 'lucide-react';
import { FilmStudioApiClient } from '../services/apiClient';
import { generatePromptFaithfulVisual } from '../utils/cinematicVisualRenderer';
import { videoJobRuntime } from '../videoJobRuntime';

interface GenerationQueueManagerProps {
  project: FilmProject;
  onUpdateProject: (updated: FilmProject) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const GenerationQueueManager: React.FC<GenerationQueueManagerProps> = ({
  project,
  onUpdateProject,
  isOpen,
  onClose
}) => {
  const [isQueuePaused, setIsQueuePaused] = useState(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  const jobs = project.generationJobs || [];

  const counts = {
    total: jobs.length,
    queued: jobs.filter(j => j.status === 'queued').length,
    generating: jobs.filter(j => j.status === 'generating').length,
    completed: jobs.filter(j => j.status === 'completed').length,
    failed: jobs.filter(j => j.status === 'failed').length
  };

  // Background queue processor
  useEffect(() => {
    if (isQueuePaused) return;

    const nextQueuedJob = jobs.find(j => j.status === 'queued' && j.targetType !== 'video');
    if (!nextQueuedJob || activeJobId) return;

    const runJob = async () => {
      setActiveJobId(nextQueuedJob.id);

      // Set status to generating
      let updatedJobs = jobs.map(j =>
        j.id === nextQueuedJob.id ? { ...j, status: 'generating' as const, progress: 15 } : j
      );
      onUpdateProject({ ...project, generationJobs: updatedJobs });

      try {
        let resultUrl = '';

        if (nextQueuedJob.targetType === 'image') {
          const isLocalImage = nextQueuedJob.provider.includes('Local') || nextQueuedJob.model === 'flux';
          resultUrl = isLocalImage
            ? (await FilmStudioApiClient.generateLocalImage(nextQueuedJob.prompt)).imageUrl
            : await FilmStudioApiClient.generateImage(nextQueuedJob.prompt);
        } else if (nextQueuedJob.targetType === 'video') {
          const targetShot = project.shots.find(s => s.id === nextQueuedJob.shotId);
          const isLocal = nextQueuedJob.provider.includes('Local') || nextQueuedJob.model === 'ltx-video';
          const vid = isLocal
            ? await FilmStudioApiClient.generateLocalVideo(
                nextQueuedJob.prompt, 4, nextQueuedJob.shotId,
                targetShot?.storyboardImageUrl,
                project.aspectRatio.split(' ')[0],
                project.resolution
              )
            : await FilmStudioApiClient.generateVideo(
                nextQueuedJob.prompt, 4, nextQueuedJob.shotId,
                targetShot?.storyboardImageUrl
              );
          resultUrl = vid.videoUrl;
        } else if (nextQueuedJob.targetType === 'tts') {
          const tts = await FilmStudioApiClient.generateTTS(nextQueuedJob.prompt, 'Kore', 'restrained');
          resultUrl = `data:${tts.mimeType};base64,${tts.audioData}`;
        } else {
          const targetShot = project.shots.find(s => s.id === nextQueuedJob.shotId);
          resultUrl = generatePromptFaithfulVisual({
            prompt: nextQueuedJob.prompt,
            title: targetShot?.title || 'JOB RESULT',
            shotId: targetShot?.id,
            aspectRatio: '16:9'
          });
        }

        // Complete job
        updatedJobs = (project.generationJobs || []).map(j =>
          j.id === nextQueuedJob.id
            ? {
                ...j,
                status: 'completed' as const,
                progress: 100,
                completedAt: new Date().toISOString(),
                resultUrl
              }
            : j
        );

        // Also update the shot or dialogue if relevant
        let updatedShots = project.shots;
        if (nextQueuedJob.shotId) {
          updatedShots = project.shots.map(s => {
            if (s.id === nextQueuedJob.shotId) {
              if (nextQueuedJob.targetType === 'image') {
                return {
                  ...s,
                  storyboardImageUrl: resultUrl,
                  status: 'review' as const,
                  takes: [
                    ...s.takes,
                    {
                      id: `take_${Date.now()}`,
                      takeNumber: s.takes.length + 1,
                      type: 'image' as const,
                      url: resultUrl,
                      prompt: nextQueuedJob.prompt,
                      provider: nextQueuedJob.provider,
                      model: nextQueuedJob.model,
                      generationParameters: { queuedJobId: nextQueuedJob.id },
                      createdAt: new Date().toISOString(),
                      approved: false,
                      isMaster: false
                    }
                  ]
                };
              } else if (nextQueuedJob.targetType === 'video') {
                return {
                  ...s,
                  videoUrl: resultUrl,
                  status: 'review' as const,
                  takes: [
                    ...s.takes,
                    {
                      id: `take_${Date.now()}`,
                      takeNumber: s.takes.length + 1,
                      type: 'video' as const,
                      url: resultUrl,
                      prompt: nextQueuedJob.prompt,
                      provider: nextQueuedJob.provider || 'Veo Video Generator (Veo 3.1)',
                      model: nextQueuedJob.model,
                      sourceImage: s.storyboardImageUrl,
                      providerJobId: nextQueuedJob.id,
                      generationParameters: { queuedJobId: nextQueuedJob.id, resolution: project.resolution, aspectRatio: project.aspectRatio },
                      createdAt: new Date().toISOString(),
                      approved: false,
                      isMaster: false
                    }
                  ]
                };
              }
            }
            return s;
          });
        }

        onUpdateProject({
          ...project,
          shots: updatedShots,
          generationJobs: updatedJobs
        });
      } catch (err: any) {
        console.error('Job generation failed', err);
        updatedJobs = (project.generationJobs || []).map(j =>
          j.id === nextQueuedJob.id
            ? {
                ...j,
                status: 'failed' as const,
                progress: 0,
                error: err.message || 'Generation error'
              }
            : j
        );
        onUpdateProject({ ...project, generationJobs: updatedJobs });
      } finally {
        setActiveJobId(null);
      }
    };

    runJob();
  }, [jobs, isQueuePaused, activeJobId, onUpdateProject, project]);

  const handleRetryJob = (jobId: string) => {
    const videoJob = videoJobRuntime.getJobs(project.id).find(job => job.id === jobId);
    if (videoJob) { videoJobRuntime.retry(jobId); return; }
    const updated = jobs.map(j => j.id === jobId ? { ...j, status: 'queued' as const, progress: 0, error: undefined } : j);
    onUpdateProject({ ...project, generationJobs: updated });
  };

  const handleCancelJob = (jobId: string) => {
    if (videoJobRuntime.getJobs(project.id).some(job => job.id === jobId)) { void videoJobRuntime.cancel(jobId); return; }
    const updated = jobs.map(j => j.id === jobId ? { ...j, status: 'cancelled' as const, progress: 0 } : j);
    onUpdateProject({ ...project, generationJobs: updated });
  };

  const handleRetryAllFailed = () => {
    const updated = jobs.map(j =>
      j.status === 'failed' ? { ...j, status: 'queued' as const, progress: 0, error: undefined } : j
    );
    onUpdateProject({ ...project, generationJobs: updated });
  };

  const handleClearCompleted = () => {
    const updated = jobs.filter(j => j.status !== 'completed' && j.status !== 'cancelled');
    onUpdateProject({ ...project, generationJobs: updated });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-0 right-0 z-50 w-full md:w-[480px] bg-slate-900 border-t md:border-l md:border-t border-slate-700 shadow-2xl rounded-t-lg md:rounded-tl-lg font-mono text-slate-100 flex flex-col max-h-[600px] transition-all">
      {/* Header */}
      <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded bg-cyan-950 border border-cyan-500/50 flex items-center justify-center text-cyan-400">
            <Cpu className="w-3.5 h-3.5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Generation Job Queue</h3>
            <span className="text-[10px] text-slate-400">
              {counts.queued} Queued • {counts.generating} Active • {counts.completed} Done
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsQueuePaused(!isQueuePaused)}
            className={`p-1.5 rounded text-xs transition-colors flex items-center gap-1 ${
              isQueuePaused
                ? 'bg-amber-950 text-amber-300 border border-amber-800'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
            title={isQueuePaused ? 'Resume Queue' : 'Pause Queue'}
          >
            {isQueuePaused ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Control Strip */}
      <div className="px-4 py-2 bg-slate-950/60 border-b border-slate-800/80 flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-2">
          {counts.failed > 0 && (
            <button
              onClick={handleRetryAllFailed}
              className="text-amber-400 hover:underline flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" /> Retry {counts.failed} Failed
            </button>
          )}
        </div>
        <button
          onClick={handleClearCompleted}
          className="text-slate-400 hover:text-slate-200 text-[10px] hover:underline"
        >
          Clear Completed
        </button>
      </div>

      {/* Job List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2.5 divide-y divide-slate-800/40">
        {jobs.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-xs">
            <Cpu className="w-8 h-8 mx-auto mb-2 text-slate-600" />
            <p>Generation queue is currently idle</p>
            <p className="text-[10px] text-slate-600 mt-1">
              Trigger generations from Shot Designer, Storyboards, or Audio
            </p>
          </div>
        ) : (
          jobs.map(job => (
            <div key={job.id} className="pt-2 first:pt-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="px-1.5 py-0.2 rounded bg-slate-950 border border-slate-800 text-[9px] text-cyan-400 font-bold uppercase">
                      {job.targetType}
                    </span>
                    <h4 className="text-xs font-semibold text-white truncate" title={job.title}>
                      {job.title}
                    </h4>
                  </div>
                  <p className="text-[10px] text-slate-400 font-mono truncate" title={job.prompt}>
                    {job.prompt}
                  </p>
                  <div className="mt-1 flex items-center gap-2 text-[9px] text-slate-500">
                    <span>{job.provider}</span>
                    <span>•</span>
                    <span>${job.costEstimateUsd.toFixed(2)}</span>
                    {job.error && <span className="text-rose-400 truncate max-w-[150px]">Error: {job.error}</span>}
                  </div>
                </div>

                {/* Status indicator & Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {job.status === 'completed' && (
                    <span className="text-emerald-400 flex items-center gap-1 text-[10px]">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </span>
                  )}
                  {job.status === 'failed' && (
                    <button
                      onClick={() => handleRetryJob(job.id)}
                      className="p-1 rounded bg-slate-800 text-amber-400 hover:bg-slate-700"
                      title="Retry"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {job.status === 'generating' && (
                    <span className="text-cyan-400 text-[10px] animate-pulse">Running...</span>
                  )}
                  {job.status === 'queued' && (
                    <button
                      onClick={() => handleCancelJob(job.id)}
                      className="p-1 rounded hover:bg-slate-800 text-slate-500 hover:text-slate-300"
                      title="Cancel"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Progress bar for generating jobs */}
              {job.status === 'generating' && (
                <div className="mt-2 w-full bg-slate-950 rounded-full h-1.5 overflow-hidden border border-slate-800">
                  <div
                    className="bg-cyan-500 h-full rounded-full transition-all duration-300 animate-pulse"
                    style={{ width: `${job.progress || 45}%` }}
                  />
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
