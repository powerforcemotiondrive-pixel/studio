import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import type {
  GapFillCategory,
  GapFillExercise,
  PilotMessageExercise,
  RealAtcDrill,
} from './src/types/hub.ts';
import {
  DEFAULT_DRIVE_FOLDER_ID,
  downloadDriveAudioFile,
  extractDriveFolderId,
  listPublicDriveAudioFiles,
} from './src/server/driveSync.ts';
import {
  synthesizeGapFillWav,
  synthesizePilotMessageWav,
  transcribeAndBuildWordDrill,
} from './src/server/geminiHub.ts';
import {
  HUB_ROOT_DIR,
  addHubSseClient,
  broadcastHubEvent,
  computeScormPlans,
  ensureHubDirs,
  getBatchJob,
  getHubData,
  getHubSnapshot,
  loadHubState,
  resolveSafeHubAudioPath,
  saveHubState,
  setBatchJob,
} from './src/server/hubStore.ts';
import { buildScorm12Zip } from './src/server/scormBuilder.ts';

const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

ensureHubDirs();
loadHubState();

let stopBatchRequested = false;

function sanitizeLocalAudioName(indexNumber: number, originalFilename: string): string {
  const ext = path.extname(originalFilename).toLowerCase();
  const safeExt = ['.mp3', '.wav', '.m4a', '.ogg'].includes(ext) ? ext : '.mp3';
  const stem = path
    .basename(originalFilename, ext)
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
  return `clip_${String(indexNumber).padStart(2, '0')}_${stem || 'atc'}${safeExt}`;
}

async function syncDriveFolder(folderIdInput?: string): Promise<RealAtcDrill[]> {
  const data = getHubData();
  const folderId = folderIdInput ? extractDriveFolderId(folderIdInput) : data.driveFolderId || DEFAULT_DRIVE_FOLDER_ID;
  if (!folderId) {
    throw new Error('Please provide a valid public Google Drive folder link or folder ID.');
  }

  const entries = await listPublicDriveAudioFiles(folderId);
  if (entries.length === 0) {
    throw new Error(
      'No audio files (.mp3, .wav, .m4a, .ogg) were found in that Google Drive folder. Verify link sharing is set to "Anyone with the link can view".'
    );
  }

  const existingByFileId = new Map(data.realAtcDrills.map((d) => [d.driveFileId, d]));
  const updatedDrills: RealAtcDrill[] = entries.map((entry, idx) => {
    const num = idx + 1;
    const prev = existingByFileId.get(entry.fileId);
    if (prev) {
      return {
        ...prev,
        indexNumber: num,
        originalFilename: entry.filename,
      };
    }
    const localFilename = sanitizeLocalAudioName(num, entry.filename);
    const safePath = resolveSafeHubAudioPath('real_atc', localFilename);
    const exists = Boolean(safePath && fs.existsSync(safePath));
    const size = exists && safePath ? fs.statSync(safePath).size : 0;

    return {
      id: `real_${entry.fileId.slice(0, 12)}`,
      indexNumber: num,
      driveFileId: entry.fileId,
      originalFilename: entry.filename,
      localFilename,
      title: entry.cleanTitle,
      contextHint: entry.contextHint,
      hasLocalAudio: exists,
      fileSizeBytes: size,
      status: 'unprepared',
      heardWords: [],
      distractorWords: [],
      transcript: '',
      transcriptLines: [],
    };
  });

  data.driveFolderId = folderId;
  data.lastDriveSyncAt = new Date().toISOString();
  data.realAtcDrills = updatedDrills;
  saveHubState();
  broadcastHubEvent('state_update', getHubSnapshot());
  return updatedDrills;
}

