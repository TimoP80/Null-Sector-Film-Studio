import React, { useState } from 'react';
import { FilmProject, Shot } from '../types/film';
import { 
  ListFilter, 
  Search, 
  CheckCircle2, 
  Clock, 
  Sparkles, 
  Video, 
  Image as ImageIcon, 
  SlidersHorizontal,
  ChevronRight,
  Eye,
  Plus,
  Play
} from 'lucide-react';

interface ShotListWorkspaceProps {
  project: FilmProject;
  onSelectShot: (shot: Shot) => void;
  onUpdateShot: (shot: Shot) => void;
  onOpenShotDesigner: (shot: Shot) => void;
  onBatchGenerateStoryboards: (shotIds: string[]) => void;
}

export const ShotListWorkspace: React.FC<ShotListWorkspaceProps> = ({
  project,
  onSelectShot,
  onUpdateShot,
  onOpenShotDesigner,
  onBatchGenerateStoryboards,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAct, setFilterAct] = useState<string>('ALL');
  const [filterScene, setFilterScene] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterShotSize, setFilterShotSize] = useState<string>('ALL');
  const [selectedShotIds, setSelectedShotIds] = useState<string[]>([]);

  // Filtered Shots
  const filteredShots = project.shots.filter((shot) => {
    if (filterAct !== 'ALL' && shot.actId !== filterAct) return false;
    if (filterScene !== 'ALL' && shot.sceneId !== filterScene) return false;
    if (filterStatus !== 'ALL' && shot.status !== filterStatus) return false;
    if (filterShotSize !== 'ALL' && shot.camera.shotSize !== filterShotSize) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchId = shot.id.toLowerCase().includes(q);
      const matchTitle = shot.title.toLowerCase().includes(q);
      const matchDesc = shot.description.toLowerCase().includes(q);
      if (!matchId && !matchTitle && !matchDesc) return false;
    }
    return true;
  });

  const handleSelectAll = () => {
    if (selectedShotIds.length === filteredShots.length) {
      setSelectedShotIds([]);
    } else {
      setSelectedShotIds(filteredShots.map(s => s.id));
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedShotIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleBatchApprove = () => {
    selectedShotIds.forEach(id => {
      const shot = project.shots.find(s => s.id === id);
      if (shot) {
        onUpdateShot({ ...shot, status: 'approved' });
      }
    });
    setSelectedShotIds([]);
  };

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#0A0A0B] text-[#E0E0E0]">
      {/* Top Filter Bar */}
      <div className="bg-[#0E0E10] border-b border-[#222225] p-3 space-y-2.5 shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ListFilter className="w-4 h-4 text-[#CBA135]" />
            <span className="text-xs font-bold text-[#E0E0E0] uppercase tracking-wider font-mono">SHOT MATRIX DATA GRID</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-sm bg-[#151619] text-[#8E9299] border border-[#222225]">
              {filteredShots.length} / {project.shots.length} SHOTS
            </span>
          </div>

          {/* Search Box */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#666] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filter shot ID, optics, action..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-[#151619] border border-[#2A2A2D] rounded-sm pl-8 pr-3 py-1 text-xs text-[#E0E0E0] focus:outline-none focus:border-[#CBA135] w-64 font-mono"
              />
            </div>

            {selectedShotIds.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onBatchGenerateStoryboards(selectedShotIds)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-xs font-mono font-medium bg-[#151619] text-[#CBA135] border border-[#CBA135]/50 hover:bg-[#1E1F24]"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#CBA135]" />
                  <span>GEN STORYBOARD ({selectedShotIds.length})</span>
                </button>

                <button
                  onClick={handleBatchApprove}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-xs font-mono font-medium bg-[#151619] text-emerald-400 border border-emerald-500/40 hover:bg-[#1E1F24]"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>APPROVE ({selectedShotIds.length})</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Filter Selects */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          {/* Act filter */}
          <select
            value={filterAct}
            onChange={(e) => setFilterAct(e.target.value)}
            className="bg-[#151619] border border-[#2A2A2D] rounded-sm px-2 py-1 text-[#8E9299] text-xs focus:outline-none focus:border-[#CBA135]"
          >
            <option value="ALL">ALL ACTS</option>
            {project.acts.map(a => (
              <option key={a.id} value={a.id}>{a.title.toUpperCase()}</option>
            ))}
          </select>

          {/* Scene filter */}
          <select
            value={filterScene}
            onChange={(e) => setFilterScene(e.target.value)}
            className="bg-[#151619] border border-[#2A2A2D] rounded-sm px-2 py-1 text-[#8E9299] text-xs focus:outline-none focus:border-[#CBA135]"
          >
            <option value="ALL">ALL SCENES</option>
            {project.scenes.map(s => (
              <option key={s.id} value={s.id}>SCENE #{s.sceneNumber}: {s.heading.substring(0, 22)}...</option>
            ))}
          </select>

          {/* Status filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-[#151619] border border-[#2A2A2D] rounded-sm px-2 py-1 text-[#8E9299] text-xs focus:outline-none focus:border-[#CBA135]"
          >
            <option value="ALL">ALL STATUSES</option>
            <option value="pending">PENDING</option>
            <option value="generating">GENERATING</option>
            <option value="review">REVIEW</option>
            <option value="approved">APPROVED</option>
          </select>

          {/* Shot Size */}
          <select
            value={filterShotSize}
            onChange={(e) => setFilterShotSize(e.target.value)}
            className="bg-[#151619] border border-[#2A2A2D] rounded-sm px-2 py-1 text-[#8E9299] text-xs focus:outline-none focus:border-[#CBA135]"
          >
            <option value="ALL">ALL SIZES</option>
            <option value="extreme_wide">EXTREME WIDE (EWS)</option>
            <option value="wide">WIDE (WS)</option>
            <option value="medium_wide">MEDIUM WIDE (MWS)</option>
            <option value="medium">MEDIUM (MS)</option>
            <option value="medium_close_up">MEDIUM CLOSE-UP (MCU)</option>
            <option value="close_up">CLOSE-UP (CU)</option>
            <option value="extreme_close_up">EXTREME CLOSE-UP (ECU)</option>
          </select>

          {(filterAct !== 'ALL' || filterScene !== 'ALL' || filterStatus !== 'ALL' || filterShotSize !== 'ALL' || searchQuery) && (
            <button
              onClick={() => {
                setFilterAct('ALL');
                setFilterScene('ALL');
                setFilterStatus('ALL');
                setFilterShotSize('ALL');
                setSearchQuery('');
              }}
              className="text-[10px] text-[#CBA135] hover:underline px-1 uppercase tracking-wider font-mono"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Main Data Grid Table */}
      <div className="flex-1 overflow-x-auto overflow-y-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-[#0E0E10] text-[#666] uppercase tracking-wider text-[9px] sticky top-0 z-10 border-b border-[#222225] font-mono">
            <tr>
              <th className="p-2.5 w-10 text-center">
                <input
                  type="checkbox"
                  checked={selectedShotIds.length === filteredShots.length && filteredShots.length > 0}
                  onChange={handleSelectAll}
                  className="rounded-sm border-[#2A2A2D] bg-[#151619] text-[#CBA135]"
                />
              </th>
              <th className="p-2.5">Code</th>
              <th className="p-2.5">Keyframe</th>
              <th className="p-2.5">Scene Context</th>
              <th className="p-2.5">Framing & Motion</th>
              <th className="p-2.5">Optics & Light</th>
              <th className="p-2.5">Description</th>
              <th className="p-2.5">Dur</th>
              <th className="p-2.5">Status</th>
              <th className="p-2.5 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1A1A1D]">
            {filteredShots.map((shot) => {
              const isSelected = selectedShotIds.includes(shot.id);
              const scene = project.scenes.find(s => s.id === shot.sceneId);

              return (
                <tr
                  key={shot.id}
                  className={`hover:bg-[#151619]/70 transition-colors ${
                    isSelected ? 'bg-[#151619]' : 'bg-[#0A0A0B]'
                  }`}
                >
                  <td className="p-2.5 text-center">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleSelect(shot.id)}
                      className="rounded-sm border-[#2A2A2D] bg-[#151619]"
                    />
                  </td>

                  <td className="p-2.5 font-mono font-bold text-[#CBA135] whitespace-nowrap text-[11px]">
                    {shot.id}
                  </td>

                  <td className="p-2.5">
                    <div 
                      onClick={() => onOpenShotDesigner(shot)}
                      className="w-16 h-9 rounded-sm bg-[#151619] border border-[#2A2A2D] overflow-hidden cursor-pointer relative group shrink-0"
                    >
                      {shot.storyboardImageUrl ? (
                        <img 
                          src={shot.storyboardImageUrl} 
                          alt={shot.title} 
                          className="w-full h-full object-cover" 
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[#555]">
                          <ImageIcon className="w-3.5 h-3.5" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <Eye className="w-3.5 h-3.5 text-[#CBA135]" />
                      </div>
                    </div>
                  </td>

                  <td className="p-2.5 whitespace-nowrap">
                    <div className="font-semibold text-[#E0E0E0] text-xs">
                      SCENE #{scene?.sceneNumber || shot.sceneId}
                    </div>
                    <div className="text-[10px] text-[#666] font-mono truncate max-w-[140px]">
                      {scene?.heading || 'INT. SCENE'}
                    </div>
                  </td>

                  <td className="p-2.5 whitespace-nowrap">
                    <div className="font-mono text-[#E0E0E0] uppercase font-semibold text-[11px]">
                      {shot.camera.shotSize.replace('_', ' ')}
                    </div>
                    <div className="text-[9px] text-[#666] font-mono">
                      {shot.camera.movement} • {shot.camera.angle}
                    </div>
                  </td>

                  <td className="p-2.5 whitespace-nowrap">
                    <div className="text-[#E0E0E0] font-mono text-[11px]">{shot.camera.lens}</div>
                    <div className="text-[9px] text-[#666] font-mono">{shot.environment.keyLight}</div>
                  </td>

                  <td className="p-2.5 max-w-xs">
                    <div className="font-medium text-[#E0E0E0] truncate text-xs">{shot.title}</div>
                    <div className="text-[10px] text-[#8E9299] line-clamp-1 font-mono">{shot.description}</div>
                  </td>

                  <td className="p-2.5 font-mono text-[#E0E0E0] whitespace-nowrap text-[11px]">
                    {shot.durationSec}s
                  </td>

                  <td className="p-2.5 whitespace-nowrap">
                    <span className={`text-[9px] font-mono px-2 py-0.5 rounded-sm font-semibold uppercase ${
                      shot.status === 'approved' 
                        ? 'bg-[#122018] text-emerald-400 border border-emerald-500/40' 
                        : shot.status === 'generating' 
                        ? 'bg-[#151D24] text-cyan-400 border border-cyan-500/40 animate-pulse' 
                        : shot.status === 'review'
                        ? 'bg-[#201B12] text-[#CBA135] border border-[#CBA135]/40'
                        : 'bg-[#151619] text-[#666] border border-[#222225]'
                    }`}>
                      {shot.status}
                    </span>
                  </td>

                  <td className="p-2.5 text-right whitespace-nowrap">
                    <button
                      onClick={() => onOpenShotDesigner(shot)}
                      className="px-2 py-1 rounded-sm bg-[#151619] hover:bg-[#1E1F24] text-[#CBA135] border border-[#2A2A2D] hover:border-[#CBA135]/60 text-[10px] font-mono font-medium transition-colors inline-flex items-center gap-1"
                    >
                      <SlidersHorizontal className="w-3 h-3 text-[#CBA135]" />
                      <span>DESIGN</span>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
