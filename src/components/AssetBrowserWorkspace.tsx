import React, { useState, useMemo } from 'react';
import { FilmProject, AssetItem, AssetType, Shot } from '../types/film';
import {
  FolderOpen,
  Image as ImageIcon,
  Video,
  Mic,
  Music,
  Volume2,
  FileText,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Download,
  Plus,
  Play,
  Square,
  Eye,
  Trash2,
  Sparkles,
  ExternalLink,
  Layers,
  Upload,
  RefreshCw
} from 'lucide-react';
import { cinemaAudio } from '../utils/audioSynth';

interface AssetBrowserWorkspaceProps {
  project: FilmProject;
  onUpdateProject: (updated: FilmProject) => void;
  onNavigateToShot?: (shotId: string) => void;
}

export const AssetBrowserWorkspace: React.FC<AssetBrowserWorkspaceProps> = ({
  project,
  onUpdateProject,
  onNavigateToShot
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<AssetType | 'ALL'>('ALL');
  const [selectedAct, setSelectedAct] = useState<string>('ALL');
  const [selectedScene, setSelectedScene] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [previewAsset, setPreviewAsset] = useState<AssetItem | null>(null);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newAssetForm, setNewAssetForm] = useState({
    name: '',
    type: 'IMAGE' as AssetType,
    url: '',
    shotId: '',
    sceneId: '',
    actId: '',
    provider: 'Local / Manual Upload',
    status: 'approved' as const
  });

  // Calculate synthetic assets from project shots and dialogue if not in project.assets
  const allAssets: AssetItem[] = useMemo(() => {
    const existing = project.assets || [];
    const derived: AssetItem[] = [];

    // Derive from shots
    project.shots.forEach(shot => {
      if (shot.storyboardImageUrl && !existing.some(a => a.url === shot.storyboardImageUrl)) {
        derived.push({
          id: `AST_DERIVED_${shot.id}_IMG`,
          name: `${shot.title} (Storyboard Frame)`,
          filename: `${shot.id}_STORYBOARD.png`,
          type: 'IMAGE',
          shotId: shot.id,
          sceneId: shot.sceneId,
          actId: shot.actId,
          provider: 'Gemini Imagen / Flash Image',
          model: 'gemini-3.1-flash-lite-image',
          prompt: shot.prompt,
          url: shot.storyboardImageUrl,
          thumbnailUrl: shot.storyboardImageUrl,
          createdAt: '2026-08-12T10:00:00Z',
          status: shot.status === 'approved' ? 'approved' : 'generated',
          versionTake: 1,
          costUsd: 0.00
        });
      }
      if (shot.videoUrl && !existing.some(a => a.url === shot.videoUrl)) {
        derived.push({
          id: `AST_DERIVED_${shot.id}_VID`,
          name: `${shot.title} (Video Clip)`,
          filename: `${shot.id}_VEO.mp4`,
          type: 'VIDEO',
          shotId: shot.id,
          sceneId: shot.sceneId,
          actId: shot.actId,
          provider: 'Veo Video Generator (Veo 3.1)',
          model: 'veo-3.1-generate-preview',
          prompt: shot.videoPrompt || shot.prompt,
          url: shot.videoUrl,
          createdAt: '2026-08-12T10:00:00Z',
          status: shot.status === 'approved' ? 'approved' : 'generated',
          versionTake: 1,
          durationSec: shot.durationSec,
          costUsd: 0.00
        });
      }
    });

    // Derive character reference images
    project.characters.forEach(char => {
      if (char.masterReferenceImage && !existing.some(a => a.url === char.masterReferenceImage)) {
        derived.push({
          id: `AST_DERIVED_CHAR_${char.id}`,
          name: `${char.name} — Master Reference`,
          filename: `REF_${char.id}_MASTER.png`,
          type: 'REFERENCE',
          characterId: char.id,
          provider: 'Master Character Library',
          model: 'reference-portrait-hq',
          prompt: `${char.name}, ${char.age}, ${char.appearance}`,
          url: char.masterReferenceImage,
          thumbnailUrl: char.masterReferenceImage,
          createdAt: '2026-08-10T12:00:00Z',
          status: 'approved',
          versionTake: 1,
          costUsd: 0.00
        });
      }
    });

    // Combine and deduplicate
    const combined = [...existing, ...derived];
    return combined;
  }, [project]);

  // Filter logic
  const filteredAssets = useMemo(() => {
    return allAssets.filter(asset => {
      if (selectedType !== 'ALL' && asset.type !== selectedType) return false;
      if (selectedAct !== 'ALL' && asset.actId !== selectedAct) return false;
      if (selectedScene !== 'ALL' && asset.sceneId !== selectedScene) return false;
      if (selectedStatus !== 'ALL' && asset.status !== selectedStatus) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = asset.name.toLowerCase().includes(q);
        const matchFile = asset.filename.toLowerCase().includes(q);
        const matchShot = asset.shotId?.toLowerCase().includes(q);
        const matchPrompt = asset.prompt?.toLowerCase().includes(q);
        if (!matchName && !matchFile && !matchShot && !matchPrompt) return false;
      }
      return true;
    });
  }, [allAssets, selectedType, selectedAct, selectedScene, selectedStatus, searchQuery]);

  // Stats
  const stats = useMemo(() => {
    const counts: Record<AssetType, number> = {
      REFERENCE: 0,
      IMAGE: 0,
      VIDEO: 0,
      DIALOGUE: 0,
      MUSIC: 0,
      SFX: 0,
      AMBIENCE: 0,
      SUBTITLE: 0
    };
    let approved = 0;
    allAssets.forEach(a => {
      if (counts[a.type] !== undefined) counts[a.type]++;
      if (a.status === 'approved') approved++;
    });
    return { counts, total: allAssets.length, approved };
  }, [allAssets]);

  const handleToggleSelect = (id: string) => {
    setSelectedAssetIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedAssetIds.length === filteredAssets.length) {
      setSelectedAssetIds([]);
    } else {
      setSelectedAssetIds(filteredAssets.map(a => a.id));
    }
  };

  const handleUpdateAssetStatus = (assetId: string, status: 'approved' | 'rejected') => {
    const updated = (project.assets || []).map(a => (a.id === assetId ? { ...a, status } : a));
    // If not in project.assets, add it
    if (!project.assets?.some(a => a.id === assetId)) {
      const found = allAssets.find(a => a.id === assetId);
      if (found) {
        updated.push({ ...found, status });
      }
    }
    onUpdateProject({ ...project, assets: updated });
  };

  const handleDeleteAsset = (assetId: string) => {
    const updated = (project.assets || []).filter(a => a.id !== assetId);
    onUpdateProject({ ...project, assets: updated });
    setSelectedAssetIds(prev => prev.filter(x => x !== assetId));
  };

  const handleBatchApprove = () => {
    const updated = (project.assets || []).map(a =>
      selectedAssetIds.includes(a.id) ? { ...a, status: 'approved' as const } : a
    );
    onUpdateProject({ ...project, assets: updated });
    setSelectedAssetIds([]);
  };

  const handleAddCustomAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAssetForm.name || !newAssetForm.url) return;

    const newAsset: AssetItem = {
      id: `AST_CUSTOM_${Date.now()}`,
      name: newAssetForm.name,
      filename: `${newAssetForm.name.toLowerCase().replace(/\s+/g, '_')}.${newAssetForm.type === 'IMAGE' ? 'png' : newAssetForm.type === 'VIDEO' ? 'mp4' : 'wav'}`,
      type: newAssetForm.type,
      shotId: newAssetForm.shotId || undefined,
      sceneId: newAssetForm.sceneId || undefined,
      actId: newAssetForm.actId || undefined,
      provider: newAssetForm.provider,
      model: 'manual-import',
      url: newAssetForm.url,
      thumbnailUrl: newAssetForm.type === 'IMAGE' ? newAssetForm.url : undefined,
      createdAt: new Date().toISOString(),
      status: 'approved',
      versionTake: 1,
      costUsd: 0.00
    };

    onUpdateProject({
      ...project,
      assets: [...(project.assets || []), newAsset]
    });

    setIsAddModalOpen(false);
    setNewAssetForm({
      name: '',
      type: 'IMAGE',
      url: '',
      shotId: '',
      sceneId: '',
      actId: '',
      provider: 'Local / Manual Upload',
      status: 'approved'
    });
  };

  const handlePlayAudio = (asset: AssetItem) => {
    if (playingAudioId === asset.id) {
      cinemaAudio.stopAll();
      setPlayingAudioId(null);
      return;
    }

    cinemaAudio.stopAll();
    setPlayingAudioId(asset.id);

    if (asset.type === 'SFX') {
      cinemaAudio.playCinematicSFX('machinery', asset.name);
    } else if (asset.type === 'MUSIC') {
      cinemaAudio.playMusicDrone('suspense', 0.6);
    } else if (asset.type === 'DIALOGUE') {
      cinemaAudio.speakDialogue(asset.prompt || asset.name, 'Zephyr', 'urgent');
    }
  };

  const getTypeIcon = (type: AssetType) => {
    switch (type) {
      case 'IMAGE':
        return <ImageIcon className="w-4 h-4 text-cyan-400" />;
      case 'VIDEO':
        return <Video className="w-4 h-4 text-emerald-400" />;
      case 'REFERENCE':
        return <Layers className="w-4 h-4 text-amber-400" />;
      case 'DIALOGUE':
        return <Mic className="w-4 h-4 text-purple-400" />;
      case 'MUSIC':
        return <Music className="w-4 h-4 text-pink-400" />;
      case 'SFX':
      case 'AMBIENCE':
        return <Volume2 className="w-4 h-4 text-blue-400" />;
      case 'SUBTITLE':
        return <FileText className="w-4 h-4 text-slate-400" />;
      default:
        return <FolderOpen className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 text-slate-100 overflow-hidden font-mono">
      {/* Top Header Bar */}
      <div className="border-b border-slate-800 bg-slate-900/90 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded bg-cyan-950/70 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-white tracking-wide uppercase">Production Asset Browser</h1>
                <span className="text-xs px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/60 font-semibold">
                  {filteredAssets.length} / {allAssets.length} ASSETS
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Centralized repository for images, video plates, dialogue takes, references, and sound design
              </p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2">
          {selectedAssetIds.length > 0 && (
            <button
              onClick={handleBatchApprove}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-emerald-900/60 hover:bg-emerald-800/80 text-emerald-300 border border-emerald-700/50 text-xs font-semibold transition-all"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Approve Selected ({selectedAssetIds.length})
            </button>
          )}

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-sm transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            Register Asset
          </button>
        </div>
      </div>

      {/* Filter & Metric Ribbon */}
      <div className="border-b border-slate-800/80 bg-slate-900/40 px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Type selector tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 max-w-full">
          <button
            onClick={() => setSelectedType('ALL')}
            className={`px-2.5 py-1 rounded text-xs transition-all flex items-center gap-1.5 ${
              selectedType === 'ALL'
                ? 'bg-slate-700 text-white font-semibold'
                : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-200'
            }`}
          >
            All <span className="text-[10px] opacity-70">({stats.total})</span>
          </button>
          {(['REFERENCE', 'IMAGE', 'VIDEO', 'DIALOGUE', 'MUSIC', 'SFX'] as AssetType[]).map(type => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`px-2.5 py-1 rounded text-xs transition-all flex items-center gap-1.5 ${
                selectedType === type
                  ? 'bg-cyan-950 border border-cyan-500/50 text-cyan-300 font-semibold'
                  : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-200'
              }`}
            >
              {getTypeIcon(type)}
              <span>{type}</span>
              <span className="text-[10px] opacity-70">({stats.counts[type] || 0})</span>
            </button>
          ))}
        </div>

        {/* View mode toggle */}
        <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded border border-slate-800">
          <button
            onClick={() => setViewMode('grid')}
            className={`px-2.5 py-1 rounded text-xs transition-all ${
              viewMode === 'grid' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Grid
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`px-2.5 py-1 rounded text-xs transition-all ${
              viewMode === 'table' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Table
          </button>
        </div>
      </div>

      {/* Filter Row: Search, Acts, Scenes, Status */}
      <div className="border-b border-slate-800 bg-slate-950 px-6 py-2.5 flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by filename, shot ID, prompt, character..."
            className="w-full bg-slate-900 border border-slate-800 rounded pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/70"
          />
        </div>

        {/* Act filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-slate-500">Act:</span>
          <select
            value={selectedAct}
            onChange={e => {
              setSelectedAct(e.target.value);
              setSelectedScene('ALL');
            }}
            className="bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">All Acts</option>
            {project.acts.map(act => (
              <option key={act.id} value={act.id}>
                {act.title}
              </option>
            ))}
          </select>
        </div>

        {/* Scene filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-slate-500">Scene:</span>
          <select
            value={selectedScene}
            onChange={e => setSelectedScene(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">All Scenes</option>
            {project.scenes
              .filter(s => selectedAct === 'ALL' || s.actId === selectedAct)
              .map(s => (
                <option key={s.id} value={s.id}>
                  Scene {s.sceneNumber}: {s.heading.slice(0, 30)}...
                </option>
              ))}
          </select>
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-slate-500">Status:</span>
          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="approved">Approved</option>
            <option value="generated">Review Required</option>
            <option value="pending">Pending</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        {/* Selection summary */}
        <div className="text-[11px] text-slate-400 ml-auto flex items-center gap-2">
          <button
            onClick={handleSelectAll}
            className="text-cyan-400 hover:underline hover:text-cyan-300"
          >
            {selectedAssetIds.length === filteredAssets.length && filteredAssets.length > 0
              ? 'Deselect All'
              : 'Select All'}
          </button>
          <span>•</span>
          <span>{filteredAssets.length} matching</span>
        </div>
      </div>

      {/* Main Asset Grid / Table View */}
      <div className="flex-1 overflow-y-auto p-6">
        {filteredAssets.length === 0 ? (
          <div className="h-64 border border-dashed border-slate-800 rounded-lg flex flex-col items-center justify-center text-slate-500 text-center p-6">
            <FolderOpen className="w-10 h-10 mb-3 text-slate-600" />
            <p className="text-sm font-semibold text-slate-400">No assets match the active filter criteria</p>
            <p className="text-xs text-slate-600 mt-1 max-w-sm">
              Adjust your search query or generate new media from the Shot Designer, Storyboards, or Audio Department.
            </p>
            <button
              onClick={() => {
                setSelectedType('ALL');
                setSelectedAct('ALL');
                setSelectedScene('ALL');
                setSelectedStatus('ALL');
                setSearchQuery('');
              }}
              className="mt-4 px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
            >
              Reset Filters
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredAssets.map(asset => {
              const isSelected = selectedAssetIds.includes(asset.id);
              const isAudio = asset.type === 'DIALOGUE' || asset.type === 'MUSIC' || asset.type === 'SFX';

              return (
                <div
                  key={asset.id}
                  className={`group relative bg-slate-900 rounded-lg border transition-all flex flex-col overflow-hidden ${
                    isSelected
                      ? 'border-cyan-500 shadow-md shadow-cyan-950/40 ring-1 ring-cyan-500'
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Thumbnail / Visual Area */}
                  <div className="relative aspect-video bg-slate-950 flex items-center justify-center overflow-hidden border-b border-slate-800/80">
                    {asset.thumbnailUrl || asset.url ? (
                      asset.type === 'VIDEO' ? (
                        <video
                          src={asset.url}
                          className="w-full h-full object-cover"
                          muted
                          loop
                          playsInline
                        />
                      ) : (
                        <img
                          src={asset.thumbnailUrl || asset.url}
                          alt={asset.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          referrerPolicy="no-referrer"
                        />
                      )
                    ) : isAudio ? (
                      <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-gradient-to-br from-slate-950 to-slate-900">
                        <div className="flex items-center gap-1 w-full justify-center mb-2">
                          {[40, 75, 50, 90, 60, 30, 85, 45, 70, 95, 35, 65].map((h, i) => (
                            <div
                              key={i}
                              className={`w-1 rounded-full transition-all ${
                                playingAudioId === asset.id
                                  ? 'bg-cyan-400 animate-pulse'
                                  : 'bg-slate-700'
                              }`}
                              style={{ height: `${h * 0.4}px` }}
                            />
                          ))}
                        </div>
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider">
                          {asset.type} Track ({asset.durationSec || 3.0}s)
                        </span>
                      </div>
                    ) : (
                      <div className="text-slate-600 flex flex-col items-center gap-1">
                        {getTypeIcon(asset.type)}
                        <span className="text-[10px]">No Preview</span>
                      </div>
                    )}

                    {/* Quick Play overlay for audio */}
                    {isAudio && (
                      <button
                        onClick={() => handlePlayAudio(asset)}
                        className={`absolute inset-0 m-auto w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                          playingAudioId === asset.id
                            ? 'bg-cyan-500 text-slate-950'
                            : 'bg-slate-900/80 text-white hover:bg-cyan-500 hover:text-slate-950 border border-slate-700'
                        }`}
                      >
                        {playingAudioId === asset.id ? (
                          <Square className="w-4 h-4 fill-current" />
                        ) : (
                          <Play className="w-4 h-4 fill-current ml-0.5" />
                        )}
                      </button>
                    )}

                    {/* Top overlay badges */}
                    <div className="absolute top-2 left-2 flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 rounded bg-slate-950/80 backdrop-blur-sm border border-slate-700/60 text-[10px] font-semibold text-slate-300 flex items-center gap-1">
                        {getTypeIcon(asset.type)}
                        {asset.type}
                      </span>
                    </div>

                    <div className="absolute top-2 right-2 flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(asset.id)}
                        className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0 cursor-pointer"
                      />
                    </div>

                    {/* Status badge */}
                    <div className="absolute bottom-2 left-2">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                          asset.status === 'approved'
                            ? 'bg-emerald-950/90 text-emerald-300 border-emerald-700/60'
                            : asset.status === 'rejected'
                            ? 'bg-rose-950/90 text-rose-300 border-rose-700/60'
                            : 'bg-amber-950/90 text-amber-300 border-amber-700/60'
                        }`}
                      >
                        {asset.status.toUpperCase()}
                      </span>
                    </div>

                    {asset.shotId && (
                      <div className="absolute bottom-2 right-2">
                        <span className="px-1.5 py-0.5 rounded bg-slate-950/90 text-[10px] font-mono text-cyan-400 border border-cyan-800/60">
                          {asset.shotId}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Metadata */}
                  <div className="p-3 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="text-xs font-semibold text-white line-clamp-1 group-hover:text-cyan-300 transition-colors" title={asset.name}>
                        {asset.name}
                      </h3>
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5 truncate" title={asset.filename}>
                        {asset.filename}
                      </p>

                      <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500">
                        <span className="truncate max-w-[120px]" title={asset.provider}>
                          {asset.provider}
                        </span>
                        <span>Take 0{asset.versionTake || 1}</span>
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between gap-1 text-slate-400">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setPreviewAsset(asset)}
                          className="p-1 rounded hover:bg-slate-800 hover:text-white"
                          title="Inspect Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {asset.shotId && onNavigateToShot && (
                          <button
                            onClick={() => onNavigateToShot(asset.shotId!)}
                            className="p-1 rounded hover:bg-slate-800 hover:text-cyan-400"
                            title="Open in Shot Designer"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {asset.url && (
                          <a
                            href={asset.url}
                            download={asset.filename}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1 rounded hover:bg-slate-800 hover:text-white"
                            title="Download Asset"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        {asset.status !== 'approved' ? (
                          <button
                            onClick={() => handleUpdateAssetStatus(asset.id, 'approved')}
                            className="p-1 rounded hover:bg-emerald-950 hover:text-emerald-400"
                            title="Approve Asset"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUpdateAssetStatus(asset.id, 'rejected')}
                            className="p-1 rounded hover:bg-rose-950 hover:text-rose-400"
                            title="Reject Asset"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteAsset(asset.id)}
                          className="p-1 rounded hover:bg-rose-950/60 hover:text-rose-400 text-slate-600"
                          title="Delete from Library"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Table View */
          <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-900/60">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950 text-slate-400 font-semibold">
                  <th className="p-3 w-8">
                    <input
                      type="checkbox"
                      checked={selectedAssetIds.length === filteredAssets.length && filteredAssets.length > 0}
                      onChange={handleSelectAll}
                      className="w-3.5 h-3.5 rounded bg-slate-900 border-slate-700 text-cyan-500 cursor-pointer"
                    />
                  </th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Asset Identifier / File</th>
                  <th className="p-3">Shot / Scene</th>
                  <th className="p-3">Provider & Model</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Take</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredAssets.map(asset => {
                  const isSelected = selectedAssetIds.includes(asset.id);
                  return (
                    <tr
                      key={asset.id}
                      className={`hover:bg-slate-800/40 transition-colors ${
                        isSelected ? 'bg-cyan-950/20' : ''
                      }`}
                    >
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(asset.id)}
                          className="w-3.5 h-3.5 rounded bg-slate-900 border-slate-700 text-cyan-500 cursor-pointer"
                        />
                      </td>
                      <td className="p-3">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[10px] font-semibold">
                          {getTypeIcon(asset.type)}
                          {asset.type}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="font-semibold text-white">{asset.name}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{asset.filename}</div>
                      </td>
                      <td className="p-3 font-mono text-[11px]">
                        {asset.shotId ? (
                          <span className="text-cyan-400">{asset.shotId}</span>
                        ) : asset.sceneId ? (
                          <span className="text-slate-400">Scene {asset.sceneId}</span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                      <td className="p-3 text-slate-400 text-[11px]">
                        <div>{asset.provider}</div>
                        <div className="text-[10px] text-slate-600">{asset.model}</div>
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                            asset.status === 'approved'
                              ? 'bg-emerald-950 text-emerald-300 border-emerald-800/60'
                              : asset.status === 'rejected'
                              ? 'bg-rose-950 text-rose-300 border-rose-800/60'
                              : 'bg-amber-950 text-amber-300 border-amber-800/60'
                          }`}
                        >
                          {asset.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-[11px] text-slate-400">
                        Take 0{asset.versionTake || 1}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setPreviewAsset(asset)}
                            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
                            title="Inspect Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {asset.status !== 'approved' ? (
                            <button
                              onClick={() => handleUpdateAssetStatus(asset.id, 'approved')}
                              className="p-1 rounded hover:bg-emerald-950 text-slate-400 hover:text-emerald-400"
                              title="Approve"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleUpdateAssetStatus(asset.id, 'rejected')}
                              className="p-1 rounded hover:bg-rose-950 text-slate-400 hover:text-rose-400"
                              title="Reject"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteAsset(asset.id)}
                            className="p-1 rounded hover:bg-rose-950/60 text-slate-600 hover:text-rose-400"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Asset Preview Modal */}
      {previewAsset && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-lg max-w-2xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="border-b border-slate-800 px-5 py-3 flex items-center justify-between bg-slate-950">
              <div className="flex items-center gap-2">
                {getTypeIcon(previewAsset.type)}
                <h3 className="font-bold text-white text-sm">{previewAsset.name}</h3>
              </div>
              <button
                onClick={() => setPreviewAsset(null)}
                className="text-slate-400 hover:text-white text-lg leading-none"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              {/* Media viewer */}
              <div className="aspect-video bg-black rounded border border-slate-800 flex items-center justify-center overflow-hidden">
                {previewAsset.url ? (
                  previewAsset.type === 'VIDEO' ? (
                    <video src={previewAsset.url} controls className="w-full h-full object-contain" />
                  ) : previewAsset.type === 'IMAGE' || previewAsset.type === 'REFERENCE' ? (
                    <img
                      src={previewAsset.url}
                      alt={previewAsset.name}
                      className="w-full h-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="text-center p-6">
                      <button
                        onClick={() => handlePlayAudio(previewAsset)}
                        className="w-14 h-14 rounded-full bg-cyan-600 hover:bg-cyan-500 text-white flex items-center justify-center mx-auto shadow-lg"
                      >
                        {playingAudioId === previewAsset.id ? (
                          <Square className="w-6 h-6 fill-current" />
                        ) : (
                          <Play className="w-6 h-6 fill-current ml-1" />
                        )}
                      </button>
                      <p className="text-xs text-slate-400 mt-3 font-mono">{previewAsset.filename}</p>
                    </div>
                  )
                ) : (
                  <p className="text-xs text-slate-500">Audio Synth Buffer Ready</p>
                )}
              </div>

              {/* Detail fields */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
                  <span className="text-slate-500 block">Filename:</span>
                  <span className="font-mono text-slate-200">{previewAsset.filename}</span>
                </div>
                <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
                  <span className="text-slate-500 block">Shot ID:</span>
                  <span className="font-mono text-cyan-400">{previewAsset.shotId || 'Unassigned'}</span>
                </div>
                <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
                  <span className="text-slate-500 block">Provider & Model:</span>
                  <span className="text-slate-200">{previewAsset.provider} ({previewAsset.model})</span>
                </div>
                <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
                  <span className="text-slate-500 block">Approval Status:</span>
                  <span className="capitalize text-emerald-400 font-semibold">{previewAsset.status}</span>
                </div>
              </div>

              {previewAsset.prompt && (
                <div className="bg-slate-950 p-3 rounded border border-slate-800 text-xs">
                  <span className="text-slate-500 block mb-1 font-semibold">Generation Prompt:</span>
                  <p className="text-slate-300 leading-relaxed font-sans">{previewAsset.prompt}</p>
                </div>
              )}
            </div>

            <div className="border-t border-slate-800 px-5 py-3 bg-slate-950 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {previewAsset.shotId && onNavigateToShot && (
                  <button
                    onClick={() => {
                      const id = previewAsset.shotId!;
                      setPreviewAsset(null);
                      onNavigateToShot(id);
                    }}
                    className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-cyan-300 flex items-center gap-1.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Open in Shot Designer
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    handleUpdateAssetStatus(
                      previewAsset.id,
                      previewAsset.status === 'approved' ? 'rejected' : 'approved'
                    );
                    setPreviewAsset(null);
                  }}
                  className={`px-3 py-1.5 rounded text-xs font-semibold ${
                    previewAsset.status === 'approved'
                      ? 'bg-rose-900/60 hover:bg-rose-800 text-rose-300'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  }`}
                >
                  {previewAsset.status === 'approved' ? 'Mark as Rejected' : 'Approve Asset'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Register Custom Asset Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-lg max-w-lg w-full overflow-hidden shadow-2xl">
            <div className="border-b border-slate-800 px-5 py-3 flex items-center justify-between bg-slate-950">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Plus className="w-4 h-4 text-cyan-400" />
                Register Production Asset
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddCustomAsset} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Asset Name / Title:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Helios Array Starboard Master Take 01"
                  value={newAssetForm.name}
                  onChange={e => setNewAssetForm({ ...newAssetForm, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Asset Type:</label>
                  <select
                    value={newAssetForm.type}
                    onChange={e => setNewAssetForm({ ...newAssetForm, type: e.target.value as AssetType })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="IMAGE">IMAGE (Keyframe)</option>
                    <option value="VIDEO">VIDEO (Motion Clip)</option>
                    <option value="REFERENCE">REFERENCE (Master Ref)</option>
                    <option value="DIALOGUE">DIALOGUE (Audio)</option>
                    <option value="MUSIC">MUSIC (Score / Cue)</option>
                    <option value="SFX">SFX (Sound FX)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Associate with Shot:</label>
                  <select
                    value={newAssetForm.shotId}
                    onChange={e => setNewAssetForm({ ...newAssetForm, shotId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="">None / Standalone</option>
                    {project.shots.map(sh => (
                      <option key={sh.id} value={sh.id}>
                        {sh.id}: {sh.title.slice(0, 25)}...
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Media URL or Base64 URI:</label>
                <input
                  type="url"
                  required
                  placeholder="https://... or data:image/png;base64,..."
                  value={newAssetForm.url}
                  onChange={e => setNewAssetForm({ ...newAssetForm, url: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Provider Source:</label>
                <input
                  type="text"
                  value={newAssetForm.provider}
                  onChange={e => setNewAssetForm({ ...newAssetForm, provider: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-semibold"
                >
                  Register to Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
