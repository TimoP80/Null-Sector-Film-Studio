import React, { useState } from 'react';
import { Shot, FilmProject, CameraMovement, ShotSize, CameraAngle } from '../types/film';
import { FilmStudioApiClient } from '../services/apiClient';
import { generatePromptFaithfulVisual } from '../utils/cinematicVisualRenderer';
import {
  SlidersHorizontal,
  X,
  Check,
} from 'lucide-react';
import { ShotDesignerParameterPanel, ShotDesignerTab } from './ShotDesignerParameterPanel';
import { ShotDesignerPreviewPane } from './ShotDesignerPreviewPane';
import { ImageToVideoPanel } from './ImageToVideoPanel';
import { buildImageToVideoPrompt } from '../videoPromptBuilder';
import { videoJobRuntime } from '../videoJobRuntime';
import { VideoGenerationJob } from '../videoTypes';

interface ShotDesignerModalProps {
  shot: Shot;
  project: FilmProject;
  onClose: () => void;
  onUpdateShot: (updatedShot: Shot) => void;
}

// Preset Definitions
const LENS_PRESETS = [
  { name: '18mm Ultra-Wide', focalLength: '18mm', lensFamily: 'ARRI Master Prime', aperture: 'T1.3', dof: 'deep', filter: 'Clean / None', desc: 'Expansive environmental scale, dramatic perspective distortion' },
  { name: '24mm Wide', focalLength: '24mm', lensFamily: 'Zeiss Supreme Prime', aperture: 'T1.5', dof: 'medium', filter: 'Clean / None', desc: 'Cinematic wide, excellent establishing and master shot coverage' },
  { name: '35mm Narrative Gold', focalLength: '35mm', lensFamily: 'Cooke S4/i', aperture: 'T2.0', dof: 'shallow', filter: '1/8 Black Pro-Mist', desc: 'Standard cinematic perspective, organic skin roll-off and warm bokeh' },
  { name: '50mm Human Normal', focalLength: '50mm', lensFamily: 'Leica Summilux-C', aperture: 'T1.4', dof: 'shallow', filter: 'Clean / None', desc: 'Matches human ocular field of view, neutral geometry' },
  { name: '85mm Portrait Telephoto', focalLength: '85mm', lensFamily: 'ARRI Master Prime', aperture: 'T1.3', dof: 'shallow', filter: '1/4 CineBloom', desc: 'Creamy subject isolation, compressed background, flattering facial compression' },
  { name: '100mm Macro Close-Up', focalLength: '100mm', lensFamily: 'Zeiss Master Macro', aperture: 'T2.0', dof: 'shallow', filter: 'Clean / None', desc: 'Extreme intimate detail, tactile textures, razor-thin focal plane' },
  { name: '135mm Tight Telephoto', focalLength: '135mm', lensFamily: 'Canon K-35 Vintage', aperture: 'T1.5', dof: 'shallow', filter: '1/8 Black Pro-Mist', desc: 'Extreme background compression, intense emotional isolation' },
  { name: '35mm Panavision Anamorphic 2x', focalLength: '35mm Anamorphic', lensFamily: 'Panavision C-Series', aperture: 'T2.3', dof: 'shallow', filter: 'Blue Streak Anamorphic Flare', desc: '2.39:1 horizontal scope, oval bokeh, signature horizontal flares' },
  { name: '50mm Kowa Vintage Anamorphic', focalLength: '50mm Anamorphic', lensFamily: 'Kowa Prominar Anamorphic', aperture: 'T2.8', dof: 'shallow', filter: 'Vintage 35mm Halation', desc: 'Vintage warm flare, organic barrel distortion, nostalgic character' },
];

