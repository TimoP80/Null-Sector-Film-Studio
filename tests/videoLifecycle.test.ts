import test from 'node:test';
import assert from 'node:assert/strict';
import { VideoJobManager } from '../src/videoJobManager';
import { VideoGenerationJob } from '../src/videoTypes';
import { syncVideoJobToProject } from '../src/videoProjectSync';
import { videoProviderRegistry } from '../src/videoProviderRegistry';
import { verifyVideoOutput } from '../src/videoOutputVerification';
import { FilmProject } from '../src/types/film';

const storage = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
};

const job = (overrides: Partial<VideoGenerationJob> = {}): VideoGenerationJob => ({
  id: `job-${Math.random()}`, projectId: 'project-a', sceneId: 'scene-1', shotId: 'shot-1', takeId: 'take-1',
  providerId: 'local', modelId: 'ltx-video', status: 'queued', sourceImage: '/api/assets/images/source.png',
  prompt: 'slow dolly forward', duration: 2, resolution: '480p', createdAt: new Date().toISOString(), ...overrides,
});

const wait = (ms = 20) => new Promise(resolve => setTimeout(resolve, ms));

const project = (id = 'project-a'): FilmProject => ({ id, title: id, shots: [{
  id: 'shot-1', sceneId: 'scene-1', actId: 'act-1', shotNumber: 1, title: 'Shot', description: 'Shot', durationSec: 2,
  status: 'pending', camera: {} as any, subject: {} as any, environment: {} as any, style: {} as any,
  prompt: 'shot', dialogueSegmentIds: [], continuityFlags: [], takes: [],
}], generationJobs: [], scenes: [], acts: [], characters: [], locations: [], dialogueSegments: [], musicCues: [], sfxCues: [],
  assets: [], continuityItems: [], productionNotes: [], zeroBudget: {} as any, studioBranding: {} as any, timelineTracks: [],
  logline: '', genre: '', runtimeMin: 1, resolution: '4K (3840x2160)', frameRate: 24, aspectRatio: '16:9 (Widescreen)',
  status: 'development', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), screenplayText: '',
});

test('queue completes exactly once and supports retry history', async () => {
  storage.clear();
  let starts = 0;
  const manager = new VideoJobManager({ start: async current => { starts += 1; return { ...current, providerJobId: `provider-${starts}`, outputPath: '/api/assets/videos/output.webp' }; } });
  const original = job({ id: 'job-retry' });
  manager.enqueue(original);
  await wait();
  assert.equal(manager.getJobs('project-a')[0].status, 'completed');
  assert.equal(starts, 1);

  const failedManager = new VideoJobManager({ start: async current => { throw new Error(`failed ${current.id}`); } });
  const failed = job({ id: 'job-failed' });
  failedManager.enqueue(failed);
  await wait();
  assert.equal(failedManager.getJobs('project-a').find(item => item.id === 'job-failed')?.status, 'failed');
  const retry = failedManager.retry('job-failed');
  assert.ok(retry);
  assert.notEqual(retry!.id, failed.id);
  assert.equal(failedManager.getJobs('project-a').length, 3);
  assert.equal(failedManager.getJobs('project-a').some(item => item.id === 'job-failed'), true);
});

test('queued jobs can be cancelled and projects stay isolated', async () => {
  storage.clear();
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const manager = new VideoJobManager({ start: async current => { await gate; return { ...current, outputPath: '/api/assets/videos/a.webp' }; } });
  manager.enqueue(job({ id: 'a-active', projectId: 'project-a' }));
  manager.enqueue(job({ id: 'a-queued', projectId: 'project-a' }));
  manager.enqueue(job({ id: 'b-queued', projectId: 'project-b' }));
  await manager.cancel('a-queued');
  assert.equal(manager.getJobs('project-a').find(item => item.id === 'a-queued')?.status, 'cancelled');
  assert.equal(manager.getJobs('project-b').length, 1);
  release();
  await wait();
});

test('project sync creates one GenerationJob and one unapproved Take', () => {
  let next = project();
  const completed = job({ id: 'sync-1', status: 'completed', providerJobId: 'provider-1', outputPath: '/api/assets/videos/one.webp' });
  next = syncVideoJobToProject(next, completed);
  next = syncVideoJobToProject(next, completed);
  assert.equal(next.generationJobs.filter(item => item.id === completed.id).length, 1);
  assert.equal(next.shots[0].takes.length, 1);
  assert.equal(next.shots[0].takes[0].approved, false);
  assert.equal(next.shots[0].takes[0].isMaster, false);
});

test('completed recovery marks missing output failed', async () => {
  storage.clear();
  const manager = new VideoJobManager({ start: async current => current });
  manager.enqueue(job({ id: 'missing', status: 'completed', outputPath: '/api/assets/videos/missing.webp' }));
  await manager.reconcileAsync('project-a', async () => false);
  assert.equal(manager.getJobs('project-a')[0].status, 'failed');
  assert.match(manager.getJobs('project-a')[0].error || '', /missing|invalid/i);
});

test('invalid cloud providers fail without network work', async () => {
  const provider = videoProviderRegistry.get('runway');
  assert.ok(provider);
  await assert.rejects(() => provider!.generate({ sourceImage: '/image', prompt: 'motion' }), /not configured/i);
});

test('video output verifier rejects empty or unavailable media', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => new Response(null, { status: 404 })) as typeof fetch;
  const result = await verifyVideoOutput('/api/assets/videos/missing.webp');
  assert.equal(result.valid, false);
  globalThis.fetch = originalFetch;
});

test('video output verifier accepts FFprobe metadata when available', async () => {
  const originalFetch = globalThis.fetch;
  let call = 0;
  globalThis.fetch = (async () => {
    call += 1;
    return call === 1
      ? new Response(null, { status: 200, headers: { 'content-length': '128', 'content-type': 'video/webm' } })
      : new Response(JSON.stringify({ valid: true, verifiedBy: 'ffprobe', metadata: { durationSec: 2, width: 864, height: 480, frameRate: 24, codec: 'vp8' } }), { status: 200, headers: { 'content-type': 'application/json' } });
  }) as typeof fetch;
  const result = await verifyVideoOutput('/api/assets/videos/real.webp');
  assert.equal(result.valid, true);
  assert.equal(result.metadata?.verifiedBy, 'ffprobe');
  assert.equal(result.metadata?.width, 864);
  globalThis.fetch = originalFetch;
});

test('sync does not create a Take for a failed or incomplete output', () => {
  const next = syncVideoJobToProject(project(), job({ id: 'bad', status: 'failed', error: 'missing output' }));
  assert.equal(next.shots[0].takes.length, 0);
  assert.equal(next.generationJobs[0].status, 'failed');
});