async function prepareSingleRealDrill(drillId: string, forceRetranscribe = false): Promise<RealAtcDrill> {
  const data = getHubData();
  const idx = data.realAtcDrills.findIndex((d) => d.id === drillId);
  if (idx < 0) {
    throw new Error('Real ATC clip not found.');
  }

  let drill = data.realAtcDrills[idx];
  if (!forceRetranscribe && drill.status === 'ready' && drill.hasLocalAudio && drill.heardWords.length > 0) {
    return drill;
  }

  drill = { ...drill, status: 'processing', errorMessage: undefined };
  data.realAtcDrills[idx] = drill;
  broadcastHubEvent('drill_updated', drill);

  try {
    const safePath = resolveSafeHubAudioPath('real_atc', drill.localFilename);
    if (!safePath) {
      throw new Error('Could not resolve safe audio path.');
    }

    let fileSizeBytes = drill.fileSizeBytes;
    let mimeType = 'audio/mpeg';
    if (!fs.existsSync(safePath) || fs.statSync(safePath).size < 512) {
      const dl = await downloadDriveAudioFile(drill.driveFileId, safePath);
      fileSizeBytes = dl.fileSizeBytes;
      mimeType = dl.mimeType;
    } else {
      fileSizeBytes = fs.statSync(safePath).size;
      const ext = path.extname(safePath).toLowerCase();
      mimeType = ext === '.wav' ? 'audio/wav' : ext === '.m4a' ? 'audio/mp4' : ext === '.ogg' ? 'audio/ogg' : 'audio/mpeg';
    }

    const built = await transcribeAndBuildWordDrill({
      filePath: safePath,
      mimeType,
      originalFilename: drill.originalFilename,
      fallbackTitle: drill.title,
    });

    drill = {
      ...drill,
      title: `Clip ${String(drill.indexNumber).padStart(2, '0')} — ${built.title.replace(/^Clip\s+\d+\s*[—:-]\s*/i, '')}`,
      contextHint: built.contextHint,
      hasLocalAudio: true,
      fileSizeBytes,
      status: 'ready',
      errorMessage: undefined,
      heardWords: built.heardWords,
      distractorWords: built.distractorWords,
      transcript: built.transcript,
      transcriptLines: built.transcriptLines,
      preparedAt: new Date().toISOString(),
    };
    data.realAtcDrills[idx] = drill;
    saveHubState();
    broadcastHubEvent('state_update', getHubSnapshot());
    return drill;
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to prepare audio drill.';
    const safePath = resolveSafeHubAudioPath('real_atc', drill.localFilename);
    const hasAudio = Boolean(safePath && fs.existsSync(safePath) && fs.statSync(safePath).size >= 512);
    drill = {
      ...drill,
      hasLocalAudio: hasAudio,
      fileSizeBytes: hasAudio && safePath ? fs.statSync(safePath).size : 0,
      status: 'error',
      errorMessage: msg,
    };
    data.realAtcDrills[idx] = drill;
    saveHubState();
    broadcastHubEvent('state_update', getHubSnapshot());
    throw err;
  }
}

async function generateSingleGapAudio(exerciseId: string, force = false): Promise<GapFillExercise> {
  const data = getHubData();
  const idx = data.gapFillExercises.findIndex((g) => g.id === exerciseId);
  if (idx < 0) {
    throw new Error('Gap-fill exercise not found.');
  }

  let ex = data.gapFillExercises[idx];
  const safePath = resolveSafeHubAudioPath('ai_gapfill', ex.audioFilename);
  if (!safePath) {
    throw new Error('Could not resolve safe audio path.');
  }

  if (!force && ex.audioStatus === 'ready' && fs.existsSync(safePath) && fs.statSync(safePath).size > 512) {
    return ex;
  }

  ex = { ...ex, audioStatus: 'generating', audioError: undefined };
  data.gapFillExercises[idx] = ex;
  broadcastHubEvent('gap_updated', ex);

  try {
    const { fileSizeBytes } = await synthesizeGapFillWav(ex, safePath);
    ex = {
      ...ex,
      hasLocalAudio: true,
      fileSizeBytes,
      audioStatus: 'ready',
      audioError: undefined,
    };
    data.gapFillExercises[idx] = ex;
    saveHubState();
    broadcastHubEvent('state_update', getHubSnapshot());
    return ex;
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to generate AI audio.';
    ex = {
      ...ex,
      audioStatus: 'error',
      audioError: msg,
    };
    data.gapFillExercises[idx] = ex;
    saveHubState();
    broadcastHubEvent('state_update', getHubSnapshot());
    throw err;
  }
}

async function generateSinglePilotAudio(
  exerciseId: string,
  force = false
): Promise<PilotMessageExercise> {
  const data = getHubData();
  const idx = data.pilotMessages.findIndex((p) => p.id === exerciseId);
  if (idx < 0) {
    throw new Error('Pilot message exercise not found.');
  }

  let ex = data.pilotMessages[idx];
  const safePath = resolveSafeHubAudioPath('pilot_messages', ex.audioFilename);
  if (!safePath) {
    throw new Error('Could not resolve safe audio path.');
  }

  if (!force && ex.audioStatus === 'ready' && fs.existsSync(safePath) && fs.statSync(safePath).size > 512) {
    return ex;
  }

  ex = { ...ex, audioStatus: 'generating', audioError: undefined };
  data.pilotMessages[idx] = ex;
  broadcastHubEvent('pilot_updated', ex);

  try {
    const { fileSizeBytes } = await synthesizePilotMessageWav(ex, safePath);
    ex = {
      ...ex,
      hasLocalAudio: true,
      fileSizeBytes,
      audioStatus: 'ready',
      audioError: undefined,
    };
    data.pilotMessages[idx] = ex;
    saveHubState();
    broadcastHubEvent('state_update', getHubSnapshot());
    return ex;
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to generate cockpit VHF audio.';
    ex = {
      ...ex,
      audioStatus: 'error',
      audioError: msg,
    };
    data.pilotMessages[idx] = ex;
    saveHubState();
    broadcastHubEvent('state_update', getHubSnapshot());
    throw err;
  }
}

