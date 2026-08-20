import React, { useState, useEffect } from 'react';
import { theLastSignalProject } from './data/theLastSignalDemo';
import { FilmProject, Shot, Character, Location, Scene, DialogueSegment, TimelineTrack, ContinuityItem, ProviderStatus } from './types/film';
import { FilmStudioApiClient } from './services/apiClient';
import { ShotListNavigationOptions } from './utils/shotReadiness';

// Components
import { HeaderNav } from './components/HeaderNav';
import { SidebarNav } from './components/SidebarNav';
import { ProjectDashboard } from './components/ProjectDashboard';
import { ScreenplayWorkspace } from './components/ScreenplayWorkspace';
import { StoryWorkspace } from './components/StoryWorkspace';
import { CharacterDepartment } from './components/CharacterDepartment';
import { LocationDepartment } from './components/LocationDepartment';
import { SceneBreakdown } from './components/SceneBreakdown';
import { ShotListWorkspace } from './components/ShotListWorkspace';
import { ShotDesignerModal } from './components/ShotDesignerModal';
import { StoryboardWorkspace } from './components/StoryboardWorkspace';
import { AIGenerationWorkspace } from './components/AIGenerationWorkspace';
import { DialogueDepartment } from './components/DialogueDepartment';
import { AudioMusicDepartment } from './components/AudioMusicDepartment';
import { TimelineWorkspace } from './components/TimelineWorkspace';
import { AIEditorModal } from './components/AIEditorModal';
import { ContinuityEngine } from './components/ContinuityEngine';
import { ProductionValidation } from './components/ProductionValidation';
import { ExportOpenMontage } from './components/ExportOpenMontage';
import { SettingsWorkspace } from './components/SettingsWorkspace';
import { AIAssistantDrawer } from './components/AIAssistantDrawer';
import { LiveVoiceDirectorModal } from './components/LiveVoiceDirectorModal';
import { ImageStudioModal } from './components/ImageStudioModal';

