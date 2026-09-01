import { VideoGenerationJob } from './videoTypes';

const KEY = 'null-sector-video-generation-jobs';
const MAX_JOBS = 250;

export const loadVideoJobs = (): VideoGenerationJob[] => {
  if (typeof localStorage === 'undefined') return [];
  try {
    const value = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(value) ? value : [];
  } catch { return []; }
};

export const saveVideoJobs = (jobs: VideoGenerationJob[]): void => {
  if (typeof localStorage !== 'undefined') {
    const retained = jobs.length > MAX_JOBS
      ? jobs.filter(job => job.status === 'queued' || job.status === 'generating').concat(jobs.filter(job => !['queued', 'generating'].includes(job.status)).slice(-(MAX_JOBS)))
      : jobs;
    try { localStorage.setItem(KEY, JSON.stringify(retained)); } catch { /* Metadata persistence must never break generation UI. */ }
  }
};

export const upsertVideoJob = (job: VideoGenerationJob): VideoGenerationJob[] => {
  const jobs = loadVideoJobs();
  const index = jobs.findIndex(existing => existing.id === job.id);
  if (index >= 0) jobs[index] = job; else jobs.push(job);
  saveVideoJobs(jobs);
  return jobs;
};
