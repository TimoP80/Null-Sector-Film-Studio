export type ProjectStatus = 'development' | 'pre-production' | 'production' | 'post-production' | 'completed';

export type ShotStatus = 'pending' | 'generating' | 'review' | 'approved' | 'rejected';

export type ShotSize = 'extreme_wide' | 'wide' | 'full' | 'medium_wide' | 'medium' | 'medium_close_up' | 'close_up' | 'extreme_close_up' | 'macro';

export type CameraAngle = 'eye_level' | 'low_angle' | 'high_angle' | 'dutch_angle' | 'birds_eye' | 'worm_eye' | 'over_the_shoulder' | 'pov';

export type CameraMovement = 
  | 'static' 
  | 'pan' 
  | 'tilt' 
  | 'dolly_in' 
  | 'dolly_out' 
  | 'tracking' 
  | 'crane' 
  | 'handheld' 
  | 'steadicam' 
  | 'whip_pan' 
  | 'orbital' 
  | 'orbit'
  | 'zoom' 
  | 'push_in' 
  | 'pull_out'
  | 'dolly_zoom'
  | 'arc'
  | 'drone'
  | 'roll'
  | 'pedestal'
  | 'jib';

export type AssetType = 'REFERENCE' | 'IMAGE' | 'VIDEO' | 'DIALOGUE' | 'MUSIC' | 'SFX' | 'AMBIENCE' | 'SUBTITLE';

export type ProviderTier = 'free' | 'paid' | 'local';

export interface CameraParameters {
  shotSize: ShotSize;
  angle: CameraAngle;
  lens: string; // e.g. "35mm ARRI Master Prime T1.3", "85mm Portrait Prime", "Panavision 50mm Anamorphic"
  focalLength?: string; // e.g. "14mm", "18mm", "24mm", "35mm", "50mm", "85mm", "100mm", "135mm", "200mm"
  lensFamily?: string; // e.g. "ARRI Master Prime", "Cooke S4/i", "Panavision C-Series Anamorphic", "Zeiss Supreme Prime", "Kowa Prominar", "Leica Summilux-C", "Laowa Probe"
  aperture?: string; // e.g. "f/1.4", "f/2.8", "f/5.6", "T1.3", "T2.0"
  lensFilter?: string; // e.g. "1/8 Black Pro-Mist", "1/4 CineBloom", "Linear Polarizer", "Blue Streak Anamorphic Flare", "Clean / None"
  depthOfField: 'shallow' | 'deep' | 'rack_focus' | 'medium';
  position: string;
  movement: CameraMovement;
  movementSpeed?: 'slow' | 'moderate' | 'fast' | 'ramped' | 'whip';
  cameraRig?: 'technocrane' | 'dana_dolly' | 'steadicam' | 'handheld' | 'fluid_head_tripod' | 'cable_cam' | 'fpv_drone' | 'robotic_arm';
  framing: string;
  composition: string; // e.g. "Rule of thirds, strong negative space on right"
  motionBlur?: 'none' | 'subtle' | 'high' | 'cinematic 180deg';
  filmGrain?: 'none' | 'fine 35mm' | 'heavy 16mm' | 'digital clean';
  shutterAngle?: '90deg' | '180deg' | '270deg';
  exposure?: 'underexposed -1' | 'nominal' | 'overexposed +1';
  colorTemp?: string; // e.g. "3200K Tungsten", "5600K Daylight"
}

export interface SubjectParameters {
  characterIds: string[];
  pose: string;
  expression: string;
  action: string;
  wardrobe: string;
  props: string[];
}

