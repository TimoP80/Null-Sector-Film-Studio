import { VideoJobManager } from './videoJobManager';
import { VideoGenerationJob } from './videoTypes';
import { FilmStudioApiClient } from './services/apiClient';
import { syncVideoJobToProject } from './videoProjectSync';
import { FilmProject } from './types/film';
import { verifyVideoOutput } from './videoOutputVerification';

const runtime = new VideoJobManager({
  async start(job: VideoGenerationJob): Promise<VideoGenerationJob> {
    if (job.providerId !== 'local') throw new Error(`${job.providerId} provider is not configured`);
    const result = await FilmStudioApiClient.generateLocalVideo(job.prompt, job.duration || 4, job.shotId, job.sourceImage, '16:9', job.resolution, undefined, 'webp');
    const verification = await verifyVideoOutput(result.videoUrl);
    if (!verification.valid) throw new Error(verification.error || 'Generated video failed validation');
    return { ...job, providerJobId: result.operationId, outputPath: result.videoUrl, generationParameters: { ...(job.generationParameters || {}), ...(verification.metadata || {}) } };
  },
}, 1);

runtime.initialize();

export const videoJobRuntime = runtime;

export const reconcileVideoJobsForProject = async (
  project: FilmProject,
  setProject: (updater: (current: FilmProject) => FilmProject) => void,
): Promise<void> => {
  await runtime.reconcileAsync(project.id, async job => {
    if (!job.outputPath) return false;
    const result = await verifyVideoOutput(job.outputPath);
    if (result.valid) {
      setProject(current => syncVideoJobToProject(current, {
        ...job,
        generationParameters: { ...(job.generationParameters || {}), ...(result.metadata || {}) },
      }));
    }
    return result.valid;
  });
};

export const bindVideoJobsToProject = (project: FilmProject, setProject: (updater: (current: FilmProject) => FilmProject) => void): (() => void) => {
  runtime.initialize();
  runtime.recover(project.id);
  const unbind = runtime.subscribe(jobs => {
    const scoped = jobs.filter(job => job.projectId === project.id);
    if (scoped.length) setProject(current => scoped.reduce(syncVideoJobToProject, current));
  });
  void reconcileVideoJobsForProject(project, setProject);
  return unbind;
};
