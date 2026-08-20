import React from 'react';
import { CameraMovement, CameraAngle, EnvironmentParameters, Shot, ShotSize } from '../types/film';
import {
  Camera,
  Check,
  Compass,
  Palette,
  RotateCcw,
  Sparkles,
  Sun,
  Users,
  Wand2,
} from 'lucide-react';

export type ShotDesignerTab = 'camera' | 'movement' | 'lighting' | 'subject' | 'style' | 'prompt';

type ShotUpdater = (updater: (prev: Shot) => Shot) => void;

type LensPreset = {
  name: string;
  focalLength: string;
  lensFamily: string;
  aperture: string;
  dof: string;
  filter: string;
  desc: string;
};

type MovementPreset = {
  label: string;
  value: CameraMovement;
  icon: string;
  desc: string;
  rig: string;
  speed: 'slow' | 'moderate' | 'fast' | 'ramped' | 'whip';
};

type LightingPreset = {
  name: string;
  setup: string;
  keyLight: string;
  keyLightType: NonNullable<EnvironmentParameters['keyLightType']>;
  keyLightAngle: NonNullable<EnvironmentParameters['keyLightAngle']>;
  fillLight: string;
  fillRatio: NonNullable<EnvironmentParameters['fillRatio']>;
  rimLight: string;
  colorTemp: string;
  colorTempKelvin: number;
  contrast: NonNullable<EnvironmentParameters['contrast']>;
  volumetricHaze: NonNullable<EnvironmentParameters['volumetricHaze']>;
  desc: string;
};

interface ShotDesignerParameterPanelProps {
  currentShot: Shot;
  activeTab: ShotDesignerTab;
  onTabChange: (tab: ShotDesignerTab) => void;
  updateShotAndSyncPrompt: ShotUpdater;
  autoSyncPrompt: boolean;
  onAutoSyncPromptChange: (enabled: boolean) => void;
  onPromptChange: (prompt: string) => void;
  handleManualCompilePrompt: () => void;
  handleAiPolishPrompt: () => void;
  isAiPolishing: boolean;
  lensPresets: LensPreset[];
  movementPresets: MovementPreset[];
  lightingPresets: LightingPreset[];
  getKelvinColorStyle: (kelvin: number) => string;
}

export const ShotDesignerParameterPanel: React.FC<ShotDesignerParameterPanelProps> = ({
  currentShot,
  activeTab,
  onTabChange,
  updateShotAndSyncPrompt,
  autoSyncPrompt,
  onAutoSyncPromptChange,
  onPromptChange,
  handleManualCompilePrompt,
  handleAiPolishPrompt,
  isAiPolishing,
  lensPresets,
  movementPresets,
  lightingPresets,
  getKelvinColorStyle,
}) => (
  <div className="flex-1 flex flex-col overflow-hidden bg-[#0E0E10]">
    {/* Department Tabs */}
    <div className="flex items-center gap-1 px-4 pt-2 border-b border-[#222225] text-xs shrink-0 overflow-x-auto bg-[#0A0A0B]">
      <button
        onClick={() => onTabChange('camera')}
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
        onClick={() => onTabChange('movement')}
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
        onClick={() => onTabChange('lighting')}
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
        onClick={() => onTabChange('subject')}
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
        onClick={() => onTabChange('style')}
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
        onClick={() => onTabChange('prompt')}
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
              {lensPresets.map((preset) => {
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
              {movementPresets.map((move) => {
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
              {lightingPresets.map((preset) => {
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
                  onChange={(e) => onAutoSyncPromptChange(e.target.checked)}
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
            onChange={(e) => onPromptChange(e.target.value)}
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
);
