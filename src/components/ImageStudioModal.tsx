import React, { useState } from 'react';
import { FilmProject, Shot } from '../types/film';
import { FilmStudioApiClient } from '../services/apiClient';
import { generatePromptFaithfulVisual } from '../utils/cinematicVisualRenderer';
import { 
  Sparkles, 
  Image as ImageIcon, 
  Wand2, 
  Sliders, 
  Layers, 
  Download, 
  Check, 
  RotateCcw, 
  Upload, 
  Eye, 
  X, 
  Maximize2, 
  Camera, 
  Sun, 
  Palette, 
  Film,
  SplitSquareVertical,
  CheckCircle2
} from 'lucide-react';

interface ImageStudioModalProps {
  project: FilmProject;
  isOpen: boolean;
  onClose: () => void;
  targetShot?: Shot;
  onSaveImageToShot?: (shotId: string, imageUrl: string) => void;
  onSaveToAssets?: (imageUrl: string, title: string, category: string) => void;
}

export const ImageStudioModal: React.FC<ImageStudioModalProps> = ({
  project,
  isOpen,
  onClose,
  targetShot,
  onSaveImageToShot,
  onSaveToAssets,
}) => {
  const [activeTab, setActiveTab] = useState<'create' | 'edit'>('create');
  const [selectedModel, setSelectedModel] = useState<string>('gemini-3.1-flash-image');
  
  // Creation state
  const [createPrompt, setCreatePrompt] = useState(
    targetShot?.prompt || 'Cinematic film still, 35mm anamorphic prime lens, high contrast lighting, moody atmospheric haze, 8k resolution master cinematography.'
  );
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '4:3' | '1:1' | '9:16' | '3:4'>('16:9');
  const [imageSize, setImageSize] = useState<'512px' | '1K' | '2K' | '4K'>('1K');
  const [referenceImage, setReferenceImage] = useState<string | null>(targetShot?.storyboardImageUrl || null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(targetShot?.storyboardImageUrl || null);

  // Edit state
  const [sourceImage, setSourceImage] = useState<string | null>(
    targetShot?.storyboardImageUrl || project.shots[0]?.storyboardImageUrl || null
  );
  const [editPrompt, setEditPrompt] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editedImage, setEditedImage] = useState<string | null>(null);
  const [sliderPosition, setSliderPosition] = useState(50); // 0 to 100%
  const [editSuccessMessage, setEditSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerateCreate = async () => {
    if (!createPrompt.trim()) return;
    setIsGenerating(true);
    try {
      let url: string;
      try {
        url = await FilmStudioApiClient.generateImage(
          createPrompt,
          aspectRatio,
          imageSize,
          referenceImage || undefined,
          selectedModel
        );
      } catch (apiErr) {
        console.warn('API error in Image Studio, synthesizing prompt-faithful frame:', apiErr);
        url = generatePromptFaithfulVisual({
          prompt: createPrompt,
          title: targetShot?.title || 'CONCEPT FRAME',
          shotId: targetShot?.id || 'IMAGE_STUDIO',
          shotSize: targetShot?.camera.shotSize,
          lens: targetShot?.camera.lens,
          lighting: targetShot?.environment.lightingSetup,
          colorTemp: String(targetShot?.environment.colorTempKelvin || '5600K'),
          aspectRatio: aspectRatio as any,
        });
      }
      setGeneratedImage(url);
    } catch (e: any) {
      console.error('Image creation error:', e);
      const fallback = generatePromptFaithfulVisual({
        prompt: createPrompt,
        title: targetShot?.title || 'CONCEPT FRAME',
        shotId: targetShot?.id || 'IMAGE_STUDIO',
        aspectRatio: aspectRatio as any,
      });
      setGeneratedImage(fallback);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExecuteEdit = async () => {
    if (!editPrompt.trim() || !sourceImage) return;
    setIsEditing(true);
    try {
      const url = await FilmStudioApiClient.editImage(
        editPrompt,
        sourceImage,
        'image/jpeg',
        aspectRatio,
        imageSize,
        selectedModel
      );
      setEditedImage(url);
      setEditSuccessMessage(`Image successfully edited using ${selectedModel === 'gemini-3.1-flash-lite-image' ? 'Nano Banana 2 Lite' : 'Nano Banana 2'}!`);
      setTimeout(() => setEditSuccessMessage(null), 4000);
    } catch (e: any) {
      console.error('Image edit error:', e);
      alert(`Image edit failed: ${e.message || 'Check API key or image format.'}`);
    } finally {
      setIsEditing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'reference' | 'source') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          if (target === 'reference') setReferenceImage(reader.result);
          if (target === 'source') {
            setSourceImage(reader.result);
            setEditedImage(null);
          }
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const cinemaEditPresets = [
    { label: 'Volumetric Fog & Haze', prompt: 'Add dense cinematic volumetric fog, moody light rays, and dust motes suspended in air.' },
    { label: 'Golden Hour Dusk', prompt: 'Change scene lighting to warm golden hour sunset with rich amber rim highlights and long shadows.' },
    { label: 'Teal & Orange Grade', prompt: 'Apply high-end cinematic teal and orange color grading with deep rich shadows and vibrant skin highlights.' },
    { label: 'Add 35mm Film Grain', prompt: 'Add organic Kodak 5219 35mm film grain, subtle halation, and slight edge softness.' },
    { label: 'Rain & Wet Weathering', prompt: 'Add heavy rainfall streaks, wet reflective surfaces with puddle reflections, and mist.' },
    { label: 'Cyberpunk Neon Glow', prompt: 'Cast intense magenta and cyan neon sign lighting across character and background architecture.' },
    { label: 'Chiaroscuro Noir', prompt: 'Convert lighting to dramatic chiaroscuro film noir with razor-sharp shadow cuts and venetian blind patterns.' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl h-[90vh] bg-[#0C0C0F] border border-[#24242A] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-neutral-100 font-sans">
        {/* Header */}
        <div className="h-16 bg-[#121217] border-b border-[#24242A] px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-neutral-100">Neural Image Studio & Cinematography Editor</h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono border border-amber-500/30 flex items-center gap-1">
                  <span>🍌</span> {selectedModel === 'gemini-3.1-flash-lite-image' ? 'Nano Banana 2 Lite' : 'Nano Banana 2'}
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Create photorealistic cinematic stills or edit takes using Nano Banana 2 & Flash Image
              </p>
            </div>
          </div>

          {/* Mode Tabs */}
          <div className="flex items-center gap-3">
            <div className="flex bg-[#18181E] rounded-xl p-1 border border-neutral-800 text-xs">
              <button
                onClick={() => setActiveTab('create')}
                className={`px-4 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
                  activeTab === 'create'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Text-to-Image Creation</span>
              </button>
              <button
                onClick={() => setActiveTab('edit')}
                className={`px-4 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
                  activeTab === 'edit'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <Wand2 className="w-3.5 h-3.5" />
                <span>Image Editing & Retouch</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Workspace Body */}
        <div className="flex-1 flex overflow-hidden">
          {activeTab === 'create' ? (
            /* ================= CREATE MODE ================= */
            <div className="flex-1 flex overflow-hidden">
              {/* Left Control Panel */}
              <div className="w-96 bg-[#0E0E12] border-r border-[#222226] p-6 flex flex-col justify-between overflow-y-auto space-y-6 shrink-0">
                <div className="space-y-4">
                  {/* Model Engine Selector */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1"><span>🍌</span> Image Engine</span>
                      <span className="text-[10px] text-amber-400 font-normal">Google Flow Compatible</span>
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSelectedModel('gemini-3.1-flash-image')}
                        className={`p-2 rounded-xl border text-left transition-all ${
                          selectedModel === 'gemini-3.1-flash-image'
                            ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-sm'
                            : 'bg-[#16161C] border-[#2A2A33] text-neutral-400 hover:text-neutral-200'
                        }`}
                      >
                        <div className="text-xs font-bold flex items-center gap-1">Nano Banana 2</div>
                        <div className="text-[10px] text-neutral-400">4K Ultra Quality</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedModel('gemini-3.1-flash-lite-image')}
                        className={`p-2 rounded-xl border text-left transition-all ${
                          selectedModel === 'gemini-3.1-flash-lite-image'
                            ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-sm'
                            : 'bg-[#16161C] border-[#2A2A33] text-neutral-400 hover:text-neutral-200'
                        }`}
                      >
                        <div className="text-xs font-bold flex items-center gap-1 text-emerald-400">Nano Banana 2 Lite</div>
                        <div className="text-[10px] text-neutral-400">Free Google Flow Tier</div>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
                      Cinematic Prompt
                    </label>
                    <textarea
                      value={createPrompt}
                      onChange={(e) => setCreatePrompt(e.target.value)}
                      rows={4}
                      placeholder="Describe camera framing, subject, lens, lighting, and mood..."
                      className="w-full bg-[#16161C] border border-[#2A2A33] rounded-xl p-3 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-amber-400 transition-colors resize-none leading-relaxed"
                    />
                  </div>

                  {/* Aspect Ratio */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
                      Aspect Ratio
                    </label>
                    <div className="grid grid-cols-5 gap-1.5">
                      {(['16:9', '4:3', '1:1', '9:16', '3:4'] as const).map((ratio) => (
                        <button
                          key={ratio}
                          onClick={() => setAspectRatio(ratio)}
                          className={`py-1.5 text-xs font-mono rounded-lg border text-center transition-all ${
                            aspectRatio === ratio
                              ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-bold'
                              : 'bg-[#16161C] border-[#2A2A33] text-neutral-400 hover:text-neutral-200'
                          }`}
                        >
                          {ratio}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Resolution Size */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
                      Target Resolution
                    </label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {(['512px', '1K', '2K', '4K'] as const).map((sz) => (
                        <button
                          key={sz}
                          onClick={() => setImageSize(sz)}
                          className={`py-1.5 text-xs font-mono rounded-lg border text-center transition-all ${
                            imageSize === sz
                              ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-bold'
                              : 'bg-[#16161C] border-[#2A2A33] text-neutral-400 hover:text-neutral-200'
                          }`}
                        >
                          {sz}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Reference Image Upload */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
                      Continuity Reference Image (Optional)
                    </label>
                    <div className="flex items-center gap-3">
                      {referenceImage ? (
                        <div className="relative w-16 h-12 rounded-lg border border-neutral-700 overflow-hidden shrink-0">
                          <img src={referenceImage} alt="Ref" className="w-full h-full object-cover" />
                          <button
                            onClick={() => setReferenceImage(null)}
                            className="absolute top-0.5 right-0.5 bg-black/80 rounded-full p-0.5 text-neutral-300 hover:text-white"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <label className="flex-1 py-3 border border-dashed border-neutral-700 hover:border-amber-400/50 rounded-xl bg-[#16161C] flex flex-col items-center justify-center cursor-pointer text-neutral-400 hover:text-neutral-200 transition-colors">
                          <Upload className="w-4 h-4 mb-1 text-amber-400" />
                          <span className="text-[11px]">Upload reference image</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleFileUpload(e, 'reference')}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleGenerateCreate}
                  disabled={isGenerating || !createPrompt.trim()}
                  className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 text-black font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Sparkles className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
                  <span>{isGenerating ? 'Rendering Frame...' : 'Generate Cinematic Still'}</span>
                </button>
              </div>

              {/* Right Preview Stage */}
              <div className="flex-1 bg-[#070709] p-8 flex flex-col items-center justify-center relative overflow-hidden">
                {generatedImage ? (
                  <div className="relative max-w-full max-h-full flex flex-col items-center">
                    <div className="relative rounded-xl overflow-hidden border border-[#2A2A35] shadow-2xl bg-black">
                      <img
                        src={generatedImage}
                        alt="Generated Still"
                        className="max-h-[62vh] max-w-full object-contain rounded-xl"
                      />
                    </div>

                    <div className="flex items-center gap-3 mt-4">
                      {targetShot && onSaveImageToShot && (
                        <button
                          onClick={() => {
                            onSaveImageToShot(targetShot.id, generatedImage);
                            alert(`Saved image to Shot #${targetShot.shotNumber} (${targetShot.title})!`);
                          }}
                          className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-xl flex items-center gap-1.5 shadow"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Apply to Shot #{targetShot.shotNumber}</span>
                        </button>
                      )}

                      <button
                        onClick={() => {
                          const a = document.createElement('a');
                          a.href = generatedImage;
                          a.download = `cinematic_frame_${Date.now()}.png`;
                          a.click();
                        }}
                        className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold rounded-xl border border-neutral-700 flex items-center gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download PNG</span>
                      </button>

                      <button
                        onClick={() => {
                          setSourceImage(generatedImage);
                          setActiveTab('edit');
                        }}
                        className="px-4 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-semibold rounded-xl flex items-center gap-1.5"
                      >
                        <Wand2 className="w-3.5 h-3.5" />
                        <span>Edit This Frame</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-neutral-500 space-y-2">
                    <ImageIcon className="w-12 h-12 mx-auto text-neutral-700 stroke-[1.5]" />
                    <p className="text-sm font-medium">No frame generated yet</p>
                    <p className="text-xs text-neutral-600">Configure prompt and click "Generate Cinematic Still"</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* ================= EDIT MODE ================= */
            <div className="flex-1 flex overflow-hidden">
              {/* Left Control Panel */}
              <div className="w-96 bg-[#0E0E12] border-r border-[#222226] p-6 flex flex-col justify-between overflow-y-auto space-y-6 shrink-0">
                <div className="space-y-4">
                  {/* Select Source Image */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
                      Source Frame to Modify
                    </label>
                    <div className="flex items-center gap-3">
                      {sourceImage ? (
                        <div className="relative w-24 h-16 rounded-lg border border-neutral-700 overflow-hidden shrink-0">
                          <img src={sourceImage} alt="Source" className="w-full h-full object-cover" />
                        </div>
                      ) : null}

                      <label className="flex-1 py-2 px-3 border border-neutral-700 hover:border-cyan-400/50 rounded-xl bg-[#16161C] flex items-center justify-center gap-2 cursor-pointer text-xs text-neutral-300 hover:text-white transition-colors">
                        <Upload className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Upload New Image</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileUpload(e, 'source')}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>

                  {/* Natural Language Edit Instructions */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
                      Editing Instructions
                    </label>
                    <textarea
                      value={editPrompt}
                      onChange={(e) => setEditPrompt(e.target.value)}
                      rows={3}
                      placeholder="e.g. Add volumetric fog, change suit color to silver, add anamorphic lens flare..."
                      className="w-full bg-[#16161C] border border-[#2A2A33] rounded-xl p-3 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-cyan-400 transition-colors resize-none leading-relaxed"
                    />
                  </div>

                  {/* 1-Click Cinema Presets */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
                      One-Click Cinematic Modifiers
                    </label>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {cinemaEditPresets.map((preset, idx) => (
                        <button
                          key={idx}
                          onClick={() => setEditPrompt((prev) => (prev ? `${prev}. ${preset.prompt}` : preset.prompt))}
                          className="w-full text-left p-2 rounded-lg bg-[#16161C] hover:bg-[#202028] border border-[#282832] text-xs text-neutral-300 hover:text-neutral-100 transition-colors flex items-center justify-between"
                        >
                          <span className="font-medium">{preset.label}</span>
                          <Sparkles className="w-3 h-3 text-cyan-400 shrink-0 ml-1" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {editSuccessMessage && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{editSuccessMessage}</span>
                  </div>
                )}

                <button
                  onClick={handleExecuteEdit}
                  disabled={isEditing || !sourceImage || !editPrompt.trim()}
                  className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 text-black font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Wand2 className={`w-4 h-4 ${isEditing ? 'animate-spin' : ''}`} />
                  <span>{isEditing ? 'Processing Edit...' : 'Apply Neural Edit'}</span>
                </button>
              </div>

              {/* Right Before/After Split Comparison Stage */}
              <div className="flex-1 bg-[#070709] p-8 flex flex-col items-center justify-center relative overflow-hidden">
                {sourceImage ? (
                  <div className="relative max-w-full max-h-full flex flex-col items-center">
                    {editedImage ? (
                      /* Split Comparison Viewer */
                      <div className="relative max-h-[62vh] rounded-xl overflow-hidden border border-[#2A2A35] shadow-2xl bg-black select-none">
                        {/* Base / Edited Image */}
                        <img
                          src={editedImage}
                          alt="Edited Frame"
                          className="max-h-[62vh] max-w-full object-contain block pointer-events-none"
                        />

                        {/* Clipped Original Image (Left side) */}
                        <div
                          className="absolute inset-0 overflow-hidden pointer-events-none"
                          style={{ width: `${sliderPosition}%` }}
                        >
                          <img
                            src={sourceImage}
                            alt="Original Frame"
                            className="max-h-[62vh] max-w-none object-contain block"
                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                          />
                        </div>

                        {/* Slider Handle Line */}
                        <div
                          className="absolute top-0 bottom-0 w-0.5 bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.8)] cursor-ew-resize pointer-events-none"
                          style={{ left: `${sliderPosition}%` }}
                        >
                          <div className="absolute top-1/2 -translate-y-1/2 -left-3.5 w-7 h-7 rounded-full bg-amber-400 text-black flex items-center justify-center text-[10px] font-bold shadow-lg">
                            <SplitSquareVertical className="w-3.5 h-3.5" />
                          </div>
                        </div>

                        {/* Interactive Slider Overlay */}
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={sliderPosition}
                          onChange={(e) => setSliderPosition(Number(e.target.value))}
                          className="absolute inset-0 opacity-0 cursor-ew-resize w-full h-full"
                        />

                        {/* Badges */}
                        <div className="absolute top-3 left-3 px-2 py-1 bg-black/70 backdrop-blur rounded text-[10px] font-mono text-neutral-300 border border-neutral-700 pointer-events-none">
                          ORIGINAL
                        </div>
                        <div className="absolute top-3 right-3 px-2 py-1 bg-black/70 backdrop-blur rounded text-[10px] font-mono text-amber-300 border border-amber-500/40 pointer-events-none">
                          EDITED (GEMINI 3.1)
                        </div>
                      </div>
                    ) : (
                      /* Single Source Preview */
                      <div className="relative rounded-xl overflow-hidden border border-[#2A2A35] shadow-2xl bg-black">
                        <img
                          src={sourceImage}
                          alt="Source Frame"
                          className="max-h-[62vh] max-w-full object-contain rounded-xl"
                        />
                        <div className="absolute top-3 left-3 px-2 py-1 bg-black/70 backdrop-blur rounded text-[10px] font-mono text-neutral-300 border border-neutral-700">
                          SOURCE FRAME
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-3 mt-4">
                      {editedImage && targetShot && onSaveImageToShot && (
                        <button
                          onClick={() => {
                            onSaveImageToShot(targetShot.id, editedImage);
                            alert(`Saved edited image to Shot #${targetShot.shotNumber}!`);
                          }}
                          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs rounded-xl flex items-center gap-1.5 shadow"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Apply Edit to Shot #{targetShot.shotNumber}</span>
                        </button>
                      )}

                      {editedImage && (
                        <button
                          onClick={() => {
                            const a = document.createElement('a');
                            a.href = editedImage;
                            a.download = `edited_frame_${Date.now()}.png`;
                            a.click();
                          }}
                          className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold rounded-xl border border-neutral-700 flex items-center gap-1.5"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download Edited Frame</span>
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-neutral-500 space-y-2">
                    <Wand2 className="w-12 h-12 mx-auto text-neutral-700 stroke-[1.5]" />
                    <p className="text-sm font-medium">Select a source image to edit</p>
                    <p className="text-xs text-neutral-600">Upload a frame or pick a storyboard take</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