const MOVEMENT_PRESETS: { label: string; value: CameraMovement; icon: string; desc: string; rig: string; speed: 'slow' | 'moderate' | 'fast' | 'ramped' | 'whip' }[] = [
  { label: 'Dolly In (Push In)', value: 'dolly_in', icon: '→', desc: 'Camera glides smoothly toward subject, intensifying focus and psychological drama', rig: 'dana_dolly', speed: 'slow' },
  { label: 'Dolly Out (Pull Back)', value: 'dolly_out', icon: '←', desc: 'Camera pulls away from subject, revealing wider environment or isolation', rig: 'dana_dolly', speed: 'slow' },
  { label: 'Orbit / 360° Arc', value: 'orbit', icon: '↺', desc: 'Camera circumnavigates around subject in a sweeping circular arc', rig: 'steadicam', speed: 'moderate' },
  { label: 'Crane / Jib Boom', value: 'crane', icon: '↑', desc: 'Camera rises or descends vertically on a mechanical jib arm', rig: 'technocrane', speed: 'moderate' },
  { label: 'Tracking / Trucking', value: 'tracking', icon: '⇄', desc: 'Lateral parallel tracking shot keeping pace with subject movement', rig: 'dana_dolly', speed: 'moderate' },
  { label: 'Smooth Steadicam', value: 'steadicam', icon: '〜', desc: 'Fluid, floating body-mounted stabilization moving seamlessly through space', rig: 'steadicam', speed: 'moderate' },
  { label: 'Organic Handheld', value: 'handheld', icon: '⚡', desc: 'Raw, visceral human camera vibration conveying urgency, tension, and documentary realism', rig: 'handheld', speed: 'moderate' },
  { label: 'Static (Locked Tripod)', value: 'static', icon: '■', desc: 'Locked-off rigid fluid head tripod, formal composition with zero camera drift', rig: 'fluid_head_tripod', speed: 'slow' },
  { label: 'Pan (Horizontal Sweep)', value: 'pan', icon: '↔', desc: 'Camera rotates horizontally on a fixed axis following action', rig: 'fluid_head_tripod', speed: 'moderate' },
  { label: 'Tilt (Vertical Sweep)', value: 'tilt', icon: '↕', desc: 'Camera pivots vertically upward or downward from a fixed mount', rig: 'fluid_head_tripod', speed: 'moderate' },
  { label: 'Whip Pan', value: 'whip_pan', icon: '⏩', desc: 'High-speed rotational camera sweep creating intentional kinetic motion blur', rig: 'fluid_head_tripod', speed: 'whip' },
  { label: 'Dolly Zoom (Vertigo)', value: 'dolly_zoom', icon: '⦿', desc: 'Simultaneous dolly push and counter-zoom distorting background perspective', rig: 'technocrane', speed: 'ramped' },
  { label: 'Drone / Aerial Sweep', value: 'drone', icon: '✈', desc: 'Sweeping three-dimensional aerial trajectory with expansive altitude changes', rig: 'fpv_drone', speed: 'fast' },
];

