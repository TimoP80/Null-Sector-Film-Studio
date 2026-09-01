import { ModalLtxConfig, getModalLtxConfig } from './modalLtxProvider';

export type VideoProviderChoice = 'local' | 'modal-ltx' | 'auto';

export const getVideoProviderChoice = (env: NodeJS.ProcessEnv = process.env): VideoProviderChoice => {
  const value = env.VIDEO_PROVIDER || env.LOCAL_VIDEO_PROVIDER || 'local';
  return value === 'modal' || value === 'modal-ltx' || value === 'auto' ? value === 'modal' ? 'modal-ltx' : value : 'local';
};

export const shouldUseModal = (choice: VideoProviderChoice, config: ModalLtxConfig = getModalLtxConfig()): boolean =>
  (choice === 'modal-ltx' || choice === 'auto') && config.enabled && Boolean(config.endpoint);

export const isRetryableModalFailure = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : String(error);
  return /timeout|timed out|network|fetch failed|connection|provision|capacity|worker|unavailable|temporar/i.test(message);
};

export const shouldFallbackToLocal = (
  choice: VideoProviderChoice,
  error: unknown,
  fallbackEnabled = getModalLtxConfig().enabled,
): boolean => choice === 'auto' && fallbackEnabled && isRetryableModalFailure(error);