export interface EnvironmentParameters {
  locationId: string;
  timeOfDay: string;
  weather: string;
  atmosphere: string; // e.g. "Hazy, suspended dust particles, condensation"
  backgroundActivity: string;
  lightingSetup?: string; // e.g. "Rembrandt Lighting", "3-Point Classic", "Chiaroscuro / Film Noir", "Volumetric Haze & God Rays", "Natural Golden Hour", "Edge Rim Only", "Practical Only (Neon / Consoles)", "High-Key Commercial", "Butterfly / Glamour", "Underlit Horror / Low Angle"
  keyLight: string;
  keyLightType?: 'hard_fresnel' | 'soft_diffused' | 'grid_softbox' | 'direct_sun' | 'bounce_foamcore' | 'neon_tube' | 'flicker_fire';
  keyLightAngle?: '45_camera_left' | '45_camera_right' | '90_side_profile' | 'top_down_overhead' | 'low_upward' | 'backlit_rim';
  fillLight: string;
  fillRatio?: '1:1_flat' | '2:1_subtle' | '4:1_standard' | '8:1_moody' | '16:1_noir' | 'negative_fill';
  rimLight: string;
  practicals: string;
  volumetricHaze?: 'none' | 'subtle_mist' | 'dense_fog' | 'god_rays_dust' | 'smoky_noir';
  colorTempKelvin?: number; // e.g. 3200, 5600
  lightingType?: 'high_key' | 'low_key' | 'practical' | 'rim' | 'volumetric' | 'silhouette' | 'neon' | 'moonlight' | 'emergency_lighting' | 'rembrandt' | 'split' | 'butterfly' | 'chiaroscuro';
  colorTemp: string; // e.g. "5600K Daylight balanced with 3200K warm interior"
  contrast: 'high' | 'medium' | 'low' | 'chiaroscuro';
  mood: string;
}

export interface StyleParameters {
  cinematicStyle: string; // e.g. "Neo-noir Sci-Fi, Ridley Scott aesthetic"
  colorTreatment: string; // e.g. "Teal and amber split toning, desaturated greens"
  filmStock: string; // e.g. "Kodak Vision3 500T, subtle 35mm grain"
  texture: string;
  visualReferences: string[];
}

export interface ShotTake {
  id: string;
  takeNumber: number;
  type: 'image' | 'video';
  url: string;
  prompt: string;
  provider?: string;
  model?: string;
  seed?: number;
  createdAt: string;
  approved: boolean;
  isMaster?: boolean;
  rejected?: boolean;
  notes?: string;
  durationSec?: number;
  costUsd?: number;
}

export interface Shot {
  id: string; // e.g. "TLS_FINAL_S13_SH161" or "TLS_A01_S01_SH001"
  sceneId: string;
  actId: string;
  sequenceId?: string;
  shotNumber: number;
  title: string;
  description: string;
  durationSec: number;
  status: ShotStatus;
  camera: CameraParameters;
  subject: SubjectParameters;
  environment: EnvironmentParameters;
  style: StyleParameters;
  prompt: string;
  videoPrompt?: string;
  ttsPrompt?: string;
  sfxPrompt?: string;
  musicPrompt?: string;
  storyboardImageUrl?: string;
  videoUrl?: string;
  dialogueSegmentIds: string[];
  takes: ShotTake[];
  continuityFlags: string[];
  notes?: string;
}

export interface CharacterMasterReferences {
  faceRefUrl?: string;
  fullBodyRefUrl?: string;
  wardrobeRefUrl?: string;
  propsRefUrl?: string;
  voiceSampleUrl?: string;
  emotionalStates?: Record<string, string>; // e.g. "rage": url, "grief": url
  isLocked: boolean;
}

export interface Character {
  id: string;
  name: string;
  role: 'Lead' | 'Supporting' | 'Minor' | 'Voice / AI';
  age: string;
  description: string;
  personality: string;
  appearance: string;
  clothing: string;
  hair: string;
  facialFeatures: string;
  physicalCharacteristics: string;
  voiceDescription: string;
  accent: string;
  emotionalTraits: string;
  characterArc: string;
  isLocked: boolean;
  masterReferenceImage?: string;
  referenceImages: string[];
  masterReferences?: CharacterMasterReferences;
  voiceId?: string;
  prebuiltVoiceName?: 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr';
  wardrobeContinuity?: Record<string, string>; // sceneId -> costume description
}

export interface LocationMasterReferences {
  wideRefUrl?: string;
  interiorRefUrl?: string;
  lightingVariants?: Record<string, string>; // e.g. "emergency_red": url
  isLocked: boolean;
}