const LIGHTING_PRESETS = [
  {
    name: 'Rembrandt Lighting (45° Key)',
    setup: 'Rembrandt Lighting',
    keyLight: 'Directional 45° Key Light with characteristic triangular cheek highlight',
    keyLightType: 'hard_fresnel' as const,
    keyLightAngle: '45_camera_left' as const,
    fillLight: 'Subtle 4:1 bounce fill on shadow side',
    fillRatio: '4:1_standard' as const,
    rimLight: 'Crisp hair rim light for background separation',
    colorTemp: '3200K Tungsten Key balanced with 5600K ambient fill',
    colorTempKelvin: 3200,
    contrast: 'high' as const,
    volumetricHaze: 'subtle_mist' as const,
    desc: 'Classic Renaissance portraiture lighting creating deep dramatic dimension'
  },
  {
    name: 'Chiaroscuro / Film Noir',
    setup: 'Chiaroscuro / Film Noir',
    keyLight: 'Hard raking side profile light with deep venetian blind cast shadows',
    keyLightType: 'hard_fresnel' as const,
    keyLightAngle: '90_side_profile' as const,
    fillLight: 'Negative fill (black solid absorbing all bounce)',
    fillRatio: '16:1_noir' as const,
    rimLight: 'Razor-sharp edge contour rim',
    colorTemp: '4300K Cool White with deep inky blacks',
    colorTempKelvin: 4300,
    contrast: 'chiaroscuro' as const,
    volumetricHaze: 'smoky_noir' as const,
    desc: 'Extreme contrast, bold silhouettes, deep dramatic psychological tension'
  },
  {
    name: '3-Point Classic Cinematic',
    setup: '3-Point Classic Cinematic',
    keyLight: 'Soft 8x8 diffused book light at 45 degrees',
    keyLightType: 'grid_softbox' as const,
    keyLightAngle: '45_camera_left' as const,
    fillLight: 'Soft 2:1 diffused beadboard fill',
    fillRatio: '2:1_subtle' as const,
    rimLight: 'Balanced shoulder and hair kicker',
    colorTemp: '5600K Natural Daylight balanced',
    colorTempKelvin: 5600,
    contrast: 'medium' as const,
    volumetricHaze: 'none' as const,
    desc: 'Standard commercial & narrative studio lighting with balanced clarity'
  },
  {
    name: 'Volumetric Haze & God Rays',
    setup: 'Volumetric Haze & God Rays',
    keyLight: 'High-intensity directional beam slicing through dense atmospheric particles',
    keyLightType: 'hard_fresnel' as const,
    keyLightAngle: 'top_down_overhead' as const,
    fillLight: 'Ambient volumetric atmospheric scatter',
    fillRatio: '8:1_moody' as const,
    rimLight: 'Volumetric light cone wrap',
    colorTemp: '5600K Cyan HMI daylight beam',
    colorTempKelvin: 5600,
    contrast: 'high' as const,
    volumetricHaze: 'god_rays_dust' as const,
    desc: 'Visible shafts of volumetric light cutting through micro-suspended dust motes'
  },
  {
    name: 'Golden Hour (3200K Low Sun)',
    setup: 'Natural Golden Hour',
    keyLight: 'Low-angle warm amber sunlight raking across the scene',
    keyLightType: 'direct_sun' as const,
    keyLightAngle: '45_camera_right' as const,
    fillLight: 'Deep blue sky ambient bounce fill',
    fillRatio: '4:1_standard' as const,
    rimLight: 'Blazing golden rim halo',
    colorTemp: '2800K Warm Golden Sunset / Dusk',
    colorTempKelvin: 2800,
    contrast: 'medium' as const,
    volumetricHaze: 'subtle_mist' as const,
    desc: 'Natural low-angled sunset illumination with long warm shadows'
  },
  {
    name: 'Cyberpunk Practical & Neon',
    setup: 'Practical Only (Neon & Displays)',
    keyLight: 'Multi-point glowing cyan HUD screens and magenta neon tube fixtures',
    keyLightType: 'neon_tube' as const,
    keyLightAngle: '90_side_profile' as const,
    fillLight: 'Pulsing amber telemetry dashboard glow',
    fillRatio: '8:1_moody' as const,
    rimLight: 'Dual-tone teal and magenta rim highlights',
    colorTemp: '10000K Cool Cyan split with 2000K Neon Pink',
    colorTempKelvin: 10000,
    contrast: 'high' as const,
    volumetricHaze: 'dense_fog' as const,
    desc: 'Vibrant motivated practicals, saturated split-tone neon accents'
  },
  {
    name: 'Edge Rim & Silhouette Only',
    setup: 'Edge Rim & Silhouette Only',
    keyLight: 'Subject entirely unlit in silhouette (zero frontal key)',
    keyLightType: 'bounce_foamcore' as const,
    keyLightAngle: 'backlit_rim' as const,
    fillLight: 'Zero frontal fill (pure negative fill)',
    fillRatio: '16:1_noir' as const,
    rimLight: 'Blinding 2-stop overexposed white edge silhouette backlight',
    colorTemp: '6500K Overcast White Backlight',
    colorTempKelvin: 6500,
    contrast: 'chiaroscuro' as const,
    volumetricHaze: 'subtle_mist' as const,
    desc: 'Dramatic contour silhouette outlining subject shape against light background'
  }
];

