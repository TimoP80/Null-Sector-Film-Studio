import React, { useState } from 'react';
import { FilmProject } from '../types/film';
import { FilmStudioApiClient } from '../services/apiClient';
import { 
  FileText, 
  Sparkles, 
  Upload, 
  Download, 
  Copy, 
  Check, 
  Layers, 
  Users, 
  MapPin, 
  MessageSquareQuote,
  Activity,
  AlertCircle,
  Eye
} from 'lucide-react';

interface ScreenplayWorkspaceProps {
  project: FilmProject;
  onUpdateScreenplay: (newScript: string, extractedData?: any) => void;
  onNavigateToScene: (sceneId: string) => void;
}

export const ScreenplayWorkspace: React.FC<ScreenplayWorkspaceProps> = ({
  project,
  onUpdateScreenplay,
  onNavigateToScene,
}) => {
  const [scriptText, setScriptText] = useState(project.screenplayText);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisSuccess, setAnalysisSuccess] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedSceneId, setSelectedSceneId] = useState<string>(project.scenes[0]?.id || '');

  const handleAnalyze = async () => {
    if (!scriptText.trim()) return;
    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysisSuccess(false);

    try {
      const data = await FilmStudioApiClient.analyzeScreenplay(scriptText);
      onUpdateScreenplay(scriptText, data);
      setAnalysisSuccess(true);
    } catch (err: any) {
      console.error(err);
      setAnalysisError(err.message || 'Analysis failed. Please check Gemini API key configuration.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(scriptText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setScriptText(content);
        onUpdateScreenplay(content);
      }
    };
    reader.readAsText(file);
  };

  const selectedScene = project.scenes.find(s => s.id === selectedSceneId) || project.scenes[0];

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#0A0A0B] text-[#E0E0E0]">
      {/* Action Toolbar */}
      <div className="h-11 bg-[#0E0E10] border-b border-[#222225] px-4 flex items-center justify-between shrink-0 font-mono">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-[#E0E0E0] text-xs font-semibold">
            <FileText className="w-4 h-4 text-[#CBA135]" />
            <span className="uppercase tracking-wider">SCREENPLAY SCRIPT ENGINE</span>
          </div>
          <span className="text-[10px] font-mono text-[#666]">
            COURIER PROTOCOL • {scriptText.split('\n').length} LINES
          </span>
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-xs font-mono font-medium bg-[#151619] hover:bg-[#1E1F24] text-[#8E9299] hover:text-[#E0E0E0] cursor-pointer border border-[#2A2A2D] transition-colors">
            <Upload className="w-3.5 h-3.5 text-[#CBA135]" />
            <span>IMPORT .FOUNTAIN</span>
            <input 
              type="file" 
              accept=".txt,.fountain,.fdr,.pdf" 
              onChange={handleFileUpload} 
              className="hidden" 
            />
          </label>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-xs font-mono font-medium bg-[#151619] hover:bg-[#1E1F24] text-[#8E9299] hover:text-[#E0E0E0] border border-[#2A2A2D] transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-[#CBA135]" />}
            <span>{copied ? 'COPIED' : 'COPY'}</span>
          </button>

          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className={`flex items-center gap-2 px-3 py-1 rounded-sm text-xs font-mono font-bold transition-all shadow-sm ${
              isAnalyzing
                ? 'bg-[#151619] text-[#CBA135] border border-[#CBA135]/40 opacity-75 cursor-wait'
                : 'bg-[#CBA135] hover:bg-[#DFB548] text-black border border-[#CBA135]'
            }`}
          >
            <Sparkles className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
            <span className="uppercase tracking-wider">{isAnalyzing ? 'PARSING SCRIPT...' : 'AI SCRIPT BREAKDOWN'}</span>
          </button>
        </div>
      </div>

      {/* Analysis Notifications */}
      {analysisError && (
        <div className="bg-[#261214] border-b border-red-500/40 px-4 py-1.5 text-xs font-mono text-red-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{analysisError}</span>
          </div>
          <button 
            onClick={() => setAnalysisError(null)} 
            className="text-red-400 hover:text-red-300 text-[10px] uppercase font-mono"
          >
            Dismiss
          </button>
        </div>
      )}

      {analysisSuccess && (
        <div className="bg-[#122018] border-b border-emerald-500/40 px-4 py-1.5 text-xs font-mono text-emerald-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Breakdown complete: Extracted {project.acts.length} Acts, {project.scenes.length} Scenes, {project.characters.length} Characters, {project.dialogueSegments.length} Dialogue nodes.</span>
          </div>
          <button 
            onClick={() => setAnalysisSuccess(false)} 
            className="text-emerald-400 hover:text-emerald-300 text-[10px] uppercase font-mono"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Dual-Pane Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Pane: Hollywood Screenplay Editor */}
        <div className="flex-1 flex flex-col border-r border-[#222225] bg-[#080809]">
          <div className="p-2 bg-[#0E0E10] border-b border-[#222225] text-[10px] font-mono text-[#8E9299] flex items-center justify-between">
            <span className="uppercase tracking-wider">STANDARD HOLLYWOOD COURIER TELETYPE</span>
            <button 
              onClick={() => onUpdateScreenplay(scriptText)}
              className="text-[#CBA135] hover:underline text-[10px] font-mono font-bold uppercase"
            >
              SAVE SCRIPT
            </button>
          </div>
          
          <div className="flex-1 p-5 overflow-y-auto flex justify-center bg-[#080809]">
            <div className="w-full max-w-3xl bg-[#151619] border border-[#2A2A2D] rounded-sm p-8 shadow-2xl">
              <textarea
                value={scriptText}
                onChange={(e) => {
                  setScriptText(e.target.value);
                }}
                className="w-full h-full min-h-[600px] bg-transparent text-[#E0E0E0] font-mono text-sm leading-relaxed tracking-wide resize-none focus:outline-none placeholder-[#555]"
                placeholder="Paste or type standard screenplay format here (e.g. INT. LOCATION - NIGHT)..."
                style={{ fontFamily: '"Courier Prime", "Courier New", monospace' }}
              />
            </div>
          </div>
        </div>

        {/* Right Pane: Structured Production Hierarchy */}
        <div className="w-96 bg-[#0E0E10] flex flex-col shrink-0 overflow-hidden border-l border-[#222225]">
          <div className="p-3 bg-[#0A0A0B] border-b border-[#222225] flex items-center justify-between font-mono">
            <span className="text-xs font-bold text-[#E0E0E0] flex items-center gap-2 uppercase tracking-wider">
              <Layers className="w-3.5 h-3.5 text-[#CBA135]" />
              PRODUCTION HIERARCHY
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-sm bg-[#151619] text-[#8E9299] border border-[#2A2A2D]">
              {project.scenes.length} SCENES
            </span>
          </div>

          {/* Scene Tree List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {project.acts.map((act) => {
              const actScenes = project.scenes.filter(s => s.actId === act.id);
              return (
                <div key={act.id} className="space-y-1.5">
                  <div className="text-[10px] font-bold text-[#CBA135] uppercase tracking-wider flex items-center gap-1.5 px-1 font-mono">
                    <span>{act.title}</span>
                  </div>

                  <div className="space-y-1 pl-2 border-l border-[#222225]">
                    {actScenes.map((scene) => {
                      const isSelected = scene.id === selectedSceneId;
                      const location = project.locations.find(l => l.id === scene.locationId);
                      const sceneChars = project.characters.filter(c => scene.characterIds.includes(c.id));
                      const sceneShots = project.shots.filter(s => s.sceneId === scene.id);

                      return (
                        <div
                          key={scene.id}
                          onClick={() => setSelectedSceneId(scene.id)}
                          className={`p-2.5 rounded-sm border text-xs cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-[#151619] border-[#CBA135] text-[#FFFFFF] shadow-sm'
                              : 'bg-[#0A0A0B] border-[#222225] text-[#8E9299] hover:text-[#E0E0E0] hover:bg-[#151619]'
                          }`}
                        >
                          <div className="flex items-center justify-between font-mono">
                            <span className="font-bold text-[#E0E0E0]">
                              SCENE #{scene.sceneNumber}
                            </span>
                            <span className="text-[9px] text-[#666]">
                              {sceneShots.length} SHOTS • {scene.estimatedRuntimeSec}s
                            </span>
                          </div>

                          <div className="font-mono text-[10px] text-[#CBA135]/90 truncate mt-0.5">
                            {scene.heading}
                          </div>

                          {/* Quick Badges */}
                          <div className="flex flex-wrap gap-1 mt-1.5 font-mono">
                            {sceneChars.map(c => (
                              <span key={c.id} className="text-[8px] px-1.5 py-0.5 rounded-sm bg-[#151619] text-cyan-400 border border-[#2A2A2D]">
                                {c.name.split(' ')[0]}
                              </span>
                            ))}
                            {location && (
                              <span className="text-[8px] px-1.5 py-0.5 rounded-sm bg-[#151619] text-[#CBA135] border border-[#2A2A2D]">
                                {location.name.split(' ')[1] || location.name}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected Scene Quick Card Details */}
          {selectedScene && (
            <div className="p-3 bg-[#0A0A0B] border-t border-[#222225] text-xs space-y-1.5 font-mono">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#E0E0E0] text-[11px] uppercase">SCENE #{selectedScene.sceneNumber} INSPECTOR</span>
                <button
                  onClick={() => onNavigateToScene(selectedScene.id)}
                  className="text-[10px] text-[#CBA135] hover:underline font-bold uppercase"
                >
                  Breakdown →
                </button>
              </div>
              <p className="text-[10px] text-[#8E9299] line-clamp-2">{selectedScene.storyPurpose}</p>
              <div className="text-[9px] text-[#666]">
                LOCATION: {project.locations.find(l => l.id === selectedScene.locationId)?.name.toUpperCase() || 'DEFAULT'}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
