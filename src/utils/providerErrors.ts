export type ProviderErrorCode =
  | 'AUTHENTICATION'
  | 'NOT_CONFIGURED'
  | 'BACKEND_UNAVAILABLE'
  | 'MODEL_UNAVAILABLE'
  | 'OUT_OF_MEMORY'
  | 'GENERATION_FAILED'
  | 'QUOTA_EXHAUSTED'
  | 'RATE_LIMITED'
  | 'INVALID_REQUEST'
  | 'CONTENT_BLOCKED'
  | 'TIMEOUT'
  | 'COMFYUI_WORKFLOW_REJECTED'
  | 'GPU_RUNTIME_ERROR'
  | 'OUTPUT_NOT_FOUND'
  | 'OUTPUT_INVALID'
  | 'ASSET_PERSISTENCE_FAILED'
  | 'UNKNOWN';

export type ProviderQuotaStatus = 'available' | 'exhausted' | 'unknown';

export interface ProviderErrorInfo {
  code: ProviderErrorCode;
  quotaStatus: ProviderQuotaStatus;
  retryAfterSec?: number;
  hardQuotaLimit?: number;
}

export interface ProviderErrorPresentation {
  title: string;
  message: string;
  detail: string;
  action: string;
  retryMessage?: string;
}

const asText = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (value instanceof Error) return value.message;
  try {
    return JSON.stringify(value) || '';
  } catch {
    return String(value);
  }
};