export const ShotDesignerModal: React.FC<ShotDesignerModalProps> = ({
  shot,
  project,
  onClose,
  onUpdateShot,
}) => {
  const [currentShot, setCurrentShot] = useState<Shot>({
    ...shot,
    camera: {
      ...shot.camera,
      focalLength: shot.camera.focalLength || '35mm',
      lensFamily: shot.camera.lensFamily || 'ARRI Master Prime',
      aperture: shot.camera.aperture || 'T1.3',
      lensFilter: shot.camera.lensFilter || 'Clean / None',
      movement: shot.camera.movement || 'dolly_in',
      movementSpeed: shot.camera.movementSpeed || 'slow',
      cameraRig: shot.camera.cameraRig || 'dana_dolly',
    },
    environment: {
      ...shot.environment,
      lightingSetup: shot.environment.lightingSetup || 'Rembrandt Lighting',
      keyLightType: shot.environment.keyLightType || 'hard_fresnel',
      keyLightAngle: shot.environment.keyLightAngle || '45_camera_left',
      fillRatio: shot.environment.fillRatio || '4:1_standard',
      colorTempKelvin: shot.environment.colorTempKelvin || 3200,
      volumetricHaze: shot.environment.volumetricHaze || 'subtle_mist'
    }
  });

  const [activeTab, setActiveTab] = useState<ShotDesignerTab>('camera');
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isAiPolishing, setIsAiPolishing] = useState(false);
  const [autoSyncPrompt, setAutoSyncPrompt] = useState(true);
  const [selectedModel, setSelectedModel] = useState<string>('gemini-3.1-flash-image');
  const [showImageToVideo, setShowImageToVideo] = useState(false);

  // Helper to compile all structured parameters into a cinematic prompt
  const compileCinematicPrompt = (targetShot: Shot): string => {
    const scene = project.scenes.find(s => s.id === targetShot.sceneId);
    const loc = project.locations.find(l => l.id === targetShot.environment.locationId);
    const characters = project.characters.filter(c => targetShot.subject.characterIds.includes(c.id));

    const shotSizeLabel = targetShot.camera.shotSize.replace(/_/g, ' ').toUpperCase();
    const cameraAngleLabel = targetShot.camera.angle.replace(/_/g, ' ');
    const cameraMoveLabel = targetShot.camera.movement.replace(/_/g, ' ');
    const rigLabel = targetShot.camera.cameraRig ? targetShot.camera.cameraRig.replace(/_/g, ' ') : 'precision dolly';
    const speedLabel = targetShot.camera.movementSpeed ? `${targetShot.camera.movementSpeed} ` : '';

    // Lens Details
    const lensDetails = [
      targetShot.camera.lensFamily || 'Cinema Prime',
      targetShot.camera.focalLength || targetShot.camera.lens || '35mm',
      `at ${targetShot.camera.aperture || 'T1.3'}`,
      `${targetShot.camera.depthOfField || 'shallow'} depth of field with cinematic circular bokeh`,
      targetShot.camera.lensFilter && targetShot.camera.lensFilter !== 'Clean / None' ? `optical ${targetShot.camera.lensFilter} halation` : null
    ].filter(Boolean).join(', ');

    // Movement Details
    const movementDetails = `${speedLabel}${cameraMoveLabel} camera movement on ${rigLabel}, ${cameraAngleLabel} angle, composition: ${targetShot.camera.composition || 'rule of thirds framing'}`;

    // Lighting Details
    const kelvinStr = targetShot.environment.colorTempKelvin ? `${targetShot.environment.colorTempKelvin}K` : targetShot.environment.colorTemp;
    const lightingDetails = [
      targetShot.environment.lightingSetup ? `Lighting setup: ${targetShot.environment.lightingSetup}` : null,
      targetShot.environment.keyLight ? `Key light: ${targetShot.environment.keyLight} (${targetShot.environment.keyLightType?.replace(/_/g, ' ') || 'directional'} at ${targetShot.environment.keyLightAngle?.replace(/_/g, ' ') || '45 deg'})` : null,
      targetShot.environment.fillLight ? `Fill: ${targetShot.environment.fillLight} (${targetShot.environment.fillRatio?.replace(/_/g, ' ') || 'balanced ratio'})` : null,
      targetShot.environment.rimLight ? `Rim: ${targetShot.environment.rimLight}` : null,
      targetShot.environment.practicals ? `Practicals: ${targetShot.environment.practicals}` : null,
      `Color temp: ${kelvinStr}`,
      `Contrast: ${targetShot.environment.contrast} contrast`,
      targetShot.environment.volumetricHaze && targetShot.environment.volumetricHaze !== 'none' ? `Atmosphere: ${targetShot.environment.volumetricHaze.replace(/_/g, ' ')}` : null
    ].filter(Boolean).join('. ');

    // Subject & Action
    const subjectDetails = characters.length > 0
      ? characters.map(c => `${c.name} (${targetShot.subject.expression || 'intense focus'}, wearing ${targetShot.subject.wardrobe || c.clothing})`).join(', ')
      : targetShot.subject.action || 'Subject';

    const promptParts = [
      `Cinematic ${shotSizeLabel} film still from "${project.title}"`,
      scene ? `Scene: ${scene.heading}` : '',
      `Action: ${targetShot.description || targetShot.title}`,
      `Subject: ${subjectDetails}`,
      `Optics: Shot on ${lensDetails}`,
      `Camera Kinematics: ${movementDetails}`,
      `Illumination & Gaffer: ${lightingDetails}`,
      `Location & Environment: ${loc?.name || 'Interior environment'}, ${targetShot.environment.atmosphere || 'atmospheric cinematic staging'}`,
      `Film Stock & Grade: Master ASC cinematography, ${targetShot.style.filmStock || 'Kodak Vision3 500T 35mm'}, ${targetShot.style.colorTreatment || 'cinematic color grading'}, 8K resolution, photorealistic optical precision.`
    ].filter(Boolean);

    return promptParts.join('. ');
  };

  // Auto-sync prompt when parameters change if enabled
  const updateShotAndSyncPrompt = (updater: (prev: Shot) => Shot) => {
    setCurrentShot(prev => {
      const updated = updater(prev);
      if (autoSyncPrompt) {
        const newPrompt = compileCinematicPrompt(updated);
        return { ...updated, prompt: newPrompt };
      }
      return updated;
    });
  };

  const handleManualCompilePrompt = () => {
    const newPrompt = compileCinematicPrompt(currentShot);
    setCurrentShot(prev => ({ ...prev, prompt: newPrompt }));
  };

  const handleAiPolishPrompt = async () => {
    setIsAiPolishing(true);
    try {
      const assistantPrompt = `You are a legendary Master Cinematographer (ASC) and prompt engineering expert.
Refine and elevate this technical cinematography generation prompt into a single ultra-high-fidelity master prompt (around 120-150 words) suitable for neural visual synthesis (Imagen/Veo).
Keep all exact lens specs (${currentShot.camera.focalLength}, ${currentShot.camera.aperture}, ${currentShot.camera.lensFamily}), camera motion (${currentShot.camera.movement}), lighting (${currentShot.environment.lightingSetup}, ${currentShot.environment.colorTempKelvin}K, ${currentShot.environment.contrast} contrast), and character details.

ORIGINAL PROMPT:
${currentShot.prompt}

Return ONLY the refined prompt text without intro, quotes, or markdown.`;

      const refined = await FilmStudioApiClient.askAIAssistant(assistantPrompt, project);
      if (refined && refined.trim()) {
        setCurrentShot(prev => ({ ...prev, prompt: refined.trim() }));
      }
    } catch (e) {
      console.error('AI prompt polish failed', e);
    } finally {
      setIsAiPolishing(false);
    }
  };

  const handleGenerateVisual = async () => {
    setIsGeneratingImage(true);
    const promptToUse = currentShot.prompt || compileCinematicPrompt(currentShot);
    const scene = project.scenes.find(s => s.id === currentShot.sceneId);

    try {
      let imageUrl: string;
      try {
        imageUrl = await FilmStudioApiClient.generateImage(promptToUse, '16:9', '1K', undefined, selectedModel);
      } catch (apiErr) {
        console.warn('Backend image model unavailable or error, synthesizing prompt-faithful cinematic frame:', apiErr);
        imageUrl = generatePromptFaithfulVisual({
          prompt: promptToUse,
          title: currentShot.title,
          shotId: currentShot.id,
          sceneHeading: scene?.heading,
          shotSize: currentShot.camera.shotSize,
          lens: currentShot.camera.lens || currentShot.camera.focalLength,
          lighting: currentShot.environment.lightingSetup || currentShot.environment.keyLight,
          colorTemp: String(currentShot.environment.colorTempKelvin || currentShot.environment.colorTemp || '5600K'),
          aspectRatio: '16:9'
        });
      }

      const newTake = {
        id: `take_${Date.now()}`,
        takeNumber: (currentShot.takes?.length || 0) + 1,
        type: 'image' as const,
        url: imageUrl,
        prompt: promptToUse,
        parameters: { ...currentShot.camera },
        approved: false,
        createdAt: new Date().toISOString(),
        notes: `Engine: ${selectedModel === 'gemini-3.1-flash-lite-image' ? 'Nano Banana 2 Lite' : 'Nano Banana 2'} • Lens: ${currentShot.camera.focalLength || currentShot.camera.lens} • Move: ${currentShot.camera.movement} • Lighting: ${currentShot.environment.lightingSetup || currentShot.environment.keyLight}`
      };

      const updated = {
        ...currentShot,
        storyboardImageUrl: imageUrl,
        status: 'review' as const,
        takes: [newTake, ...(currentShot.takes || [])]
      };

      setCurrentShot(updated);
      onUpdateShot(updated);
    } catch (e: any) {
      console.error('Shot visual generation error:', e);
      const fallbackUrl = generatePromptFaithfulVisual({
        prompt: promptToUse,
        title: currentShot.title,
        shotId: currentShot.id,
        sceneHeading: scene?.heading,
        shotSize: currentShot.camera.shotSize,
        lens: currentShot.camera.lens || currentShot.camera.focalLength,
        lighting: currentShot.environment.lightingSetup || currentShot.environment.keyLight,
        colorTemp: String(currentShot.environment.colorTempKelvin || currentShot.environment.colorTemp || '5600K'),
        aspectRatio: '16:9'
      });
      const updated = {
        ...currentShot,
        storyboardImageUrl: fallbackUrl,
        status: 'review' as const
      };
      setCurrentShot(updated);
      onUpdateShot(updated);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const updateTake = (takeId: string, updater: (take: Shot['takes'][number]) => Shot['takes'][number]) => {
    setCurrentShot(prev => ({
      ...prev,
      takes: (prev.takes || []).map(take => take.id === takeId ? updater(take) : take)
    }));
  };

  const handleApproveTake = (takeId: string) => {
    updateTake(takeId, take => ({ ...take, approved: true, rejected: false }));
  };

  const handleSetMasterTake = (takeId: string) => {
    setCurrentShot(prev => ({
      ...prev,
      takes: (prev.takes || []).map(take => take.id === takeId
        ? { ...take, approved: true, isMaster: true, rejected: false }
        : { ...take, isMaster: false })
    }));
  };

  const handleRejectTake = (takeId: string) => {
    updateTake(takeId, take => ({ ...take, approved: false, isMaster: false, rejected: true }));
  };

  const handleSave = () => {
    onUpdateShot(currentShot);
    onClose();
  };

  // Helper for Kelvin color gradient
  const getKelvinColorStyle = (kelvin: number) => {
    if (kelvin <= 2400) return 'bg-amber-600 text-amber-100';
    if (kelvin <= 3200) return 'bg-amber-500 text-amber-950';
    if (kelvin <= 4500) return 'bg-yellow-100 text-yellow-900';
    if (kelvin <= 6000) return 'bg-sky-100 text-sky-950';
    if (kelvin <= 7500) return 'bg-sky-300 text-sky-950';
    return 'bg-blue-500 text-blue-100';
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0A0A0B]/85 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto font-mono text-[#E0E0E0]">
      <div className="bg-[#0E0E10] border border-[#222225] rounded-sm w-full max-w-6xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="h-14 bg-[#0A0A0B] border-b border-[#222225] px-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-sm bg-[#151619] text-[#CBA135] border border-[#2A2A2D]">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-xs text-[#CBA135]">{currentShot.id}</span>
                <span className="text-[10px] text-[#8E9299]">• SCENE #{currentShot.sceneId}</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#1A1A1E] text-[#CBA135] border border-[#2A2A2D] uppercase font-bold">
                  {currentShot.camera.shotSize.replace(/_/g, ' ')}
                </span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#1A1A1E] text-cyan-400 border border-[#2A2A2D] uppercase">
                  {currentShot.camera.focalLength || currentShot.camera.lens}
                </span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#1A1A1E] text-emerald-400 border border-[#2A2A2D] uppercase">
                  {currentShot.camera.movement.replace(/_/g, ' ')}
                </span>
              </div>
              <h2 className="text-xs font-bold text-[#E0E0E0] uppercase tracking-wider truncate max-w-md">{currentShot.title}</h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-sm text-xs font-bold bg-[#CBA135] hover:bg-[#DFB548] text-black transition-colors uppercase tracking-wider shadow"
            >
              <Check className="w-3.5 h-3.5" />
              <span>APPLY & SAVE</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-sm text-[#8E9299] hover:text-[#E0E0E0] hover:bg-[#1E1F24]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Workspace Dual Columns */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          <ShotDesignerPreviewPane
            currentShot={currentShot}
            isGeneratingImage={isGeneratingImage}
            generationJobs={project.generationJobs.filter(job => job.shotId === currentShot.id)}
            onGenerateVisual={handleGenerateVisual}
            onSelectTake={(takeUrl) => setCurrentShot(prev => ({ ...prev, storyboardImageUrl: takeUrl }))}
            onApproveTake={handleApproveTake}
            onSetMasterTake={handleSetMasterTake}
            onRejectTake={handleRejectTake}
          />

          <div className="flex-1 flex flex-col overflow-hidden">
          <div className="px-4 pt-3 bg-[#0E0E10]">
            <button onClick={() => setShowImageToVideo(value => !value)} className="px-3 py-2 rounded-sm bg-cyan-950 text-cyan-300 border border-cyan-500/40 text-[10px] font-mono font-bold uppercase">
              {showImageToVideo ? 'Close Image → Video' : 'Open Image → Video'}
            </button>
          </div>
          {showImageToVideo ? <div className="p-4 overflow-y-auto"><ImageToVideoPanel shot={currentShot} continuityInstructions={project.continuityItems.filter(item => item.shotIds.includes(currentShot.id) && item.status !== 'resolved').map(item => item.description)} onUpdateShot={setCurrentShot} onQueueJob={(legacyJob) => {
              const job: VideoGenerationJob = {
                id: legacyJob.id, projectId: project.id, sceneId: legacyJob.sceneId, shotId: legacyJob.shotId,
                providerId: 'local', modelId: legacyJob.model, status: 'queued', sourceImage: currentShot.storyboardImageUrl || '',
                prompt: legacyJob.prompt, duration: 4, resolution: '480p', createdAt: legacyJob.createdAt,
                generationParameters: legacyJob.generationParameters, motionSpecification: legacyJob.motionSpecification,
                takeId: `take_${legacyJob.id}`,
              };
              videoJobRuntime.enqueue(job);
            }} /></div> : <ShotDesignerParameterPanel
            currentShot={currentShot}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            updateShotAndSyncPrompt={updateShotAndSyncPrompt}
            autoSyncPrompt={autoSyncPrompt}
            onAutoSyncPromptChange={setAutoSyncPrompt}
            onPromptChange={(prompt) => setCurrentShot(prev => ({ ...prev, prompt }))}
            handleManualCompilePrompt={handleManualCompilePrompt}
            handleAiPolishPrompt={handleAiPolishPrompt}
            isAiPolishing={isAiPolishing}
            lensPresets={LENS_PRESETS}
            movementPresets={MOVEMENT_PRESETS}
            lightingPresets={LIGHTING_PRESETS}
            getKelvinColorStyle={getKelvinColorStyle}
          />}
          </div>
        </div>
      </div>
    </div>
  );
};
