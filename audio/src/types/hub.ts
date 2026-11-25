export type GapFillCategory = 'atis' | 'afis' | 'clearance' | 'ground' | 'pushback' | 'taxiway';

export interface TranscriptLine {
  speaker: 'ATC' | 'PILOT' | 'OTHER';
  text: string;
}

export interface RealAtcDrill {
  id: string;
  indexNumber: number;
  driveFileId: string;
  originalFilename: string;
  localFilename: string;
  title: string;
  contextHint: string;
  hasLocalAudio: boolean;
  fileSizeBytes: number;
  status: 'unprepared' | 'processing' | 'ready' | 'error';
  errorMessage?: string;
  heardWords: string[];
  distractorWords: string[];
  transcript: string;
  transcriptLines: TranscriptLine[];
  preparedAt?: string;
}

export interface GapBlank {
  id: string;
  answer: string;
  acceptedAnswers: string[];
  hint: string;
}

export interface GapFillExercise {
  id: string;
  category: GapFillCategory;
  indexInCategory: number;
  airportIcao: string;
  airportName: string;
  facility: string;
  title: string;
  instructions: string;
  /** Full spoken text used for Gemini TTS synthesis */
  spokenScript: string;
  /**
   * Display template with placeholders like {{0}}, {{1}}, {{2}} matching blanks[] indices.
   */
  templateText: string;
  blanks: GapBlank[];
  voiceRole: 'single_broadcast' | 'atc_pilot_exchange';
  audioFilename: string;
  hasLocalAudio: boolean;
  fileSizeBytes: number;
  audioStatus: 'unprepared' | 'generating' | 'ready' | 'error';
  audioError?: string;
}

export interface PilotVocabItem {
  term: string;
  meaning: string;
}

export interface PilotMessageExercise {
  id: string;
  indexNumber: number;
  messageType: 'routine' | 'non_routine';
  callsign: string;
  sector: string;
  frequencyMHz: string;
  title: string;
  /** Spoken pilot radio call on the active frequency */
  spokenScript: string;
  /** Display template with exactly 3 gaps: {{0}}, {{1}}, {{2}} */
  templateText: string;
  blanks: GapBlank[];
  /** Shown after student checks answers */
  phaseOfFlight: string;
  contextSummary: string;
  usefulVocabulary: PilotVocabItem[];
  voiceName: 'Puck' | 'Fenrir' | 'Charon' | 'Kore' | 'Orus';
  audioFilename: string;
  hasLocalAudio: boolean;
  fileSizeBytes: number;
  audioStatus: 'unprepared' | 'generating' | 'ready' | 'error';
  audioError?: string;
}

export interface ScormPackagePlan {
  id: string;
  name: string;
  filename: string;
  description: string;
  section: 'combined' | 'real_atc' | 'ai_gapfill' | 'pilot_messages';
  realAtcIds: string[];
  gapFillIds: string[];
  pilotMessageIds: string[];
  estimatedBytes: number;
  readyCount: number;
  totalCount: number;
  underLimit: boolean;
}

export interface BatchJobStatus {
  running: boolean;
  kind: 'real_atc' | 'ai_gapfill' | 'pilot_messages' | null;
  processed: number;
  total: number;
  currentLabel: string;
  lastError?: string;
}

export interface HubStateSnapshot {
  driveFolderId: string;
  driveFolderUrl: string;
  lastDriveSyncAt: string | null;
  realAtcDrills: RealAtcDrill[];
  gapFillExercises: GapFillExercise[];
  pilotMessages: PilotMessageExercise[];
  scormPlans: ScormPackagePlan[];
  batchJob: BatchJobStatus;
  stats: {
    realAtcTotal: number;
    realAtcReady: number;
    realAtcAudioBytes: number;
    gapFillTotal: number;
    gapFillReady: number;
    gapFillAudioBytes: number;
    pilotMessagesTotal: number;
    pilotMessagesReady: number;
    pilotMessagesAudioBytes: number;
  };
}
