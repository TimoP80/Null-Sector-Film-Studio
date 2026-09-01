import { ImageToVideoProvider, ImageToVideoRequest, VideoCapabilities, VideoGenerationJob } from './videoTypes';

export interface ModalLtxConfig {
  enabled: boolean;
  app?: string;
  functionName?: string;
  endpoint?: string;
  bearerToken?: string;
  timeoutSec: number;
  maxCostUsd?: number;
}

export const getModalLtxConfig = (env: NodeJS.ProcessEnv = process.env): ModalLtxConfig => ({
  enabled: env.MODAL_LTX_ENABLED === 'true',
  app: env.MODAL_LTX_APP,
  functionName: env.MODAL_LTX_FUNCTION,
  endpoint: env.MODAL_LTX_ENDPOINT,
  timeoutSec: Number(env.MODAL_LTX_TIMEOUT_SEC) || 900,
  maxCostUsd: env.MODAL_LTX_MAX_COST_USD ? Number(env.MODAL_LTX_MAX_COST_USD) : undefined,
  bearerToken: env.MODAL_LTX_TOKEN,
});

export const MODAL_LTX_CAPABILITIES: VideoCapabilities = {
  imageToVideo: true,
  textToVideo: true,
  referenceImages: false,
  startFrame: true,
  endFrame: false,
  audioGeneration: false,
  supportedResolutions: ['480p', '720p', '864x480'],
  supportedAspectRatios: ['16:9'],
  minDuration: 0.375,
  maxDuration: 10,
};

type ModalResponse = {
  jobId?: string;
  providerJobId?: string;
  status?: VideoGenerationJob['status'];
  progress?: number;
  outputUrl?: string;
  outputPath?: string;
  error?: string;
  model?: string;
};

const withTimeout = async <T>(promise: Promise<T>, timeoutSec: number): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`Modal LTX request timed out after ${timeoutSec}s`)), timeoutSec * 1000);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
};

export class ModalLtxProvider implements ImageToVideoProvider {
  readonly id = 'modal-ltx';
  readonly name = 'Modal LTX';

  constructor(
    private readonly config: ModalLtxConfig = getModalLtxConfig(),
    private readonly fetcher: typeof fetch = fetch,
    private readonly idempotencyKeyFactory: () => string = () => `null-sector-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
  ) {}

  getCapabilities(): VideoCapabilities { return MODAL_LTX_CAPABILITIES; }

  async generate(request: ImageToVideoRequest): Promise<VideoGenerationJob> {
    if (!this.config.enabled) throw new Error('Modal LTX is not enabled. Set MODAL_LTX_ENABLED=true.');
    if (!this.config.endpoint) throw new Error('Modal LTX endpoint is not configured. Set MODAL_LTX_ENDPOINT.');
    if (!/^https:\/\//i.test(this.config.endpoint)) throw new Error('Modal LTX endpoint must use HTTPS.');
    if (!request.prompt.trim()) throw new Error('A video prompt is required');

    const id = `modal-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const createdAt = new Date().toISOString();
    const response = await withTimeout(this.fetcher(this.config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': this.idempotencyKeyFactory(),
        ...(this.config.bearerToken ? { Authorization: `Bearer ${this.config.bearerToken}` } : {}),
      },
      body: JSON.stringify({
        type: request.sourceImage ? 'i2v' : 't2v',
        prompt: request.prompt,
        negativePrompt: request.negativePrompt,
        sourceImage: request.sourceImage || undefined,
        duration: request.duration,
        resolution: request.resolution,
        aspectRatio: request.aspectRatio,
        modelId: request.modelId || 'ltx-video-2b-v0.9.1',
        outputFormat: 'mp4',
        fps: 24,
        frames: request.duration ? Math.max(9, Math.round(request.duration * 24)) : undefined,
        steps: 25,
        cfg: 3,
        seed: request.seed,
      }),
    }).then(async res => {
      const body = await res.json() as ModalResponse;
      if (!res.ok) throw new Error(body.error || `Modal LTX returned HTTP ${res.status}`);
      return body;
    }), this.config.timeoutSec);

    return {
      id,
      projectId: request.projectId,
      sceneId: request.sceneId,
      shotId: request.shotId,
      providerId: this.id,
      modelId: response.model || request.modelId || 'ltx-video-2b-v0.9.1',
      status: response.status || (response.outputUrl || response.outputPath ? 'completed' : 'generating'),
      sourceImage: request.sourceImage || '',
      prompt: request.prompt,
      duration: request.duration,
      resolution: request.resolution,
      createdAt,
      startedAt: createdAt,
      completedAt: response.status === 'completed' ? new Date().toISOString() : undefined,
      progress: response.progress,
      outputPath: response.outputUrl || response.outputPath,
      providerJobId: response.providerJobId || response.jobId || id,
      error: response.error,
      motionSpecification: request.motion,
    };
  }

  async getJobStatus(jobId: string): Promise<VideoGenerationJob> {
    if (!this.config.enabled) throw new Error('Modal LTX is not enabled.');
    if (!this.config.endpoint) throw new Error('Modal LTX endpoint is not configured.');
    if (!/^https:\/\//i.test(this.config.endpoint)) throw new Error('Modal LTX endpoint must use HTTPS.');
    const response = await withTimeout(this.fetcher(`${this.config.endpoint.replace(/\/$/, '')}/${encodeURIComponent(jobId)}`, {
      headers: { Accept: 'application/json', ...(this.config.bearerToken ? { Authorization: `Bearer ${this.config.bearerToken}` } : {}) },
    }).then(async res => {
      const body = await res.json() as ModalResponse;
      if (!res.ok) throw new Error(body.error || `Modal LTX returned HTTP ${res.status}`);
      return body;
    }), this.config.timeoutSec);
    return {
      id: jobId,
      providerId: this.id,
      modelId: response.model || 'ltx-video-2b-v0.9.1',
      status: response.status || 'generating',
      sourceImage: '',
      prompt: '',
      createdAt: new Date().toISOString(),
      progress: response.progress,
      outputPath: response.outputUrl || response.outputPath,
      providerJobId: response.providerJobId || response.jobId || jobId,
      error: response.error,
    };
  }

  async cancel(jobId: string): Promise<void> {
    if (!this.config.enabled) throw new Error('Modal LTX is not enabled.');
    if (!this.config.endpoint) throw new Error('Modal LTX endpoint is not configured.');
    if (!/^https:\/\//i.test(this.config.endpoint)) throw new Error('Modal LTX endpoint must use HTTPS.');
    const response = await withTimeout(this.fetcher(`${this.config.endpoint.replace(/\/$/, '')}/${encodeURIComponent(jobId)}`, {
      method: 'DELETE',
      headers: this.config.bearerToken ? { Authorization: `Bearer ${this.config.bearerToken}` } : undefined,
    }), this.config.timeoutSec);
    if (!response.ok) throw new Error(`Modal LTX cancellation failed (HTTP ${response.status})`);
  }
}

export const modalLtxProvider = new ModalLtxProvider();
