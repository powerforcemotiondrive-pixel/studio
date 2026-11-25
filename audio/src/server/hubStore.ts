import fs from 'node:fs';
import path from 'node:path';
import type { Response } from 'express';
import type {
  BatchJobStatus,
  GapFillExercise,
  HubStateSnapshot,
  PilotMessageExercise,
  RealAtcDrill,
  ScormPackagePlan,
} from '../types/hub.ts';
import { DEFAULT_DRIVE_FOLDER_ID } from './driveSync.ts';
import { createSeedGapFillExercises } from './gapFillSeed.ts';
import { createSeedPilotMessages } from './pilotMessagesSeed.ts';

export const HUB_ROOT_DIR = path.resolve(process.cwd(), 'documents', 'enac_gsea_hub');
export const REAL_ATC_DIR = path.resolve(HUB_ROOT_DIR, 'real_atc');
export const AI_GAPFILL_DIR = path.resolve(HUB_ROOT_DIR, 'ai_gapfill');
export const PILOT_MSG_DIR = path.resolve(HUB_ROOT_DIR, 'pilot_messages');
const STATE_FILE = path.resolve(HUB_ROOT_DIR, 'hub_state.json');

// Safe 85 MB cap per SCORM package (well under Moodle's 100 MB upload limit)
export const MAX_SCORM_PACKAGE_BYTES = 85 * 1024 * 1024;
const SCORM_SHELL_OVERHEAD_BYTES = 2.5 * 1024 * 1024;

interface PersistedHubState {
  driveFolderId: string;
  lastDriveSyncAt: string | null;
  realAtcDrills: RealAtcDrill[];
  gapFillExercises: GapFillExercise[];
  pilotMessages: PilotMessageExercise[];
}

const sseClients = new Set<Response>();

let persisted: PersistedHubState = {
  driveFolderId: DEFAULT_DRIVE_FOLDER_ID,
  lastDriveSyncAt: null,
  realAtcDrills: [],
  gapFillExercises: createSeedGapFillExercises(),
  pilotMessages: createSeedPilotMessages(),
};

let batchJob: BatchJobStatus = {
  running: false,
  kind: null,
  processed: 0,
  total: 0,
  currentLabel: '',
};

export function ensureHubDirs(): void {
  fs.mkdirSync(REAL_ATC_DIR, { recursive: true });
  fs.mkdirSync(AI_GAPFILL_DIR, { recursive: true });
  fs.mkdirSync(PILOT_MSG_DIR, { recursive: true });
}

export function resolveSafeHubAudioPath(
  bucket: 'real_atc' | 'ai_gapfill' | 'pilot_messages',
  filename: string
): string | null {
  ensureHubDirs();
  const baseDir =
    bucket === 'real_atc'
      ? REAL_ATC_DIR
      : bucket === 'pilot_messages'
        ? PILOT_MSG_DIR
        : AI_GAPFILL_DIR;
  const base = path.basename(filename);
  if (!base || base !== filename || !/^[a-zA-Z0-9._-]+$/.test(base)) {
    return null;
  }
  const resolved = path.resolve(baseDir, base);
  if (!resolved.startsWith(baseDir + path.sep)) {
    return null;
  }
  return resolved;
}

