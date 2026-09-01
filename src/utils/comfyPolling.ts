/**
 * ComfyUI history-entry interpretation for the local video poll loop.
 *
 * Pure functions over the JSON shape returned by GET /history/{prompt_id} in
 * ComfyUI 0.20.x, separated from server.ts so the "ComfyUI HTTP boundary" can
 * be unit-tested deterministically without a real backend.
 */

import { classifyProviderError, ProviderError, ProviderErrorInfo } from './providerErrors';

export interface ComfyOutputFile {
  filename: string;
  subfolder?: string;
  type?: string;
  /** Output slot kind (images/gifs/videos) — diagnostics only. */
  slot?: 'images' | 'gifs' | 'videos';
  /** ComfyUI node id that produced the file — diagnostics only. */
  nodeId?: string;
}

export type ComfyPollPhase =
  | { phase: 'pending' } // not yet present in history (queued / not started)
  | { phase: 'running' } // present but not completed
  | { phase: 'completed'; files: ComfyOutputFile[] }
  | { phase: 'error'; message: string; info: ProviderErrorInfo };

interface ComfyHistoryStatus {
  completed?: boolean;
  status_str?: string;
  messages?: Array<[string, unknown]>;
}

interface ComfyHistoryNodeOutput {
  images?: Array<Record<string, unknown>>;
  gifs?: Array<Record<string, unknown>>;
  videos?: Array<Record<string, unknown>>;
}

export interface ComfyHistoryEntry {
  status?: ComfyHistoryStatus;
  outputs?: Record<string, ComfyHistoryNodeOutput>;
}

/** Extract the execution_error message ComfyUI records on a failed prompt. */
export const extractExecutionError = (entry: ComfyHistoryEntry | undefined): string | undefined => {
  const messages = entry?.status?.messages;
  if (!Array.isArray(messages)) return undefined;
  for (const message of messages) {
    if (!Array.isArray(message)) continue;
    const [kind, payload] = message;
    if (kind !== 'execution_error' || !payload || typeof payload !== 'object') continue;
    const record = payload as { exception_message?: unknown; exception_type?: unknown; node_id?: unknown };
    const detail = typeof record.exception_message === 'string' ? record.exception_message : JSON.stringify(record);
    const type = typeof record.exception_type === 'string' ? `${record.exception_type}: ` : '';
    const node = typeof record.node_id === 'string' ? ` (node ${record.node_id})` : '';
    if (!type && !detail && !node) continue;
    return `${type}${detail}${node}`;
  }
  return undefined;
};

const toFile = (value: unknown, kind: 'images' | 'gifs' | 'videos'): ComfyOutputFile | undefined => {
  if (!value || typeof value !== 'object') return undefined;
  const record = value as Record<string, unknown>;
  const filename = typeof record.filename === 'string' ? record.filename : '';
  if (!filename) return undefined;
  return {
    filename,
    subfolder: typeof record.subfolder === 'string' ? record.subfolder : '',
    type: typeof record.type === 'string' ? record.type : 'output',
    // Surface which output slot produced the file (used for diagnostics only).
    slot: kind,
  } as ComfyOutputFile;
};

const collectFiles = (outputs: Record<string, ComfyHistoryNodeOutput> | undefined): ComfyOutputFile[] => {
  if (!outputs) return [];
  const files: ComfyOutputFile[] = [];
  for (const nodeId of Object.keys(outputs)) {
    const nodeOutput = outputs[nodeId];
    for (const kind of ['images', 'gifs', 'videos'] as const) {
      const list = nodeOutput?.[kind];
      if (!Array.isArray(list)) continue;
      for (const item of list) {
        const file = toFile(item, kind);
        if (file) files.push({ ...file, nodeId });
      }
    }
  }
  return files;
};

/**
 * Interpret a single /history/{prompt_id} entry.
 *
 * - No entry            → pending (still queued)
 * - Not completed       → running
 * - Completed + files   → completed
 * - Completed, no files → error (OUTPUT_NOT_FOUND unless an execution error names the cause)
 * - status_str=error    → error (message lifted from execution_error if present)
 */
export const interpretComfyHistory = (entry: ComfyHistoryEntry | undefined): ComfyPollPhase => {
  if (!entry || typeof entry !== 'object') return { phase: 'pending' };
  const status = entry.status ?? {};

  const executionError = extractExecutionError(entry);
  if (status.status_str === 'error' || executionError) {
    const message = executionError
      ? `ComfyUI execution error: ${executionError}`
      : 'ComfyUI reported an execution error';
    return { phase: 'error', message, info: classifyProviderError(undefined, message) };
  }

  if (status.completed !== true) return { phase: 'running' };

  const files = collectFiles(entry.outputs);
  if (files.length > 0) return { phase: 'completed', files };

  return {
    phase: 'error',
    message: 'ComfyUI completed without producing an output file',
    info: classifyProviderError(undefined, 'OUTPUT_NOT_FOUND: ComfyUI completed without an output file'),
  };
};

/**
 * Wrap a raw ComfyUI failure into a classified ProviderError so the endpoint
 * catch block can preserve the precise reason instead of re-deriving it.
 */
export const comfyPollingError = (phase: Extract<ComfyPollPhase, { phase: 'error' }>, provider = 'Local Video (ComfyUI)'): ProviderError =>
  new ProviderError(phase.message, { provider, info: phase.info, details: phase.message });