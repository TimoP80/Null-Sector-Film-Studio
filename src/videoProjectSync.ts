import { FilmProject, GenerationJob, ShotTake } from './types/film';
import { VideoGenerationJob } from './videoTypes';

export const toGenerationJob = (job: VideoGenerationJob): GenerationJob => ({
  id: job.id,
  title: `${job.shotId || 'Shot'} — ${job.providerId} video`,
  targetType: 'video', targetId: job.shotId || job.id, shotId: job.shotId, sceneId: job.sceneId,
  provider: job.providerId === 'local' ? 'Local (ComfyUI)' : job.providerId,
  model: job.modelId, prompt: job.prompt,
  status: job.status === 'generating' ? 'generating' : job.status,
  progress: typeof job.progress === 'number' ? job.progress : 0,
  costEstimateUsd: 0, createdAt: job.createdAt, startedAt: job.startedAt,
  completedAt: job.completedAt, error: job.error, resultUrl: job.outputPath,
});

export const syncVideoJobToProject = (project: FilmProject, job: VideoGenerationJob): FilmProject => {
  const generationJob = toGenerationJob(job);
  const jobs = project.generationJobs.some(item => item.id === job.id)
    ? project.generationJobs.map(item => item.id === job.id ? { ...item, ...generationJob } : item)
    : [...project.generationJobs, generationJob];
  if (job.status !== 'completed' || !job.outputPath || !job.shotId) return { ...project, generationJobs: jobs, updatedAt: new Date().toISOString() };

  const shot = project.shots.find(item => item.id === job.shotId);
  if (!shot) return { ...project, generationJobs: jobs, updatedAt: new Date().toISOString() };
  const existing = shot.takes.find(take => take.id === job.takeId || take.providerJobId === job.providerJobId || take.providerJobId === job.id);
  const take: ShotTake = existing || {
    id: job.takeId || `take_${job.id}`,
    takeNumber: shot.takes.length + 1, type: 'video', url: job.outputPath,
    prompt: job.prompt, provider: job.providerId === 'local' ? 'Local Video (ComfyUI)' : job.providerId,
    model: job.modelId, sourceImage: job.sourceImage, providerJobId: job.providerJobId || job.id,
    generationParameters: { ...(job.generationParameters || {}), motionSpecification: job.motionSpecification },
    createdAt: job.completedAt || new Date().toISOString(), approved: false, isMaster: false,
  };
  const takes = existing ? shot.takes.map(item => item.id === take.id ? { ...item, ...take } : item) : [...shot.takes, take];
  return { ...project, generationJobs: jobs, shots: project.shots.map(item => item.id === shot.id ? { ...item, videoUrl: take.url, status: 'review', takes } : item), updatedAt: new Date().toISOString() };
};