export function loadHubState(): PersistedHubState {
  ensureHubDirs();
  const seedGaps = createSeedGapFillExercises();
  const seedPilots = createSeedPilotMessages();

  if (fs.existsSync(STATE_FILE)) {
    try {
      const raw = fs.readFileSync(STATE_FILE, 'utf8');
      const parsed = JSON.parse(raw) as Partial<PersistedHubState>;
      const savedGapMap = new Map(
        (Array.isArray(parsed.gapFillExercises) ? parsed.gapFillExercises : []).map((g) => [g.id, g])
      );
      const savedPilotMap = new Map(
        (Array.isArray(parsed.pilotMessages) ? parsed.pilotMessages : []).map((p) => [p.id, p])
      );

      persisted = {
        driveFolderId: parsed.driveFolderId || DEFAULT_DRIVE_FOLDER_ID,
        lastDriveSyncAt: parsed.lastDriveSyncAt ?? null,
        realAtcDrills: Array.isArray(parsed.realAtcDrills) ? parsed.realAtcDrills : [],
        gapFillExercises: seedGaps.map((seed) => {
          const prev = savedGapMap.get(seed.id);
          return prev ? { ...seed, ...prev } : seed;
        }),
        pilotMessages: seedPilots.map((seed) => {
          const prev = savedPilotMap.get(seed.id);
          return prev ? { ...seed, ...prev } : seed;
        }),
      };
    } catch {
      persisted = {
        driveFolderId: DEFAULT_DRIVE_FOLDER_ID,
        lastDriveSyncAt: null,
        realAtcDrills: [],
        gapFillExercises: seedGaps,
        pilotMessages: seedPilots,
      };
    }
  } else {
    persisted = {
      driveFolderId: DEFAULT_DRIVE_FOLDER_ID,
      lastDriveSyncAt: null,
      realAtcDrills: [],
      gapFillExercises: seedGaps,
      pilotMessages: seedPilots,
    };
  }

  // Reconcile disk file existence & sizes
  persisted.realAtcDrills = persisted.realAtcDrills.map((drill) => {
    const safe = resolveSafeHubAudioPath('real_atc', drill.localFilename);
    const exists = Boolean(safe && fs.existsSync(safe));
    const size = exists && safe ? fs.statSync(safe).size : 0;
    return {
      ...drill,
      hasLocalAudio: exists,
      fileSizeBytes: size,
      status: drill.status === 'processing' ? 'unprepared' : drill.status,
    };
  });

  persisted.gapFillExercises = persisted.gapFillExercises.map((ex) => {
    const safe = resolveSafeHubAudioPath('ai_gapfill', ex.audioFilename);
    const exists = Boolean(safe && fs.existsSync(safe));
    const size = exists && safe ? fs.statSync(safe).size : 0;
    return {
      ...ex,
      hasLocalAudio: exists,
      fileSizeBytes: size,
      audioStatus: exists ? 'ready' : ex.audioStatus === 'generating' ? 'unprepared' : ex.audioStatus,
    };
  });

  persisted.pilotMessages = persisted.pilotMessages.map((pm) => {
    const safe = resolveSafeHubAudioPath('pilot_messages', pm.audioFilename);
    const exists = Boolean(safe && fs.existsSync(safe));
    const size = exists && safe ? fs.statSync(safe).size : 0;
    return {
      ...pm,
      hasLocalAudio: exists,
      fileSizeBytes: size,
      audioStatus: exists ? 'ready' : pm.audioStatus === 'generating' ? 'unprepared' : pm.audioStatus,
    };
  });

  return persisted;
}