async function runBatchRealAtc(limit?: number): Promise<void> {
  if (getBatchJob().running) return;
  stopBatchRequested = false;

  const data = getHubData();
  const pending = data.realAtcDrills.filter((d) => d.status !== 'ready' || !d.hasLocalAudio);
  const targets = typeof limit === 'number' && limit > 0 ? pending.slice(0, limit) : pending;

  if (targets.length === 0) return;

  setBatchJob({
    running: true,
    kind: 'real_atc',
    processed: 0,
    total: targets.length,
    currentLabel: targets[0].title,
  });

  let processed = 0;
  let lastError: string | undefined;

  for (const drill of targets) {
    if (stopBatchRequested) break;
    setBatchJob({
      running: true,
      kind: 'real_atc',
      processed,
      total: targets.length,
      currentLabel: `Clip ${String(drill.indexNumber).padStart(2, '0')} (${drill.originalFilename})`,
      lastError,
    });
    try {
      await prepareSingleRealDrill(drill.id, false);
    } catch (err) {
      lastError = err instanceof Error ? err.message : 'Clip preparation failed';
    }
    processed += 1;
  }

  setBatchJob({
    running: false,
    kind: null,
    processed,
    total: targets.length,
    currentLabel: stopBatchRequested ? 'Paused by instructor' : 'Batch complete',
    lastError,
  });
  broadcastHubEvent('state_update', getHubSnapshot());
}

async function runBatchGapFill(category?: GapFillCategory, limit?: number): Promise<void> {
  if (getBatchJob().running) return;
  stopBatchRequested = false;

  const data = getHubData();
  const pending = data.gapFillExercises.filter(
    (g) => (!category || g.category === category) && (g.audioStatus !== 'ready' || !g.hasLocalAudio)
  );
  const targets = typeof limit === 'number' && limit > 0 ? pending.slice(0, limit) : pending;
  if (targets.length === 0) return;

  setBatchJob({
    running: true,
    kind: 'ai_gapfill',
    processed: 0,
    total: targets.length,
    currentLabel: targets[0].title,
  });

  let processed = 0;
  let lastError: string | undefined;

  for (const ex of targets) {
    if (stopBatchRequested) break;
    setBatchJob({
      running: true,
      kind: 'ai_gapfill',
      processed,
      total: targets.length,
      currentLabel: ex.title,
      lastError,
    });
    try {
      await generateSingleGapAudio(ex.id, false);
    } catch (err) {
      lastError = err instanceof Error ? err.message : 'Audio generation failed';
    }
    processed += 1;
  }

  setBatchJob({
    running: false,
    kind: null,
    processed,
    total: targets.length,
    currentLabel: stopBatchRequested ? 'Paused by instructor' : 'Batch complete',
    lastError,
  });
  broadcastHubEvent('state_update', getHubSnapshot());
}

async function runBatchPilotMessages(limit?: number): Promise<void> {
  if (getBatchJob().running) return;
  stopBatchRequested = false;

  const data = getHubData();
  const pending = data.pilotMessages.filter((p) => p.audioStatus !== 'ready' || !p.hasLocalAudio);
  const targets = typeof limit === 'number' && limit > 0 ? pending.slice(0, limit) : pending;
  if (targets.length === 0) return;

  setBatchJob({
    running: true,
    kind: 'pilot_messages',
    processed: 0,
    total: targets.length,
    currentLabel: targets[0].title,
  });

  let processed = 0;
  let lastError: string | undefined;

  for (const ex of targets) {
    if (stopBatchRequested) break;
    setBatchJob({
      running: true,
      kind: 'pilot_messages',
      processed,
      total: targets.length,
      currentLabel: `${ex.callsign} (${ex.frequencyMHz} MHz) — ${ex.title}`,
      lastError,
    });
    try {
      await generateSinglePilotAudio(ex.id, false);
    } catch (err) {
      lastError = err instanceof Error ? err.message : 'Pilot message audio generation failed';
    }
    processed += 1;
  }

  setBatchJob({
    running: false,
    kind: null,
    processed,
    total: targets.length,
    currentLabel: stopBatchRequested ? 'Paused by instructor' : 'Batch complete',
    lastError,
  });
  broadcastHubEvent('state_update', getHubSnapshot());
}

