import { VideoGenerationJob } from './videoTypes';
import { loadVideoJobs, saveVideoJobs, upsertVideoJob } from './videoJobStore';

export interface VideoJobRunner {
  start(job: VideoGenerationJob): Promise<VideoGenerationJob>;
  cancel?(job: VideoGenerationJob): Promise<boolean>;
}

type Listener = (jobs: VideoGenerationJob[]) => void;

export class VideoJobManager {
  private jobs: VideoGenerationJob[] = [];
  private listeners = new Set<Listener>();
  private initialized = false;
  private active = new Set<string>();
  private paused = false;
  private shuttingDown = false;
  private runTokens = new Map<string, symbol>();

  constructor(private readonly runner: VideoJobRunner, private readonly concurrency = 1) {}

  initialize(): VideoGenerationJob[] {
    if (!this.initialized) {
      this.jobs = loadVideoJobs();
      this.initialized = true;
      this.emit();
    }
    return this.jobs;
  }

  subscribe(listener: Listener): () => void { this.initialize(); this.listeners.add(listener); listener(this.jobs); return () => this.listeners.delete(listener); }
  getJobs(projectId?: string): VideoGenerationJob[] { return this.jobs.filter(job => !projectId || job.projectId === projectId); }

  enqueue(job: VideoGenerationJob): void {
    this.initialize();
    if (this.shuttingDown) return;
    if (!this.jobs.some(existing => existing.id === job.id)) {
      this.jobs = [...this.jobs, job];
      saveVideoJobs(this.jobs);
      this.emit();
      void this.processQueue();
    }
  }

  pause(): void { this.paused = true; }
  resume(): void { this.paused = false; void this.processQueue(); }

  async cancel(id: string): Promise<void> {
    const job = this.jobs.find(item => item.id === id);
    if (!job || ['completed', 'failed', 'cancelled'].includes(job.status)) return;
    const wasActive = this.active.has(id);
    let remoteCancelled = true;
    if (wasActive && this.runner.cancel) remoteCancelled = await this.runner.cancel(job);
    const current = this.jobs.find(item => item.id === id);
    if (current && (!wasActive || remoteCancelled)) {
      this.runTokens.delete(id);
      this.update({ ...current, status: 'cancelled', error: remoteCancelled ? undefined : 'Local monitoring stopped; provider operation may still be running.' });
    }
  }

  retry(id: string): VideoGenerationJob | undefined {
    const job = this.jobs.find(item => item.id === id);
    if (!job || !['failed', 'cancelled'].includes(job.status)) return undefined;
    const retry = { ...job, id: `${job.id}-retry-${Date.now()}`, status: 'queued' as const, providerJobId: undefined, outputPath: undefined, error: undefined, createdAt: new Date().toISOString() };
    this.enqueue(retry);
    return retry;
  }

  recover(projectId?: string): void {
    this.initialize();
    this.jobs = this.jobs.map(job => {
      if (projectId && job.projectId !== projectId) return job;
      if (job.status === 'generating' && !this.active.has(job.id)) return { ...job, status: 'failed' as const, error: 'Generation interrupted by application restart.' };
      return job;
    });
    saveVideoJobs(this.jobs); this.emit(); void this.processQueue();
  }

  reconcile(projectId: string, hasOutput: (job: VideoGenerationJob) => boolean = job => Boolean(job.outputPath)): void {
    this.initialize();
    this.jobs = this.jobs.map(job => {
      if (job.projectId !== projectId || job.status !== 'completed') return job;
      return hasOutput(job) ? job : { ...job, status: 'failed' as const, outputPath: undefined, error: 'Output file missing after restart.' };
    });
    saveVideoJobs(this.jobs); this.emit();
  }

  async reconcileAsync(projectId: string, verifyOutput: (job: VideoGenerationJob) => Promise<boolean>): Promise<void> {
    this.initialize();
    const completed = this.jobs.filter(job => job.projectId === projectId && job.status === 'completed');
    for (const job of completed) {
      try {
        if (!(await verifyOutput(job))) {
          this.update({ ...job, status: 'failed', outputPath: undefined, error: 'Output file missing or invalid after restart.' });
        }
      } catch (error) {
        this.update({ ...job, status: 'failed', outputPath: undefined, error: error instanceof Error ? error.message : 'Output verification failed after restart.' });
      }
    }
  }

  shutdown(): void {
    this.shuttingDown = true;
    this.paused = true;
    saveVideoJobs(this.jobs);
    this.listeners.clear();
  }

  private async processQueue(): Promise<void> {
    if (this.paused) return;
    while (this.active.size < this.concurrency) {
      const next = this.jobs.find(job => job.status === 'queued' && !this.active.has(job.id));
      if (!next) return;
      this.active.add(next.id);
      const token = Symbol(next.id);
      this.runTokens.set(next.id, token);
      this.update({ ...next, status: 'generating', startedAt: new Date().toISOString() });
      void this.run(next.id, token);
    }
  }

  private async run(id: string, token: symbol): Promise<void> {
    const initial = this.jobs.find(item => item.id === id);
    if (!initial) return;
    try {
      const result = await this.runner.start(initial);
      const current = this.jobs.find(item => item.id === id);
      if (this.runTokens.get(id) !== token || current?.status !== 'generating') return;
      this.update({ ...current, ...result, id, status: 'completed', completedAt: result.completedAt || new Date().toISOString() });
    } catch (error) {
      const current = this.jobs.find(item => item.id === id);
      if (this.runTokens.get(id) !== token || current?.status !== 'generating') return;
      this.update({ ...current, status: 'failed', error: error instanceof Error ? error.message : String(error) });
    } finally {
      if (this.runTokens.get(id) === token) this.runTokens.delete(id);
      this.active.delete(id);
      void this.processQueue();
    }
  }

  update(job: VideoGenerationJob): void { this.jobs = this.jobs.map(item => item.id === job.id ? job : item); upsertVideoJob(job); this.emit(); }
  addListener(listener: Listener): () => void { return this.subscribe(listener); }
  private emit(): void { const snapshot = [...this.jobs]; this.listeners.forEach(listener => listener(snapshot)); }
}