export function saveHubState(): void {
  ensureHubDirs();
  const tmp = `${STATE_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(persisted, null, 2), 'utf8');
  fs.renameSync(tmp, STATE_FILE);
}

export function getHubData(): PersistedHubState {
  return persisted;
}

export function getBatchJob(): BatchJobStatus {
  return batchJob;
}

export function setBatchJob(next: BatchJobStatus): void {
  batchJob = next;
  broadcastHubEvent('batch_status', batchJob);
}

export function addHubSseClient(res: Response): void {
  sseClients.add(res);
  res.on('close', () => {
    sseClients.delete(res);
  });
}

export function broadcastHubEvent(event: string, payload: unknown): void {
  const chunk = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(chunk);
    } catch {
      sseClients.delete(client);
    }
  }
}

export function computeScormPlans(): ScormPackagePlan[] {
  const plans: ScormPackagePlan[] = [];
  const readyReal = persisted.realAtcDrills.filter((d) => d.status === 'ready' && d.hasLocalAudio);
  const readyGaps = persisted.gapFillExercises.filter((g) => g.audioStatus === 'ready' && g.hasLocalAudio);
  const readyPilots = persisted.pilotMessages.filter((p) => p.audioStatus === 'ready' && p.hasLocalAudio);

  const realBytes = readyReal.reduce((s, d) => s + (d.fileSizeBytes || 0), 0);
  const gapBytes = readyGaps.reduce((s, g) => s + Math.round((g.fileSizeBytes || 0) * 0.9), 0);
  const pilotBytes = readyPilots.reduce((s, p) => s + Math.round((p.fileSizeBytes || 0) * 0.9), 0);

  const readySectionsCount =
    (readyReal.length > 0 ? 1 : 0) + (readyGaps.length > 0 ? 1 : 0) + (readyPilots.length > 0 ? 1 : 0);

  // 1. Combined package option if everything currently ready fits under 85 MB
  if (
    readySectionsCount >= 2 &&
    realBytes + gapBytes + pilotBytes + SCORM_SHELL_OVERHEAD_BYTES <= MAX_SCORM_PACKAGE_BYTES
  ) {
    plans.push({
      id: 'combined_all',
      name: 'Complete Hub (All Ready Sections)',
      filename: 'ENAC_GSEA_Listening_Hub_Complete_SCORM12.zip',
      description: `Single Moodle SCORM 1.2 package with ${readyReal.length} Real ATC clips, ${readyGaps.length} Ground Ops drills, and ${readyPilots.length} Pilot Messages.`,
      section: 'combined',
      realAtcIds: readyReal.map((d) => d.id),
      gapFillIds: readyGaps.map((g) => g.id),
      pilotMessageIds: readyPilots.map((p) => p.id),
      estimatedBytes: realBytes + gapBytes + pilotBytes + SCORM_SHELL_OVERHEAD_BYTES,
      readyCount: readyReal.length + readyGaps.length + readyPilots.length,
      totalCount:
        persisted.realAtcDrills.length +
        persisted.gapFillExercises.length +
        persisted.pilotMessages.length,
      underLimit: true,
    });
  }

  // 2. Section 1: Real ATC — never split by phase of flight; chunk sequentially by 85 MB size cap
  if (readyReal.length > 0) {
    const chunks: RealAtcDrill[][] = [];
    let currentChunk: RealAtcDrill[] = [];
    let currentSize = SCORM_SHELL_OVERHEAD_BYTES;

    for (const drill of readyReal) {
      const sz = drill.fileSizeBytes || 400_000;
      if (currentChunk.length > 0 && currentSize + sz > MAX_SCORM_PACKAGE_BYTES) {
        chunks.push(currentChunk);
        currentChunk = [drill];
        currentSize = SCORM_SHELL_OVERHEAD_BYTES + sz;
      } else {
        currentChunk.push(drill);
        currentSize += sz;
      }
    }
    if (currentChunk.length > 0) chunks.push(currentChunk);

    chunks.forEach((chunk, idx) => {
      const bytes = chunk.reduce((s, d) => s + (d.fileSizeBytes || 0), SCORM_SHELL_OVERHEAD_BYTES);
      const firstNum = chunk[0]?.indexNumber ?? 1;
      const lastNum = chunk[chunk.length - 1]?.indexNumber ?? chunk.length;
      const partLabel = chunks.length > 1 ? ` — Part ${idx + 1} of ${chunks.length}` : '';
      plans.push({
        id: `real_atc_part_${idx + 1}`,
        name: `Section 1: Real ATC Drills${partLabel} (Clips ${firstNum}–${lastNum})`,
        filename: `ENAC_GSEA_Section1_RealATC_Part${idx + 1}_SCORM12.zip`,
        description: `${chunk.length} prepared pilot–controller "Select Words You Heard" drills with audio & transcripts.`,
        section: 'real_atc',
        realAtcIds: chunk.map((d) => d.id),
        gapFillIds: [],
        pilotMessageIds: [],
        estimatedBytes: bytes,
        readyCount: chunk.length,
        totalCount: chunk.length,
        underLimit: bytes <= MAX_SCORM_PACKAGE_BYTES,
      });
    });
  } else {
    plans.push({
      id: 'real_atc_part_1',
      name: 'Section 1: Real ATC Drills',
      filename: 'ENAC_GSEA_Section1_RealATC_Part1_SCORM12.zip',
      description: 'Prepare clips using Gemini transcription above to include them in this SCORM package.',
      section: 'real_atc',
      realAtcIds: [],
      gapFillIds: [],
      pilotMessageIds: [],
      estimatedBytes: SCORM_SHELL_OVERHEAD_BYTES,
      readyCount: 0,
      totalCount: persisted.realAtcDrills.length,
      underLimit: true,
    });
  }

  // 3. Section 2: ICAO Ground Ops Gap-Fill (6 categories — auto-splits cleanly under 85 MB)
  if (readyGaps.length > 0) {
    const chunks: GapFillExercise[][] = [];
    let currentChunk: GapFillExercise[] = [];
    let currentSize = SCORM_SHELL_OVERHEAD_BYTES;

    for (const ex of readyGaps) {
      const sz = Math.round((ex.fileSizeBytes || 420_000) * 0.9);
      if (currentChunk.length > 0 && currentSize + sz > MAX_SCORM_PACKAGE_BYTES) {
        chunks.push(currentChunk);
        currentChunk = [ex];
        currentSize = SCORM_SHELL_OVERHEAD_BYTES + sz;
      } else {
        currentChunk.push(ex);
        currentSize += sz;
      }
    }
    if (currentChunk.length > 0) chunks.push(currentChunk);

    chunks.forEach((chunk, idx) => {
      const bytes = chunk.reduce(
        (s, g) => s + Math.round((g.fileSizeBytes || 0) * 0.9),
        SCORM_SHELL_OVERHEAD_BYTES
      );
      const partLabel = chunks.length > 1 ? ` — Part ${idx + 1} of ${chunks.length}` : '';
      plans.push({
        id: chunks.length === 1 ? 'ai_gapfill_all' : `ai_gapfill_part_${idx + 1}`,
        name: `Section 2: ICAO Ground Operations Gap-Fill${partLabel}`,
        filename:
          chunks.length === 1
            ? 'ENAC_GSEA_Section2_ICAO_GapFill_SCORM12.zip'
            : `ENAC_GSEA_Section2_ICAO_GapFill_Part${idx + 1}_SCORM12.zip`,
        description: `${chunk.length} ready European/ICAO VHF radio gap-fill exercises (ATIS, AFIS, Route Clearance, Ground, Pushback, Taxiway).`,
        section: 'ai_gapfill',
        realAtcIds: [],
        gapFillIds: chunk.map((g) => g.id),
        pilotMessageIds: [],
        estimatedBytes: bytes,
        readyCount: chunk.length,
        totalCount: chunks.length === 1 ? persisted.gapFillExercises.length : chunk.length,
        underLimit: bytes <= MAX_SCORM_PACKAGE_BYTES,
      });
    });
  } else {
    plans.push({
      id: 'ai_gapfill_all',
      name: 'Section 2: ICAO Ground Operations Gap-Fill (6 Categories)',
      filename: 'ENAC_GSEA_Section2_ICAO_GapFill_SCORM12.zip',
      description: 'Generate AI VHF radio audio for Section 2 exercises above to bundle them into this SCORM package.',
      section: 'ai_gapfill',
      realAtcIds: [],
      gapFillIds: [],
      pilotMessageIds: [],
      estimatedBytes: SCORM_SHELL_OVERHEAD_BYTES,
      readyCount: 0,
      totalCount: persisted.gapFillExercises.length,
      underLimit: true,
    });
  }

  // 4. Section 3: Routine & Non-Routine Pilot Messages (30 exercises, 3 gaps + phase/context/vocab)
  plans.push({
    id: 'pilot_messages_all',
    name: 'Section 3: Routine & Non-Routine Pilot Messages',
    filename: 'ENAC_GSEA_Section3_PilotMessages_SCORM12.zip',
    description:
      readyPilots.length > 0
        ? `${readyPilots.length} ready airborne cockpit VHF pilot messages (3-gap drills with phase of flight, context & vocabulary).`
        : 'Generate cockpit VHF audio for Section 3 exercises above to bundle them into this SCORM package.',
    section: 'pilot_messages',
    realAtcIds: [],
    gapFillIds: [],
    pilotMessageIds: readyPilots.map((p) => p.id),
    estimatedBytes: pilotBytes + SCORM_SHELL_OVERHEAD_BYTES,
    readyCount: readyPilots.length,
    totalCount: persisted.pilotMessages.length,
    underLimit: pilotBytes + SCORM_SHELL_OVERHEAD_BYTES <= MAX_SCORM_PACKAGE_BYTES,
  });

  return plans;
}

export function getHubSnapshot(): HubStateSnapshot {
  const realAtcReady = persisted.realAtcDrills.filter((d) => d.status === 'ready' && d.hasLocalAudio).length;
  const realAtcAudioBytes = persisted.realAtcDrills.reduce((s, d) => s + (d.fileSizeBytes || 0), 0);
  const gapFillReady = persisted.gapFillExercises.filter((g) => g.audioStatus === 'ready' && g.hasLocalAudio).length;
  const gapFillAudioBytes = persisted.gapFillExercises.reduce((s, g) => s + (g.fileSizeBytes || 0), 0);
  const pilotMessagesReady = persisted.pilotMessages.filter(
    (p) => p.audioStatus === 'ready' && p.hasLocalAudio
  ).length;
  const pilotMessagesAudioBytes = persisted.pilotMessages.reduce(
    (s, p) => s + (p.fileSizeBytes || 0),
    0
  );

  return {
    driveFolderId: persisted.driveFolderId,
    driveFolderUrl: `https://drive.google.com/drive/folders/${persisted.driveFolderId}`,
    lastDriveSyncAt: persisted.lastDriveSyncAt,
    realAtcDrills: persisted.realAtcDrills,
    gapFillExercises: persisted.gapFillExercises,
    pilotMessages: persisted.pilotMessages,
    scormPlans: computeScormPlans(),
    batchJob,
    stats: {
      realAtcTotal: persisted.realAtcDrills.length,
      realAtcReady,
      realAtcAudioBytes,
      gapFillTotal: persisted.gapFillExercises.length,
      gapFillReady,
      gapFillAudioBytes,
      pilotMessagesTotal: persisted.pilotMessages.length,
      pilotMessagesReady,
      pilotMessagesAudioBytes,
    },
  };
}