export interface Location {
  id: string;
  name: string;
  description: string;
  architecture: string;
  environment: string;
  timeOfDay: string;
  weather: string;
  lighting: string;
  colorPalette: string[];
  isLocked: boolean;
  masterReferenceImage?: string;
  referenceImages: string[];
  masterReferences?: LocationMasterReferences;
  continuityNotes: string;
}

export interface DialogueTake {
  id: string;
  takeNumber: number;
  audioUrl: string;
  provider?: string;
  createdAt: string;
  approved: boolean;
  isMaster?: boolean;
}

export interface DialogueSegment {
  id: string;
  sceneId: string;
  shotId?: string;
  characterId: string;
  text: string;
  emotion: string;
  delivery: string;
  voiceName?: string;
  voiceId?: string;
  audioUrl?: string;
  status: 'pending' | 'generating' | 'approved' | 'rejected';
  durationSec?: number;
  estimatedDurationSec?: number;
  takes?: DialogueTake[];
}

export interface Scene {
  id: string; // e.g. "S01", "S02"
  actId: string;
  sequenceId?: string;
  sceneNumber: number;
  heading: string; // e.g. "INT. OBSERVATORY CONTROL ROOM - NIGHT"
  locationId: string;
  timeOfDay: string;
  weather: string;
  storyPurpose: string;
  characterIds: string[];
  dialogueIds?: string[];
  actions: string[];
  props: string[];
  continuityNotes?: string;
  shotIds: string[];
  estimatedRuntimeSec: number;
}

export interface Sequence {
  id: string;
  actId: string;
  title: string;
  description: string;
  sceneIds: string[];
}

export interface Act {
  id: string; // e.g. "ACT_I"
  number: number;
  title: string;
  description: string;
  sceneIds: string[];
}

export interface MusicCue {
  id: string;
  title: string;
  sceneId?: string;
  actId?: string;
  genre?: string;
  mood: string;
  tempo?: string; // e.g. "72 BPM"
  bpm?: number;
  key?: string; // e.g. "D minor"
  instrumentation?: string;
  instruments?: string[];
  description?: string;
  durationSec: number;
  emotionalPurpose?: string;
  intensity?: number;
  audioUrl?: string;
  status?: 'pending' | 'generating' | 'ready';
  provider?: string;
}

export interface SFXCue {
  id: string;
  shotId?: string;
  sceneId?: string;
  category: 'ambience' | 'footsteps' | 'impacts' | 'machinery' | 'weapons' | 'environmental' | 'ui' | 'risers' | string;
  name: string;
  description: string;
  durationSec: number;
  audioUrl?: string;
  volume?: number; // 0 to 1
  isProcedural?: boolean;
}

export interface TimelineClip {
  id: string;
  trackId: string;
  assetId?: string;
  sourceAssetId?: string;
  assetType?: 'shot_video' | 'shot_image' | 'dialogue' | 'sfx' | 'music' | 'subtitle' | string;
  type?: string;
  name: string;
  startSec?: number;
  startTimeSec?: number;
  durationSec: number;
  sourceStartSec?: number;
  inPointSec?: number;
  outPointSec?: number;
  volume?: number; // 0 to 1
  fadeInSec?: number;
  fadeOutSec?: number;
  text?: string; // For subtitles or notes
  color?: string;
}

export interface TimelineTrack {
  id: string;
  name: string;
  type: 'video' | 'video2' | 'broll' | 'dialogue' | 'sfx' | 'ambience' | 'music' | 'subtitles' | string;
  muted?: boolean;
  isMuted?: boolean;
  solo?: boolean;
  isLocked?: boolean;
  volume?: number;
  color?: string;
  clips: TimelineClip[];
}

export interface ContinuityItem {
  id: string;
  type: 'character' | 'environment' | 'cinematography' | string;
  title: string;
  description: string;
  sceneIds?: string[];
  shotIds: string[];
  status: 'consistent' | 'warning' | 'violation' | 'flagged' | 'resolved' | string;
  details?: string;
  severity?: 'error' | 'warning' | 'info' | string;
  suggestedFix?: string;
}

