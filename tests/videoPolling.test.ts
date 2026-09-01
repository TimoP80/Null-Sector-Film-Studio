import test from 'node:test';
import assert from 'node:assert/strict';
import { interpretComfyHistory, extractExecutionError, ComfyHistoryEntry } from '../src/utils/comfyPolling';
import { classifyProviderError } from '../src/utils/providerErrors';

const entry = (overrides: Partial<ComfyHistoryEntry> = {}): ComfyHistoryEntry => ({
  status: { completed: true, status_str: 'success', messages: [] },
  outputs: {},
  ...overrides,
});

test('missing history entry is pending (still queued)', () => {
  assert.deepEqual(interpretComfyHistory(undefined), { phase: 'pending' });
});

test('incomplete entry is running', () => {
  const result = interpretComfyHistory(entry({ status: { completed: false } }));
  assert.equal(result.phase, 'running');
});

test('completed entry with images returns the output file', () => {
  const result = interpretComfyHistory(entry({
    outputs: { '12': { images: [{ filename: 'out00001_.webp', subfolder: '', type: 'output' }] } },
  }));
  assert.equal(result.phase, 'completed');
  if (result.phase === 'completed') {
    assert.equal(result.files[0].filename, 'out00001_.webp');
    assert.equal(result.files[0].nodeId, '12');
    assert.equal(result.files[0].slot, 'images');
  }
});

test('completed entry with videos returns the output file', () => {
  const result = interpretComfyHistory(entry({
    outputs: { '12': { videos: [{ filename: 'out00001_.mp4', subfolder: '', type: 'output' }] } },
  }));
  assert.equal(result.phase, 'completed');
  if (result.phase === 'completed') {
    assert.equal(result.files[0].filename, 'out00001_.mp4');
    assert.equal(result.files[0].slot, 'videos');
  }
});

test('completed entry without output files is OUTPUT_NOT_FOUND, not pending', () => {
  const result = interpretComfyHistory(entry({ outputs: undefined }));
  assert.equal(result.phase, 'error');
  if (result.phase === 'error') {
    assert.equal(result.info.code, 'OUTPUT_NOT_FOUND');
  }
});

test('execution_error message is extracted from history', () => {
  const result = interpretComfyHistory(entry({
    status: {
      completed: true,
      status_str: 'error',
      messages: [
        ['execution_error', { exception_type: 'RuntimeError', exception_message: 'CUDA out of memory.', node_id: '10' }],
      ],
    },
  }));
  assert.equal(result.phase, 'error');
  if (result.phase === 'error') {
    assert.match(result.message, /CUDA out of memory/);
    assert.equal(result.info.code, 'OUT_OF_MEMORY');
  }
});

test('status_str error without messages still surfaces as an execution error', () => {
  const result = interpretComfyHistory(entry({ status: { completed: true, status_str: 'error', messages: [] } }));
  assert.equal(result.phase, 'error');
  if (result.phase === 'error') {
    assert.match(result.message, /execution error/i);
  }
});

test('extractExecutionError handles malformed messages defensively', () => {
  assert.equal(extractExecutionError({ status: { messages: [['execution_start', {}], 'not-an-array'] } as any }), undefined);
  assert.equal(extractExecutionError({ status: { messages: [['execution_error', { exception_message: 'boom' }]] } }), 'boom');
  assert.equal(extractExecutionError(undefined), undefined);
});

test('timeout text classifies as TIMEOUT (both TIMED OUT and TIMEOUT forms)', () => {
  assert.equal(classifyProviderError(undefined, 'Local video generation timed out after 1500s').code, 'TIMEOUT');
  assert.equal(classifyProviderError(undefined, 'deadline exceeded').code, 'TIMEOUT');
});

test('ComfyUI-crashed workflow text classifies as GPU_RUNTIME_ERROR', () => {
  const info = classifyProviderError(undefined, 'Windows fatal exception: access violation during VAEDecode');
  assert.equal(info.code, 'GPU_RUNTIME_ERROR');
});

test('CUDA out of memory text classifies as OUT_OF_MEMORY', () => {
  assert.equal(classifyProviderError(undefined, 'CUDA error: out of memory').code, 'OUT_OF_MEMORY');
});

test('workflow rejection classifies as COMFYUI_WORKFLOW_REJECTED', () => {
  const info = classifyProviderError(400, 'ComfyUI rejected workflow: HTTP 400 — invalid node type');
  assert.equal(info.code, 'COMFYUI_WORKFLOW_REJECTED');
});

test('OOM takes precedence over generic GPU runtime errors', () => {
  const info = classifyProviderError(undefined, 'RuntimeError: CUDA out of memory. Tried to allocate 512 MiB');
  assert.equal(info.code, 'OUT_OF_MEMORY');
});