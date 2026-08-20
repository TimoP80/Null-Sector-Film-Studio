import React from 'react';
import { 
  LayoutDashboard, 
  FileText, 
  BookOpen, 
  Users, 
  MapPin, 
  Layers, 
  ListFilter, 
  LayoutGrid, 
  Sparkles, 
  MessageSquareQuote, 
  Volume2, 
  Music, 
  Film, 
  ShieldCheck, 
  CheckSquare, 
  DownloadCloud, 
  Settings
} from 'lucide-react';

interface SidebarNavProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  shotCount: number;
  dialogueCount: number;
}

export const navItems = [
  { id: 'PROJECT', label: 'Project', icon: LayoutDashboard, category: 'Overview' },
  { id: 'SCREENPLAY', label: 'Screenplay', icon: FileText, category: 'Pre-Production' },
  { id: 'STORY', label: 'Story Structure', icon: BookOpen, category: 'Pre-Production' },
  { id: 'CHARACTERS', label: 'Characters', icon: Users, category: 'Assets' },
  { id: 'LOCATIONS', label: 'Locations', icon: MapPin, category: 'Assets' },
  { id: 'SCENES', label: 'Scene Breakdown', icon: Layers, category: 'Production' },
  { id: 'SHOT_LIST', label: 'Shot List', icon: ListFilter, category: 'Production', badgeKey: 'shots' },
  { id: 'STORYBOARD', label: 'Storyboard', icon: LayoutGrid, category: 'Visuals' },
  { id: 'AI_GENERATION', label: 'AI Generation', icon: Sparkles, category: 'Visuals' },
  { id: 'DIALOGUE', label: 'Dialogue / TTS', icon: MessageSquareQuote, category: 'Audio', badgeKey: 'dialogue' },
  { id: 'AUDIO', label: 'Sound Design & SFX', icon: Volume2, category: 'Audio' },
  { id: 'MUSIC', label: 'Music Department', icon: Music, category: 'Audio' },
  { id: 'TIMELINE', label: 'Timeline Editor', icon: Film, category: 'Post-Production' },
  { id: 'CONTINUITY', label: 'Continuity Engine', icon: ShieldCheck, category: 'Quality' },
  { id: 'VALIDATION', label: 'Production Validation', icon: CheckSquare, category: 'Quality' },
  { id: 'EXPORT', label: 'Export & OpenMontage', icon: DownloadCloud, category: 'Delivery' },
  { id: 'SETTINGS', label: 'Settings', icon: Settings, category: 'System' },
];

export const SidebarNav: React.FC<SidebarNavProps> = ({
  currentTab,
  onSelectTab,
  shotCount,
  dialogueCount,
}) => {
  return (
    <aside className="w-56 bg-[#050505] border-r border-[#222225] flex flex-col shrink-0 select-none overflow-y-auto">
      <div className="p-2 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-sm text-xs font-mono transition-all ${
                isActive
                  ? 'bg-[#151619] text-[#CBA135] border border-[#CBA135]/50 shadow-sm'
                  : 'text-[#8E9299] hover:text-[#E0E0E0] hover:bg-[#151619]/60 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#CBA135]' : 'text-[#666]'}`} />
                <span className="tracking-tight">{item.label}</span>
              </div>
              {item.badgeKey === 'shots' && (
                <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded-sm border ${
                  isActive 
                    ? 'bg-[#201D14] text-[#CBA135] border-[#CBA135]/40' 
                    : 'bg-[#101012] text-[#666] border-[#222225]'
                }`}>
                  {shotCount}
                </span>
              )}
              {item.badgeKey === 'dialogue' && (
                <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded-sm border ${
                  isActive 
                    ? 'bg-[#201D14] text-[#CBA135] border-[#CBA135]/40' 
                    : 'bg-[#101012] text-[#666] border-[#222225]'
                }`}>
                  {dialogueCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-auto p-3 border-t border-[#222225] text-[10px] font-mono text-[#666] flex flex-col gap-1.5 bg-[#08080A]">
        <div className="flex justify-between items-center text-[#8E9299]">
          <span className="uppercase text-[9px] text-[#555]">AI Engine</span>
          <span className="text-[#CBA135]">Gemini 3.7 + Veo</span>
        </div>
        <div className="flex justify-between items-center text-[#8E9299]">
          <span className="uppercase text-[9px] text-[#555]">Protocol</span>
          <span className="text-[#8E9299]">OpenMontage v2.4</span>
        </div>
        <div className="flex justify-between items-center text-[#8E9299]">
          <span className="uppercase text-[9px] text-[#555]">Grid State</span>
          <span className="flex items-center gap-1 text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            SYNCED
          </span>
        </div>
      </div>
    </aside>
  );
};
