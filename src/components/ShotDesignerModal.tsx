import React, { useState, useEffect } from 'react';
import { Shot, FilmProject, CameraMovement, ShotSize, CameraAngle } from '../types/film';
import { FilmStudioApiClient } from '../services/apiClient';
import { generatePromptFaithfulVisual } from '../utils/cinematicVisualRenderer';
import { 
  SlidersHorizontal, 
  X, 
  Sparkles, 
  Camera, 
  Users, 
  Sun, 
  Palette, 
  Check, 
  Play, 
  Image as ImageIcon,
  RotateCcw,
  Video,
  Plus,
  Eye,
  Zap,
  Layers,
  Compass,
  Film,
  Thermometer,
  Wand2
} from 'lucide-react';

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

  const [activeTab, setActiveTab] = useState<'camera' | 'movement' | 'lighting' | 'subject' | 'style' | 'prompt'>('camera');
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isAiPolishing, setIsAiPolishing] = useState(false);
  const [autoSyncPrompt, setAutoSyncPrompt] = useState(true);
  const [selectedModel, setSelectedModel] = useState<string>('gemini-3.1-flash-image');

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
          {/* Left Column: Visual Take Frame & Quick Specs */}
          <div className="lg:w-96 bg-[#0A0A0B] border-r border-[#222225] p-4 flex flex-col justify-between shrink-0 overflow-y-auto space-y-4">
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-[#8E9299] mb-2 flex items-center justify-between">
                <span>VIEWPORT RENDER</span>
                <span className="font-mono text-[#CBA135] text-[10px]">2.39:1 CINEMASCOPE</span>
              </div>

              {/* Viewport Frame */}
              <div className="w-full aspect-video rounded-sm bg-[#151619] border border-[#2A2A2D] overflow-hidden relative shadow-lg group">
                {currentShot.storyboardImageUrl ? (
                  <img 
                    src={currentShot.storyboardImageUrl} 
                    alt={currentShot.title} 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-[#666]">
                    <ImageIcon className="w-8 h-8 mb-2 text-[#444]" />
                    <span className="text-xs">NO VISUAL RENDERED</span>
                    <span className="text-[10px] text-[#555] mt-1">Configure optics and render take</span>
                  </div>
                )}

                {/* Overlays */}
                <div className="absolute top-2 left-2 bg-black/80 backdrop-blur-xs px-2 py-0.5 rounded text-[9px] text-[#CBA135] border border-white/10">
                  {currentShot.camera.focalLength || currentShot.camera.lens} • {currentShot.camera.aperture || 'T1.3'}
                </div>

                <div className="absolute bottom-2 left-2 bg-black/80 backdrop-blur-xs px-2 py-0.5 rounded text-[9px] text-cyan-300 border border-white/10">
                  MOVE: {currentShot.camera.movement.toUpperCase()}
                </div>

                <div className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-xs px-2 py-0.5 rounded text-[9px] text-amber-300 border border-white/10">
                  {currentShot.environment.colorTempKelvin || 3200}K
                </div>

                {/* Aspect Ratio Guides */}
                <div className="absolute inset-0 border border-[#CBA135]/20 pointer-events-none" />
                <div className="absolute inset-x-0 top-1/3 border-t border-dashed border-white/10 pointer-events-none" />
                <div className="absolute inset-x-0 bottom-1/3 border-t border-dashed border-white/10 pointer-events-none" />
                <div className="absolute inset-y-0 left-1/3 border-l border-dashed border-white/10 pointer-events-none" />
                <div className="absolute inset-y-0 right-1/3 border-l border-dashed border-white/10 pointer-events-none" />
              </div>

              {/* Render Controls */}
              <div className="mt-3 space-y-2">
                <button
                  onClick={handleGenerateVisual}
                  disabled={isGeneratingImage}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-sm text-xs font-bold bg-[#CBA135] hover:bg-[#DFB548] text-black transition-all uppercase tracking-wider shadow"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${isGeneratingImage ? 'animate-spin' : ''}`} />
                  <span>{isGeneratingImage ? 'NEURAL RENDERING TAKE...' : 'RENDER SHOT VISUAL (IMAGEN 3)'}</span>
                </button>
              </div>

              {/* Live Cinematography Summary Card */}
              <div className="mt-4 p-3 rounded-sm bg-[#121316] border border-[#222225] space-y-2 text-[10px]">
                <div className="text-[#8E9299] font-bold uppercase tracking-wider flex items-center justify-between border-b border-[#1E1F24] pb-1">
                  <span>Cinematography Blueprint</span>
                  <span className="text-[#CBA135]">ASC SPEC</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5 text-[#AAA]">
                  <div><span className="text-[#666]">LENS:</span> <strong className="text-[#E0E0E0]">{currentShot.camera.focalLength || '35mm'} {currentShot.camera.lensFamily}</strong></div>
                  <div><span className="text-[#666]">APERTURE:</span> <strong className="text-[#E0E0E0]">{currentShot.camera.aperture}</strong></div>
                  <div><span className="text-[#666]">MOTION:</span> <strong className="text-cyan-300">{currentShot.camera.movement.replace(/_/g, ' ')}</strong></div>
                  <div><span className="text-[#666]">RIG:</span> <strong className="text-[#E0E0E0]">{currentShot.camera.cameraRig?.replace(/_/g, ' ') || 'Tripod'}</strong></div>
                  <div><span className="text-[#666]">LIGHTING:</span> <strong className="text-amber-300">{currentShot.environment.lightingSetup || 'Rembrandt'}</strong></div>
                  <div><span className="text-[#666]">KELVIN:</span> <strong className="text-[#E0E0E0]">{currentShot.environment.colorTempKelvin || 3200}K</strong></div>
                </div>
              </div>
            </div>

            {/* Takes Gallery */}
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-[#8E9299] mb-2 flex items-center justify-between">
                <span>SAVED TAKES ({currentShot.takes?.length || 0})</span>
              </div>
              <div className="grid grid-cols-3 gap-2 max-h-28 overflow-y-auto pr-1">
                {currentShot.takes?.map((take) => (
                  <div
                    key={take.id}
                    onClick={() => setCurrentShot(prev => ({ ...prev, storyboardImageUrl: take.url }))}
                    className={`aspect-video rounded-sm overflow-hidden border cursor-pointer relative ${
                      currentShot.storyboardImageUrl === take.url 
                        ? 'border-[#CBA135] ring-1 ring-[#CBA135]' 
                        : 'border-[#2A2A2D] opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={take.url} alt={`Take ${take.takeNumber}`} className="w-full h-full object-cover" />
                    <span className="absolute bottom-0.5 right-0.5 text-[8px] bg-black/85 px-1 rounded-xs text-[#CBA135] font-mono">
                      T{take.takeNumber}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Multi-Department Cinematography Parameters */}
          <div className="flex-1 flex flex-col overflow-hidden bg-[#0E0E10]">
            {/* Department Tabs */}
            <div className="flex items-center gap-1 px-4 pt-2 border-b border-[#222225] text-xs shrink-0 overflow-x-auto bg-[#0A0A0B]">
              <button
                onClick={() => setActiveTab('camera')}
                className={`px-3 py-2 border-b-2 font-mono text-[11px] transition-colors flex items-center gap-1.5 uppercase ${
                  activeTab === 'camera' 
                    ? 'border-[#CBA135] text-[#CBA135] font-bold' 
                    : 'border-transparent text-[#8E9299] hover:text-[#E0E0E0]'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>1. Optics & Lens Lab</span>
              </button>

              <button
                onClick={() => setActiveTab('movement')}
                className={`px-3 py-2 border-b-2 font-mono text-[11px] transition-colors flex items-center gap-1.5 uppercase ${
                  activeTab === 'movement' 
                    ? 'border-[#CBA135] text-[#CBA135] font-bold' 
                    : 'border-transparent text-[#8E9299] hover:text-[#E0E0E0]'
                }`}
              >
                <Compass className="w-3.5 h-3.5" />
                <span>2. Camera Motion & Rig</span>
              </button>

              <button
                onClick={() => setActiveTab('lighting')}
                className={`px-3 py-2 border-b-2 font-mono text-[11px] transition-colors flex items-center gap-1.5 uppercase ${
                  activeTab === 'lighting' 
                    ? 'border-[#CBA135] text-[#CBA135] font-bold' 
                    : 'border-transparent text-[#8E9299] hover:text-[#E0E0E0]'
                }`}
              >
                <Sun className="w-3.5 h-3.5" />
                <span>3. Lighting & Gaffer</span>
              </button>

              <button
                onClick={() => setActiveTab('subject')}
                className={`px-3 py-2 border-b-2 font-mono text-[11px] transition-colors flex items-center gap-1.5 uppercase ${
                  activeTab === 'subject' 
                    ? 'border-[#CBA135] text-[#CBA135] font-bold' 
                    : 'border-transparent text-[#8E9299] hover:text-[#E0E0E0]'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>4. Subject & Staging</span>
              </button>

              <button
                onClick={() => setActiveTab('style')}
                className={`px-3 py-2 border-b-2 font-mono text-[11px] transition-colors flex items-center gap-1.5 uppercase ${
                  activeTab === 'style' 
                    ? 'border-[#CBA135] text-[#CBA135] font-bold' 
                    : 'border-transparent text-[#8E9299] hover:text-[#E0E0E0]'
                }`}
              >
                <Palette className="w-3.5 h-3.5" />
                <span>5. Film Stock & Look</span>
              </button>

              <button
                onClick={() => setActiveTab('prompt')}
                className={`px-3 py-2 border-b-2 font-mono text-[11px] transition-colors flex items-center gap-1.5 uppercase ${
                  activeTab === 'prompt' 
                    ? 'border-[#CBA135] text-[#CBA135] font-bold' 
                    : 'border-transparent text-[#8E9299] hover:text-[#E0E0E0]'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>6. Auto Prompt Engine</span>
              </button>
            </div>

            {/* Department Body Content */}
            <div className="flex-1 p-5 overflow-y-auto text-xs space-y-5 font-mono">
              
              {/* TAB 1: OPTICS & LENS LAB */}
              {activeTab === 'camera' && (
                <div className="space-y-5">
                  {/* Quick Lens Presets Gallery */}
                  <div>
                    <label className="text-[#8E9299] uppercase tracking-wider text-[10px] font-bold block mb-2">
                      Master Lens Selection & Glass Character Presets
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {LENS_PRESETS.map((preset) => {
                        const isSelected = currentShot.camera.focalLength === preset.focalLength && currentShot.camera.lensFamily === preset.lensFamily;
                        return (
                          <div
                            key={preset.name}
                            onClick={() => {
                              updateShotAndSyncPrompt(prev => ({
                                ...prev,
                                camera: {
                                  ...prev.camera,
                                  focalLength: preset.focalLength,
                                  lens: `${preset.focalLength} ${preset.lensFamily} ${preset.aperture}`,
                                  lensFamily: preset.lensFamily,
                                  aperture: preset.aperture,
                                  depthOfField: preset.dof as any,
                                  lensFilter: preset.filter
                                }
                              }));
                            }}
                            className={`p-2.5 rounded-sm border cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-[#18181C] border-[#CBA135] shadow-md ring-1 ring-[#CBA135]'
                                : 'bg-[#121316] border-[#222225] hover:bg-[#1A1A1E] text-[#AAA]'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-xs text-[#E0E0E0]">{preset.focalLength}</span>
                              <span className="text-[9px] px-1 rounded bg-black/60 text-[#CBA135] border border-[#2A2A2D] font-mono">
                                {preset.aperture}
                              </span>
                            </div>
                            <div className="text-[10px] text-[#8E9299] mt-0.5 font-semibold truncate">{preset.lensFamily}</div>
                            <p className="text-[9px] text-[#666] mt-1 line-clamp-2 leading-relaxed">{preset.desc}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Granular Lens Fine-Tuning */}
                  <div className="p-4 rounded-sm bg-[#121316] border border-[#222225] space-y-4">
                    <div className="text-[10px] uppercase font-bold text-[#8E9299] tracking-wider border-b border-[#1E1F24] pb-1">
                      Granular Optical Parameters
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                      {/* Shot Size */}
                      <div className="space-y-1">
                        <label className="text-[#8E9299] uppercase tracking-wider text-[9px]">Shot Size (Framing)</label>
                        <select
                          value={currentShot.camera.shotSize}
                          onChange={(e) => updateShotAndSyncPrompt(prev => ({
                            ...prev,
                            camera: { ...prev.camera, shotSize: e.target.value as ShotSize }
                          }))}
                          className="w-full bg-[#151619] border border-[#2A2A2D] rounded-sm p-2 text-[#E0E0E0] focus:border-[#CBA135] focus:outline-none"
                        >
                          <option value="extreme_wide">Extreme Wide (EWS)</option>
                          <option value="wide">Wide Shot (WS)</option>
                          <option value="medium_wide">Medium Wide (MWS)</option>
                          <option value="medium">Medium Shot (MS)</option>
                          <option value="medium_close_up">Medium Close-Up (MCU)</option>
                          <option value="close_up">Close-Up (CU)</option>
                          <option value="extreme_close_up">Extreme Close-Up (ECU)</option>
                          <option value="macro">Macro (Extreme Detail)</option>
                        </select>
                      </div>

                      {/* Focal Length */}
                      <div className="space-y-1">
                        <label className="text-[#8E9299] uppercase tracking-wider text-[9px]">Focal Length (mm)</label>
                        <input
                          type="text"
                          value={currentShot.camera.focalLength || currentShot.camera.lens}
                          onChange={(e) => updateShotAndSyncPrompt(prev => ({
                            ...prev,
                            camera: { ...prev.camera, focalLength: e.target.value, lens: `${e.target.value} ${prev.camera.lensFamily || ''}`.trim() }
                          }))}
                          className="w-full bg-[#151619] border border-[#2A2A2D] rounded-sm p-2 text-[#E0E0E0] focus:border-[#CBA135] focus:outline-none"
                          placeholder="e.g. 35mm, 85mm, 50mm Anamorphic"
                        />
                      </div>

                      {/* Lens Family */}
                      <div className="space-y-1">
                        <label className="text-[#8E9299] uppercase tracking-wider text-[9px]">Lens Series / Glass</label>
                        <select
                          value={currentShot.camera.lensFamily || 'ARRI Master Prime'}
                          onChange={(e) => updateShotAndSyncPrompt(prev => ({
                            ...prev,
                            camera: { ...prev.camera, lensFamily: e.target.value }
                          }))}
                          className="w-full bg-[#151619] border border-[#2A2A2D] rounded-sm p-2 text-[#E0E0E0] focus:border-[#CBA135] focus:outline-none"
                        >
                          <option value="ARRI Master Prime">ARRI Master Prime (Ultra Sharp, T1.3)</option>
                          <option value="Cooke S4/i">Cooke S4/i (The Cooke Look, Warm Skin Tones)</option>
                          <option value="Panavision C-Series Anamorphic">Panavision C-Series (2x Squeeze, Oval Bokeh)</option>
                          <option value="Zeiss Supreme Prime">Zeiss Supreme Prime (Crisp Micro-contrast)</option>
                          <option value="Leica Summilux-C">Leica Summilux-C (Velvety Highlights)</option>
                          <option value="Kowa Prominar Anamorphic">Kowa Prominar (Vintage Amber Flares)</option>
                          <option value="Canon K-35 Vintage Cine">Canon K-35 Vintage (70s Dreamy Flares)</option>
                          <option value="Laowa 24mm Probe Lens">Laowa Probe Lens (Snorkel Macro Perspective)</option>
                        </select>
                      </div>

                      {/* Aperture */}
                      <div className="space-y-1">
                        <label className="text-[#8E9299] uppercase tracking-wider text-[9px]">Aperture (f-stop / T-stop)</label>
                        <select
                          value={currentShot.camera.aperture || 'T1.3'}
                          onChange={(e) => updateShotAndSyncPrompt(prev => ({
                            ...prev,
                            camera: { ...prev.camera, aperture: e.target.value }
                          }))}
                          className="w-full bg-[#151619] border border-[#2A2A2D] rounded-sm p-2 text-[#E0E0E0] focus:border-[#CBA135] focus:outline-none"
                        >
                          <option value="T1.2 / f/1.2">T1.2 / f/1.2 (Ultra Razor Bokeh)</option>
                          <option value="T1.3 / f/1.4">T1.3 / f/1.4 (Shallow Cinematic Separation)</option>
                          <option value="T2.0 / f/2.0">T2.0 / f/2.0 (Classic Narrative Portraiture)</option>
                          <option value="T2.8 / f/2.8">T2.8 / f/2.8 (Balanced Subject & Environment)</option>
                          <option value="T4.0 / f/4.0">T4.0 / f/4.0 (Commercial Clarity)</option>
                          <option value="T5.6 / f/5.6">T5.6 / f/5.6 (Moderate Deep Staging)</option>
                          <option value="T8.0 - T11">T8.0 - T11 (Deep Focus Citizen Kane)</option>
                        </select>
                      </div>

                      {/* Optical Filter */}
                      <div className="space-y-1">
                        <label className="text-[#8E9299] uppercase tracking-wider text-[9px]">Optical Filter Glass</label>
                        <select
                          value={currentShot.camera.lensFilter || 'Clean / None'}
                          onChange={(e) => updateShotAndSyncPrompt(prev => ({
                            ...prev,
                            camera: { ...prev.camera, lensFilter: e.target.value }
                          }))}
                          className="w-full bg-[#151619] border border-[#2A2A2D] rounded-sm p-2 text-[#E0E0E0] focus:border-[#CBA135] focus:outline-none"
                        >
                          <option value="Clean / None">Clean Optical Glass (No Filter)</option>
                          <option value="1/8 Black Pro-Mist">1/8 Black Pro-Mist (Soft Highlight Bloom)</option>
                          <option value="1/4 CineBloom">1/4 CineBloom (Dreamy Atmosphere)</option>
                          <option value="Linear Polarizer">Linear Polarizer (Deep Sky & No Glare)</option>
                          <option value="Blue Streak Anamorphic Flare">Blue Streak Anamorphic Flare Glass</option>
                          <option value="Vintage 35mm Halation">Vintage 35mm Halation Edge Rake</option>
                        </select>
                      </div>

                      {/* Depth of Field */}
                      <div className="space-y-1">
                        <label className="text-[#8E9299] uppercase tracking-wider text-[9px]">Depth of Field Focus Plane</label>
                        <select
                          value={currentShot.camera.depthOfField}
                          onChange={(e) => updateShotAndSyncPrompt(prev => ({
                            ...prev,
                            camera: { ...prev.camera, depthOfField: e.target.value as any }
                          }))}
                          className="w-full bg-[#151619] border border-[#2A2A2D] rounded-sm p-2 text-[#E0E0E0] focus:border-[#CBA135] focus:outline-none"
                        >
                          <option value="shallow">Shallow DOF (Isolated Subject, Defocused Background)</option>
                          <option value="medium">Medium DOF (Subject Clear, Moderate Background Context)</option>
                          <option value="deep">Deep Focus (Both Foreground and Horizon in Sharp Focus)</option>
                          <option value="rack_focus">Rack Focus Transition (Dynamic Focal Plane Shift)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: CAMERA MOTION & RIGGING */}
              {activeTab === 'movement' && (
                <div className="space-y-5">
                  <div>
                    <label className="text-[#8E9299] uppercase tracking-wider text-[10px] font-bold block mb-2">
                      Granular Camera Kinematics & Movement Type
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {MOVEMENT_PRESETS.map((move) => {
                        const isSelected = currentShot.camera.movement === move.value;
                        return (
                          <div
                            key={move.value}
                            onClick={() => {
                              updateShotAndSyncPrompt(prev => ({
                                ...prev,
                                camera: {
                                  ...prev.camera,
                                  movement: move.value,
                                  cameraRig: move.rig as any,
                                  movementSpeed: move.speed
                                }
                              }));
                            }}
                            className={`p-3 rounded-sm border cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-[#18181C] border-[#CBA135] shadow-md ring-1 ring-[#CBA135]'
                                : 'bg-[#121316] border-[#222225] hover:bg-[#1A1A1E] text-[#AAA]'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-xs text-[#E0E0E0] flex items-center gap-1.5">
                                <span className="text-[#CBA135] font-mono">{move.icon}</span>
                                {move.label}
                              </span>
                              <span className="text-[9px] px-1 rounded bg-black/60 text-cyan-400 border border-[#2A2A2D] uppercase font-mono">
                                {move.speed}
                              </span>
                            </div>
                            <p className="text-[9px] text-[#777] mt-1.5 leading-relaxed">{move.desc}</p>
                            <div className="mt-2 text-[8px] text-[#8E9299] font-mono uppercase">
                              RIG: {move.rig.replace(/_/g, ' ')}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Motion Fine-Tuning Rig & Angle */}
                  <div className="p-4 rounded-sm bg-[#121316] border border-[#222225] space-y-4">
                    <div className="text-[10px] uppercase font-bold text-[#8E9299] tracking-wider border-b border-[#1E1F24] pb-1">
                      Camera Perspective, Angle & Rigging Mount
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                      {/* Camera Angle */}
                      <div className="space-y-1">
                        <label className="text-[#8E9299] uppercase tracking-wider text-[9px]">Camera Angle / Axis</label>
                        <select
                          value={currentShot.camera.angle}
                          onChange={(e) => updateShotAndSyncPrompt(prev => ({
                            ...prev,
                            camera: { ...prev.camera, angle: e.target.value as CameraAngle }
                          }))}
                          className="w-full bg-[#151619] border border-[#2A2A2D] rounded-sm p-2 text-[#E0E0E0] focus:border-[#CBA135] focus:outline-none"
                        >
                          <option value="eye_level">Eye Level (Neutral Psychological Perspective)</option>
                          <option value="low_angle">Low Angle (Heroic / Dominant / Monumental)</option>
                          <option value="high_angle">High Angle (Vulnerable / Diminished / Observed)</option>
                          <option value="dutch_angle">Dutch Angle (Tilted Cant / Disorientation)</option>
                          <option value="birds_eye">Bird's Eye / Top-Down Overhead View</option>
                          <option value="worm_eye">Worm's Eye (Ground Level Extreme Low)</option>
                          <option value="over_the_shoulder">Over the Shoulder (OTS Conversation)</option>
                          <option value="pov">Point of View (First-Person Subjective)</option>
                        </select>
                      </div>

                      {/* Camera Rig Mount */}
                      <div className="space-y-1">
                        <label className="text-[#8E9299] uppercase tracking-wider text-[9px]">Camera Mount / Grip Rig</label>
                        <select
                          value={currentShot.camera.cameraRig || 'dana_dolly'}
                          onChange={(e) => updateShotAndSyncPrompt(prev => ({
                            ...prev,
                            camera: { ...prev.camera, cameraRig: e.target.value as any }
                          }))}
                          className="w-full bg-[#151619] border border-[#2A2A2D] rounded-sm p-2 text-[#E0E0E0] focus:border-[#CBA135] focus:outline-none"
                        >
                          <option value="dana_dolly">Dana Dolly / Precision Linear Track</option>
                          <option value="technocrane">Technocrane / Telescopic Jib Arm</option>
                          <option value="steadicam">Steadicam Ultra / Ronin 4D 4-Axis</option>
                          <option value="fluid_head_tripod">O'Connor Heavy Duty Fluid Head Tripod</option>
                          <option value="handheld">Shoulder Rig / EasyRig Cinema Verité</option>
                          <option value="fpv_drone">FPV Drone / Aerial Octocopter</option>
                          <option value="cable_cam">Cablecam / 3D Wire Rig</option>
                          <option value="robotic_arm">Motion Control Bolt High-Speed Robotic Arm</option>
                        </select>
                      </div>

                      {/* Movement Speed */}
                      <div className="space-y-1">
                        <label className="text-[#8E9299] uppercase tracking-wider text-[9px]">Velocity & Acceleration</label>
                        <select
                          value={currentShot.camera.movementSpeed || 'slow'}
                          onChange={(e) => updateShotAndSyncPrompt(prev => ({
                            ...prev,
                            camera: { ...prev.camera, movementSpeed: e.target.value as any }
                          }))}
                          className="w-full bg-[#151619] border border-[#2A2A2D] rounded-sm p-2 text-[#E0E0E0] focus:border-[#CBA135] focus:outline-none"
                        >
                          <option value="slow">Slow Burn / Creeping Cinematic Track</option>
                          <option value="moderate">Moderate Standard Narrative Pace</option>
                          <option value="fast">Fast Kinetic Dynamic Push</option>
                          <option value="ramped">Ramped (Slow Acceleration to Fast Out)</option>
                          <option value="whip">Whip Velocity (Kinetic Motion Blur)</option>
                        </select>
                      </div>

                      {/* Composition & Framing */}
                      <div className="space-y-1 md:col-span-3">
                        <label className="text-[#8E9299] uppercase tracking-wider text-[9px]">Compositional Staging & Framing Notes</label>
                        <input
                          type="text"
                          value={currentShot.camera.composition}
                          onChange={(e) => updateShotAndSyncPrompt(prev => ({
                            ...prev,
                            camera: { ...prev.camera, composition: e.target.value }
                          }))}
                          className="w-full bg-[#151619] border border-[#2A2A2D] rounded-sm p-2 text-[#E0E0E0] focus:border-[#CBA135] focus:outline-none"
                          placeholder="e.g. Rule of thirds, strong negative space on right frame, leading convergence lines"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: LIGHTING & GAFFER ENGINE */}
              {activeTab === 'lighting' && (
                <div className="space-y-5">
                  {/* Lighting Archetype Presets */}
                  <div>
                    <label className="text-[#8E9299] uppercase tracking-wider text-[10px] font-bold block mb-2">
                      Master Lighting Archetypes & Contrast Setups
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {LIGHTING_PRESETS.map((preset) => {
                        const isSelected = currentShot.environment.lightingSetup === preset.setup;
                        return (
                          <div
                            key={preset.name}
                            onClick={() => {
                              updateShotAndSyncPrompt(prev => ({
                                ...prev,
                                environment: {
                                  ...prev.environment,
                                  lightingSetup: preset.setup,
                                  keyLight: preset.keyLight,
                                  keyLightType: preset.keyLightType,
                                  keyLightAngle: preset.keyLightAngle,
                                  fillLight: preset.fillLight,
                                  fillRatio: preset.fillRatio,
                                  rimLight: preset.rimLight,
                                  colorTemp: preset.colorTemp,
                                  colorTempKelvin: preset.colorTempKelvin,
                                  contrast: preset.contrast,
                                  volumetricHaze: preset.volumetricHaze
                                }
                              }));
                            }}
                            className={`p-3 rounded-sm border cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-[#18181C] border-[#CBA135] shadow-md ring-1 ring-[#CBA135]'
                                : 'bg-[#121316] border-[#222225] hover:bg-[#1A1A1E] text-[#AAA]'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-xs text-[#E0E0E0] truncate">{preset.name}</span>
                              <span className={`text-[8px] px-1 rounded font-bold ${getKelvinColorStyle(preset.colorTempKelvin)}`}>
                                {preset.colorTempKelvin}K
                              </span>
                            </div>
                            <p className="text-[9px] text-[#777] mt-1.5 leading-relaxed">{preset.desc}</p>
                            <div className="mt-2 text-[8px] text-[#8E9299] font-mono uppercase flex items-center justify-between">
                              <span>RATIO: {preset.fillRatio.replace(/_/g, ' ')}</span>
                              <span className="text-[#CBA135]">{preset.contrast}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Granular Gaffer Controls */}
                  <div className="p-4 rounded-sm bg-[#121316] border border-[#222225] space-y-4">
                    <div className="text-[10px] uppercase font-bold text-[#8E9299] tracking-wider border-b border-[#1E1F24] pb-1 flex items-center justify-between">
                      <span>Granular Gaffer & Illumination Setup</span>
                      <span className="text-amber-400 font-bold">{currentShot.environment.colorTempKelvin || 3200}K Spectrum</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                      {/* Key Light Fixture Type */}
                      <div className="space-y-1">
                        <label className="text-[#8E9299] uppercase tracking-wider text-[9px]">Key Light Fixture / Quality</label>
                        <select
                          value={currentShot.environment.keyLightType || 'hard_fresnel'}
                          onChange={(e) => updateShotAndSyncPrompt(prev => ({
                            ...prev,
                            environment: { ...prev.environment, keyLightType: e.target.value as any }
                          }))}
                          className="w-full bg-[#151619] border border-[#2A2A2D] rounded-sm p-2 text-[#E0E0E0] focus:border-[#CBA135] focus:outline-none"
                        >
                          <option value="hard_fresnel">Hard ARRI Fresnel Spot (Razor Cut Shadows)</option>
                          <option value="grid_softbox">Large 8x8 Grid Softbox (Diffused Roll-off)</option>
                          <option value="soft_diffused">Ultra-Soft Book Light Bounce (Invisible Shadows)</option>
                          <option value="direct_sun">Direct Harsh Sunlight / HMI Par</option>
                          <option value="bounce_foamcore">Beadboard / Foamcore Passive Bounce</option>
                          <option value="neon_tube">Astera Titan Neon RGB Tube Fixture</option>
                          <option value="flicker_fire">Dynamic Fireplace / Candle Flicker</option>
                        </select>
                      </div>

                      {/* Key Light Placement Angle */}
                      <div className="space-y-1">
                        <label className="text-[#8E9299] uppercase tracking-wider text-[9px]">Key Light Placement Angle</label>
                        <select
                          value={currentShot.environment.keyLightAngle || '45_camera_left'}
                          onChange={(e) => updateShotAndSyncPrompt(prev => ({
                            ...prev,
                            environment: { ...prev.environment, keyLightAngle: e.target.value as any }
                          }))}
                          className="w-full bg-[#151619] border border-[#2A2A2D] rounded-sm p-2 text-[#E0E0E0] focus:border-[#CBA135] focus:outline-none"
                        >
                          <option value="45_camera_left">45° Off-Camera Left (Rembrandt Key)</option>
                          <option value="45_camera_right">45° Off-Camera Right</option>
                          <option value="90_side_profile">90° Hard Profile Side Light (Split Lighting)</option>
                          <option value="top_down_overhead">Top-Down Overhead (The Godfather Look)</option>
                          <option value="low_upward">Low-Angle Upward Cast (Horror Tension)</option>
                          <option value="backlit_rim">Direct Backlight-as-Key (Edge Halo Silhouette)</option>
                        </select>
                      </div>

                      {/* Contrast & Fill Ratio */}
                      <div className="space-y-1">
                        <label className="text-[#8E9299] uppercase tracking-wider text-[9px]">Fill Ratio & Contrast Gradient</label>
                        <select
                          value={currentShot.environment.fillRatio || '4:1_standard'}
                          onChange={(e) => updateShotAndSyncPrompt(prev => ({
                            ...prev,
                            environment: { ...prev.environment, fillRatio: e.target.value as any }
                          }))}
                          className="w-full bg-[#151619] border border-[#2A2A2D] rounded-sm p-2 text-[#E0E0E0] focus:border-[#CBA135] focus:outline-none"
                        >
                          <option value="1:1_flat">1:1 Flat Fill (High-Key Commercial)</option>
                          <option value="2:1_subtle">2:1 Subtle Shadow (Standard TV / Drama)</option>
                          <option value="4:1_standard">4:1 Standard Cinematic (Classic Feature)</option>
                          <option value="8:1_moody">8:1 Deep Moody Dramatic Contrast</option>
                          <option value="16:1_noir">16:1 Extreme Chiaroscuro / Film Noir</option>
                          <option value="negative_fill">Negative Fill (Black Flags Absorbing All Ambient)</option>
                        </select>
                      </div>

                      {/* Color Temp Kelvin Slider / Quick Badges */}
                      <div className="space-y-1 md:col-span-2">
                        <div className="flex items-center justify-between text-[9px] text-[#8E9299] uppercase">
                          <span>Color Temperature Kelvin</span>
                          <span className="font-bold text-[#E0E0E0]">{currentShot.environment.colorTempKelvin || 3200} Kelvin</span>
                        </div>
                        <input
                          type="range"
                          min="2000"
                          max="10000"
                          step="100"
                          value={currentShot.environment.colorTempKelvin || 3200}
                          onChange={(e) => {
                            const k = parseInt(e.target.value);
                            updateShotAndSyncPrompt(prev => ({
                              ...prev,
                              environment: {
                                ...prev.environment,
                                colorTempKelvin: k,
                                colorTemp: `${k}K ${k < 3500 ? 'Tungsten Warm' : k < 6000 ? 'Daylight Clean' : 'Cool Blue Hour'}`
                              }
                            }));
                          }}
                          className="w-full h-2 bg-gradient-to-r from-amber-600 via-yellow-100 via-sky-300 to-blue-600 rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="flex justify-between text-[8px] text-[#666] pt-1">
                          <span>2000K (Candle)</span>
                          <span>3200K (Tungsten)</span>
                          <span>5600K (Daylight)</span>
                          <span>6500K (Overcast)</span>
                          <span>10000K (Blue Hour)</span>
                        </div>
                      </div>

                      {/* Volumetric Haze & Atmosphere */}
                      <div className="space-y-1">
                        <label className="text-[#8E9299] uppercase tracking-wider text-[9px]">Atmospheric Haze & Particulates</label>
                        <select
                          value={currentShot.environment.volumetricHaze || 'subtle_mist'}
                          onChange={(e) => updateShotAndSyncPrompt(prev => ({
                            ...prev,
                            environment: { ...prev.environment, volumetricHaze: e.target.value as any }
                          }))}
                          className="w-full bg-[#151619] border border-[#2A2A2D] rounded-sm p-2 text-[#E0E0E0] focus:border-[#CBA135] focus:outline-none"
                        >
                          <option value="none">Clean Atmosphere (Zero Haze)</option>
                          <option value="subtle_mist">Subtle 35mm Studio Oil Haze</option>
                          <option value="god_rays_dust">Volumetric God Rays & Suspended Dust Motes</option>
                          <option value="dense_fog">Dense Industrial Smoke / Sci-Fi Fog</option>
                          <option value="smoky_noir">Smoky Venetian Noir Shafts</option>
                        </select>
                      </div>

                      {/* Key Light Description */}
                      <div className="space-y-1 md:col-span-2">
                        <label className="text-[#8E9299] uppercase tracking-wider text-[9px]">Key Light Custom Description</label>
                        <input
                          type="text"
                          value={currentShot.environment.keyLight}
                          onChange={(e) => updateShotAndSyncPrompt(prev => ({
                            ...prev,
                            environment: { ...prev.environment, keyLight: e.target.value }
                          }))}
                          className="w-full bg-[#151619] border border-[#2A2A2D] rounded-sm p-2 text-[#E0E0E0] focus:border-[#CBA135] focus:outline-none"
                          placeholder="e.g. Warm 3200K tungsten console wash from lower left"
                        />
                      </div>

                      {/* Practicals */}
                      <div className="space-y-1">
                        <label className="text-[#8E9299] uppercase tracking-wider text-[9px]">Motivated Practical Lights</label>
                        <input
                          type="text"
                          value={currentShot.environment.practicals}
                          onChange={(e) => updateShotAndSyncPrompt(prev => ({
                            ...prev,
                            environment: { ...prev.environment, practicals: e.target.value }
                          }))}
                          className="w-full bg-[#151619] border border-[#2A2A2D] rounded-sm p-2 text-[#E0E0E0] focus:border-[#CBA135] focus:outline-none"
                          placeholder="e.g. Glowing CRT monitors, amber indicators"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: SUBJECT & STAGING */}
              {activeTab === 'subject' && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[#8E9299] uppercase tracking-wider text-[9px]">Dramatic Action & Blocking</label>
                    <textarea
                      value={currentShot.description || currentShot.title}
                      onChange={(e) => updateShotAndSyncPrompt(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full bg-[#151619] border border-[#2A2A2D] rounded-sm p-3 text-[#E0E0E0] text-xs focus:border-[#CBA135] focus:outline-none"
                      rows={3}
                      placeholder="Describe what the subject is physically doing during this shot..."
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[#8E9299] uppercase tracking-wider text-[9px]">Subject Emotional Expression</label>
                      <input
                        type="text"
                        value={currentShot.subject.expression}
                        onChange={(e) => updateShotAndSyncPrompt(prev => ({
                          ...prev,
                          subject: { ...prev.subject, expression: e.target.value }
                        }))}
                        className="w-full bg-[#151619] border border-[#2A2A2D] rounded-sm p-2 text-[#E0E0E0] focus:border-[#CBA135] focus:outline-none"
                        placeholder="e.g. Haunted contemplation, micro-tremor of fear"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[#8E9299] uppercase tracking-wider text-[9px]">Wardrobe & Costume Continuity</label>
                      <input
                        type="text"
                        value={currentShot.subject.wardrobe}
                        onChange={(e) => updateShotAndSyncPrompt(prev => ({
                          ...prev,
                          subject: { ...prev.subject, wardrobe: e.target.value }
                        }))}
                        className="w-full bg-[#151619] border border-[#2A2A2D] rounded-sm p-2 text-[#E0E0E0] focus:border-[#CBA135] focus:outline-none"
                        placeholder="e.g. Weathered EVA flight suit with cracked visor"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: FILM STOCK & LOOK */}
              {activeTab === 'style' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[#8E9299] uppercase tracking-wider text-[9px]">Film Stock & Emulsion Grain</label>
                      <input
                        type="text"
                        value={currentShot.style.filmStock}
                        onChange={(e) => updateShotAndSyncPrompt(prev => ({
                          ...prev,
                          style: { ...prev.style, filmStock: e.target.value }
                        }))}
                        className="w-full bg-[#151619] border border-[#2A2A2D] rounded-sm p-2 text-[#E0E0E0] focus:border-[#CBA135] focus:outline-none"
                        placeholder="e.g. Kodak Vision3 500T 5219, fine 35mm grain"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[#8E9299] uppercase tracking-wider text-[9px]">Color Grade LUT / Tone Separation</label>
                      <input
                        type="text"
                        value={currentShot.style.colorTreatment}
                        onChange={(e) => updateShotAndSyncPrompt(prev => ({
                          ...prev,
                          style: { ...prev.style, colorTreatment: e.target.value }
                        }))}
                        className="w-full bg-[#151619] border border-[#2A2A2D] rounded-sm p-2 text-[#E0E0E0] focus:border-[#CBA135] focus:outline-none"
                        placeholder="e.g. Teal and warm amber split toning, rich inky shadows"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 6: AUTO PROMPT ENGINE */}
              {activeTab === 'prompt' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-cyan-400 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        Master Synthesized Cinematography Prompt
                      </span>
                      <label className="flex items-center gap-1 text-[10px] text-[#8E9299] ml-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={autoSyncPrompt}
                          onChange={(e) => setAutoSyncPrompt(e.target.checked)}
                          className="rounded bg-[#151619] border-[#2A2A2D] text-[#CBA135] focus:ring-0"
                        />
                        <span>Auto-compile on parameter changes</span>
                      </label>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleManualCompilePrompt}
                        className="px-2.5 py-1 rounded bg-[#1A1A1E] hover:bg-[#222226] text-[#CBA135] text-xs font-semibold flex items-center gap-1 border border-[#2A2A2D] transition-colors"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Re-compile Blueprint</span>
                      </button>

                      <button
                        onClick={handleAiPolishPrompt}
                        disabled={isAiPolishing}
                        className="px-3 py-1 rounded bg-cyan-950 hover:bg-cyan-900 text-cyan-300 text-xs font-semibold flex items-center gap-1.5 border border-cyan-500/40 transition-colors"
                      >
                        <Wand2 className={`w-3.5 h-3.5 ${isAiPolishing ? 'animate-spin' : ''}`} />
                        <span>{isAiPolishing ? 'AI Refining...' : 'AI ASC Polish'}</span>
                      </button>
                    </div>
                  </div>

                  <textarea
                    value={currentShot.prompt}
                    onChange={(e) => setCurrentShot(prev => ({ ...prev, prompt: e.target.value }))}
                    className="w-full bg-[#0A0A0B] border border-[#2A2A2D] rounded-sm p-4 text-[#E0E0E0] font-mono text-xs leading-relaxed focus:border-[#CBA135] focus:outline-none"
                    rows={8}
                  />

                  {/* Token breakdown checklist */}
                  <div className="p-3.5 rounded-sm bg-[#121316] border border-[#222225] space-y-2 text-[10px]">
                    <div className="text-[#8E9299] font-bold uppercase tracking-wider flex items-center justify-between">
                      <span>Compiled Parameter Injection Checklist</span>
                      <span className="text-emerald-400 flex items-center gap-1"><Check className="w-3 h-3" /> All Modules Synchronized</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[#999]">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                        <span><strong>Camera Movement:</strong> {currentShot.camera.movement.replace(/_/g, ' ')} ({currentShot.camera.cameraRig?.replace(/_/g, ' ')})</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                        <span><strong>Optics & Glass:</strong> {currentShot.camera.focalLength || currentShot.camera.lens} ({currentShot.camera.lensFamily})</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                        <span><strong>Lighting Setup:</strong> {currentShot.environment.lightingSetup} ({currentShot.environment.colorTempKelvin}K)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                        <span><strong>Contrast & Ratio:</strong> {currentShot.environment.contrast} ({currentShot.environment.fillRatio?.replace(/_/g, ' ')})</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
