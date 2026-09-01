import { ImageToVideoProvider, VideoCapabilities, ImageToVideoRequest, VideoGenerationJob } from './videoTypes';
import { modalLtxProvider } from './modalLtxProvider';

const unavailable = (id: string, name: string): ImageToVideoProvider => {
  const capabilities: VideoCapabilities = {
    imageToVideo: false, textToVideo: false, referenceImages: false,
    startFrame: false, endFrame: false, audioGeneration: false,
    supportedResolutions: [], supportedAspectRatios: [],
  };
  return {
    id, name,
    getCapabilities: () => capabilities,
    async generate(): Promise<VideoGenerationJob> {
      throw new Error(`${name} is not configured. Configure its backend before generating.`);
    },
    async getJobStatus(): Promise<VideoGenerationJob> {
      throw new Error(`${name} is not configured.`);
    },
    async cancel(): Promise<void> { throw new Error(`${name} is not configured.`); },
  };
};

export class VideoProviderRegistry {
  private readonly providers = new Map<string, ImageToVideoProvider>();
  register(provider: ImageToVideoProvider): void { this.providers.set(provider.id, provider); }
  get(id: string): ImageToVideoProvider | undefined { return this.providers.get(id); }
  list(): ImageToVideoProvider[] { return [...this.providers.values()]; }
}

export const videoProviderRegistry = new VideoProviderRegistry();
videoProviderRegistry.register(unavailable('runway', 'Runway Gen-4.5'));
videoProviderRegistry.register(unavailable('wan', 'WAN 3.0'));
videoProviderRegistry.register(unavailable('seedance', 'Seedance 2.5'));
videoProviderRegistry.register(unavailable('kling', 'Kling'));
// Registered for explicit provider discovery, but remains unavailable until a
// real authenticated Modal HTTP endpoint is configured. The benchmark CLI is
// intentionally not invoked by the application and cannot safely be treated as
// a production API.
videoProviderRegistry.register(modalLtxProvider);
