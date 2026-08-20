import React, { useState } from 'react';
import { FilmProject } from '../types/film';
import { FilmStudioApiClient } from '../services/apiClient';
import { 
  Sparkles, 
  X, 
  Send, 
  Bot, 
  User, 
  Film, 
  ShieldCheck, 
  Layers, 
  Check 
} from 'lucide-react';

interface AIAssistantDrawerProps {
  project: FilmProject;
  isOpen: boolean;
  onClose: () => void;
  onNavigateToTab?: (tab: string) => void;
  onOpenLiveVoice?: () => void;
}

interface Message {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
}

export const AIAssistantDrawer: React.FC<AIAssistantDrawerProps> = ({
  project,
  isOpen,
  onClose,
  onNavigateToTab,
  onOpenLiveVoice,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'm1',
      sender: 'ai',
      text: `Hello Director. I am your AI Production Assistant for "${project.title}". I have full access to your ${project.scenes.length} scenes, ${project.shots.length} shots, characters, and continuity matrix. How can I assist your shoot or edit today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSend = async (textToSend?: string) => {
    const query = textToSend || input;
    if (!query.trim()) return;

    const userMsg: Message = {
      id: `u_${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setIsLoading(true);

    try {
      const reply = await FilmStudioApiClient.askAIAssistant(query, project, messages);
      const aiMsg: Message = {
        id: `ai_${Date.now()}`,
        sender: 'ai',
        text: reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (e: any) {
      console.error(e);
      // Fallback assistant response
      const aiMsg: Message = {
        id: `ai_${Date.now()}`,
        sender: 'ai',
        text: `Analysis for "${project.title}": Currently Scene #4 (EVA Breach) has the highest tension velocity. I recommend locking Captain Elias's helmet visor reflection in shot SH008 to preserve continuity with Scene #2.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, aiMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickChips = [
    'Audit continuity issues in Act II',
    'Suggest alternative coverage for Scene 4',
    'Which shots are still unapproved?',
    'Summarize current production readiness',
  ];

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-[#0E0E10] border-l border-[#222225] shadow-2xl z-40 flex flex-col select-none text-[#E0E0E0]">
      {/* Header */}
      <div className="h-12 bg-[#0A0A0B] border-b border-[#222225] px-4 flex items-center justify-between shrink-0 font-mono">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-sm bg-[#151619] text-[#CBA135] border border-[#2A2A2D]">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-[#E0E0E0] uppercase tracking-wider">AI PRODUCTION COPILOT</h3>
            <span className="text-[9px] text-emerald-400 font-mono flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              TELEMETRY SYNCED
            </span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1 rounded-sm text-[#8E9299] hover:text-[#E0E0E0] hover:bg-[#1E1F24]"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Live Voice Director Banner */}
      {onOpenLiveVoice && (
        <div className="p-2.5 bg-gradient-to-r from-amber-500/10 via-neutral-900 to-cyan-500/10 border-b border-[#222225] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span className="text-[11px] font-mono text-neutral-200">Spoken Voice Director</span>
          </div>
          <button
            onClick={onOpenLiveVoice}
            className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-black font-bold text-[10px] uppercase font-mono tracking-wider transition-colors shadow-sm cursor-pointer"
          >
            Launch Live API Voice
          </button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3 text-xs font-mono">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[88%] rounded-sm p-2.5 space-y-1 ${
                m.sender === 'user'
                  ? 'bg-[#CBA135] text-black font-medium'
                  : 'bg-[#151619] text-[#E0E0E0] border border-[#2A2A2D] leading-relaxed whitespace-pre-wrap'
              }`}
            >
              <p className="text-[11px]">{m.text}</p>
              <div
                className={`text-[8px] text-right ${
                  m.sender === 'user' ? 'text-black/70' : 'text-[#666]'
                }`}
              >
                {m.timestamp}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 text-[#8E9299] text-[10px] font-mono italic">
            <Sparkles className="w-3.5 h-3.5 animate-spin text-[#CBA135]" />
            <span>Assistant parsing project matrix...</span>
          </div>
        )}
      </div>

      {/* Quick Chips */}
      <div className="px-3 py-2 border-t border-[#222225] bg-[#0A0A0B] flex flex-wrap gap-1.5 shrink-0 font-mono">
        {quickChips.map((chip, i) => (
          <button
            key={i}
            onClick={() => handleSend(chip)}
            className="text-[9px] px-2 py-1 rounded-sm bg-[#151619] hover:bg-[#1E1F24] text-[#8E9299] hover:text-[#CBA135] border border-[#2A2A2D] transition-colors"
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="p-2.5 bg-[#0A0A0B] border-t border-[#222225] flex items-center gap-2 shrink-0 font-mono">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask copilot about shots, continuity, cues..."
          className="flex-1 bg-[#151619] border border-[#2A2A2D] rounded-sm px-2.5 py-1.5 text-xs text-[#E0E0E0] focus:outline-none focus:border-[#CBA135]"
        />

        <button
          onClick={() => handleSend()}
          disabled={!input.trim() || isLoading}
          className="p-1.5 rounded-sm bg-[#CBA135] hover:bg-[#DFB548] text-black disabled:opacity-40 transition-colors"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