async function startServer(): Promise<void> {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  app.get('/api/hub/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();
    res.write(`event: connected\ndata: ${JSON.stringify({ ok: true })}\n\n`);
    addHubSseClient(res);
    req.on('close', () => res.end());
  });

  app.get('/api/hub/state', (_req, res) => {
    res.json(getHubSnapshot());
  });

  app.post('/api/hub/drive/sync', async (req, res) => {
    try {
      const folderUrl = typeof req.body?.folderUrl === 'string' ? req.body.folderUrl : undefined;
      await syncDriveFolder(folderUrl);
      res.json({ ok: true, snapshot: getHubSnapshot() });
    } catch (err) {
      res.status(400).json({
        error: err instanceof Error ? err.message : 'Failed to sync Google Drive folder.',
      });
    }
  });

  app.post('/api/hub/real-atc/:id/prepare', async (req, res) => {
    try {
      const force = Boolean(req.body?.force);
      const drill = await prepareSingleRealDrill(req.params.id, force);
      res.json({ ok: true, drill, snapshot: getHubSnapshot() });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Failed to transcribe and build drill.',
      });
    }
  });

  app.patch('/api/hub/real-atc/:id', (req, res) => {
    const data = getHubData();
    const idx = data.realAtcDrills.findIndex((d) => d.id === req.params.id);
    if (idx < 0) {
      res.status(404).json({ error: 'Drill not found.' });
      return;
    }
    const prev = data.realAtcDrills[idx];
    const body = req.body as Partial<RealAtcDrill>;
    const updated: RealAtcDrill = {
      ...prev,
      title: typeof body.title === 'string' && body.title.trim() ? body.title.trim() : prev.title,
      contextHint:
        typeof body.contextHint === 'string' && body.contextHint.trim()
          ? body.contextHint.trim()
          : prev.contextHint,
      heardWords: Array.isArray(body.heardWords)
        ? body.heardWords.map((w) => String(w).trim()).filter(Boolean).slice(0, 12)
        : prev.heardWords,
      distractorWords: Array.isArray(body.distractorWords)
        ? body.distractorWords.map((w) => String(w).trim()).filter(Boolean).slice(0, 10)
        : prev.distractorWords,
    };
    data.realAtcDrills[idx] = updated;
    saveHubState();
    broadcastHubEvent('state_update', getHubSnapshot());
    res.json({ ok: true, drill: updated });
  });

  app.post('/api/hub/real-atc/batch-prepare', (req, res) => {
    if (getBatchJob().running) {
      res.status(409).json({ error: 'Another batch job is already running.' });
      return;
    }
    const limit = typeof req.body?.limit === 'number' ? Math.max(1, Math.min(100, req.body.limit)) : undefined;
    void runBatchRealAtc(limit);
    res.json({ ok: true, batchJob: getBatchJob() });
  });

  app.post('/api/hub/gap-fill/:id/generate-audio', async (req, res) => {
    try {
      const force = Boolean(req.body?.force);
      const exercise = await generateSingleGapAudio(req.params.id, force);
      res.json({ ok: true, exercise, snapshot: getHubSnapshot() });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Failed to generate AI audio.',
      });
    }
  });

  app.post('/api/hub/gap-fill/batch-generate', (req, res) => {
    if (getBatchJob().running) {
      res.status(409).json({ error: 'Another batch job is already running.' });
      return;
    }
    const allowedCats = new Set<GapFillCategory>([
      'atis',
      'afis',
      'clearance',
      'ground',
      'pushback',
      'taxiway',
    ]);
    const rawCat = typeof req.body?.category === 'string' ? (req.body.category as GapFillCategory) : undefined;
    const category = rawCat && allowedCats.has(rawCat) ? rawCat : undefined;
    const limit = typeof req.body?.limit === 'number' ? Math.max(1, Math.min(180, req.body.limit)) : undefined;
    void runBatchGapFill(category, limit);
    res.json({ ok: true, batchJob: getBatchJob() });
  });

  app.post('/api/hub/pilot-messages/:id/generate-audio', async (req, res) => {
    try {
      const force = Boolean(req.body?.force);
      const exercise = await generateSinglePilotAudio(req.params.id, force);
      res.json({ ok: true, exercise, snapshot: getHubSnapshot() });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Failed to generate cockpit VHF audio.',
      });
    }
  });

  app.post('/api/hub/pilot-messages/batch-generate', (req, res) => {
    if (getBatchJob().running) {
      res.status(409).json({ error: 'Another batch job is already running.' });
      return;
    }
    const limit = typeof req.body?.limit === 'number' ? Math.max(1, Math.min(60, req.body.limit)) : undefined;
    void runBatchPilotMessages(limit);
    res.json({ ok: true, batchJob: getBatchJob() });
  });

  app.post('/api/hub/batch/stop', (_req, res) => {
    stopBatchRequested = true;
    res.json({ ok: true });
  });

  app.get('/api/hub/audio/:bucket/:filename', (req, res) => {
    const bucket = req.params.bucket;
    if (bucket !== 'real_atc' && bucket !== 'ai_gapfill' && bucket !== 'pilot_messages') {
      res.status(400).json({ error: 'Invalid audio bucket.' });
      return;
    }
    const safePath = resolveSafeHubAudioPath(bucket, req.params.filename);
    if (!safePath || !fs.existsSync(safePath)) {
      res.status(404).json({ error: 'Audio file not prepared yet.' });
      return;
    }

    const stat = fs.statSync(safePath);
    const ext = path.extname(safePath).toLowerCase();
    const contentType =
      ext === '.wav'
        ? 'audio/wav'
        : ext === '.m4a'
          ? 'audio/mp4'
          : ext === '.ogg'
            ? 'audio/ogg'
            : 'audio/mpeg';

    res.setHeader('Accept-Ranges', 'bytes');
    const range = req.headers.range;
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
      if (Number.isNaN(start) || Number.isNaN(end) || start > end || end >= stat.size) {
        res.status(416).setHeader('Content-Range', `bytes */${stat.size}`).end();
        return;
      }
      res.status(206);
      res.setHeader('Content-Range', `bytes ${start}-${end}/${stat.size}`);
      res.setHeader('Content-Length', String(end - start + 1));
      res.setHeader('Content-Type', contentType);
      fs.createReadStream(safePath, { start, end }).pipe(res);
      return;
    }

    res.setHeader('Content-Length', String(stat.size));
    res.setHeader('Content-Type', contentType);
    fs.createReadStream(safePath).pipe(res);
  });

  app.get('/api/hub/scorm/:planId', (req, res) => {
    try {
      const plans = computeScormPlans();
      const plan = plans.find((p) => p.id === req.params.planId);
      if (!plan) {
        res.status(404).json({ error: 'SCORM package plan not found.' });
        return;
      }
      if (plan.readyCount === 0) {
        res.status(400).json({
          error: 'No exercises are prepared with audio for this package yet. Prepare clips first.',
        });
        return;
      }
      const data = getHubData();
      const zipBuffer = buildScorm12Zip({
        plan,
        allRealDrills: data.realAtcDrills,
        allGapExercises: data.gapFillExercises,
        allPilotMessages: data.pilotMessages,
      });

      const safeDownloadName = plan.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${safeDownloadName}"`);
      res.setHeader('Content-Length', String(zipBuffer.length));
      res.send(zipBuffer);
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Failed to build SCORM 1.2 package.',
      });
    }
  });

  if (isProduction) {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ENAC GSEA Listening Hub running on http://0.0.0.0:${PORT} (Data: ${HUB_ROOT_DIR})`);
    // Automatically sync the user's shared Google Drive folder on initial boot
    const data = getHubData();
    if (data.realAtcDrills.length === 0) {
      setTimeout(async () => {
        try {
          await syncDriveFolder(DEFAULT_DRIVE_FOLDER_ID);
          // Warm up the first 2 real clips + first 2 AI gap-fills if GEMINI_API_KEY is available
          if (process.env.GEMINI_API_KEY) {
            const fresh = getHubData();
            for (const clip of fresh.realAtcDrills.slice(0, 2)) {
              try {
                await prepareSingleRealDrill(clip.id, false);
              } catch {
                // continue
              }
            }
            for (const gap of fresh.gapFillExercises.slice(0, 2)) {
              try {
                await generateSingleGapAudio(gap.id, false);
              } catch {
                // continue
              }
            }
          }
        } catch (err) {
          console.error('Initial Drive sync skipped:', err instanceof Error ? err.message : err);
        }
      }, 600);
    }
  });
}

void startServer();
