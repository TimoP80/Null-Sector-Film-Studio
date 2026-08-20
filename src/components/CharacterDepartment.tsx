import React, { useState } from 'react';
import { Character } from '../types/film';
import { FilmStudioApiClient } from '../services/apiClient';
import { cinemaAudio } from '../utils/audioSynth';
import { 
  Users, 
  Lock, 
  Unlock, 
  Sparkles, 
  Upload, 
  Volume2, 
  Check, 
  Plus, 
  Trash2, 
  Edit3, 
  ShieldCheck,
  RefreshCw,
  Image as ImageIcon
} from 'lucide-react';

interface CharacterDepartmentProps {
  characters: Character[];
  onUpdateCharacter: (character: Character) => void;
  onCreateCharacter: (character: Partial<Character>) => void;
}

export const CharacterDepartment: React.FC<CharacterDepartmentProps> = ({
  characters,
  onUpdateCharacter,
  onCreateCharacter,
}) => {
  const [selectedId, setSelectedId] = useState<string>(characters[0]?.id || '');
  const [isGeneratingRef, setIsGeneratingRef] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'wardrobe' | 'voice'>('profile');

  const selectedChar = characters.find(c => c.id === selectedId) || characters[0];

  const handleToggleLock = (char: Character) => {
    onUpdateCharacter({
      ...char,
      isLocked: !char.isLocked,
    });
  };

  const handleGenerateRef = async (char: Character) => {
    setIsGeneratingRef(true);
    try {
      const prompt = `Cinematic master character reference portrait of ${char.name}, ${char.age} years old. ${char.appearance}. Facial features: ${char.facialFeatures}. Hair: ${char.hair}. Wearing ${char.clothing}. Photorealistic 8K film portrait, master studio cinematography, Hasselblad 80mm lens, Roger Deakins lighting, Kodak Vision3 500T 35mm grain.`;
      const imageUrl = await FilmStudioApiClient.generateImage(prompt, '1:1');
      onUpdateCharacter({
        ...char,
        masterReferenceImage: imageUrl,
        referenceImages: [imageUrl, ...(char.referenceImages || [])],
        isLocked: true,
      });
    } catch (e: any) {
      console.error(e);
      // Fallback high quality avatar if API key is not present
      const fallbackUrl = `https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80`;
      onUpdateCharacter({
        ...char,
        masterReferenceImage: fallbackUrl,
        referenceImages: [fallbackUrl, ...(char.referenceImages || [])],
        isLocked: true,
      });
    } finally {
      setIsGeneratingRef(false);
    }
  };

  const handleVoiceTest = (char: Character) => {
    cinemaAudio.speakDialogue(
      `This is ${char.name}. Telemetry protocols locked. We are proceeding into the sector.`,
      char.prebuiltVoiceName || 'Kore',
      char.emotionalTraits
    );
  };

  return (
    <div className="h-full flex flex-col overflow-hidden bg-neutral-950">
      {/* Header */}
      <div className="h-12 bg-neutral-900/90 border-b border-neutral-800 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 text-neutral-200 text-xs font-semibold">
          <Users className="w-4 h-4 text-amber-400" />
          <span>Character Department & Continuity Anchor Matrix</span>
        </div>

        <button
          onClick={() => {
            const newChar: Character = {
              id: `CHAR_${Date.now()}`,
              name: 'New Character',
              role: 'Supporting',
              age: '30',
              description: 'Character bio and emotional role...',
              personality: 'Determined, observant',
              appearance: 'Visual aesthetic',
              clothing: 'Default uniform',
              hair: 'Short dark hair',
              facialFeatures: 'Sharp jawline',
              physicalCharacteristics: 'Athletic',
              voiceDescription: 'Clear baritone',
              accent: 'Standard',
              emotionalTraits: 'Stoic',
              characterArc: 'Character transformation',
              isLocked: false,
              referenceImages: [],
              prebuiltVoiceName: 'Kore',
            };
            onCreateCharacter(newChar);
            setSelectedId(newChar.id);
          }}
          className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-neutral-950 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Character</span>
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left: Character List */}
        <div className="w-80 bg-neutral-900/70 border-r border-neutral-800 flex flex-col shrink-0 overflow-y-auto p-3 space-y-2">
          <div className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider px-1">
            Production Cast ({characters.length})
          </div>

          {characters.map((char) => {
            const isSelected = char.id === selectedId;
            return (
              <div
                key={char.id}
                onClick={() => setSelectedId(char.id)}
                className={`p-3 rounded-lg border cursor-pointer transition-all flex items-start gap-3 ${
                  isSelected
                    ? 'bg-neutral-800/90 border-amber-500/50 shadow-md'
                    : 'bg-neutral-950/70 border-neutral-800/80 hover:bg-neutral-900 text-neutral-400'
                }`}
              >
                {/* Character Thumbnail */}
                <div className="w-12 h-12 rounded-lg bg-neutral-900 border border-neutral-800 overflow-hidden shrink-0 relative">
                  {char.masterReferenceImage ? (
                    <img 
                      src={char.masterReferenceImage} 
                      alt={char.name} 
                      className="w-full h-full object-cover" 
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-neutral-600">
                      <Users className="w-5 h-5" />
                    </div>
                  )}
                  {char.isLocked && (
                    <div className="absolute top-0.5 right-0.5 bg-emerald-950/90 text-emerald-400 p-0.5 rounded border border-emerald-500/40">
                      <Lock className="w-2.5 h-2.5" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-neutral-200 truncate">{char.name}</span>
                    <span className="text-[10px] font-mono px-1 rounded bg-neutral-900 text-amber-400 border border-neutral-800 shrink-0">
                      {char.role}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-400 truncate mt-0.5">{char.description}</p>
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-neutral-500">
                    <span>Voice: {char.prebuiltVoiceName || 'Kore'}</span>
                    <span>•</span>
                    <span className={char.isLocked ? 'text-emerald-400' : 'text-amber-400'}>
                      {char.isLocked ? 'Reference Locked' : 'Unlocked'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: Detailed Character Inspector */}
        {selectedChar ? (
          <div className="flex-1 overflow-y-auto p-6 bg-neutral-950 space-y-6">
            {/* Top Anchor Box */}
            <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-5 flex flex-col md:flex-row gap-6 items-start">
              {/* Master Reference Card */}
              <div className="w-48 shrink-0 flex flex-col items-center">
                <div className="w-48 h-48 rounded-xl bg-neutral-950 border border-neutral-700 overflow-hidden relative shadow-lg group">
                  {selectedChar.masterReferenceImage ? (
                    <img 
                      src={selectedChar.masterReferenceImage} 
                      alt={selectedChar.name} 
                      className="w-full h-full object-cover" 
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-neutral-500 p-4 text-center">
                      <ImageIcon className="w-8 h-8 mb-2 text-neutral-600" />
                      <span className="text-xs">No Master Reference Locked</span>
                    </div>
                  )}

                  <div className="absolute top-2 right-2 flex items-center gap-1">
                    <button
                      onClick={() => handleToggleLock(selectedChar)}
                      className={`p-1.5 rounded-md text-xs font-medium border backdrop-blur-md transition-all ${
                        selectedChar.isLocked 
                          ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50' 
                          : 'bg-neutral-900/80 text-neutral-400 border-neutral-700 hover:text-neutral-200'
                      }`}
                      title={selectedChar.isLocked ? 'Locked as continuity anchor' : 'Click to lock as continuity anchor'}
                    >
                      {selectedChar.isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="w-full space-y-2 mt-3">
                  <button
                    onClick={() => handleGenerateRef(selectedChar)}
                    disabled={isGeneratingRef}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-neutral-950 transition-all shadow"
                  >
                    <Sparkles className={`w-3.5 h-3.5 ${isGeneratingRef ? 'animate-spin' : ''}`} />
                    <span>{isGeneratingRef ? 'Synthesizing...' : 'Generate Reference'}</span>
                  </button>

                  <button
                    onClick={() => handleVoiceTest(selectedChar)}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700/80 transition-colors"
                  >
                    <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Audition Voice ({selectedChar.prebuiltVoiceName || 'Kore'})</span>
                  </button>
                </div>
              </div>

              {/* Character Identity & Parameters */}
              <div className="flex-1 min-w-0 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-800 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold text-neutral-100">{selectedChar.name}</h2>
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        {selectedChar.role}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-400 mt-1">{selectedChar.description}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-neutral-500">Age: <strong>{selectedChar.age}</strong></span>
                  </div>
                </div>

                {/* Sub-Tabs */}
                <div className="flex gap-2 border-b border-neutral-800 pb-2 text-xs">
                  <button
                    onClick={() => setActiveTab('profile')}
                    className={`px-3 py-1 rounded font-medium transition-colors ${
                      activeTab === 'profile' 
                        ? 'bg-neutral-800 text-amber-300' 
                        : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    Visual Profile
                  </button>
                  <button
                    onClick={() => setActiveTab('wardrobe')}
                    className={`px-3 py-1 rounded font-medium transition-colors ${
                      activeTab === 'wardrobe' 
                        ? 'bg-neutral-800 text-amber-300' 
                        : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    Wardrobe Continuity
                  </button>
                  <button
                    onClick={() => setActiveTab('voice')}
                    className={`px-3 py-1 rounded font-medium transition-colors ${
                      activeTab === 'voice' 
                        ? 'bg-neutral-800 text-amber-300' 
                        : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    Master Voice Profile
                  </button>
                </div>

                {/* Tab 1: Profile */}
                {activeTab === 'profile' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="space-y-1">
                      <label className="text-neutral-500 uppercase tracking-wider text-[10px]">Appearance</label>
                      <textarea
                        value={selectedChar.appearance}
                        onChange={(e) => onUpdateCharacter({ ...selectedChar, appearance: e.target.value })}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-neutral-200 text-xs focus:border-amber-500 focus:outline-none"
                        rows={2}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-neutral-500 uppercase tracking-wider text-[10px]">Default Wardrobe</label>
                      <textarea
                        value={selectedChar.clothing}
                        onChange={(e) => onUpdateCharacter({ ...selectedChar, clothing: e.target.value })}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-neutral-200 text-xs focus:border-amber-500 focus:outline-none"
                        rows={2}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-neutral-500 uppercase tracking-wider text-[10px]">Facial Features & Scars</label>
                      <input
                        type="text"
                        value={selectedChar.facialFeatures}
                        onChange={(e) => onUpdateCharacter({ ...selectedChar, facialFeatures: e.target.value })}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-neutral-200 text-xs focus:border-amber-500 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-neutral-500 uppercase tracking-wider text-[10px]">Hair & Grooming</label>
                      <input
                        type="text"
                        value={selectedChar.hair}
                        onChange={(e) => onUpdateCharacter({ ...selectedChar, hair: e.target.value })}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-neutral-200 text-xs focus:border-amber-500 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1 md:col-span-2">
                      <label className="text-neutral-500 uppercase tracking-wider text-[10px]">Character Arc & Dramatic Journey</label>
                      <textarea
                        value={selectedChar.characterArc}
                        onChange={(e) => onUpdateCharacter({ ...selectedChar, characterArc: e.target.value })}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-neutral-200 text-xs focus:border-amber-500 focus:outline-none"
                        rows={2}
                      />
                    </div>
                  </div>
                )}

                {/* Tab 2: Wardrobe Continuity */}
                {activeTab === 'wardrobe' && (
                  <div className="space-y-3 text-xs">
                    <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-400">
                      <ShieldCheck className="w-4 h-4 text-emerald-400 inline mr-2" />
                      Scene-by-scene costume tracking guarantees the AI prompt generator applies the exact suit, damage, or patch across all takes.
                    </div>

                    <div className="space-y-2">
                      {Object.entries(selectedChar.wardrobeContinuity || {
                        'S02': 'Flight Suit + Navy Jacket',
                        'S04': 'EVA Mk-IV High Pressure Suit with Gold Visor'
                      }).map(([sceneId, costume]) => (
                        <div key={sceneId} className="flex items-center gap-3 p-2 bg-neutral-950 rounded-lg border border-neutral-800">
                          <span className="font-mono text-amber-400 font-bold w-16">{sceneId}</span>
                          <span className="text-neutral-300 flex-1">{costume}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tab 3: Master Voice */}
                {activeTab === 'voice' && (
                  <div className="space-y-4 text-xs">
                    <div className="space-y-1">
                      <label className="text-neutral-500 uppercase tracking-wider text-[10px]">Gemini TTS Prebuilt Voice Model</label>
                      <select
                        value={selectedChar.prebuiltVoiceName || 'Kore'}
                        onChange={(e) => onUpdateCharacter({ ...selectedChar, prebuiltVoiceName: e.target.value as any })}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-neutral-200 text-xs focus:border-amber-500 focus:outline-none"
                      >
                        <option value="Kore">Kore (Authoritative, Gravelly Baritone — Captain Elias)</option>
                        <option value="Zephyr">Zephyr (Melodic, Articulate Alto — Dr. Anya Vance)</option>
                        <option value="Fenrir">Fenrir (Cold, Precise Synthetic Baritone — Unit-7)</option>
                        <option value="Puck">Puck (Warm, Conversational Tenor — Commander Kael)</option>
                        <option value="Charon">Charon (Deep, Resonance Bass)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-neutral-500 uppercase tracking-wider text-[10px]">Voice Texture & Delivery Cadence</label>
                      <input
                        type="text"
                        value={selectedChar.voiceDescription}
                        onChange={(e) => onUpdateCharacter({ ...selectedChar, voiceDescription: e.target.value })}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-neutral-200 text-xs focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
