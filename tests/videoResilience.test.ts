import test from 'node:test';
import assert from 'node:assert/strict';
import { VideoJobManager } from '../src/videoJobManager';
import { VideoGenerationJob } from '../src/videoTypes';

const storage = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
};

const makeJob = (id: string, status: VideoGenerationJob['status'] = 'queued'): VideoGenerationJob => ({
  id, projectId: 'p-a', shotId: 'shot-a', providerId: 'local', modelId: 'ltx-video', status,
  sourceImage: '/api/assets/images/source.png', prompt: 'slow camera move', duration: 2,
  resolution: '480p', createdAt: new Date().toISOString(), takeId: `take-${id}`,
});

const wait = () => new Promise(resolve => setTimeout(resolve, 15));

test('late completion after cancellation cannot overwrite cancelled job', async () => {
  storage.clear();
  let release!: () => void;
  const pending = new Promise<void>(resolve => { release = resolve; });
  const manager = new VideoJobManager({ start: async job => { await pending; return { ...job, outputPath: '/api/assets/videos/late.webp' }; } });
  manager.enqueue(makeJob('job-a'));
  await wait();
  await manager.cancel('job-a');
  release();
  await wait();
  assert.equal(manager.getJobs('p-a')[0].status, 'cancelled');
  assert.equal(manager.getJobs('p-a')[0].outputPath, undefined);
});

test('completed jobs are not retryable or cancellable', async () => {
  storage.clear();
  const manager = new VideoJobManager({ start: async job => ({ ...job, outputPath: '/api/assets/videos/ok.webp' }) });
  manager.enqueue(makeJob('job-complete'));
  await wait();
  assert.equal(await manager.cancel('job-complete'), undefined);
  assert.equal(manager.retry('job-complete'), undefined);
  assert.equal(manager.getJobs('p-a')[0].status, 'completed');
});

test('repeated reconciliation is stable and only verifies completed jobs', async () => {
  storage.clear();
  const manager = new VideoJobManager({ start: async job => job });
  manager.enqueue(makeJob('job-completed', 'completed'));
  let calls = 0;
  const verify = async () => { calls += 1; return true; };
  await manager.reconcileAsync('p-a', verify);
  await manager.reconcileAsync('p-a', verify);
  assert.equal(calls, 2);
  assert.equal(manager.getJobs('p-a').length, 1);
  assert.equal(manager.getJobs('p-a')[0].status, 'completed');
});

test('active jobs for another project are not reconciled by current project', async () => {
  storage.clear();
  const manager = new VideoJobManager({ start: async job => job });
  manager.enqueue(makeJob('job-a', 'generating'));
  manager.enqueue({ ...makeJob('job-b', 'completed'), projectId: 'p-b' });
  await manager.reconcileAsync('p-a', async () => false);
  assert.equal(manager.getJobs('p-a')[0].status, 'generating');
  assert.equal(manager.getJobs('p-b')[0].status, 'completed');
});

test('shutdown prevents new jobs from entering the queue', () => {
  storage.clear();
  const manager = new VideoJobManager({ start: async job => job });
  manager.shutdown();
  manager.enqueue(makeJob('after-shutdown'));
  assert.equal(manager.getJobs('p-a').length, 0);
});
