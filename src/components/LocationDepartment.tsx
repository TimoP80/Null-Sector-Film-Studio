import React, { useState } from 'react';
import { Location } from '../types/film';
import { FilmStudioApiClient } from '../services/apiClient';
import { 
  MapPin, 
  Lock, 
  Unlock, 
  Sparkles, 
  Plus, 
  Image as ImageIcon, 
  Sun, 
  Palette, 
  Building2, 
  ShieldCheck 
} from 'lucide-react';

interface LocationDepartmentProps {
  locations: Location[];
  onUpdateLocation: (location: Location) => void;
  onCreateLocation: (location: Partial<Location>) => void;
}

export const LocationDepartment: React.FC<LocationDepartmentProps> = ({
  locations,
  onUpdateLocation,
  onCreateLocation,
}) => {
  const [selectedId, setSelectedId] = useState<string>(locations[0]?.id || '');
  const [isGeneratingRef, setIsGeneratingRef] = useState(false);

  const selectedLoc = locations.find(l => l.id === selectedId) || locations[0];

  const handleToggleLock = (loc: Location) => {
    onUpdateLocation({
      ...loc,
      isLocked: !loc.isLocked,
    });
  };

  const handleGenerateRef = async (loc: Location) => {
    setIsGeneratingRef(true);
    try {
      const prompt = `Cinematic wide environmental film still of ${loc.name}. ${loc.description}. Architecture: ${loc.architecture}. Atmosphere: ${loc.environment}. Lighting: ${loc.lighting}. Master cinematography, Panavision 70mm lens, Roger Deakins chiaroscuro lighting, 8K ultra-detailed film production design.`;
      const imageUrl = await FilmStudioApiClient.generateImage(prompt, '16:9');
      onUpdateLocation({
        ...loc,
        masterReferenceImage: imageUrl,
        referenceImages: [imageUrl, ...(loc.referenceImages || [])],
        isLocked: true,
      });
    } catch (e: any) {
      console.error(e);
      const fallbackUrl = `https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80`;
      onUpdateLocation({
        ...loc,
        masterReferenceImage: fallbackUrl,
        referenceImages: [fallbackUrl, ...(loc.referenceImages || [])],
        isLocked: true,
      });
    } finally {
      setIsGeneratingRef(false);
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden bg-neutral-950">
      {/* Top Header */}
      <div className="h-12 bg-neutral-900/90 border-b border-neutral-800 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 text-neutral-200 text-xs font-semibold">
          <MapPin className="w-4 h-4 text-amber-400" />
          <span>Location Department & Production Sets</span>
        </div>

        <button
          onClick={() => {
            const newLoc: Location = {
              id: `LOC_${Date.now()}`,
              name: 'INT. NEW LOCATION - NIGHT',
              description: 'Detailed description of the environment and architectural aesthetic...',
              architecture: 'Brutalist aerospace interior',
              environment: 'Pressurized cabin with ambient haze',
              timeOfDay: 'Interior Night',
              weather: 'Controlled',
              lighting: 'Cyan key with amber practicals',
              colorPalette: ['#0A1118', '#1E3A5F', '#D97706'],
              isLocked: false,
              referenceImages: [],
              continuityNotes: 'Continuity notes for this set',
            };
            onCreateLocation(newLoc);
            setSelectedId(newLoc.id);
          }}
          className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-neutral-950 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Location</span>
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left: Location Cards List */}
        <div className="w-80 bg-neutral-900/70 border-r border-neutral-800 flex flex-col shrink-0 overflow-y-auto p-3 space-y-2">
          <div className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider px-1">
            Registered Sets ({locations.length})
          </div>

          {locations.map((loc) => {
            const isSelected = loc.id === selectedId;
            return (
              <div
                key={loc.id}
                onClick={() => setSelectedId(loc.id)}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-neutral-800/90 border-amber-500/50 shadow-md'
                    : 'bg-neutral-950/70 border-neutral-800/80 hover:bg-neutral-900 text-neutral-400'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs text-neutral-200 truncate">{loc.name}</span>
                  {loc.isLocked && (
                    <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-500/40">
                      Locked
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-neutral-400 line-clamp-2">{loc.description}</p>
                <div className="flex items-center gap-2 mt-2">
                  {loc.colorPalette?.map((color, i) => (
                    <div 
                      key={i} 
                      className="w-3.5 h-3.5 rounded-full border border-neutral-700 shadow-sm shrink-0" 
                      style={{ backgroundColor: color }} 
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: Selected Location Detail */}
        {selectedLoc ? (
          <div className="flex-1 overflow-y-auto p-6 bg-neutral-950 space-y-6">
            {/* Visual Concept Banner */}
            <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl overflow-hidden shadow-xl">
              <div className="h-64 w-full bg-neutral-950 relative">
                {selectedLoc.masterReferenceImage ? (
                  <img 
                    src={selectedLoc.masterReferenceImage} 
                    alt={selectedLoc.name} 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-neutral-500">
                    <ImageIcon className="w-10 h-10 mb-2 text-neutral-600" />
                    <span className="text-xs">No Visual Reference Generated Yet</span>
                  </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/30 to-transparent pointer-events-none" />

                <div className="absolute bottom-4 left-6 right-6 flex items-end justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-amber-400">LOCATION PROFILE</span>
                      <span className="text-neutral-600">•</span>
                      <span className="text-xs text-neutral-400 font-mono">{selectedLoc.id}</span>
                    </div>
                    <h2 className="text-2xl font-black text-neutral-100 mt-1">{selectedLoc.name}</h2>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleLock(selectedLoc)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border backdrop-blur-md transition-all flex items-center gap-1.5 ${
                        selectedLoc.isLocked 
                          ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/50' 
                          : 'bg-neutral-900/90 text-neutral-300 border-neutral-700 hover:text-neutral-100'
                      }`}
                    >
                      {selectedLoc.isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                      <span>{selectedLoc.isLocked ? 'Reference Locked' : 'Lock Reference'}</span>
                    </button>

                    <button
                      onClick={() => handleGenerateRef(selectedLoc)}
                      disabled={isGeneratingRef}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-neutral-950 transition-all flex items-center gap-1.5 shadow"
                    >
                      <Sparkles className={`w-3.5 h-3.5 ${isGeneratingRef ? 'animate-spin' : ''}`} />
                      <span>{isGeneratingRef ? 'Rendering Concept...' : 'Generate Location Concept'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Form Parameters */}
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-neutral-500 uppercase tracking-wider text-[10px]">Description & Atmosphere</label>
                    <textarea
                      value={selectedLoc.description}
                      onChange={(e) => onUpdateLocation({ ...selectedLoc, description: e.target.value })}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-neutral-200 text-xs focus:border-amber-500 focus:outline-none"
                      rows={2}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-neutral-500 uppercase tracking-wider text-[10px]">Architecture Style</label>
                    <input
                      type="text"
                      value={selectedLoc.architecture}
                      onChange={(e) => onUpdateLocation({ ...selectedLoc, architecture: e.target.value })}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-neutral-200 text-xs focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-neutral-500 uppercase tracking-wider text-[10px]">Lighting Setup</label>
                    <input
                      type="text"
                      value={selectedLoc.lighting}
                      onChange={(e) => onUpdateLocation({ ...selectedLoc, lighting: e.target.value })}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-neutral-200 text-xs focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-neutral-500 uppercase tracking-wider text-[10px]">Time of Day & Environment</label>
                    <input
                      type="text"
                      value={selectedLoc.timeOfDay}
                      onChange={(e) => onUpdateLocation({ ...selectedLoc, timeOfDay: e.target.value })}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-neutral-200 text-xs focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-neutral-500 uppercase tracking-wider text-[10px]">Weather / Atmosphere</label>
                    <input
                      type="text"
                      value={selectedLoc.weather}
                      onChange={(e) => onUpdateLocation({ ...selectedLoc, weather: e.target.value })}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-neutral-200 text-xs focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1 md:col-span-2">
                    <label className="text-neutral-500 uppercase tracking-wider text-[10px]">Continuity Notes</label>
                    <textarea
                      value={selectedLoc.continuityNotes}
                      onChange={(e) => onUpdateLocation({ ...selectedLoc, continuityNotes: e.target.value })}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-neutral-200 text-xs focus:border-amber-500 focus:outline-none"
                      rows={2}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
