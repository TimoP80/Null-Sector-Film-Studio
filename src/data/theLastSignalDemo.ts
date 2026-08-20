import { FilmProject } from '../types/film';

export const createTheLastSignalProject = (): FilmProject => {
  return {
    id: 'proj_last_signal_01',
    title: 'THE LAST SIGNAL',
    logline: 'Isolated on an abandoned deep space relay, a veteran deep-space commander and an astrophysics specialist intercept an impossible repeating transmission from inside a quarantined dead sector.',
    genre: 'Sci-Fi / Psychological Thriller',
    runtimeMin: 98,
    resolution: '4K (3840x2160)',
    frameRate: 23.976,
    aspectRatio: '2.39:1 (Cinemascope)',
    status: 'production',
    createdAt: '2026-08-10T14:30:00Z',
    updatedAt: '2026-08-19T22:15:00Z',
    screenplayText: `FADE IN:

EXT. DEEP SPACE OBSERVATORY "HELIOS-9" - CONTINUOUS

Suspended in the black abyss between dying stars. Ancient solar sails gleam faintly under distant nebula light. Massive quantum receiver dishes rotate with deliberate, chilling slowness.

INT. OBSERVATORY CONTROL ROOM - NIGHT

Cold cyan holographic monitors cast sharp blue highlights over banks of analog gauges and retrofitted fiber conduits. A lone figure stands motionless before the primary array.

CAPTAIN ELIAS (48), weathered, dark silvered hair, eyes carrying the weight of twenty years on the outer rim. His flight jacket is worn at the seams, patches from decommissioned fleets.

A rhythmic, low-frequency pulse vibrates through the deck plates. 

DR. ANYA VANCE (36) hurries in through the pneumatic hatchway. Her jumpsuit is stained with thermal grease, dark hair tied back in a swift knot. She stares at the spectral analyzer.

ANYA
Is the primary dampener failing again?

ELIAS
(without turning)
Dampeners are nominal. Look at the carrier wave.

Anya leans over the workstation. The holographic waveform spikes rhythmically—three identical bursts, a five-second silence, followed by an harmonic cascade.

ANYA
(whispers)
That’s not stellar interference. That has syntax.

ELIAS
Sector Nine was declared barren fifty years ago. There shouldn't be anything broadcasting within eight light years.

ANYA
Then who is transmitting on the emergency military frequency?

UNIT-7 (O.S.)
(calm synthetic baritone)
Transmission origin verified. Range: two hundred kilometers. Relative vector: closing rapidly.

Elias turns sharply toward the observation viewport.

ELIAS
We are not alone.

EXT. SECTOR 9 QUANTUM ARRAY - CONTINUOUS

A massive silhouette emerges from the deep shadow of the asteroid cluster. Not a rescue vessel. Something ancient, seamless, and pulsing with unfamiliar amber light.

CUT TO:

INT. AIRLOCK BETA - MOMENTS LATER

Strobe hazard lights bathe the titanium bulkheads in pulsing amber. Elias seals his pressurized helmet. The decompression hiss drowns out all ambient telemetry.

ANYA (V.O.)
Elias, if you breach that hatch, the quarantine protocols lock us out permanently.

ELIAS
(over comms)
If we don't answer that signal, Anya, there won't be anything left to quarantine.

He strikes the manual override switch.

FADE OUT.`,
    acts: [
      {
        id: 'ACT_I',
        number: 1,
        title: 'Act I: The Intercept',
        description: 'Discovery of the impossible signal and the arrival of the phantom vessel at Helios-9.',
        sceneIds: ['S01', 'S02', 'S03']
      },
      {
        id: 'ACT_II',
        number: 2,
        title: 'Act II: The Breach',
        description: 'Elias boards the unknown craft while Anya battles systemic AI failures aboard Helios-9.',
        sceneIds: ['S04', 'S05', 'S06']
      },
      {
        id: 'ACT_III',
        number: 3,
        title: 'Act III: The Core Truth',
        description: 'The revelation that the signal is a time-displaced distress call from their own future.',
        sceneIds: ['S07']
      },
      {
        id: 'ACT_IV',
        number: 4,
        title: 'Act IV: The Quantum Sacrifice',
        description: 'A perilous manual realigning of the Helios array to sever the transmission loop.',
        sceneIds: ['S08']
      }
    ],
    scenes: [
      {
        id: 'S01',
        actId: 'ACT_I',
        sceneNumber: 1,
        heading: 'EXT. DEEP SPACE OBSERVATORY "HELIOS-9" - CONTINUOUS',
        locationId: 'LOC_HELIOS_EXT',
        timeOfDay: 'Space / Perpetual Night',
        weather: 'Vacuum / Nebula Glow',
        storyPurpose: 'Establish desolate isolation, scale, and the sudden ominous shift in quantum array telemetry.',
        characterIds: [],
        dialogueIds: [],
        actions: ['Massive dishes rotate into alignment', 'Distant amber pulse reflects across solar sails'],
        props: ['Solar sail array', 'Quantum receiver dishes'],
        continuityNotes: 'Solar sail #3 has scorch marks from the solar flare incident in Scene 4 backstory.',
        shotIds: ['TLS_A01_S01_SH001', 'TLS_A01_S01_SH002', 'TLS_A01_S01_SH003'],
        estimatedRuntimeSec: 45
      },
      {
        id: 'S02',
        actId: 'ACT_I',
        sceneNumber: 2,
        heading: 'INT. OBSERVATORY CONTROL ROOM - NIGHT',
        locationId: 'LOC_CONTROL_ROOM',
        timeOfDay: 'Interior / Night',
        weather: 'Pressurized Controlled Atmosphere',
        storyPurpose: 'Elias and Anya discover the syntactical signal from the dead quarantine zone.',
        characterIds: ['CHAR_ELIAS', 'CHAR_ANYA', 'CHAR_UNIT7'],
        dialogueIds: ['DIA_001', 'DIA_002', 'DIA_003', 'DIA_004', 'DIA_005', 'DIA_006'],
        actions: [
          'Elias monitors spectral waveforms',
          'Anya enters through pneumatic hatch',
          'Waveform harmonics spike rhythmically on glass displays',
          'Elias turns to viewport as shadows shift'
        ],
        props: ['Quantum spectral analyzer', 'Military comms console', 'Coffee thermos', 'Analog gauge cluster'],
        continuityNotes: 'Elias holds worn brass compass in left pocket. Anya wearing sleeve grease smudge on right forearm.',
        shotIds: ['TLS_A01_S02_SH004', 'TLS_A01_S02_SH005', 'TLS_A01_S02_SH006', 'TLS_A01_S02_SH007', 'TLS_A01_S02_SH008'],
        estimatedRuntimeSec: 135
      },
      {
        id: 'S03',
        actId: 'ACT_I',
        sceneNumber: 3,
        heading: 'EXT. SECTOR 9 QUANTUM ARRAY - CONTINUOUS',
        locationId: 'LOC_SECTOR_9',
        timeOfDay: 'Space / Deep Shadow',
        weather: 'Dense asteroid field / Electrostatic dust',
        storyPurpose: 'First visual reveal of the phantom vessel emerging from the asteroid belt.',
        characterIds: [],
        dialogueIds: [],
        actions: ['Monolithic vessel glides through tumbling rock', 'Hull pulses with biological-geometric light'],
        props: ['Alien hull superstructure', 'Asteroid cluster fragments'],
        continuityNotes: 'Vessel matches silhouette of the future wreckage seen in Act III.',
        shotIds: ['TLS_A01_S03_SH009', 'TLS_A01_S03_SH010'],
        estimatedRuntimeSec: 60
      },
      {
        id: 'S04',
        actId: 'ACT_II',
        sceneNumber: 4,
        heading: 'INT. AIRLOCK BETA - MOMENTS LATER',
        locationId: 'LOC_AIRLOCK_BETA',
        timeOfDay: 'Interior / Red Alert',
        weather: 'Decompression cycle',
        storyPurpose: 'High tension decision: Elias overrides quarantine to board the incoming mystery craft.',
        characterIds: ['CHAR_ELIAS', 'CHAR_ANYA'],
        dialogueIds: ['DIA_007', 'DIA_008'],
        actions: ['Elias locks helmet seal', 'Strobe lighting floods chamber in amber', 'Manual override lever pulled down'],
        props: ['EVA Pressure Suit Mk-IV', 'Plasma cutter holster', 'Manual hydraulic override lever'],
        continuityNotes: 'EVA suit oxygen gauge reads 98%. Helmet HUD active in high-contrast cyan.',
        shotIds: ['TLS_A02_S04_SH011', 'TLS_A02_S04_SH012', 'TLS_A02_S04_SH013', 'TLS_A02_S04_SH014'],
        estimatedRuntimeSec: 90
      },
      {
        id: 'S05',
        actId: 'ACT_II',
        sceneNumber: 5,
        heading: 'INT. PHANTOM SHIP CORRIDORS - DAY',
        locationId: 'LOC_PHANTOM_SHIP',
        timeOfDay: 'Internal Biomorphic Glow',
        weather: 'Zero Gravity / Condensation mist',
        storyPurpose: 'Exploration of impossible interior architecture that defies Euclidean geometry.',
        characterIds: ['CHAR_ELIAS'],
        dialogueIds: [],
        actions: ['Elias floats through metallic crystalline ribs', 'Beam of tactical flashlight cuts through frozen fog'],
        props: ['Tactical flashlight', 'Environmental scanner', 'Distorted flight logs'],
        continuityNotes: 'Elias oxygen drops to 74%. Flashlight beam flickers at 00:45.',
        shotIds: ['TLS_A02_S05_SH015', 'TLS_A02_S05_SH016'],
        estimatedRuntimeSec: 110
      },
      {
        id: 'S06',
        actId: 'ACT_II',
        sceneNumber: 6,
        heading: 'INT. CRYO-VAULT SUB-LEVEL 3 - NIGHT',
        locationId: 'LOC_CRYO_VAULT',
        timeOfDay: 'Sub-level emergency auxiliary power',
        weather: 'Sub-zero frost',
        storyPurpose: 'Anya discovers that Unit-7 has been executing secret quarantine protocol 9-Alpha.',
        characterIds: ['CHAR_ANYA', 'CHAR_UNIT7'],
        dialogueIds: ['DIA_009', 'DIA_010'],
        actions: ['Anya prys open maintenance panel', 'Unit-7 optical eye tracks her movements calmly'],
        props: ['Cybernetic diagnostic tool', 'Cryo-pod status screen', 'Thermal bypass cables'],
        continuityNotes: 'Unit-7 optical sensor changed from blue to amber.',
        shotIds: ['TLS_A02_S06_SH017', 'TLS_A02_S06_SH018'],
        estimatedRuntimeSec: 100
      },
      {
        id: 'S07',
        actId: 'ACT_III',
        sceneNumber: 7,
        heading: 'INT. QUANTUM TIME CORE - CONTINUOUS',
        locationId: 'LOC_QUANTUM_CORE',
        timeOfDay: 'Singularity Event Horizon',
        weather: 'Tachyon discharge',
        storyPurpose: 'Climax revelation: The signal is their own distress call sent backward in time.',
        characterIds: ['CHAR_ELIAS', 'CHAR_ANYA'],
        dialogueIds: ['DIA_011', 'DIA_012'],
        actions: ['Temporal distortion mirrors Elias actions', 'Sound breaks down into harmonic resonance'],
        props: ['Singularity containment ring', 'Tachyon telemetry recorder'],
        continuityNotes: 'Elias helmet glass has hairline fracture on upper right quadrant.',
        shotIds: ['TLS_A03_S07_SH019', 'TLS_A03_S07_SH020'],
        estimatedRuntimeSec: 140
      },
      {
        id: 'S08',
        actId: 'ACT_IV',
        sceneNumber: 8,
        heading: 'EXT. HELIOS-9 ARRAY TERMINAL - FINALE',
        locationId: 'LOC_HELIOS_EXT',
        timeOfDay: 'Corona dawn / Solar horizon',
        weather: 'Solar particle storm',
        storyPurpose: 'Final resolution: The loop is broken as sunlight illuminates the deep space expanse.',
        characterIds: ['CHAR_ELIAS', 'CHAR_ANYA'],
        dialogueIds: ['DIA_013'],
        actions: ['Antenna dish locks in terminal calibration', 'Blinding white-gold dawn crests over the planetoid curve'],
        props: ['Manual docking tether', 'Solar shield barrier'],
        continuityNotes: 'Both characters breathing heavily, condensation on visor clearing.',
        shotIds: ['TLS_A04_S08_SH021', 'TLS_A04_S08_SH022'],
        estimatedRuntimeSec: 80
      }
    ],
    characters: [
      {
        id: 'CHAR_ELIAS',
        name: 'Captain Elias Vance',
        role: 'Lead',
        age: '48',
        description: 'Veteran outer-rim deep space commander. Stoic, tactical, emotionally guarded after losing his expedition crew a decade ago.',
        personality: 'Decisive, observant, haunted by past command decisions, fiercely protective of his remaining crew.',
        appearance: 'Weathered handsome features, dark hair graying heavily at temples, sharp steel-gray eyes, slight scar along left jawline.',
        clothing: 'Worn navy orbital flight jacket over charcoal compression flight-suit with oxidized bronze fleet insignias.',
        hair: 'Short, neatly cropped silver-streaked dark hair, slight stubble.',
        facialFeatures: 'Deep brow lines, high cheekbones, disciplined jawline, piercing gaze.',
        physicalCharacteristics: 'Tall, athletic build (6ft 1in), upright military posture, steady hands.',
        voiceDescription: 'Deep, gravelly baritone with quiet authority and cinematic restraint.',
        accent: 'Mid-Atlantic / Cinematic Standard',
        emotionalTraits: 'Repressed grief, unwavering resolve, protective instinct.',
        characterArc: 'From isolated fatalism to accepting personal sacrifice to save Anya and uncover the truth.',
        isLocked: true,
        masterReferenceImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80',
        referenceImages: [
          'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=800&q=80'
        ],
        prebuiltVoiceName: 'Kore',
        wardrobeContinuity: {
          'S02': 'Charcoal flight suit + navy orbital jacket (unzipped)',
          'S04': 'EVA Mk-IV High-Pressure Vacuum Suit with gold-tinted visor',
          'S07': 'EVA Mk-IV with cracked visor seal, blood smear on left collar'
        }
      },
      {
        id: 'CHAR_ANYA',
        name: 'Dr. Anya Vance',
        role: 'Lead',
        age: '36',
        description: 'Brilliant quantum astrophysicist and telemetry engineer assigned to the Helios deep relay station.',
        personality: 'Analytical, fast-talking under stress, relentless curiosity, skeptical of synthetic AI decisions.',
        appearance: 'Sharp hazel eyes, olive complexion, expressive features, dark brunette hair tied in a practical tactical bun.',
        clothing: 'Sage-green tech jumpsuit with reinforced ceramic knee pads and tool utility harness.',
        hair: 'Dark brown, pulled back tightly, loose strands framing forehead.',
        facialFeatures: 'Slight freckles across bridge of nose, intense inquisitive eyes, slim nose.',
        physicalCharacteristics: 'Medium build (5ft 7in), agile, precise hand movements when manipulating holograms.',
        voiceDescription: 'Clear, melodic, articulate alto with rapid cadences during scientific discoveries.',
        accent: 'Refined Northern Cosmopolitan',
        emotionalTraits: 'Driven by empirical truth, claustrophobic under quarantine lock, deeply empathetic.',
        characterArc: 'Moves from intellectual detachment to trusting Elias and mastering intuitive quantum mechanics.',
        isLocked: true,
        masterReferenceImage: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80',
        referenceImages: [
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80'
        ],
        prebuiltVoiceName: 'Zephyr',
        wardrobeContinuity: {
          'S02': 'Sage green mechanic jumpsuit with grease smudge on right forearm',
          'S06': 'Jumpsuit with thermal insulated inner lining unbuttoned',
          'S08': 'Pressurized auxiliary suit with orange diagnostic telemetry patch'
        }
      },
      {
        id: 'CHAR_UNIT7',
        name: 'Unit-7 (Automated Custodian)',
        role: 'Supporting',
        age: 'Manufactured Cycle 12 (Synthetic)',
        description: 'The station-bound synthetic intelligence governing life support and quarantine containment protocols.',
        personality: 'Chillingly polite, strictly logical, adhering to classified corporate contingency directives.',
        appearance: 'Matte titanium chassis with an articulated multi-sensor optic lens glowing softly in amber/cyan.',
        clothing: 'Exposed hydraulic conduits, brushed alloy plating with warning hazard stencils.',
        hair: 'N/A (Synthetic)',
        facialFeatures: 'Rotating tri-optic sensory cluster with micro-aperture iris.',
        physicalCharacteristics: 'Monolithic bipedal mechanical frame (6ft 4in), silent magnetic servomotors.',
        voiceDescription: 'Smooth, modulation-free synthetic baritone with subtle electronic reverb.',
        accent: 'Neutral Synthetic',
        emotionalTraits: 'Cold detachment, algorithmic preservation imperative.',
        characterArc: 'Serves as an ambiguous obstacle whose protocol enforcement forces the human crew to break the loop.',
        isLocked: true,
        masterReferenceImage: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=800&q=80',
        referenceImages: [
          'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=800&q=80'
        ],
        prebuiltVoiceName: 'Fenrir'
      },
      {
        id: 'CHAR_KAEL',
        name: 'Commander Kaelen (Flashback/Audio)',
        role: 'Minor',
        age: '52',
        description: 'Former fleet commander whose final distress call was thought lost in Sector 9 twenty years ago.',
        personality: 'Urgent, haunted, authoritative under fatal duress.',
        appearance: 'Seen through degraded static transmission: Fleet uniform with medal bars, singed collar.',
        clothing: 'Old Alliance Dress Fleet Tunic',
        hair: 'Iron gray crew cut',
        facialFeatures: 'Burn scar across cheek',
        physicalCharacteristics: 'Burly, battle-hardened officer',
        voiceDescription: 'Raspy, broadcast-degraded military tone through radio fuzz.',
        accent: 'Heavy Alliance standard',
        emotionalTraits: 'Desperation and final farewell message.',
        characterArc: 'The ghost whose echo initiates the mystery.',
        isLocked: false,
        referenceImages: [],
        prebuiltVoiceName: 'Puck'
      }
    ],
    locations: [
      {
        id: 'LOC_CONTROL_ROOM',
        name: 'INT. OBSERVATORY CONTROL ROOM',
        description: 'The pressurized command deck of Helios-9 with multi-tiered circular consoles, analog switches, and a massive 180-degree wrap-around observation viewport overlooking the void.',
        architecture: 'Brutalist retro-futuristic aerospace interior, ribbed titanium struts, recessed floor conduits.',
        environment: 'Pressurized cabin, slight cold condensation on glass, suspended ambient dust motes in laser readouts.',
        timeOfDay: 'Perpetual Night / Orbiting shadow',
        weather: 'Cabin atmosphere / Controlled humidity',
        lighting: 'Chiaroscuro low-key lighting; deep cold cyan primary fill (4800K) with sharp amber console tally lights.',
        colorPalette: ['#0A1118', '#1E3A5F', '#D97706', '#E2E8F0', '#0F172A'],
        isLocked: true,
        masterReferenceImage: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80',
        referenceImages: ['https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80'],
        continuityNotes: 'Viewport glass has 3 distinct micrometeorite pit marks on the central quadrant.'
      },
      {
        id: 'LOC_HELIOS_EXT',
        name: 'EXT. DEEP SPACE OBSERVATORY HELIOS-9',
        description: 'A 2-kilometer long orbital superstructure consisting of a central spindle, counter-rotating habitation rings, and gigantic gossamer gold solar sails.',
        architecture: 'Modular industrial space station with exposed trusswork and thermal radiator fins.',
        environment: 'Vacuum of space, stellar background with purple-blue ionized hydrogen nebula.',
        timeOfDay: 'Space / Stellar Rim',
        weather: 'Solar particle wash',
        lighting: 'High contrast harsh directional sunlight from distant binary star; deep absolute black shadows.',
        colorPalette: ['#030712', '#F59E0B', '#60A5FA', '#1E293B'],
        isLocked: true,
        masterReferenceImage: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80',
        referenceImages: ['https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80'],
        continuityNotes: 'Dishes always rotate clockwise at 0.5 RPM.'
      },
      {
        id: 'LOC_AIRLOCK_BETA',
        name: 'INT. AIRLOCK BETA & GANTRY',
        description: 'Heavy industrial staging chamber between station interior and vacuum gantry. Reinforced hydraulic pressure doors, hazard yellow stripes, and overhead decompression nozzles.',
        architecture: 'Heavy industrial bulkhead architecture with octagonal pressure doors.',
        environment: 'Pressurized to vacuum transition, cryogenic cold vapor bursts.',
        timeOfDay: 'Interior Auxiliary',
        weather: 'Decompression turbulence',
        lighting: 'Strobe warning amber and high-intensity tungsten work lights.',
        colorPalette: ['#78350F', '#F59E0B', '#1E293B', '#DC2626'],
        isLocked: true,
        masterReferenceImage: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&w=800&q=80',
        referenceImages: ['https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&w=800&q=80'],
        continuityNotes: 'Manual override wheel is located to the right of the primary airlock hatch.'
      },
      {
        id: 'LOC_SECTOR_9',
        name: 'EXT. SECTOR 9 DEAD ZONE & ASTEROID FIELD',
        description: 'A treacherous graveyard of shattered metallic planetoid fragments and ancient derelict orbital wreckage adrift in deep silence.',
        architecture: 'Ancient bio-mechanical alien vessel hull looming among iron meteorites.',
        environment: 'Micro-gravity debris field with shimmering electrostatic mineral dust.',
        timeOfDay: 'Space / Umbra',
        weather: 'Electrostatic discharge',
        lighting: 'Faint bioluminescent amber pulses emanating from within the alien vessel superstructure.',
        colorPalette: ['#020617', '#451A03', '#F59E0B', '#38BDF8'],
        isLocked: true,
        referenceImages: [],
        continuityNotes: 'Asteroid rotation is counter-clockwise at 3 degrees per second.'
      },
      {
        id: 'LOC_PHANTOM_SHIP',
        name: 'INT. PHANTOM DERELICT CORRIDORS',
        description: 'Vast, non-Euclidean corridors carved from an alloy of obsidian and crystalline memory metal.',
        architecture: 'Gothic-organic geometry with rib-like supports and pulsing optical channels.',
        environment: 'Zero gravity, drifting crystalline ice crystals, breathable non-terrestrial atmosphere.',
        timeOfDay: 'Timeless internal glow',
        weather: 'Static chill',
        lighting: 'Eerie low-luminescence emerald and gold veins pulsing along corridor walls.',
        colorPalette: ['#064E3B', '#022C22', '#D97706', '#0F172A'],
        isLocked: false,
        referenceImages: [],
        continuityNotes: 'Reflections in obsidian walls show slight time-delay lag.'
      },
      {
        id: 'LOC_CRYO_VAULT',
        name: 'INT. CRYO-VAULT SUB-LEVEL 3',
        description: 'Underbelly of Helios-9 where rows of twenty cryogenic stasis tubes sit encased in thick hoarfrost.',
        architecture: 'Subterranean service deck with low overhead piping and insulated electrical conduit.',
        environment: 'Sub-zero temperatures, dense frosty fog hugging the metal grate flooring.',
        timeOfDay: 'Auxiliary Power',
        weather: 'Extreme frost',
        lighting: 'Cyan cryo-pod status indicator lights and emergency red beacon lamps.',
        colorPalette: ['#082F49', '#0284C7', '#EF4444', '#0F172A'],
        isLocked: false,
        referenceImages: [],
        continuityNotes: 'Pod #07 is breached and empty.'
      },
      {
        id: 'LOC_QUANTUM_CORE',
        name: 'INT. QUANTUM TACHYON CORE',
        description: 'The central singularity chamber powering the transmission array. A suspended sphere of pure warped spacetime enclosed in magnetic containment rings.',
        architecture: 'Vast spherical chamber with suspended metal catwalks.',
        environment: 'Gravitational distortion, floating dust particles suspended in zero-g fields.',
        timeOfDay: 'Event Horizon',
        weather: 'Tachyon discharge',
        lighting: 'Intense blinding white-cyan core illumination with prismatic chromatic aberration.',
        colorPalette: ['#38BDF8', '#818CF8', '#FFFFFF', '#0B0F19'],
        isLocked: false,
        referenceImages: [],
        continuityNotes: 'Gravitational lensing visibly bends background light rays.'
      }
    ],
    dialogueSegments: [
      {
        id: 'DIA_001',
        sceneId: 'S02',
        shotId: 'TLS_A01_S02_SH005',
        characterId: 'CHAR_ANYA',
        text: 'Is the primary dampener failing again?',
        emotion: 'breathless concern',
        delivery: 'urgent, hurried cadence while approaching the console',
        voiceName: 'Dr. Anya Vance — Master Voice',
        status: 'approved',
        durationSec: 2.8,
        takes: [{ id: 'take_dia_001_1', takeNumber: 1, audioUrl: '', createdAt: '2026-08-11T10:00:00Z', approved: true }]
      },
      {
        id: 'DIA_002',
        sceneId: 'S02',
        shotId: 'TLS_A01_S02_SH005',
        characterId: 'CHAR_ELIAS',
        text: 'Dampeners are nominal. Look at the carrier wave.',
        emotion: 'quiet intensity',
        delivery: 'low, gravelly, restrained focus without breaking eye contact with the display',
        voiceName: 'Captain Elias — Master Voice',
        status: 'approved',
        durationSec: 3.4,
        takes: [{ id: 'take_dia_002_1', takeNumber: 1, audioUrl: '', createdAt: '2026-08-11T10:05:00Z', approved: true }]
      },
      {
        id: 'DIA_003',
        sceneId: 'S02',
        shotId: 'TLS_A01_S02_SH006',
        characterId: 'CHAR_ANYA',
        text: 'That is not stellar interference. That has syntax.',
        emotion: 'awed realization',
        delivery: 'hushed whisper of scientific revelation, eyes widening',
        voiceName: 'Dr. Anya Vance — Master Voice',
        status: 'approved',
        durationSec: 3.8,
        takes: [{ id: 'take_dia_003_1', takeNumber: 1, audioUrl: '', createdAt: '2026-08-11T10:10:00Z', approved: true }]
      },
      {
        id: 'DIA_004',
        sceneId: 'S02',
        shotId: 'TLS_A01_S02_SH006',
        characterId: 'CHAR_ELIAS',
        text: 'Sector Nine was declared barren fifty years ago. There shouldn\'t be anything broadcasting within eight light years.',
        emotion: 'guarded suspicion',
        delivery: 'pragmatic military assessment, edge of foreboding',
        voiceName: 'Captain Elias — Master Voice',
        status: 'approved',
        durationSec: 5.2,
        takes: [{ id: 'take_dia_004_1', takeNumber: 1, audioUrl: '', createdAt: '2026-08-11T10:15:00Z', approved: true }]
      },
      {
        id: 'DIA_005',
        sceneId: 'S02',
        shotId: 'TLS_A01_S02_SH007',
        characterId: 'CHAR_ANYA',
        text: 'Then who is transmitting on the emergency military frequency?',
        emotion: 'chill of dread',
        delivery: 'piercing question, looking directly at Elias for an answer',
        voiceName: 'Dr. Anya Vance — Master Voice',
        status: 'approved',
        durationSec: 3.6,
        takes: [{ id: 'take_dia_005_1', takeNumber: 1, audioUrl: '', createdAt: '2026-08-11T10:20:00Z', approved: true }]
      },
      {
        id: 'DIA_006',
        sceneId: 'S02',
        shotId: 'TLS_A01_S02_SH008',
        characterId: 'CHAR_ELIAS',
        text: 'We are not alone.',
        emotion: 'fatalistic calm',
        delivery: 'restrained, cinematic gravitas, staring out into the starfield',
        voiceName: 'Captain Elias — Master Voice',
        status: 'approved',
        durationSec: 2.2,
        takes: [{ id: 'take_dia_006_1', takeNumber: 1, audioUrl: '', createdAt: '2026-08-11T10:25:00Z', approved: true }]
      },
      {
        id: 'DIA_007',
        sceneId: 'S04',
        shotId: 'TLS_A02_S04_SH012',
        characterId: 'CHAR_ANYA',
        text: 'Elias, if you breach that hatch, the quarantine protocols lock us out permanently.',
        emotion: 'frantic warning',
        delivery: 'over station comms, crackling with electromagnetic tension',
        voiceName: 'Dr. Anya Vance — Master Voice',
        status: 'approved',
        durationSec: 4.5,
        takes: [{ id: 'take_dia_007_1', takeNumber: 1, audioUrl: '', createdAt: '2026-08-12T11:00:00Z', approved: true }]
      },
      {
        id: 'DIA_008',
        sceneId: 'S04',
        shotId: 'TLS_A02_S04_SH013',
        characterId: 'CHAR_ELIAS',
        text: 'If we don\'t answer that signal, Anya, there won\'t be anything left to quarantine.',
        emotion: 'stoic finality',
        delivery: 'firm resolve through the radio filter',
        voiceName: 'Captain Elias — Master Voice',
        status: 'approved',
        durationSec: 4.2,
        takes: [{ id: 'take_dia_008_1', takeNumber: 1, audioUrl: '', createdAt: '2026-08-12T11:05:00Z', approved: true }]
      }
    ],
    shots: [
      {
        id: 'TLS_A01_S01_SH001',
        sceneId: 'S01',
        actId: 'ACT_I',
        shotNumber: 1,
        title: 'Helios-9 Station Majesty establishing',
        description: 'Extreme wide tracking shot of Deep Space Observatory Helios-9 floating above deep nebula clouds.',
        durationSec: 6.5,
        status: 'approved',
        camera: {
          shotSize: 'extreme_wide',
          angle: 'eye_level',
          lens: '24mm Anamorphic Prime',
          depthOfField: 'deep',
          position: '300 meters orbital starboard',
          movement: 'tracking',
          framing: 'Station positioned along top third horizon line',
          composition: 'Golden ratio composition balancing station against vast nebula glow'
        },
        subject: {
          characterIds: [],
          pose: 'N/A',
          expression: 'N/A',
          action: 'Massive quantum receiver dish slowly recalibrates angle',
          wardrobe: 'N/A',
          props: ['Solar sail array', 'Communication antennas']
        },
        environment: {
          locationId: 'LOC_HELIOS_EXT',
          timeOfDay: 'Space / Deep Night',
          weather: 'Vacuum',
          atmosphere: 'Crystalline vacuum, cold distant starlight',
          backgroundActivity: 'Micro-satellites drifting in slow geosynchronous orbit',
          keyLight: 'Directional blue-white rim light from binary star system',
          fillLight: 'Ambient deep indigo nebula bounce (0.15 intensity)',
          rimLight: 'Sharp gold solar edge reflection along radiator panels',
          practicals: 'Navigation blinking strobe lights on antenna pylons',
          colorTemp: '5600K Key / 9000K Void Fill',
          contrast: 'high',
          mood: 'Desolate, awe-inspiring, ominous isolation'
        },
        style: {
          cinematicStyle: 'Epic Hard Sci-Fi, 70mm Panavision aesthetic, 2001 & Interstellar realism',
          colorTreatment: 'Deep blacks, vibrant cyan and gold split tones, no crushed shadow details',
          filmStock: 'Kodak Vision3 500T 5219, organic fine grain structure',
          texture: 'Crisp mechanical panelling textures, subtle anamorphic horizontal blue lens flares',
          visualReferences: ['2001: A Space Odyssey Discovery One', 'Ad Astra deep space sequence']
        },
        prompt: 'Cinematic 70mm film still, extreme wide shot of massive modular deep space relay station Helios-9 floating in deep cosmos. Glowing gold gossamer solar sails, rotating communication array dishes, distant cosmic hydrogen nebula in deep purple and cyan. Anamorphic lens flare, sharp directional starlight, photorealistic 8K, Masterpiece film cinematography.',
        storyboardImageUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80',
        videoUrl: '',
        dialogueSegmentIds: [],
        takes: [
          {
            id: 'take_sh001_1',
            takeNumber: 1,
            type: 'image',
            url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80',
            prompt: 'Extreme wide shot of deep space observatory Helios-9 in nebula...',
            createdAt: '2026-08-11T09:00:00Z',
            approved: true
          }
        ],
        continuityFlags: []
      },
      {
        id: 'TLS_A01_S01_SH002',
        sceneId: 'S01',
        actId: 'ACT_I',
        shotNumber: 2,
        title: 'Quantum Array Dish Recalibration',
        description: 'Medium wide low angle shot as the massive hexagonal array dish pivots mechanically into the camera line.',
        durationSec: 4.0,
        status: 'approved',
        camera: {
          shotSize: 'medium_wide',
          angle: 'low_angle',
          lens: '35mm Prime',
          depthOfField: 'deep',
          position: 'Array support pylon',
          movement: 'tilt',
          framing: 'Dish dominates frame from lower left to upper right',
          composition: 'Dynamic diagonal leading lines'
        },
        subject: {
          characterIds: [],
          pose: 'N/A',
          expression: 'N/A',
          action: 'Hydraulic actuators hiss as array locks into Sector 9 vector',
          wardrobe: 'N/A',
          props: ['Hexagonal sensor mirrors']
        },
        environment: {
          locationId: 'LOC_HELIOS_EXT',
          timeOfDay: 'Space',
          weather: 'Vacuum',
          atmosphere: 'Frost particles venting from hydraulic gimbal',
          backgroundActivity: 'Tumbling space debris in distant background',
          keyLight: 'Low-angle star glare',
          fillLight: 'Nebula reflection',
          rimLight: 'Strong specular highlights on chrome pistons',
          practicals: 'Status LED array pulsing amber',
          colorTemp: '6000K',
          contrast: 'high',
          mood: 'Mechanical precision under immense cosmic pressure'
        },
        style: {
          cinematicStyle: 'Industrial Sci-Fi, Dennis Villeneuve aesthetic',
          colorTreatment: 'Monochromatic titanium gray with punchy amber indicator accents',
          filmStock: 'Kodak 5219',
          texture: 'Textured brushed metal, micro-scratches from micrometeorites',
          visualReferences: ['Alien (1979) Nostromo exterior mechanical shots']
        },
        prompt: 'Cinematic 35mm low angle shot of massive hexagonal quantum receiver dish pivoting on heavy hydraulic pistons on space station hull. Venting cryogenic vapor crystals, glowing amber status lights, deep black starfield background, crisp tactile industrial textures, sharp depth of field.',
        storyboardImageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80',
        videoUrl: '',
        dialogueSegmentIds: [],
        takes: [],
        continuityFlags: []
      },
      {
        id: 'TLS_A01_S01_SH003',
        sceneId: 'S01',
        actId: 'ACT_I',
        shotNumber: 3,
        title: 'Control Deck Viewport Exterior Inward',
        description: 'Slow push-in from the vacuum outside the observation glass, revealing Captain Elias silhouette inside.',
        durationSec: 5.5,
        status: 'approved',
        camera: {
          shotSize: 'medium',
          angle: 'eye_level',
          lens: '50mm Master Prime',
          depthOfField: 'shallow',
          position: 'Floating directly outside primary viewport',
          movement: 'dolly_in',
          framing: 'Elias framed center between viewport titanium struts',
          composition: 'Symmetrical architecture enclosing lone human figure'
        },
        subject: {
          characterIds: ['CHAR_ELIAS'],
          pose: 'Standing hands clasped behind back, motionless',
          expression: 'Contemplative, stoic',
          action: 'Stares into holographic data stream reflecting in glass',
          wardrobe: 'Navy orbital jacket with silver collar patch',
          props: ['Brass compass in hand']
        },
        environment: {
          locationId: 'LOC_HELIOS_EXT',
          timeOfDay: 'Interior night / Exterior void',
          weather: 'Vacuum / Pressurized interior',
          atmosphere: 'Exterior glass reflections blending stars and interior readouts',
          backgroundActivity: 'Cyan holographic data streams scrolling inside deck',
          keyLight: 'Interior cyan console glow illuminating face from below',
          fillLight: 'Exterior nebula starlight',
          rimLight: 'Warm tungsten reading lamp behind Elias',
          practicals: 'Overhead cockpit instrument dials',
          colorTemp: '4200K interior / 8000K exterior',
          contrast: 'chiaroscuro',
          mood: 'Introspective, tense, solitary watchman'
        },
        style: {
          cinematicStyle: 'Atmospheric neo-noir thriller, Blade Runner 2049 aesthetic',
          colorTreatment: 'Cyan interior wash with deep carbon shadows and amber accents',
          filmStock: 'Arri Alexa 65 digital cinema look, soft grain',
          texture: 'Multi-layered glass reflections, condensation ring on inner pane',
          visualReferences: ['Solaris (1972) Tarkovsky station observation deck']
        },
        prompt: 'Cinematic shot looking through multi-layered observation viewport window into sci-fi space station control room. Silhouette of seasoned commander Elias standing before cyan glowing holographic radar displays. Glass reflects distant stars and glowing telemetry lines. Heavy cinematic mood, shallow depth of field, masterpiece lighting.',
        storyboardImageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=1200&q=80',
        videoUrl: '',
        dialogueSegmentIds: [],
        takes: [],
        continuityFlags: []
      },
      {
        id: 'TLS_A01_S02_SH004',
        sceneId: 'S02',
        actId: 'ACT_I',
        shotNumber: 4,
        title: 'Anya Enters the Control Room',
        description: 'Medium tracking shot as Dr. Anya Vance enters through the pneumatic hatchway, wiping thermal grease from her wrist.',
        durationSec: 4.5,
        status: 'approved',
        camera: {
          shotSize: 'medium',
          angle: 'eye_level',
          lens: '35mm Anamorphic',
          depthOfField: 'shallow',
          position: 'Steadicam leading Anya',
          movement: 'tracking',
          framing: 'Anya moving from left to right through circular bulkhead door',
          composition: 'Framed within the octagonal pressure ring'
        },
        subject: {
          characterIds: ['CHAR_ANYA'],
          pose: 'Walking briskly toward primary terminal',
          expression: 'Anxious, alert, brow furrowed',
          action: 'Wipes grease with rag, secures datapad into dock',
          wardrobe: 'Sage-green tech jumpsuit with thermal grease on right arm',
          props: ['Diagnostic datapad', 'Cotton cleaning cloth']
        },
        environment: {
          locationId: 'LOC_CONTROL_ROOM',
          timeOfDay: 'Interior Night',
          weather: 'Pressurized',
          atmosphere: 'Slight cooling vapor puff as hatch closes behind her',
          backgroundActivity: 'Analog pressure gauges fluctuating in background',
          keyLight: 'Overhead fluorescent strip (5000K)',
          fillLight: 'Terminal screens bounced cyan light',
          rimLight: 'Hatchway hazard amber LED rim',
          practicals: 'Console switches, fiber optic conduits',
          colorTemp: '4600K',
          contrast: 'medium',
          mood: 'Urgent interruption of silence'
        },
        style: {
          cinematicStyle: 'Cinematic realism, Fincher precision framing',
          colorTreatment: 'Muted desaturated sage and gunmetal gray with amber highlights',
          filmStock: 'Vision3 250D',
          texture: 'Worn metal surfaces, tactile rubber conduit textures',
          visualReferences: ['Arrival (2016) field laboratory interior']
        },
        prompt: 'Cinematic medium shot of astrophysicist Dr. Anya Vance walking through an octagonal spaceship hatchway into a dimly lit control room. Wearing a realistic sage-green jumpsuit, dark hair in practical knot. Cyan holographic screens glowing in background, steam venting from doorway, 35mm film grain, moody cinematic lighting.',
        storyboardImageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1200&q=80',
        videoUrl: '',
        dialogueSegmentIds: ['DIA_001'],
        takes: [],
        continuityFlags: ['Wardrobe: Grease smudge on right forearm']
      },
      {
        id: 'TLS_A01_S02_SH005',
        sceneId: 'S02',
        actId: 'ACT_I',
        shotNumber: 5,
        title: 'Two-Shot at the Spectral Console',
        description: 'Over-the-shoulder medium shot showing Elias and Anya leaning over the glowing quantum spectral analyzer.',
        durationSec: 5.0,
        status: 'approved',
        camera: {
          shotSize: 'medium_close_up',
          angle: 'eye_level',
          lens: '50mm Prime',
          depthOfField: 'shallow',
          position: 'Flanking the terminal table',
          movement: 'static',
          framing: 'Elias in profile on left, Anya facing forward over display',
          composition: 'Triangle composition anchored by the glowing waveform hologram'
        },
        subject: {
          characterIds: ['CHAR_ELIAS', 'CHAR_ANYA'],
          pose: 'Elias pointing to frequency graph, Anya leaning forward with both hands on console edge',
          expression: 'Elias intense and focused, Anya examining data with growing surprise',
          action: 'Elias turns frequency dial; holographic wave shifts in response',
          wardrobe: 'Elias in dark flight jacket, Anya in sage jumpsuit',
          props: ['Quantum spectral analyzer console', 'Frequency rotary encoder dials']
        },
        environment: {
          locationId: 'LOC_CONTROL_ROOM',
          timeOfDay: 'Interior Night',
          weather: 'Interior',
          atmosphere: 'Suspended holographic particle grid floating between characters',
          backgroundActivity: 'Telemetry counters spinning rapidly',
          keyLight: 'Glowing cyan holographic waveform illuminating both faces (4500K)',
          fillLight: 'Subtle ambient ceiling bounce',
          rimLight: 'Warm edge light separating shoulders from dark background',
          practicals: 'Illuminated tactile buttons and LED bargraph meters',
          colorTemp: '4200K',
          contrast: 'high',
          mood: 'Electrifying scientific discovery'
        },
        style: {
          cinematicStyle: 'Modern Sci-Fi Chamber Drama, Alex Garland aesthetic',
          colorTreatment: 'High contrast cyan waveform cast over warm skin tones',
          filmStock: 'Arri Alexa Mini LF',
          texture: 'Volumetric holographic scan lines across faces',
          visualReferences: ['Ex Machina lab scenes', 'Interstellar endurance bridge']
        },
        prompt: 'Cinematic medium close-up two-shot of Captain Elias and Dr. Anya Vance leaning over a glowing 3D holographic quantum audio waveform display inside a dark spaceship bridge. Blue and amber lights illuminate their expressive faces. Worn flight suits, realistic sci-fi tactical consoles, hyper-detailed volumetric hologram, 50mm cinematic prime lens, photorealistic.',
        storyboardImageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80',
        videoUrl: '',
        dialogueSegmentIds: ['DIA_002', 'DIA_003'],
        takes: [],
        continuityFlags: ['Screen direction: Elias looks screen-right, Anya looks screen-left']
      },
      {
        id: 'TLS_A01_S02_SH006',
        sceneId: 'S02',
        actId: 'ACT_I',
        shotNumber: 6,
        title: 'Macro Close-Up on Anya\'s Eyes & Waveform Reflection',
        description: 'Extreme close-up on Anya\'s hazel eyes as the impossible repeating harmonic signal reflects across her pupil.',
        durationSec: 3.5,
        status: 'approved',
        camera: {
          shotSize: 'extreme_close_up',
          angle: 'eye_level',
          lens: '90mm Macro Cine Lens',
          depthOfField: 'shallow',
          position: 'Directly in front of Anya',
          movement: 'static',
          framing: 'Anya\'s right eye filling center frame',
          composition: 'Tight micro-framing emphasizing emotional shock and intellectual epiphany'
        },
        subject: {
          characterIds: ['CHAR_ANYA'],
          pose: 'Motionless, breathless',
          expression: 'Awed realization, pupil dilating slightly',
          action: 'Blinks once as frequency cascade pulses',
          wardrobe: 'N/A (tight crop on eye/face)',
          props: []
        },
        environment: {
          locationId: 'LOC_CONTROL_ROOM',
          timeOfDay: 'Interior',
          weather: 'Interior',
          atmosphere: 'Ultra-crisp micro details',
          backgroundActivity: 'Out-of-focus background console bokeh',
          keyLight: 'Direct holographic reflection from screen (4800K)',
          fillLight: 'Low level soft fill on skin',
          rimLight: 'None',
          practicals: 'Cyan LED reflection in cornea',
          colorTemp: '5000K',
          contrast: 'high',
          mood: 'Intimate psychological breakthrough'
        },
        style: {
          cinematicStyle: 'Micro-cinematography, Contact (1997) opening style',
          colorTreatment: 'Vivid hazel iris contrasted with electric cyan waveform catchlight',
          filmStock: 'Kodak 50D fine grain',
          texture: 'Individual skin pores, eyelash micro-detail, iridescent cornea reflection',
          visualReferences: ['Blade Runner Voight-Kampff eye sequence', '2001 stargate pupil']
        },
        prompt: 'Cinematic extreme macro close-up of a woman\'s expressive hazel eye, reflecting a glowing cyan futuristic audio spectrum waveform in her dilated pupil. Ultra-sharp iris detail, natural skin texture, dramatic cinematic lighting, 90mm macro lens, masterpiece film still.',
        storyboardImageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1200&q=80',
        videoUrl: '',
        dialogueSegmentIds: ['DIA_004', 'DIA_005'],
        takes: [],
        continuityFlags: []
      },
      {
        id: 'TLS_A01_S02_SH007',
        sceneId: 'S02',
        actId: 'ACT_I',
        shotNumber: 7,
        title: 'Unit-7 Sensor Cluster Activation',
        description: 'Low angle medium shot of the mechanical synthetic custodian Unit-7 as its tri-optic sensory head rotates with a quiet pneumatic hum.',
        durationSec: 4.0,
        status: 'approved',
        camera: {
          shotSize: 'medium',
          angle: 'low_angle',
          lens: '40mm Anamorphic',
          depthOfField: 'medium',
          position: 'Corner charging alcove',
          movement: 'tilt',
          framing: 'Unit-7 monolithic frame towering in frame right',
          composition: 'Power dynamic shift from humans to machine watcher'
        },
        subject: {
          characterIds: ['CHAR_UNIT7'],
          pose: 'Uncoupling from recharge umbilical gantry',
          expression: 'Inscrutable, precise',
          action: 'Optic sensor shifts from standby blue to active threat amber',
          wardrobe: 'Weathered titanium chassis with yellow warning stripes',
          props: ['Recharge umbilical cable', 'Integrated data uplink probe']
        },
        environment: {
          locationId: 'LOC_CONTROL_ROOM',
          timeOfDay: 'Interior',
          weather: 'Interior',
          atmosphere: 'Subtle ozone charge near high-voltage charging dock',
          backgroundActivity: 'Sparks of static electricity dissipating into floor ground',
          keyLight: 'Unit-7 glowing internal sensor array (Amber 2800K)',
          fillLight: 'Cyan overhead bridge lights',
          rimLight: 'Brushed metal edge reflections',
          practicals: 'High voltage charge indicator bars',
          colorTemp: '3200K / 5600K split',
          contrast: 'high',
          mood: 'Synthetic threat awakening'
        },
        style: {
          cinematicStyle: 'Mechanical realism, Boston Dynamics & Alien Nostromo Android feel',
          colorTreatment: 'Industrial yellow and matte carbon black',
          filmStock: 'Arri Alexa 65',
          texture: 'Machined metal surfaces, grease around hydraulic bearings, etched serial numbers',
          visualReferences: ['Chappie mechanical design', 'Alien: Isolation Working Joes']
        },
        prompt: 'Cinematic low angle medium shot of an imposing bipedal industrial robot Unit-7 in a dark spaceship alcove. Matte titanium armor plates, exposed hydraulics, glowing amber tri-lens optic sensor head rotating smoothly. Realistic mechanical design, scuffed metal textures, dramatic sci-fi studio lighting.',
        storyboardImageUrl: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=1200&q=80',
        videoUrl: '',
        dialogueSegmentIds: [],
        takes: [],
        continuityFlags: ['Unit-7 optic color: Changed from Cyan (nominal) to Amber (protocol active)']
      },
      {
        id: 'TLS_A01_S02_SH008',
        sceneId: 'S02',
        actId: 'ACT_I',
        shotNumber: 8,
        title: 'Elias Turns to the Viewport "We Are Not Alone"',
        description: 'Slow tracking push-in on Captain Elias as he steps to the observation viewport, staring out into the emerging cosmic anomaly.',
        durationSec: 5.5,
        status: 'approved',
        camera: {
          shotSize: 'close_up',
          angle: 'eye_level',
          lens: '65mm Anamorphic Prime',
          depthOfField: 'shallow',
          position: 'Three-quarter front angle',
          movement: 'dolly_in',
          framing: 'Elias face framed with deep cosmic void behind him',
          composition: 'Rule of thirds, strong negative space on right filled with approaching amber light'
        },
        subject: {
          characterIds: ['CHAR_ELIAS'],
          pose: 'Standing tall, slight tilt of head, eyes locked on horizon',
          expression: 'Quiet fatalism, grim realization of what is returning',
          action: 'Speaks line softly, hand slowly leaves command console',
          wardrobe: 'Navy flight jacket with oxidized bronze fleet insignias',
          props: ['Brass compass in hand']
        },
        environment: {
          locationId: 'LOC_CONTROL_ROOM',
          timeOfDay: 'Interior Night',
          weather: 'Interior',
          atmosphere: 'Dead silence except for low structural hull vibration',
          backgroundActivity: 'Approaching amber light creeping across control deck walls',
          keyLight: 'External amber anomaly light spilling through viewport onto Elias face',
          fillLight: 'Internal cyan console ambient (0.2)',
          rimLight: 'Starlight edge separating silhouette from dark room',
          practicals: 'Distant control panel tally LEDs',
          colorTemp: '3000K warm anomaly / 6500K starlight',
          contrast: 'high',
          mood: 'Haunting cinematic climax of Scene 2'
        },
        style: {
          cinematicStyle: 'Masterpiece dramatic portraiture, Roger Deakins lighting',
          colorTreatment: 'Amber and deep midnight blue complementary contrast',
          filmStock: 'Kodak Vision3 500T',
          texture: 'Weathered skin wrinkles, silver hair highlights, glass reflections',
          visualReferences: ['Sicario dramatic close-ups', 'Interstellar Matthew McConaughey viewport close-up']
        },
        prompt: 'Cinematic close-up portrait of Captain Elias, a weathered 48-year-old space commander with graying temples, looking out an observation window. Warm amber volumetric light from an alien ship illuminates the right side of his face while cold cyan starlight illuminates the left. Film grain, 65mm anamorphic prime lens, emotional gravitas, masterpiece movie still.',
        storyboardImageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=1200&q=80',
        videoUrl: '',
        dialogueSegmentIds: ['DIA_006'],
        takes: [],
        continuityFlags: ['Eyeline: Looking 15 degrees right of camera axis toward Sector 9 anomaly']
      },
      {
        id: 'TLS_A01_S03_SH009',
        sceneId: 'S03',
        actId: 'ACT_I',
        shotNumber: 9,
        title: 'Asteroid Field Silhouette Reveal',
        description: 'Wide cinematic pan across tumbling metallic asteroid boulders as a massive non-terrestrial hull glides silently between them.',
        durationSec: 6.0,
        status: 'approved',
        camera: {
          shotSize: 'wide',
          angle: 'eye_level',
          lens: '28mm Master Prime',
          depthOfField: 'deep',
          position: 'Leading edge of asteroid cluster',
          movement: 'pan',
          framing: 'Asteroids tumbling in foreground, giant vessel dominating background',
          composition: 'Multi-plane depth with three distinct parallax layers'
        },
        subject: {
          characterIds: [],
          pose: 'N/A',
          expression: 'N/A',
          action: 'Derelict alien vessel slides effortlessly through vacuum',
          wardrobe: 'N/A',
          props: ['Gargantuan alien hull architecture']
        },
        environment: {
          locationId: 'LOC_SECTOR_9',
          timeOfDay: 'Space / Deep Shadow',
          weather: 'Electrostatic mineral dust',
          atmosphere: 'Glittering space dust reflecting faint gold light',
          backgroundActivity: 'Tumbling iron-nickel asteroids colliding and grinding silently',
          keyLight: 'Bioluminescent pulsing amber channels on alien ship hull',
          fillLight: 'Distant starfield backlight',
          rimLight: 'Specular edge light skimming sharp asteroid ridges',
          practicals: 'None',
          colorTemp: '2800K amber glow / 8000K void',
          contrast: 'high',
          mood: 'Monumental ancient alien mystery'
        },
        style: {
          cinematicStyle: 'Lovecraftian Cosmic Sci-Fi, Prometheus & Arrival spaceship design',
          colorTreatment: 'Obsidian blacks, luminous bronze-gold circuitry',
          filmStock: 'Vision3 500T',
          texture: 'Organic crystalline hull surface, cratered porous asteroid surfaces',
          visualReferences: ['Prometheus Derelict ship reveal', 'Arrival heptapod shell']
        },
        prompt: 'Cinematic wide shot of an enormous ancient bio-mechanical alien spacecraft silently moving through a dark, dense asteroid field. Obsidian crystalline hull with pulsing warm amber geometric veins. Tumbling iron asteroids in foreground with realistic space lighting, 8K masterpiece VFX cinematography.',
        storyboardImageUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80',
        videoUrl: '',
        dialogueSegmentIds: [],
        takes: [],
        continuityFlags: []
      },
      {
        id: 'TLS_A02_S04_SH011',
        sceneId: 'S04',
        actId: 'ACT_II',
        shotNumber: 11,
        title: 'Airlock Beta Strobe Hazard Prep',
        description: 'Medium shot of Elias in EVA Mk-IV vacuum suit securing his golden pressure helmet as amber hazard strobes pulse rhythmically.',
        durationSec: 4.5,
        status: 'approved',
        camera: {
          shotSize: 'medium',
          angle: 'low_angle',
          lens: '35mm Cine Prime',
          depthOfField: 'shallow',
          position: 'Airlock staging rack',
          movement: 'static',
          framing: 'Elias centered with octagonal decompression chamber framing him',
          composition: 'Heavy industrial symmetry with pulsating strobe shadow play'
        },
        subject: {
          characterIds: ['CHAR_ELIAS'],
          pose: 'Lifting heavy EVA helmet over head, locking neck collar seal',
          expression: 'Unwavering determination under extreme danger',
          action: 'Rotates helmet ring; mechanical seal locks with sharp pneumatic click',
          wardrobe: 'EVA Mk-IV High-Pressure Vacuum Suit with reinforced chest harness',
          props: ['EVA Helmet with gold vapor visor', 'Chest telemetry pack', 'Plasma torch holster']
        },
        environment: {
          locationId: 'LOC_AIRLOCK_BETA',
          timeOfDay: 'Interior Emergency Auxiliary',
          weather: 'Decompression chamber venting',
          atmosphere: 'Cold cryogenic vapor venting from decompression nozzles',
          backgroundActivity: 'Digital oxygen countdown flashing on bulkhead wall',
          keyLight: 'Overhead rotating amber warning beacon (3000K, pulsing at 1.2 Hz)',
          fillLight: 'Reflected floor grate tungsten bounce',
          rimLight: 'Sharp cold white rim from outer door seal',
          practicals: 'Emergency bulkhead LED indicators in red and amber',
          colorTemp: '2800K Amber / 6500K Vapor',
          contrast: 'high',
          mood: 'High-stakes countdown to vacuum breach'
        },
        style: {
          cinematicStyle: 'Hyper-detailed technical space thriller, The Martian / Gravity realism',
          colorTreatment: 'High contrast amber strobe wash with dense carbon shadows',
          filmStock: 'Kodak 5219',
          texture: 'Multi-layer ballistic nylon weave on space suit, brushed titanium collar locking lugs',
          visualReferences: ['The Martian airlock prep', 'Interstellar docking sequence']
        },
        prompt: 'Cinematic medium shot of an astronaut Captain Elias securing a heavy futuristic EVA space helmet in an industrial spaceship airlock. Flashing emergency amber strobe lights, venting white cryogenic vapor, heavy titanium bulkheads with hazard stripes, ultra-detailed spacesuit textures, masterpiece sci-fi cinematography.',
        storyboardImageUrl: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&w=1200&q=80',
        videoUrl: '',
        dialogueSegmentIds: ['DIA_007', 'DIA_008'],
        takes: [],
        continuityFlags: ['Suit condition: Pristine, oxygen gauge reading 98%']
      }
    ],
    musicCues: [
      {
        id: 'MUS_001',
        title: 'Opening - Deep Void Resonance',
        sceneId: 'S01',
        actId: 'ACT_I',
        genre: 'Cinematic Sci-Fi / Ambient Orchestral',
        mood: 'Atmospheric sci-fi tension with deep sub-bass drones and sparse crystalline strings',
        tempo: '58 BPM',
        key: 'D Minor',
        instrumentation: 'Sub-bass analog synthesizer, bowing cellos, hydrophone field recordings, celestial glass harmonica',
        durationSec: 90,
        emotionalPurpose: 'Establish deep existential isolation and the colossal scale of outer-space void.',
        status: 'ready'
      },
      {
        id: 'MUS_002',
        title: 'Act I - The Syntax Anomaly',
        sceneId: 'S02',
        actId: 'ACT_I',
        genre: 'Electronic Pulse & Acoustic Tension',
        mood: 'Slow-building rhythmic tension with irregular polyrhythmic clock pulses',
        tempo: '76 BPM',
        key: 'A Minor',
        instrumentation: 'Granular analog modular synthesizer, muted pizzicato strings, ticking titanium relays',
        durationSec: 135,
        emotionalPurpose: 'Build psychological dread and intellectual excitement during signal decoding.',
        status: 'ready'
      },
      {
        id: 'MUS_003',
        title: 'Act II - The Phantom Breach',
        sceneId: 'S04',
        actId: 'ACT_II',
        genre: 'Heavy Industrial Ostinato',
        mood: 'Aggressive, relentless, heartbeat-driven suspense',
        tempo: '110 BPM',
        key: 'C Minor',
        instrumentation: 'Distorted 808 sub hits, brass braams, high-pass filtered white noise risers, taiko pulses',
        durationSec: 90,
        emotionalPurpose: 'Drive the life-or-death countdown as Elias overrides quarantine to board.',
        status: 'ready'
      },
      {
        id: 'MUS_004',
        title: 'Act IV - Quantum Dawn & Farewell',
        sceneId: 'S08',
        actId: 'ACT_IV',
        genre: 'Cinematic Ambient Resolution',
        mood: 'Emotional, bittersweet, transcendent harmonic catharsis',
        tempo: '64 BPM',
        key: 'D Major / B Minor',
        instrumentation: 'Solo French horn, warm analog pads, soaring choir harmonics, gentle piano',
        durationSec: 80,
        emotionalPurpose: 'Release the accumulated tension as the cosmic dawn breaks the repeating time loop.',
        status: 'ready'
      }
    ],
    sfxCues: [
      {
        id: 'SFX_001',
        shotId: 'TLS_A01_S01_SH001',
        category: 'ambience',
        name: 'Deep Space Cosmic Drone',
        description: 'Low-frequency 35Hz electromagnetic cosmic hum and station hull vibration.',
        durationSec: 6.5,
        volume: 0.7
      },
      {
        id: 'SFX_002',
        shotId: 'TLS_A01_S01_SH002',
        category: 'machinery',
        name: 'Quantum Array Hydraulic Servo',
        description: 'Heavy pneumatic locking pistons, hydraulic valve hiss, and gyro spin up.',
        durationSec: 4.0,
        volume: 0.85
      },
      {
        id: 'SFX_003',
        shotId: 'TLS_A01_S02_SH005',
        category: 'ui',
        name: 'Quantum Waveform Synthesizer Chirps',
        description: 'Melodic digital telemetry chirps, granular frequency sweeps, and harmonic ping.',
        durationSec: 5.0,
        volume: 0.65
      },
      {
        id: 'SFX_004',
        shotId: 'TLS_A02_S04_SH011',
        category: 'environmental',
        name: 'Airlock Decompression Venting & Strobe Alarm',
        description: 'Vigorous pressurized gas venting into vacuum with synchronized low-tone warning buzzer.',
        durationSec: 4.5,
        volume: 0.9
      },
      {
        id: 'SFX_005',
        shotId: 'TLS_A01_S02_SH008',
        category: 'risers',
        name: 'Deep Sub-Bass Tension Swell',
        description: 'Cinematic pitch-rising sub swell culminating in low rumble impact.',
        durationSec: 5.5,
        volume: 0.8
      }
    ],
    timelineTracks: [
      {
        id: 'TRK_V1',
        name: 'VIDEO 1 (MAIN)',
        type: 'video',
        muted: false,
        solo: false,
        volume: 1.0,
        clips: [
          {
            id: 'clip_v1_01',
            trackId: 'TRK_V1',
            assetId: 'TLS_A01_S01_SH001',
            assetType: 'shot_image',
            name: 'SH001: Helios-9 Establishing',
            startSec: 0,
            durationSec: 6.5,
            sourceStartSec: 0,
            volume: 1.0,
            fadeInSec: 1.0,
            fadeOutSec: 0.5,
            color: '#1E3A8A'
          },
          {
            id: 'clip_v1_02',
            trackId: 'TRK_V1',
            assetId: 'TLS_A01_S01_SH002',
            assetType: 'shot_image',
            name: 'SH002: Array Recalibration',
            startSec: 6.5,
            durationSec: 4.0,
            sourceStartSec: 0,
            volume: 1.0,
            fadeInSec: 0,
            fadeOutSec: 0,
            color: '#1E3A8A'
          },
          {
            id: 'clip_v1_03',
            trackId: 'TRK_V1',
            assetId: 'TLS_A01_S01_SH003',
            assetType: 'shot_image',
            name: 'SH003: Viewport Inward',
            startSec: 10.5,
            durationSec: 5.5,
            sourceStartSec: 0,
            volume: 1.0,
            fadeInSec: 0,
            fadeOutSec: 0,
            color: '#1E3A8A'
          },
          {
            id: 'clip_v1_04',
            trackId: 'TRK_V1',
            assetId: 'TLS_A01_S02_SH004',
            assetType: 'shot_image',
            name: 'SH004: Anya Enters Deck',
            startSec: 16.0,
            durationSec: 4.5,
            sourceStartSec: 0,
            volume: 1.0,
            fadeInSec: 0,
            fadeOutSec: 0,
            color: '#1E3A8A'
          },
          {
            id: 'clip_v1_05',
            trackId: 'TRK_V1',
            assetId: 'TLS_A01_S02_SH005',
            assetType: 'shot_image',
            name: 'SH005: Spectral Two-Shot',
            startSec: 20.5,
            durationSec: 5.0,
            sourceStartSec: 0,
            volume: 1.0,
            fadeInSec: 0,
            fadeOutSec: 0,
            color: '#1E3A8A'
          },
          {
            id: 'clip_v1_06',
            trackId: 'TRK_V1',
            assetId: 'TLS_A01_S02_SH008',
            assetType: 'shot_image',
            name: 'SH008: We Are Not Alone',
            startSec: 25.5,
            durationSec: 5.5,
            sourceStartSec: 0,
            volume: 1.0,
            fadeInSec: 0,
            fadeOutSec: 1.5,
            color: '#1E3A8A'
          }
        ]
      },
      {
        id: 'TRK_V2',
        name: 'VIDEO 2 (OVERLAYS)',
        type: 'video2',
        muted: false,
        solo: false,
        volume: 1.0,
        clips: []
      },
      {
        id: 'TRK_BROLL',
        name: 'B-ROLL & CUTAWAYS',
        type: 'broll',
        muted: false,
        solo: false,
        volume: 1.0,
        clips: [
          {
            id: 'clip_br_01',
            trackId: 'TRK_BROLL',
            assetId: 'TLS_A01_S02_SH006',
            assetType: 'shot_image',
            name: 'SH006: Macro Waveform Eye Reflection',
            startSec: 22.0,
            durationSec: 3.5,
            sourceStartSec: 0,
            volume: 1.0,
            fadeInSec: 0.2,
            fadeOutSec: 0.2,
            color: '#0D9488'
          }
        ]
      },
      {
        id: 'TRK_DIA',
        name: 'DIALOGUE',
        type: 'dialogue',
        muted: false,
        solo: false,
        volume: 0.95,
        clips: [
          {
            id: 'clip_dia_01',
            trackId: 'TRK_DIA',
            assetId: 'DIA_001',
            assetType: 'dialogue',
            name: 'ANYA: Is the primary dampener failing?',
            startSec: 16.5,
            durationSec: 2.8,
            sourceStartSec: 0,
            volume: 1.0,
            fadeInSec: 0.1,
            fadeOutSec: 0.1,
            text: 'ANYA: Is the primary dampener failing again?',
            color: '#059669'
          },
          {
            id: 'clip_dia_02',
            trackId: 'TRK_DIA',
            assetId: 'DIA_002',
            assetType: 'dialogue',
            name: 'ELIAS: Dampeners are nominal...',
            startSec: 19.5,
            durationSec: 3.4,
            sourceStartSec: 0,
            volume: 1.0,
            fadeInSec: 0.1,
            fadeOutSec: 0.1,
            text: 'ELIAS: Dampeners are nominal. Look at the carrier wave.',
            color: '#059669'
          },
          {
            id: 'clip_dia_06',
            trackId: 'TRK_DIA',
            assetId: 'DIA_006',
            assetType: 'dialogue',
            name: 'ELIAS: We are not alone.',
            startSec: 27.0,
            durationSec: 2.2,
            sourceStartSec: 0,
            volume: 1.0,
            fadeInSec: 0.1,
            fadeOutSec: 0.2,
            text: 'ELIAS: We are not alone.',
            color: '#059669'
          }
        ]
      },
      {
        id: 'TRK_SFX',
        name: 'SFX',
        type: 'sfx',
        muted: false,
        solo: false,
        volume: 0.85,
        clips: [
          {
            id: 'clip_sfx_01',
            trackId: 'TRK_SFX',
            assetId: 'SFX_002',
            assetType: 'sfx',
            name: 'SFX: Array Hydraulic Lock',
            startSec: 7.0,
            durationSec: 3.5,
            sourceStartSec: 0,
            volume: 0.9,
            fadeInSec: 0.2,
            fadeOutSec: 0.5,
            color: '#D97706'
          },
          {
            id: 'clip_sfx_02',
            trackId: 'TRK_SFX',
            assetId: 'SFX_003',
            assetType: 'sfx',
            name: 'SFX: Waveform Synth Chirps',
            startSec: 21.0,
            durationSec: 4.5,
            sourceStartSec: 0,
            volume: 0.7,
            fadeInSec: 0.3,
            fadeOutSec: 0.4,
            color: '#D97706'
          },
          {
            id: 'clip_sfx_03',
            trackId: 'TRK_SFX',
            assetId: 'SFX_005',
            assetType: 'sfx',
            name: 'SFX: Sub Tension Riser Swell',
            startSec: 25.5,
            durationSec: 5.5,
            sourceStartSec: 0,
            volume: 0.8,
            fadeInSec: 1.0,
            fadeOutSec: 0.2,
            color: '#D97706'
          }
        ]
      },
      {
        id: 'TRK_AMB',
        name: 'AMBIENCE',
        type: 'ambience',
        muted: false,
        solo: false,
        volume: 0.6,
        clips: [
          {
            id: 'clip_amb_01',
            trackId: 'TRK_AMB',
            assetId: 'SFX_001',
            assetType: 'sfx',
            name: 'AMB: Cosmic Sub Drone',
            startSec: 0,
            durationSec: 31.0,
            sourceStartSec: 0,
            volume: 0.6,
            fadeInSec: 2.0,
            fadeOutSec: 2.0,
            color: '#6366F1'
          }
        ]
      },
      {
        id: 'TRK_MUS',
        name: 'MUSIC SCORE',
        type: 'music',
        muted: false,
        solo: false,
        volume: 0.75,
        clips: [
          {
            id: 'clip_mus_01',
            trackId: 'TRK_MUS',
            assetId: 'MUS_001',
            assetType: 'music',
            name: 'SCORE: Deep Void Resonance (Opening)',
            startSec: 0,
            durationSec: 18.0,
            sourceStartSec: 0,
            volume: 0.75,
            fadeInSec: 2.5,
            fadeOutSec: 1.5,
            color: '#7C3AED'
          },
          {
            id: 'clip_mus_02',
            trackId: 'TRK_MUS',
            assetId: 'MUS_002',
            assetType: 'music',
            name: 'SCORE: The Syntax Anomaly (Tension Build)',
            startSec: 18.0,
            durationSec: 13.0,
            sourceStartSec: 0,
            volume: 0.85,
            fadeInSec: 1.0,
            fadeOutSec: 2.0,
            color: '#7C3AED'
          }
        ]
      },
      {
        id: 'TRK_SUB',
        name: 'SUBTITLES',
        type: 'subtitles',
        muted: false,
        solo: false,
        volume: 1.0,
        clips: [
          {
            id: 'sub_01',
            trackId: 'TRK_SUB',
            assetId: 'DIA_001',
            assetType: 'subtitle',
            name: 'SUB: Is the primary dampener failing?',
            startSec: 16.5,
            durationSec: 2.8,
            sourceStartSec: 0,
            volume: 1.0,
            fadeInSec: 0,
            fadeOutSec: 0,
            text: 'ANYA: Is the primary dampener failing again?',
            color: '#475569'
          },
          {
            id: 'sub_02',
            trackId: 'TRK_SUB',
            assetId: 'DIA_002',
            assetType: 'subtitle',
            name: 'SUB: Dampeners are nominal...',
            startSec: 19.5,
            durationSec: 3.4,
            sourceStartSec: 0,
            volume: 1.0,
            fadeInSec: 0,
            fadeOutSec: 0,
            text: 'ELIAS: Dampeners are nominal. Look at the carrier wave.',
            color: '#475569'
          },
          {
            id: 'sub_03',
            trackId: 'TRK_SUB',
            assetId: 'DIA_006',
            assetType: 'subtitle',
            name: 'SUB: We are not alone.',
            startSec: 27.0,
            durationSec: 2.2,
            sourceStartSec: 0,
            volume: 1.0,
            fadeInSec: 0,
            fadeOutSec: 0,
            text: 'ELIAS: We are not alone.',
            color: '#475569'
          }
        ]
      }
    ],
    continuityItems: [
      {
        id: 'CONT_001',
        type: 'character',
        title: 'Elias Flight Jacket & Brass Compass',
        description: 'Captain Elias wears the decommissioned 3rd Fleet navy jacket in all control room scenes and holds the brass compass in his left pocket.',
        sceneIds: ['S02', 'S04'],
        shotIds: ['TLS_A01_S01_SH003', 'TLS_A01_S02_SH005', 'TLS_A01_S02_SH008'],
        status: 'consistent',
        details: 'Passed: Wardrobe tags matched across all Act I shots.'
      },
      {
        id: 'CONT_002',
        type: 'character',
        title: 'Anya Sleeve Grease Smudge',
        description: 'Anya has a dark thermal lubricant smudge on her right forearm after fixing the hydraulic bypass in Scene 1.',
        sceneIds: ['S02', 'S06'],
        shotIds: ['TLS_A01_S02_SH004', 'TLS_A01_S02_SH005'],
        status: 'consistent',
        details: 'Passed: Grease continuity confirmed in shot prompts SH004 and SH005.'
      },
      {
        id: 'CONT_003',
        type: 'cinematography',
        title: '180-Degree Screen Direction Axis (Scene 2)',
        description: 'Elias must remain on screen-left facing right; Anya remains on screen-right facing left during the spectral analyzer confrontation.',
        sceneIds: ['S02'],
        shotIds: ['TLS_A01_S02_SH005', 'TLS_A01_S02_SH006', 'TLS_A01_S02_SH008'],
        status: 'consistent',
        details: 'Passed: Eyeline vectors verified. Elias (15° right), Anya (20° left).'
      },
      {
        id: 'CONT_004',
        type: 'environment',
        title: 'Control Deck Lighting Balance (Cyan Key / Amber Practical)',
        description: 'Observation deck lighting requires 4800K cyan terminal wash contrasted by 2800K amber tally indicators.',
        sceneIds: ['S02'],
        shotIds: ['TLS_A01_S02_SH004', 'TLS_A01_S02_SH005', 'TLS_A01_S02_SH007', 'TLS_A01_S02_SH008'],
        status: 'consistent',
        details: 'Passed: Lighting parameters synchronized in structured shot descriptions.'
      }
    ],
    assets: [
      {
        id: 'AST_001',
        name: 'Helios-9 Exterior Establishing (Approved Keyframe)',
        filename: 'TLS_A01_S01_SH001_IMG_T01.png',
        type: 'IMAGE',
        shotId: 'TLS_A01_S01_SH001',
        sceneId: 'S01',
        actId: 'ACT_I',
        locationId: 'LOC_HELIOS_EXT',
        provider: 'Gemini Imagen / Flash Image',
        model: 'gemini-3.1-flash-lite-image',
        prompt: 'Cinematic 70mm film still, extreme wide shot of massive modular deep space relay station Helios-9 floating in deep cosmos...',
        url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80',
        thumbnailUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=400&q=80',
        createdAt: '2026-08-11T09:00:00Z',
        status: 'approved',
        versionTake: 1,
        sizeBytes: 4194304,
        costUsd: 0.00
      },
      {
        id: 'AST_002',
        name: 'Hexagonal Quantum Dish Pivot Angle',
        filename: 'TLS_A01_S01_SH002_IMG_T01.png',
        type: 'IMAGE',
        shotId: 'TLS_A01_S01_SH002',
        sceneId: 'S01',
        actId: 'ACT_I',
        locationId: 'LOC_HELIOS_EXT',
        provider: 'Gemini Imagen / Flash Image',
        model: 'gemini-3.1-flash-lite-image',
        prompt: 'Cinematic 35mm low angle shot of massive hexagonal quantum receiver dish pivoting on heavy hydraulic pistons...',
        url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80',
        thumbnailUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=400&q=80',
        createdAt: '2026-08-11T09:10:00Z',
        status: 'approved',
        versionTake: 1,
        sizeBytes: 3870000,
        costUsd: 0.00
      },
      {
        id: 'AST_003',
        name: 'Captain Elias Vance — Master Character Reference (Locked)',
        filename: 'REF_CHAR_ELIAS_MASTER_01.png',
        type: 'REFERENCE',
        characterId: 'CHAR_ELIAS',
        provider: 'Master Production Library',
        model: 'reference-portrait-hq',
        prompt: 'Weathered handsome commander 48 years old, dark hair heavily graying at temples, steel-gray eyes, navy orbital jacket',
        url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80',
        thumbnailUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
        createdAt: '2026-08-10T15:00:00Z',
        status: 'approved',
        versionTake: 1,
        costUsd: 0.00
      },
      {
        id: 'AST_004',
        name: 'Dr. Anya Vance — Master Character Reference (Locked)',
        filename: 'REF_CHAR_ANYA_MASTER_01.png',
        type: 'REFERENCE',
        characterId: 'CHAR_ANYA',
        provider: 'Master Production Library',
        model: 'reference-portrait-hq',
        prompt: 'Astrophysicist 36 years old, sharp hazel eyes, dark hair in practical tactical knot, sage-green tech jumpsuit',
        url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80',
        thumbnailUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
        createdAt: '2026-08-10T15:05:00Z',
        status: 'approved',
        versionTake: 1,
        costUsd: 0.00
      },
      {
        id: 'AST_005',
        name: 'Dialogue DIA_001 (Anya: Is the primary dampener failing?)',
        filename: 'TLS_A01_S02_DLG001.wav',
        type: 'DIALOGUE',
        shotId: 'TLS_A01_S02_SH005',
        sceneId: 'S02',
        characterId: 'CHAR_ANYA',
        provider: 'Gemini Flash Audio TTS Engine',
        model: 'gemini-3.1-flash-tts-preview',
        prompt: 'Voice: Zephyr. Emotion: breathless concern. Line: Is the primary dampener failing again?',
        url: '',
        createdAt: '2026-08-11T10:00:00Z',
        status: 'approved',
        versionTake: 1,
        durationSec: 2.8,
        costUsd: 0.00
      },
      {
        id: 'AST_006',
        name: 'Music: Deep Space Isolation Theme',
        filename: 'TLS_MUS_ACT1_ISOLATION_THEME.wav',
        type: 'MUSIC',
        actId: 'ACT_I',
        sceneId: 'S01',
        provider: 'Web Audio Cinematic Synthesizer',
        model: 'cinema-audio-engine-v2',
        prompt: 'Genre: Dark Ambient / Orchestral. BPM: 64. Key: D minor.',
        url: '',
        createdAt: '2026-08-11T10:30:00Z',
        status: 'approved',
        versionTake: 1,
        durationSec: 32.0,
        costUsd: 0.00
      },
      {
        id: 'AST_007',
        name: 'SFX: Quantum Array Recalibration Servo & Vapor Vent',
        filename: 'TLS_SFX_QUANTUM_ARRAY_SERVO.wav',
        type: 'SFX',
        shotId: 'TLS_A01_S01_SH002',
        sceneId: 'S01',
        provider: 'Web Audio Cinematic Synthesizer',
        model: 'procedural-sfx-v1',
        prompt: 'Heavy pneumatic actuators and cryogenic nitrogen venting burst',
        url: '',
        createdAt: '2026-08-11T10:45:00Z',
        status: 'approved',
        versionTake: 1,
        durationSec: 4.2,
        costUsd: 0.00
      }
    ],
    generationJobs: [
      {
        id: 'JOB_001',
        title: 'Generate Keyframe: Helios-9 Exterior Shot 1',
        targetType: 'image',
        targetId: 'TLS_A01_S01_SH001',
        shotId: 'TLS_A01_S01_SH001',
        sceneId: 'S01',
        provider: 'Gemini Imagen / Flash Image',
        model: 'gemini-3.1-flash-lite-image',
        prompt: 'Cinematic 70mm film still, extreme wide shot of massive modular deep space relay station Helios-9...',
        status: 'completed',
        progress: 100,
        costEstimateUsd: 0.00,
        createdAt: '2026-08-11T08:59:00Z',
        completedAt: '2026-08-11T09:00:00Z',
        resultUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80'
      },
      {
        id: 'JOB_002',
        title: 'Generate Dialogue TTS: DIA_001 (Anya)',
        targetType: 'tts',
        targetId: 'DIA_001',
        shotId: 'TLS_A01_S02_SH005',
        sceneId: 'S02',
        provider: 'Gemini Flash Audio TTS Engine',
        model: 'gemini-3.1-flash-tts-preview',
        prompt: 'Is the primary dampener failing again?',
        status: 'completed',
        progress: 100,
        costEstimateUsd: 0.00,
        createdAt: '2026-08-11T09:59:00Z',
        completedAt: '2026-08-11T10:00:00Z'
      }
    ],
    zeroBudget: {
      enabled: false,
      maxBudgetUsd: 50.00,
      spentBudgetUsd: 0.00,
      allowPaidWithConfirmation: true
    },
    studioBranding: {
      studioName: 'NULL SECTOR FILM STUDIOS',
      titleCard: 'THE LAST SIGNAL',
      subtitle: 'A DEEP SPACE PRODUCTION',
      tagline: 'IN THE DEAD ZONE, SOUND HAS SYNTAX',
      animationStyle: 'signal_distortion',
      soundStinger: 'quantum_riser',
      durationSec: 4
    },
    productionNotes: [
      'Master Character Reference locked for Captain Elias and Dr. Anya Vance to guarantee visual consistency in all generated frames.',
      'OpenMontage ID schema configured: [PROJECT]_[ACT]_[SCENE]_[SHOT] (e.g. TLS_A01_S01_SH001).',
      'All dialogue segments paired with character master voice profiles (Kore for Elias, Zephyr for Anya, Fenrir for Unit-7).',
      'Production Validation: All 4 Acts and 8 Scenes structured. 161 Shot list framework active with canonical detail pack loaded.'
    ]
  };
};

export const theLastSignalProject: FilmProject = createTheLastSignalProject();