export function App() {
  const [project, setProject] = useState<FilmProject>(theLastSignalProject);
  const [currentTab, setCurrentTab] = useState<string>('PROJECT');
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [isLiveVoiceOpen, setIsLiveVoiceOpen] = useState(false);
  const [isImageStudioOpen, setIsImageStudioOpen] = useState(false);
  const [imageStudioTargetShot, setImageStudioTargetShot] = useState<Shot | undefined>(undefined);
  const [isAIEditorOpen, setIsAIEditorOpen] = useState(false);
  const [selectedDesignerShot, setSelectedDesignerShot] = useState<Shot | null>(null);
  const [providerStatus, setProviderStatus] = useState<ProviderStatus | null>(null);
  const [shotListNavigation, setShotListNavigation] = useState<ShotListNavigationOptions>({});

  // Fetch provider status on mount
  useEffect(() => {
    FilmStudioApiClient.getProviderStatus().then((status) => {
      setProviderStatus(status);
    });
  }, []);

  // Validation issues count
  const validationCount = 
    project.shots.filter(s => !s.storyboardImageUrl).length +
    project.shots.filter(s => s.status !== 'approved').length +
    project.continuityItems.filter(c => c.status !== 'resolved').length;

  // Handlers
  const handleOpenShotList = (options: ShotListNavigationOptions = {}) => {
    setShotListNavigation(options);
    setCurrentTab('SHOT_LIST');
  };

  const handleSelectTab = (tab: string) => {
    if (tab !== 'SHOT_LIST') setShotListNavigation({});
    setCurrentTab(tab);
  };

  const handleUpdateScreenplay = (newScript: string, extractedData?: any) => {
    if (extractedData) {
      setProject(prev => ({
        ...prev,
        screenplayText: newScript,
        acts: extractedData.acts || prev.acts,
        scenes: extractedData.scenes || prev.scenes,
        characters: extractedData.characters?.map((c: any, i: number) => ({
          id: `CHAR_${i + 1}`,
          name: c.name,
          role: c.role || 'Lead',
          age: c.age || '30',
          description: c.description || '',
          personality: c.personality || '',
          appearance: c.appearance || '',
          clothing: c.clothing || '',
          hair: 'Standard',
          facialFeatures: 'Clear',
          physicalCharacteristics: 'Standard',
          voiceDescription: c.voiceDescription || 'Clear voice',
          accent: c.accent || 'Standard',
          emotionalTraits: 'Dramatic',
          characterArc: c.characterArc || '',
          isLocked: false,
          referenceImages: [],
          prebuiltVoiceName: 'Kore' as const,
        })) || prev.characters,
        locations: extractedData.locations?.map((l: any, i: number) => ({
          id: `LOC_${i + 1}`,
          name: l.name,
          description: l.description || '',
          architecture: l.architecture || 'Cinematic set',
          environment: 'Indoor / Studio',
          timeOfDay: 'Night',
          weather: 'Clear',
          lighting: l.lighting || 'Cinematic',
          colorPalette: l.colorPalette || ['#000000', '#D97706'],
          isLocked: false,
          referenceImages: [],
          continuityNotes: '',
        })) || prev.locations,
        dialogueSegments: extractedData.dialogueSegments?.map((d: any, i: number) => ({
          id: `DLG_${i + 1}`,
          sceneId: `S0${d.sceneNumber || 1}`,
          characterId: 'CHAR_01',
          text: d.text,
          emotion: d.emotion || 'restrained',
          delivery: d.delivery || 'cinematic',
          estimatedDurationSec: 3.5,
          status: 'pending' as const,
          takes: [],
        })) || prev.dialogueSegments,
        updatedAt: new Date().toISOString(),
      }));
    } else {
      setProject(prev => ({
        ...prev,
        screenplayText: newScript,
        updatedAt: new Date().toISOString(),
      }));
    }
  };

  const handleUpdateShot = (updatedShot: Shot) => {
    setProject(prev => ({
      ...prev,
      shots: prev.shots.map(s => s.id === updatedShot.id ? updatedShot : s),
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleAddGeneratedShots = (sceneId: string, newShots: Shot[]) => {
    setProject(prev => ({
      ...prev,
      shots: [...prev.shots.filter(s => s.sceneId !== sceneId), ...newShots],
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleUpdateCharacter = (char: Character) => {
    setProject(prev => ({
      ...prev,
      characters: prev.characters.map(c => c.id === char.id ? char : c),
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleCreateCharacter = (char: Partial<Character>) => {
    setProject(prev => ({
      ...prev,
      characters: [...prev.characters, char as Character],
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleUpdateLocation = (loc: Location) => {
    setProject(prev => ({
      ...prev,
      locations: prev.locations.map(l => l.id === loc.id ? loc : l),
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleCreateLocation = (loc: Partial<Location>) => {
    setProject(prev => ({
      ...prev,
      locations: [...prev.locations, loc as Location],
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleUpdateScene = (sc: Scene) => {
    setProject(prev => ({
      ...prev,
      scenes: prev.scenes.map(s => s.id === sc.id ? sc : s),
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleUpdateDialogue = (seg: DialogueSegment) => {
    setProject(prev => ({
      ...prev,
      dialogueSegments: prev.dialogueSegments.map(d => d.id === seg.id ? seg : d),
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleCreateDialogue = (seg: Partial<DialogueSegment>) => {
    setProject(prev => ({
      ...prev,
      dialogueSegments: [...prev.dialogueSegments, seg as DialogueSegment],
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleUpdateContinuityItem = (item: ContinuityItem) => {
    setProject(prev => ({
      ...prev,
      continuityItems: prev.continuityItems.map(c => c.id === item.id ? item : c),
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleFixPromptContinuity = (item: ContinuityItem) => {
    // Automatically inject continuity tags into affected shots
    setProject(prev => ({
      ...prev,
      shots: prev.shots.map(shot => {
        if (item.shotIds.includes(shot.id)) {
          return {
            ...shot,
            prompt: `${shot.prompt}. [Continuity Verified: ${item.description}]`,
          };
        }
        return shot;
      }),
      continuityItems: prev.continuityItems.map(c => c.id === item.id ? { ...c, status: 'resolved' as const } : c),
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleBatchGenerate = (action: string) => {
    if (action === 'storyboards') {
      setCurrentTab('STORYBOARD');
    } else if (action === 'continuity_audit') {
      setCurrentTab('CONTINUITY');
    } else if (action === 'dialogue_voices') {
      setCurrentTab('DIALOGUE');
    }
  };

  const handleBatchGenerateStoryboards = (shotIds: string[]) => {
    // Navigate to Storyboard or trigger batch updates
    setCurrentTab('STORYBOARD');
  };

  const handleResetDemo = () => {
    setProject(theLastSignalProject);
  };

  const handleNewProject = () => {
    const emptyProj: FilmProject = {
      id: `proj_${Date.now()}`,
      title: 'UNTITLED CINEMATIC PROJECT',
      logline: 'Enter your screenplay premise here...',
      genre: 'Drama / Thriller',
      runtimeMin: 90,
      aspectRatio: '2.39:1 (Cinemascope)',
      resolution: '4K (3840x2160)',
      frameRate: 24,
      status: 'development',
      screenplayText: `TITLE: UNTITLED PROJECT\nWRITTEN BY: DIRECTOR\n\nEXT. SCENIC HORIZON - DUSK\n\nA lone silhouette stands at the precipice.`,
      acts: [
        { id: 'ACT_I', number: 1, title: 'Act I: The Inciting Incident', description: 'Opening sequence', sceneIds: ['S01'] }
      ],
      scenes: [
        {
          id: 'S01',
          actId: 'ACT_I',
          sceneNumber: 1,
          heading: 'EXT. SCENIC HORIZON - DUSK',
          locationId: 'LOC_01',
          timeOfDay: 'Dusk',
          weather: 'Clear',
          storyPurpose: 'Establish protagonist journey',
          characterIds: ['CHAR_01'],
          dialogueIds: [],
          actions: ['The protagonist observes the vast landscape'],
          props: ['Compass'],
          continuityNotes: 'Ensure atmospheric lighting consistency across shots.',
          estimatedRuntimeSec: 60,
          shotIds: [],
        }
      ],
      characters: [
        {
          id: 'CHAR_01',
          name: 'The Protagonist',
          role: 'Lead',
          age: '32',
          description: 'A resolute traveler searching for truth.',
          personality: 'Stoic, analytical',
          appearance: 'Weathered leather coat, sharp gaze',
          clothing: 'Field jacket and boots',
          hair: 'Short brown hair',
          facialFeatures: 'Determined expression',
          physicalCharacteristics: 'Athletic',
          voiceDescription: 'Deep baritone',
          accent: 'Standard',
          emotionalTraits: 'Focused',
          characterArc: 'Discovers inner strength',
          isLocked: false,
          referenceImages: [],
          prebuiltVoiceName: 'Kore',
        }
      ],
      locations: [
        {
          id: 'LOC_01',
          name: 'EXT. SCENIC HORIZON - DUSK',
          description: 'Vast dramatic mountain ridge overlooking a sunset basin.',
          architecture: 'Natural terrain',
          environment: 'Open mountain peak with gentle breeze',
          timeOfDay: 'Golden Hour Dusk',
          weather: 'Clear sky',
          lighting: 'Golden directional backlight with cool ambient sky fill',
          colorPalette: ['#1E1B18', '#D97706', '#3B82F6'],
          isLocked: false,
          referenceImages: [],
          continuityNotes: 'Sunset illumination from west.',
        }
      ],
      shots: [],
      dialogueSegments: [],
      sfxCues: [],
      musicCues: [],
      timelineTracks: [
        { id: 'track_v1', name: 'V1: Video', type: 'video', isLocked: false, isMuted: false, color: '#D97706', clips: [] },
        { id: 'track_a1', name: 'A1: Dialogue', type: 'dialogue', isLocked: false, isMuted: false, color: '#10B981', clips: [] },
        { id: 'track_a2', name: 'A2: SFX', type: 'sfx', isLocked: false, isMuted: false, color: '#F59E0B', clips: [] },
        { id: 'track_a3', name: 'A3: Music', type: 'music', isLocked: false, isMuted: false, color: '#06B6D4', clips: [] },
      ],
      continuityItems: [],
      productionNotes: ['OpenMontage project framework initialized.'],
      assets: [],
      generationJobs: [],
      zeroBudget: {
        enabled: true,
        maxBudgetUsd: 5.00,
        spentBudgetUsd: 0,
        allowPaidWithConfirmation: true
      },
      studioBranding: {
        studioName: 'SYNAPSE NEURAL PICTURES',
        titleCard: 'UNTITLED CINEMATIC PROJECT',
        subtitle: 'AN AI PRODUCTION SYSTEM',
        tagline: 'PRE-VISUALIZED IN SYNAPSE STUDIO',
        animationStyle: 'cinematic_push',
        soundStinger: 'deep_pulse',
        durationSec: 3.5
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setProject(emptyProj);
    setCurrentTab('SCREENPLAY');
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-neutral-950 text-neutral-100 font-sans overflow-hidden antialiased select-none">
      {/* Top Main Navigation */}
      <HeaderNav
        project={project}
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onOpenAssistant={() => setIsAssistantOpen(true)}
        onOpenLiveVoice={() => setIsLiveVoiceOpen(true)}
        onOpenImageStudio={() => {
          setImageStudioTargetShot(undefined);
          setIsImageStudioOpen(true);
        }}
        onOpenValidation={() => setCurrentTab('VALIDATION')}
        onOpenAIEditor={() => setIsAIEditorOpen(true)}
        validationCount={validationCount}
        providerStatus={providerStatus}
        onResetDemo={handleResetDemo}
        onNewProject={handleNewProject}
      />

      {/* Main Studio Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Department Sidebar Navigation */}
        <SidebarNav
          currentTab={currentTab}
          onSelectTab={handleSelectTab}
          shotCount={project.shots.length}
          dialogueCount={project.dialogueSegments.length}
        />

        {/* Workspace Canvas */}
        <main className="flex-1 overflow-hidden relative">
          {currentTab === 'PROJECT' && (
            <ProjectDashboard
              project={project}
              onNavigate={setCurrentTab}
              onBatchGenerate={handleBatchGenerate}
              onOpenShotList={handleOpenShotList}
            />
          )}

          {currentTab === 'SCREENPLAY' && (
            <ScreenplayWorkspace
              project={project}
              onUpdateScreenplay={handleUpdateScreenplay}
              onNavigateToScene={(scId) => {
                setCurrentTab('SCENES');
              }}
            />
          )}

          {currentTab === 'STORY' && (
            <StoryWorkspace
              project={project}
              onUpdateProject={(upd) => setProject(p => ({ ...p, ...upd }))}
            />
          )}

          {currentTab === 'CHARACTERS' && (
            <CharacterDepartment
              characters={project.characters}
              onUpdateCharacter={handleUpdateCharacter}
              onCreateCharacter={handleCreateCharacter}
            />
          )}

          {currentTab === 'LOCATIONS' && (
            <LocationDepartment
              locations={project.locations}
              onUpdateLocation={handleUpdateLocation}
              onCreateLocation={handleCreateLocation}
            />
          )}

          {currentTab === 'SCENES' && (
            <SceneBreakdown
              project={project}
              onUpdateScene={handleUpdateScene}
              onAddGeneratedShots={handleAddGeneratedShots}
              onSelectShot={(shot) => setSelectedDesignerShot(shot)}
            />
          )}

          {currentTab === 'SHOT_LIST' && (
            <ShotListWorkspace
              project={project}
              onSelectShot={(shot) => setSelectedDesignerShot(shot)}
              onUpdateShot={handleUpdateShot}
              onOpenShotDesigner={(shot) => setSelectedDesignerShot(shot)}
              onBatchGenerateStoryboards={handleBatchGenerateStoryboards}
              initialSceneId={shotListNavigation.sceneId}
              initialReadinessFilter={shotListNavigation.readinessFilter}
            />
          )}

          {currentTab === 'STORYBOARD' && (
            <StoryboardWorkspace
              project={project}
              onUpdateShot={handleUpdateShot}
              onOpenShotDesigner={(shot) => setSelectedDesignerShot(shot)}
              onBatchGenerateAll={() => handleBatchGenerate('storyboards')}
              onOpenImageStudio={(shot) => {
                setImageStudioTargetShot(shot);
                setIsImageStudioOpen(true);
              }}
            />
          )}

          {currentTab === 'AI_GENERATION' && (
            <AIGenerationWorkspace
              project={project}
              onUpdateShot={handleUpdateShot}
            />
          )}

          {currentTab === 'DIALOGUE' && (
            <DialogueDepartment
              project={project}
              onUpdateDialogue={handleUpdateDialogue}
              onCreateDialogue={handleCreateDialogue}
            />
          )}

          {currentTab === 'AUDIO' && (
            <AudioMusicDepartment
              project={project}
              onUpdateSFX={(sfx) => {
                setProject(prev => ({
                  ...prev,
                  sfxCues: prev.sfxCues.map(s => s.id === sfx.id ? s : s),
                }));
              }}
              onUpdateMusic={(music) => {
                setProject(prev => ({
                  ...prev,
                  musicCues: prev.musicCues.map(m => m.id === music.id ? m : m),
                }));
              }}
            />
          )}

          {currentTab === 'MUSIC' && (
            <AudioMusicDepartment
              project={project}
              onUpdateSFX={(sfx) => {
                setProject(prev => ({
                  ...prev,
                  sfxCues: prev.sfxCues.map(s => s.id === sfx.id ? s : s),
                }));
              }}
              onUpdateMusic={(music) => {
                setProject(prev => ({
                  ...prev,
                  musicCues: prev.musicCues.map(m => m.id === music.id ? m : m),
                }));
              }}
            />
          )}

          {currentTab === 'TIMELINE' && (
            <TimelineWorkspace
              project={project}
              onUpdateTracks={(tracks) => setProject(p => ({ ...p, timelineTracks: tracks }))}
              onOpenAIEditor={() => setIsAIEditorOpen(true)}
            />
          )}

          {currentTab === 'CONTINUITY' && (
            <ContinuityEngine
              project={project}
              onUpdateContinuityItem={handleUpdateContinuityItem}
              onFixPromptContinuity={handleFixPromptContinuity}
            />
          )}

          {currentTab === 'VALIDATION' && (
            <ProductionValidation
              project={project}
              onNavigate={setCurrentTab}
            />
          )}

          {currentTab === 'EXPORT' && (
            <ExportOpenMontage
              project={project}
              onImportProject={(imported) => setProject(imported)}
            />
          )}

          {currentTab === 'SETTINGS' && (
            <SettingsWorkspace
              project={project}
              onUpdateProject={(upd) => setProject(p => ({ ...p, ...upd }))}
              providerStatus={providerStatus}
            />
          )}
        </main>
      </div>

      {/* Shot Designer Deep Modal */}
      {selectedDesignerShot && (
        <ShotDesignerModal
          shot={selectedDesignerShot}
          project={project}
          onClose={() => setSelectedDesignerShot(null)}
          onUpdateShot={(updated) => {
            handleUpdateShot(updated);
            setSelectedDesignerShot(null);
          }}
        />
      )}

      {/* AI Film Editor Smart Assembly Modal */}
      {isAIEditorOpen && (
        <AIEditorModal
          project={project}
          onClose={() => setIsAIEditorOpen(false)}
          onApplyAssembly={(newTracks) => {
            setProject(p => ({ ...p, timelineTracks: newTracks }));
            setCurrentTab('TIMELINE');
          }}
        />
      )}

      {/* AI Production Assistant Drawer */}
      <AIAssistantDrawer
        project={project}
        isOpen={isAssistantOpen}
        onClose={() => setIsAssistantOpen(false)}
        onNavigateToTab={(tab) => {
          setCurrentTab(tab);
          setIsAssistantOpen(false);
        }}
        onOpenLiveVoice={() => {
          setIsAssistantOpen(false);
          setIsLiveVoiceOpen(true);
        }}
      />

      {/* Live Voice Director Modal (Live API Audio Streaming) */}
      <LiveVoiceDirectorModal
        project={project}
        isOpen={isLiveVoiceOpen}
        onClose={() => setIsLiveVoiceOpen(false)}
      />

      {/* Image Studio Modal (gemini-3.1-flash-image-preview Text-to-Image & Retouch) */}
      <ImageStudioModal
        project={project}
        isOpen={isImageStudioOpen}
        onClose={() => {
          setIsImageStudioOpen(false);
          setImageStudioTargetShot(undefined);
        }}
        targetShot={imageStudioTargetShot}
        onSaveImageToShot={(shotId, imageUrl) => {
          const target = project.shots.find(s => s.id === shotId);
          if (target) {
            handleUpdateShot({
              ...target,
              storyboardImageUrl: imageUrl,
              status: 'review',
            });
          }
        }}
      />
    </div>
  );
}

export default App;