export interface ProductionValidationIssue {
  id: string;
  type: 'missing_shot' | 'duplicate_id' | 'missing_character' | 'missing_reference' | 'missing_dialogue' | 'missing_video' | 'missing_asset' | 'continuity_conflict' | 'unlocked_reference';
  severity: 'error' | 'warning' | 'info';
  title: string;
  description: string;
  targetId?: string;
  section?: string;
}

export interface AssetItem {
  id: string;
  name: string;
  filename: string;
  type: AssetType;
  shotId?: string;
  sceneId?: string;
  actId?: string;
  characterId?: string;
  locationId?: string;
  provider: string;
  model: string;
  prompt?: string;
  url: string;
  thumbnailUrl?: string;
  createdAt: string;
  status: 'pending' | 'generated' | 'approved' | 'rejected';
  versionTake: number;
  durationSec?: number;
  sizeBytes?: number;
  costUsd?: number;
}

export interface GenerationJob {
  id: string;
  title: string;
  targetType: 'image' | 'video' | 'tts' | 'music' | 'sfx' | 'analysis' | 'rough_cut';
  targetId: string;
  shotId?: string;
  sceneId?: string;
  provider: string;
  model: string;
  prompt: string;
  status: 'queued' | 'generating' | 'completed' | 'failed' | 'paused' | 'cancelled';
  progress: number; // 0 to 100
  costEstimateUsd: number;
  createdAt: string;
  completedAt?: string;
  error?: string;
  resultUrl?: string;
}

export interface AIProviderOption {
  id: string;
  name: string;
  type: 'IMAGE' | 'VIDEO' | 'TTS' | 'MUSIC' | 'SFX' | 'EDITING';
  tier: ProviderTier;
  costPerUnit: number; // in USD
  unitLabel: string; // e.g. "/ image", "/ 5s video", "/ 1k chars"
  enabled: boolean;
  models: string[];
}

export interface ZeroBudgetSettings {
  enabled: boolean;
  maxBudgetUsd: number;
  spentBudgetUsd: number;
  allowPaidWithConfirmation: boolean;
}

export interface StudioBranding {
  studioName: string;
  titleCard: string;
  subtitle: string;
  tagline: string;
  logoUrl?: string;
  animationStyle: 'cyberpunk_scanline' | 'cinematic_push' | 'particle_burst' | 'signal_distortion' | 'gold_reveal';
  soundStinger: 'deep_pulse' | 'quantum_riser' | 'radio_static' | 'analog_synthesizer' | 'none';
  durationSec: number;
}

export interface AIAssistantMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  toolAction?: string;
  structuredData?: any;
}

export interface FilmProject {
  id: string;
  title: string;
  logline: string;
  genre: string;
  runtimeMin: number;
  resolution: '4K (3840x2160)' | '2K DCI (2048x1080)' | '1080p Full HD (1920x1080)' | '720p HD (1280x720)';
  frameRate: 24 | 23.976 | 25 | 29.97 | 60;
  aspectRatio: '2.39:1 (Cinemascope)' | '16:9 (Widescreen)' | '1.85:1 (Flat)' | '4:3 (Academy)' | '9:16 (Vertical)';
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
  screenplayText: string;
  acts: Act[];
  sequences?: Sequence[];
  scenes: Scene[];
  shots: Shot[];
  characters: Character[];
  locations: Location[];
  dialogueSegments: DialogueSegment[];
  musicCues: MusicCue[];
  sfxCues: SFXCue[];
  assets: AssetItem[];
  generationJobs: GenerationJob[];
  validationIssues?: ProductionValidationIssue[];
  zeroBudget: ZeroBudgetSettings;
  studioBranding: StudioBranding;
  timelineTracks: TimelineTrack[];
  continuityItems: ContinuityItem[];
  productionNotes: string[];
}

export interface ProviderStatus {
  imageProvider: { name: string; available: boolean; model: string };
  videoProvider: { name: string; available: boolean; model: string };
  ttsProvider: { name: string; available: boolean; model: string };
  musicProvider: { name: string; available: boolean; model: string };
  audioProvider: { name: string; available: boolean; model: string };
}