const getRetryAfterSeconds = (text: string): number | undefined => {
  const retryMatch = text.match(/retry(?:\s+available)?\s+(?:in|after)\s+(\d+(?:\.\d+)?)\s*s/i);
  if (retryMatch) return Math.max(1, Math.ceil(Number(retryMatch[1])));

  const retryDelayMatch = text.match(/"retryDelay"\s*:\s*\{[^}]*"seconds"\s*:\s*"?(\d+)/i);
  if (retryDelayMatch) return Math.max(1, Number(retryDelayMatch[1]));

  return undefined;
};

const isLocalProvider = (text: string): boolean =>
  /local|comfyui|ltx|flux|sdxl/i.test(text);

export const classifyProviderError = (
  httpStatus?: number,
  source?: unknown
): ProviderErrorInfo => {
  const text = asText(source);
  const upperText = text.toUpperCase();
  const retryAfterSec = getRetryAfterSeconds(text);
  const hardQuota =
    /(?:LIMIT|QUOTA)[^\d]{0,30}(?:LIMIT|=|:)\s*0\b/i.test(text) ||
    /FREE[_ -]?TIER[^\d]{0,40}(?:LIMIT|QUOTA)[^\d]{0,10}0\b/i.test(text) ||
    /(?:QUOTA|RESOURCE_EXHAUSTED).*(?:DAILY|PER[_ -]?DAY|LIMIT[_ -]?0)/i.test(text);

  if (/API key is not configured|NOT_CONFIGURED/i.test(text)) {
    return { code: 'NOT_CONFIGURED', quotaStatus: 'unknown' };
  }
  if (/BACKEND_UNAVAILABLE|BACKEND_OFFLINE|ECONNREFUSED|CONNECTION REFUSED|ENOTFOUND|FETCH FAILED|backend (?:is )?(?:not running|offline|unreachable|not available|not reachable)/i.test(text)) {
    return { code: 'BACKEND_UNAVAILABLE', quotaStatus: 'unknown' };
  }
  if (/OUT_OF_MEMORY|CUDA OUT OF MEMORY|OUT OF MEMORY|INSUFFICIENT VRAM|OOM\b/i.test(text)) {
    return { code: 'OUT_OF_MEMORY', quotaStatus: 'unknown' };
  }
  if (httpStatus === 401 || httpStatus === 403 || /UNAUTHENTICATED|PERMISSION_DENIED|INVALID API KEY/i.test(upperText)) {
    return { code: 'AUTHENTICATION', quotaStatus: 'unknown' };
  }
  if (httpStatus === 404 || /MODEL_UNAVAILABLE|MODEL_NOT_FOUND|MODEL.*(?:NOT FOUND|UNAVAILABLE)|UNSUPPORTED MODEL|CHECKPOINT.*NOT FOUND/i.test(upperText)) {
    return { code: 'MODEL_UNAVAILABLE', quotaStatus: 'unknown' };
  }
  // ComfyUI-specific rejection (invalid node, bad model name, malformed graph)
  // is more specific than a generic 400 and must win over INVALID_REQUEST.
  if (/COMFYUI.*(?:REJECTED|INVALID NODE|WORKFLOW)|REJECTED WORKFLOW|INVALID NODE TYPE/i.test(text)) {
    return { code: 'COMFYUI_WORKFLOW_REJECTED', quotaStatus: 'unknown' };
  }
  if (httpStatus === 400 || /INVALID_ARGUMENT|BAD REQUEST/i.test(upperText)) {
    return { code: 'INVALID_REQUEST', quotaStatus: 'unknown' };
  }
  if (/SAFETY|CONTENT[_ -]?FILTER|BLOCKED|RECITATION/i.test(upperText)) {
    return { code: 'CONTENT_BLOCKED', quotaStatus: 'unknown' };
  }
  if (httpStatus === 408 || /TIMEOUT|TIMED OUT|DEADLINE[_ -]?EXCEEDED/i.test(upperText)) {
    return { code: 'TIMEOUT', quotaStatus: 'unknown' };
  }
  if (/WINDOWS FATAL EXCEPTION|ACCESS VIOLATION|ILLEGAL (?:MEMORY|ADDRESS) ACCESS|RUNTIMEERROR|CUDA ERROR|CUDA ERROR:|NVRTC|TORCH.*(?:CRASH|FAIL)|GPU.*(?:CRASH|FAILURE|ERROR)/i.test(upperText)) {
    return { code: 'GPU_RUNTIME_ERROR', quotaStatus: 'unknown' };
  }
  if (/OUTPUT[_ -]?NOT[_ -]?FOUND|OUTPUT FILE.*NOT FOUND|COMPLETED WITHOUT.*OUTPUT|NO OUTPUT (?:FILE|PRODUCED)/i.test(upperText)) {
    return { code: 'OUTPUT_NOT_FOUND', quotaStatus: 'unknown' };
  }
  if (/OUTPUT[_ -]?INVALID|EMPTY OUTPUT|INVALID (?:MEDIA|VIDEO|MIME)|VERIFICATION FAILED|DECODE FAILED/i.test(upperText)) {
    return { code: 'OUTPUT_INVALID', quotaStatus: 'unknown' };
  }
  if (/ASSET[_ -]?PERSIST|PERSIST.*FAILED|COULD NOT (?:WRITE|PERSIST)|WRITE FAILED/i.test(upperText)) {
    return { code: 'ASSET_PERSISTENCE_FAILED', quotaStatus: 'unknown' };
  }
  if (httpStatus === 429 || /RESOURCE_EXHAUSTED|RATE[_ -]?LIMIT/i.test(upperText)) {
    if (hardQuota) {
      return { code: 'QUOTA_EXHAUSTED', quotaStatus: 'exhausted', hardQuotaLimit: 0 };
    }
    if (retryAfterSec !== undefined) {
      return { code: 'RATE_LIMITED', quotaStatus: 'unknown', retryAfterSec };
    }
    return { code: 'QUOTA_EXHAUSTED', quotaStatus: 'exhausted' };
  }
  if (/GENERATION_FAILED|GENERATION FAILED/i.test(text)) {
    return { code: 'GENERATION_FAILED', quotaStatus: 'unknown' };
  }

  return { code: 'UNKNOWN', quotaStatus: 'unknown' };
};

export class ProviderError extends Error {
  public readonly info: ProviderErrorInfo;
  public readonly provider: string;
  public readonly model?: string;
  public readonly details?: string;
  public readonly httpStatus?: number;

  constructor(
    message: string,
    options: {
      provider: string;
      model?: string;
      details?: string;
      httpStatus?: number;
      info: ProviderErrorInfo;
    }
  ) {
    super(message);
    this.name = 'ProviderError';
    this.provider = options.provider;
    this.model = options.model;
    this.details = options.details;
    this.httpStatus = options.httpStatus;
    this.info = options.info;
  }
}

export const getProviderErrorPresentation = (
  error: unknown,
  provider = 'Gemini image generation',
  model?: string
): ProviderErrorPresentation => {
  const providerError = error instanceof ProviderError ? error : undefined;
  const info = providerError?.info || classifyProviderError(providerError?.httpStatus, error);
  const local = isLocalProvider(`${provider} ${model || ''} ${providerError?.details || ''}`);
  const selectedModel = providerError?.model || model || (local ? 'the selected local model' : 'the selected Gemini model');
  const assetLabel = /video/i.test(provider) ? 'VIDEO GENERATION' : 'IMAGE GENERATION';
  const providerLabel = local ? 'Local generation' : provider;

  switch (info.code) {
    case 'QUOTA_EXHAUSTED':
      return {
        title: `${assetLabel} UNAVAILABLE`,
        message: `${provider} quota exhausted`,
        detail: info.hardQuotaLimit === 0
          ? `Your current Gemini project has 0 available free-tier requests for ${selectedModel}.`
          : `Your current Gemini project has no available quota for ${selectedModel}.`,
        action: 'Enable billing/quota, or use another Gemini project/API key with available quota.',
        retryMessage: info.hardQuotaLimit === 0
          ? 'No automatic retry is expected while the project quota remains at 0.'
          : 'No automatic retry is expected until provider quota becomes available.',
      };
    case 'RATE_LIMITED':
      return {
        title: 'GENERATION TEMPORARILY RATE LIMITED',
        message: `${provider} is temporarily rate limited`,
        detail: `The provider has asked the application to slow down for ${selectedModel}.`,
        action: 'Wait before trying again. No automatic retry will be started.',
        retryMessage: info.retryAfterSec
          ? `Retry available in ${info.retryAfterSec}s`
          : 'Retry may succeed after the provider rate limit clears.',
      };
    case 'NOT_CONFIGURED':
      return local
        ? {
            title: 'LOCAL PROVIDER NOT CONFIGURED',
            message: `${assetLabel} is not configured`,
            detail: 'The local generation backend is disabled in the server environment.',
            action: 'Enable LOCAL_IMAGE_ENABLED / LOCAL_VIDEO_ENABLED and start a compatible local backend.',
          }
        : {
            title: `${assetLabel} UNAVAILABLE`,
            message: `${provider} is not configured`,
            detail: 'GEMINI_API_KEY is not configured for this server.',
            action: 'Configure Gemini credentials in the server environment.',
          };
    case 'BACKEND_UNAVAILABLE':
      return local
        ? {
            title: 'LOCAL BACKEND OFFLINE',
            message: 'Local inference backend is not reachable',
            detail: providerError?.details || 'The configured local backend did not respond.',
            action: 'Start ComfyUI (or the configured backend) and verify the LOCAL_*_URL endpoint.',
          }
        : {
            title: `${assetLabel} UNAVAILABLE`,
            message: `${providerLabel} is not reachable`,
            detail: providerError?.details || 'The provider did not respond.',
            action: 'Check the provider endpoint and network configuration, then try again.',
          };
    case 'OUT_OF_MEMORY':
      return {
        title: 'LOCAL GENERATION FAILED — OUT OF MEMORY',
        message: `${selectedModel} ran out of GPU memory`,
        detail: 'The local model exceeded available VRAM during generation.',
        action: 'Reduce resolution or duration, use a smaller model, or close other GPU applications.',
      };
    case 'MODEL_UNAVAILABLE':
      return local
        ? {
            title: 'LOCAL MODEL NOT FOUND',
            message: `${selectedModel} is not available on the backend`,
            detail: providerError?.details || 'The configured local model checkpoint could not be found on the backend.',
            action: 'Install the required model checkpoint or select a checkpoint that is actually available.',
          }
        : {
            title: `${assetLabel} UNAVAILABLE`,
            message: `${selectedModel} is unavailable`,
            detail: 'The configured Gemini model could not be accessed by this project.',
            action: 'Check model access or select an available provider model.',
          };
    case 'AUTHENTICATION':
      return {
        title: `${assetLabel} UNAVAILABLE`,
        message: `${providerLabel} authentication failed`,
        detail: 'The provider rejected the request credentials or lacks permission for this model.',
        action: 'Check the configured provider credentials and model permissions.',
      };
    case 'CONTENT_BLOCKED':
      return {
        title: 'GENERATION BLOCKED',
        message: `${providerLabel} blocked this request`,
        detail: 'The provider did not return media for this prompt.',
        action: 'Review the prompt and remove content that may trigger provider safety filters.',
      };
    case 'INVALID_REQUEST':
      return {
        title: 'GENERATION REQUEST INVALID',
        message: `${providerLabel} rejected the generation request`,
        detail: 'The prompt or generation parameters were not accepted.',
        action: 'Review the prompt and selected generation settings.',
      };
    case 'TIMEOUT':
      return {
        title: 'GENERATION TIMED OUT',
        message: `${providerLabel} did not complete in time`,
        detail: providerError?.details || 'No generated media was returned before the timeout expired.',
        action: local
          ? 'The local GPU took longer than LOCAL_VIDEO_TIMEOUT_SEC. Try again with a shorter duration or lower resolution, or raise the timeout in the server environment.'
          : 'Try again with a shorter duration or lower resolution. No automatic retry will be started.',
      };
    case 'COMFYUI_WORKFLOW_REJECTED':
      return {
        title: 'LOCAL WORKFLOW REJECTED',
        message: 'ComfyUI rejected the local generation workflow',
        detail: providerError?.details || 'The submitted workflow was not accepted by the local backend.',
        action: 'Check the ComfyUI error details and verify the installed nodes and model names match the workflow.',
      };
    case 'GPU_RUNTIME_ERROR':
      return {
        title: 'LOCAL GPU RUNTIME ERROR',
        message: 'The local GPU failed during generation',
        detail: providerError?.details || 'ComfyUI/PyTorch reported a GPU runtime failure.',
        action: 'Restart ComfyUI, close other GPU applications, and check the ComfyUI log. If it recurs, reduce resolution or frame count.',
      };
    case 'OUTPUT_NOT_FOUND':
      return {
        title: 'LOCAL OUTPUT NOT FOUND',
        message: 'ComfyUI completed without producing an output file',
        detail: providerError?.details || 'No output file was reported for the completed workflow.',
        action: 'Check the ComfyUI output folder and log; the workflow may have completed without saving a file.',
      };
    case 'OUTPUT_INVALID':
      return {
        title: 'LOCAL OUTPUT INVALID',
        message: 'The generated local media failed validation',
        detail: providerError?.details || 'The output file was missing, empty, or failed media verification.',
        action: 'Review the ComfyUI output and try generating again.',
      };
    case 'ASSET_PERSISTENCE_FAILED':
      return {
        title: 'LOCAL ASSET PERSISTENCE FAILED',
        message: 'The generated local media could not be persisted',
        detail: providerError?.details || 'The output was produced but could not be copied into the durable asset directory.',
        action: 'Verify the asset directory is writable and has free disk space.',
      };
    case 'GENERATION_FAILED':
      return {
        title: `${assetLabel} FAILED`,
        message: `${providerLabel} failed to produce media`,
        detail: providerError?.details || 'The provider did not return generated media.',
        action: 'Review the backend logs and generation parameters, then try again manually.',
      };
    default:
      return {
        title: `${assetLabel} FAILED`,
        message: `${providerLabel} returned an error`,
        detail: providerError?.details || 'No generated media was returned.',
        action: 'Review the provider configuration and try again manually.',
      };
  }
};
