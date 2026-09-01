import test from 'node:test';
import assert from 'node:assert/strict';
import { VideoJobManager } from '../src/videoJobManager';
import { VideoGenerationJob } from '../src/videoTypes';
import { verifyVideoOutput } from '../src/videoOutputVerification';
import { syncVideoJobToProject } from '../src/videoProjectSync';
import { FilmProject } from '../src/types/film';

const enabled = process.env.RUN_COMFYUI_INTEGRATION === '1';
const baseUrl = process.env.COMFYUI_BASE_URL || 'http://127.0.0.1:8188';
const skipReason = enabled ? undefined : 'Set RUN_COMFYUI_INTEGRATION=1 to execute against a real ComfyUI/LTX backend.';

const project = (id: string): FilmProject => ({
  id, title: 'ComfyUI Integration', shots: [{
    id: 'integration-shot', sceneId: 'integration-scene', actId: 'integration-act', shotNumber: 1,
    title: 'Integration Shot', description: 'Minimal local integration shot', durationSec: 2, status: 'pending',
    camera: {} as any, subject: {} as any, environment: {} as any, style: {} as any, prompt: 'integration',
    dialogueSegmentIds: [], continuityFlags: [], takes: [],
  }], generationJobs: [], scenes: [], acts: [], characters: [], locations: [], dialogueSegments: [], musicCues: [],
  sfxCues: [], assets: [], continuityItems: [], productionNotes: [], zeroBudget: {} as any, studioBranding: {} as any,
  timelineTracks: [], logline: '', genre: '', runtimeMin: 1, resolution: '720p HD (1280x720)', frameRate: 24,
  aspectRatio: '16:9 (Widescreen)', status: 'development', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), screenplayText: '',
});

test('real ComfyUI/LTX lifecycle (opt-in)', { skip: skipReason }, async () => {
  const health = await fetch(`${baseUrl}/system_stats`);
  assert.equal(health.ok, true, `ComfyUI unavailable at ${baseUrl}`);
  const objectInfo = await fetch(`${baseUrl}/object_info`);
  assert.equal(objectInfo.ok, true, 'ComfyUI object_info unavailable');
  const info = await objectInfo.json() as Record<string, unknown>;
  assert.ok(info.LTXVImgToVideo || info.LTXVConditioning, 'Installed ComfyUI has no detected LTX node');

  const assetBase = process.env.NULL_SECTOR_TEST_ASSET_BASE || 'http://127.0.0.1:3001';
  const sourceImage = process.env.NULL_SECTOR_TEST_SOURCE_IMAGE || '/api/assets/images/integration-source.png';
  const prompt = 'A lone astronaut slowly walking through an abandoned deep-space station corridor, red emergency lights flickering through smoke, cinematic science fiction';
  const response = await fetch(`${assetBase}/api/video/generate-local`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    // Real GPU inference on modest hardware (e.g. GTX 1070 image-to-video) can take
    // several minutes; undici's default 300s header timeout is too short.
    signal: AbortSignal.timeout(30 * 60 * 1000),
    body: JSON.stringify({ prompt, durationSec: 1, shotId: 'integration-shot', keyframeUrl: sourceImage, aspectRatio: '16:9', resolution: '480p', outputFormat: 'webp', seed: 7 }),
  });
  const responseBody = await response.text();
  assert.equal(response.ok, true, `Production local-video endpoint failed: HTTP ${response.status} ${responseBody}`);
  const result = JSON.parse(responseBody) as { success?: boolean; videoUrl?: string; operationId?: string; model?: string; durationSec?: number; mimeType?: string };
  assert.equal(result.success, true);
  assert.ok(result.videoUrl?.startsWith('/api/assets/videos/'));

  // Node has no browser origin to resolve relative asset URLs against.
  const verification = await verifyVideoOutput(result.videoUrl!, assetBase);
  assert.equal(verification.valid, true, verification.error);
  assert.ok(verification.metadata?.sizeBytes && verification.metadata.sizeBytes > 0);
  console.info(JSON.stringify({
    backend: baseUrl, provider: 'LTX / ComfyUI', outputUrl: result.videoUrl,
    operationId: result.operationId, model: result.model, mimeType: result.mimeType,
    metadata: verification.metadata, verification: verification.metadata?.verifiedBy || 'http',
  }));

  const testJob: VideoGenerationJob = {
    id: `integration-${Date.now()}`, projectId: 'integration-project', sceneId: 'integration-scene', shotId: 'integration-shot',
    takeId: `take-integration-${Date.now()}`, providerId: 'local', modelId: result.model || 'ltx-video', status: 'completed',
    sourceImage, prompt, duration: 1, resolution: '480p', createdAt: new Date().toISOString(), completedAt: new Date().toISOString(),
    providerJobId: result.operationId, outputPath: result.videoUrl, generationParameters: verification.metadata ? { ...verification.metadata } : undefined,
  };
  const manager = new VideoJobManager({ start: async job => job });
  manager.enqueue(testJob);
  const persisted = manager.getJobs('integration-project').find(job => job.id === testJob.id);
  assert.equal(persisted?.status, 'completed');

  let restored = project('integration-project');
  restored = syncVideoJobToProject(restored, persisted!);
  restored = syncVideoJobToProject(restored, persisted!);
  assert.equal(restored.generationJobs.filter(job => job.id === testJob.id).length, 1);
  assert.equal(restored.shots[0].takes.length, 1);
  assert.equal(restored.shots[0].takes[0].approved, false);
  assert.equal(restored.shots[0].takes[0].isMaster, false);
});
