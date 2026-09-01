import test from 'node:test';
import assert from 'node:assert/strict';
import { ModalLtxProvider, getModalLtxConfig } from '../src/modalLtxProvider';
import { getVideoProviderChoice, isRetryableModalFailure, shouldFallbackToLocal, shouldUseModal } from '../src/videoProviderSelection';

test('Modal configuration is disabled and endpoint-free by default', () => {
  const config = getModalLtxConfig({});
  assert.equal(config.enabled, false);
  assert.equal(config.timeoutSec, 900);
  assert.equal(shouldUseModal('auto', config), false);
});

test('provider choice supports local, modal, and auto', () => {
  assert.equal(getVideoProviderChoice({}), 'local');
  assert.equal(getVideoProviderChoice({ VIDEO_PROVIDER: 'modal' }), 'modal-ltx');
  assert.equal(getVideoProviderChoice({ VIDEO_PROVIDER: 'modal-ltx' }), 'modal-ltx');
  assert.equal(getVideoProviderChoice({ VIDEO_PROVIDER: 'auto' }), 'auto');
});

test('Modal is selected only when enabled and endpoint configured', () => {
  const config = { enabled: true, endpoint: 'https://example.test/modal', timeoutSec: 900 };
  assert.equal(shouldUseModal('modal-ltx', config), true);
  assert.equal(shouldUseModal('auto', config), true);
  assert.equal(shouldUseModal('local', config), false);
  assert.equal(shouldUseModal('auto', { ...config, endpoint: undefined }), false);
});

test('auto fallback is limited to retryable infrastructure failures', () => {
  assert.equal(isRetryableModalFailure(new Error('Modal GPU provisioning unavailable')), true);
  assert.equal(isRetryableModalFailure(new Error('Modal request timed out')), true);
  assert.equal(isRetryableModalFailure(new Error('invalid prompt schema')), false);
  assert.equal(shouldFallbackToLocal('auto', new Error('worker capacity unavailable'), true), true);
  assert.equal(shouldFallbackToLocal('modal-ltx', new Error('worker capacity unavailable'), true), false);
  assert.equal(shouldFallbackToLocal('auto', new Error('invalid prompt schema'), true), false);
});

test('Modal adapter rejects disabled or unconfigured requests before network work', async () => {
  let calls = 0;
  const provider = new ModalLtxProvider({ enabled: false, timeoutSec: 900 }, async () => {
    calls += 1;
    throw new Error('network must not be called');
  });
  await assert.rejects(() => provider.generate({ sourceImage: '/api/assets/images/source.png', prompt: 'move', duration: 1 }), /not enabled/);
  assert.equal(calls, 0);

  const unconfigured = new ModalLtxProvider({ enabled: true, timeoutSec: 900 }, async () => {
    calls += 1;
    throw new Error('network must not be called');
  });
  await assert.rejects(() => unconfigured.generate({ sourceImage: '/api/assets/images/source.png', prompt: 'move', duration: 1 }), /endpoint is not configured/);
  assert.equal(calls, 0);
});

test('Modal adapter requires HTTPS and forwards bearer authentication', async () => {
  const provider = new ModalLtxProvider({ enabled: true, endpoint: 'http://example.test/modal', timeoutSec: 2 }, async () => {
    throw new Error('network must not be called');
  });
  await assert.rejects(() => provider.generate({ prompt: 'move' }), /HTTPS/);

  const authenticated = new ModalLtxProvider({ enabled: true, endpoint: 'https://example.test/modal', bearerToken: 'secret-not-logged', timeoutSec: 2 }, async (_url, init) => {
    assert.equal((init?.headers as Record<string, string>).Authorization, 'Bearer secret-not-logged');
    return new Response(JSON.stringify({ jobId: 'remote-t2v', status: 'queued' }), { status: 200 });
  });
  const job = await authenticated.generate({ prompt: 'move' });
  assert.equal(job.providerJobId, 'remote-t2v');
});

test('Modal adapter maps a completed provider response to a VideoGenerationJob', async () => {
  const provider = new ModalLtxProvider({ enabled: true, endpoint: 'https://example.test/modal', timeoutSec: 2 }, async (_url, init) => {
    assert.equal(init?.method, 'POST');
    assert.match(String((init?.headers as Record<string, string>)['Idempotency-Key']), /^null-sector-/);
    const body = JSON.parse(String(init?.body));
    assert.equal(body.type, 'i2v');
    assert.equal(body.outputFormat, 'mp4');
    return new Response(JSON.stringify({ jobId: 'remote-123', status: 'completed', outputUrl: '/remote/output.mp4', model: 'ltx-video-2b-v0.9.1', progress: 1 }), { status: 200 });
  });
  const job = await provider.generate({ projectId: 'p', shotId: 's', sourceImage: '/api/assets/images/source.png', prompt: 'move', duration: 1, resolution: '864x480', aspectRatio: '16:9' });
  assert.equal(job.providerId, 'modal-ltx');
  assert.equal(job.providerJobId, 'remote-123');
  assert.equal(job.status, 'completed');
  assert.equal(job.outputPath, '/remote/output.mp4');
});
