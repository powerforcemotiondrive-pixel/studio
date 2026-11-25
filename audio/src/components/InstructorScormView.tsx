import { useState } from 'react';
import {
  CheckCircle2,
  Download,
  ExternalLink,
  FolderSync,
  Loader2,
  Package,
  Sparkles,
  Square,
  Waves,
} from 'lucide-react';
import type { HubStateSnapshot } from '../types/hub';
import { formatBytesMb } from '../utils/hubFormatters';

interface InstructorScormViewProps {
  snapshot: HubStateSnapshot;
  syncingDrive: boolean;
  onSyncDrive: (folderUrl: string) => Promise<void>;
  onBatchRealAtc: (limit?: number) => Promise<void>;
  onBatchGapFill: (limit?: number) => Promise<void>;
  onBatchPilotMessages: (limit?: number) => Promise<void>;
  onStopBatch: () => Promise<void>;
}

export function InstructorScormView({
  snapshot,
  syncingDrive,
  onSyncDrive,
  onBatchRealAtc,
  onBatchGapFill,
  onBatchPilotMessages,
  onStopBatch,
}: InstructorScormViewProps) {
  const [folderUrl, setFolderUrl] = useState(snapshot.driveFolderUrl);
  const [driveMessage, setDriveMessage] = useState<string | null>(null);

  const { stats, batchJob, scormPlans } = snapshot;
  const remainingReal = Math.max(0, stats.realAtcTotal - stats.realAtcReady);
  const remainingGap = Math.max(0, stats.gapFillTotal - stats.gapFillReady);
  const remainingPilot = Math.max(0, stats.pilotMessagesTotal - stats.pilotMessagesReady);

  const handleDriveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDriveMessage(null);
    try {
      await onSyncDrive(folderUrl);
      setDriveMessage('Google Drive folder synced successfully.');
    } catch (err) {
      setDriveMessage(err instanceof Error ? err.message : 'Unable to sync folder.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Summary */}
      <section className="rounded-xl border border-[#DDE5F0] bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold text-[#0369A1]">Instructor Preparation &amp; Export</p>
            <h1 className="mt-1 text-2xl font-bold text-[#0F294A]">
              Gemini Content Builder &amp; Moodle SCORM 1.2 Packager
            </h1>
            <p className="mt-2 text-sm text-[#425874]">
              Sync your Google Drive audio clips, run Gemini transcription and AI voice generation,
              and export self-contained SCORM 1.2 <span className="font-mono">.zip</span> packages
              strictly under Moodle’s 100 MB limit (never split by phase of flight, no passing-score
              wall).
            </p>
          </div>
          <div className="grid grid-cols-3 gap-4 text-right">
            <div>
              <p className="text-xs text-[#526780]">Section 1 Ready</p>
              <p className="font-mono text-lg font-bold text-[#0F294A] tabular-nums">
                {stats.realAtcReady} / {stats.realAtcTotal}
              </p>
              <p className="font-mono text-[11px] text-[#526780] tabular-nums">
                {formatBytesMb(stats.realAtcAudioBytes)}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#526780]">Section 2 Ready</p>
              <p className="font-mono text-lg font-bold text-[#0F294A] tabular-nums">
                {stats.gapFillReady} / {stats.gapFillTotal}
              </p>
              <p className="font-mono text-[11px] text-[#526780] tabular-nums">
                {formatBytesMb(stats.gapFillAudioBytes)}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#526780]">Section 3 Ready</p>
              <p className="font-mono text-lg font-bold text-[#0F294A] tabular-nums">
                {stats.pilotMessagesReady} / {stats.pilotMessagesTotal}
              </p>
              <p className="font-mono text-[11px] text-[#526780] tabular-nums">
                {formatBytesMb(stats.pilotMessagesAudioBytes)}
              </p>
            </div>
          </div>
        </div>

        {/* Live Batch Progress Bar */}
        {batchJob.running && (
          <div className="mt-5 rounded-lg border border-[#0369A1]/30 bg-[#EFF6FC] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-xs">
                <Loader2 className="h-4 w-4 animate-spin text-[#0369A1]" />
                <span className="font-semibold text-[#0F294A]">
                  {batchJob.kind === 'real_atc'
                    ? 'Transcribing Real ATC Clips with Gemini'
                    : batchJob.kind === 'pilot_messages'
                      ? 'Generating Distorted Cockpit VHF Pilot Messages'
                      : 'Generating ICAO Ground Operations Audio'}
                </span>
                <span className="font-mono text-[#0369A1] tabular-nums">
                  {batchJob.processed} / {batchJob.total}
                </span>
              </div>
              <button
                type="button"
                onClick={() => void onStopBatch()}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#CBD5E1] bg-white px-3 text-xs font-semibold text-[#0F294A] hover:bg-red-50 hover:text-red-700"
              >
                <Square className="h-3 w-3 fill-current" />
                Pause Batch
              </button>
            </div>
            <p className="mt-1.5 truncate font-mono text-xs text-[#425874]">
              Current: {batchJob.currentLabel}
            </p>
            <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-white">
              <div
                className="h-full bg-[#0369A1] transition-all duration-300"
                style={{
                  width: `${Math.max(4, Math.round((batchJob.processed / Math.max(1, batchJob.total)) * 100))}%`,
                }}
              />
            </div>
            {batchJob.lastError && (
              <p className="mt-2 text-xs text-amber-800">Last note: {batchJob.lastError}</p>
            )}
          </div>
        )}
      </section>

      {/* Two-Column Batch Builder: Section 1 Google Drive + Section 2 AI Audio */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Section 1 Prep */}
        <section className="rounded-xl border border-[#DDE5F0] bg-white p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-[#0F294A]">
              1. Section 1 — Real ATC Clips (Google Drive)
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-[#526780]">
              Downloads each MP3 from your shared Google Drive folder, transcribes it with Gemini,
              and generates the &ldquo;Select words you heard&rdquo; word bank and transcript.
            </p>

            <form onSubmit={handleDriveSubmit} className="mt-4 flex flex-col gap-2 sm:flex-row">
              <input
                type="url"
                value={folderUrl}
                onChange={(e) => setFolderUrl(e.target.value)}
                placeholder="https://drive.google.com/drive/folders/..."
                className="h-9 flex-1 rounded-lg border border-[#D4DFEC] bg-[#F7F9FC] px-3 font-mono text-xs text-[#0F294A] focus:border-[#0369A1] focus:bg-white focus:outline-none"
              />
              <button
                type="submit"
                disabled={syncingDrive}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[#D4DFEC] bg-white px-3.5 text-xs font-semibold text-[#0F294A] hover:bg-[#F7F9FC] disabled:opacity-60 whitespace-nowrap"
              >
                {syncingDrive ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <FolderSync className="h-3.5 w-3.5 text-[#0369A1]" />
                )}
                Re-Sync Folder
              </button>
            </form>
            {driveMessage && <p className="mt-2 text-xs text-[#0369A1]">{driveMessage}</p>}

            <div className="mt-4 flex items-center justify-between text-xs text-[#526780]">
              <a
                href={snapshot.driveFolderUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-medium text-[#0369A1] hover:underline"
              >
                Open Google Drive folder
                <ExternalLink className="h-3 w-3" />
              </a>
              <span className="font-mono tabular-nums">
                {remainingReal} clip{remainingReal === 1 ? '' : 's'} remaining
              </span>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-[#E6EDF5] pt-4">
            <button
              type="button"
              disabled={batchJob.running || remainingReal === 0}
              onClick={() => void onBatchRealAtc(10)}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#0369A1] px-4 text-xs font-semibold text-white hover:bg-[#075985] disabled:opacity-50 whitespace-nowrap"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Prepare Next 10 Clips
            </button>
            <button
              type="button"
              disabled={batchJob.running || remainingReal === 0}
              onClick={() => void onBatchRealAtc(undefined)}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#D4DFEC] bg-white px-4 text-xs font-semibold text-[#0F294A] hover:bg-[#F7F9FC] disabled:opacity-50 whitespace-nowrap"
            >
              Prepare All {remainingReal} Remaining
            </button>
          </div>
        </section>

        {/* Section 2 Prep */}
        <section className="rounded-xl border border-[#DDE5F0] bg-white p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-[#0F294A]">
              2. Section 2 — European/ICAO Gap-Fill Audio ({stats.gapFillTotal} Exercises)
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-[#526780]">
              30 drills per category across ATIS, AFIS, Route Clearance, Ground, Pushback, and
              Taxiway Movements (LFBO, LFPG, EGLL, etc.). Every synthesized WAV includes authentic
              VHF radio filtering and subtle background static by default.
            </p>

            <div className="mt-4 grid grid-cols-3 gap-2 text-center sm:grid-cols-6">
              {(
                [
                  ['atis', 'ATIS'],
                  ['afis', 'AFIS'],
                  ['clearance', 'Clearance'],
                  ['ground', 'Ground'],
                  ['pushback', 'Pushback'],
                  ['taxiway', 'Taxiway'],
                ] as const
              ).map(([cat, label]) => {
                const totalInCat = snapshot.gapFillExercises.filter((g) => g.category === cat).length;
                const ready = snapshot.gapFillExercises.filter(
                  (g) => g.category === cat && g.hasLocalAudio
                ).length;
                return (
                  <div key={cat} className="rounded-lg border border-[#E6EDF5] bg-[#F7F9FC] py-2">
                    <p className="text-[10px] font-semibold uppercase text-[#526780]">{label}</p>
                    <p className="mt-0.5 font-mono text-xs font-bold text-[#0F294A] tabular-nums">
                      {ready}/{totalInCat}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-[#E6EDF5] pt-4">
            <button
              type="button"
              disabled={batchJob.running || remainingGap === 0}
              onClick={() => void onBatchGapFill(15)}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#0369A1] px-4 text-xs font-semibold text-white hover:bg-[#075985] disabled:opacity-50 whitespace-nowrap"
            >
              <Waves className="h-3.5 w-3.5" />
              Generate Next 15 Audio
            </button>
            <button
              type="button"
              disabled={batchJob.running || remainingGap === 0}
              onClick={() => void onBatchGapFill(undefined)}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#D4DFEC] bg-white px-4 text-xs font-semibold text-[#0F294A] hover:bg-[#F7F9FC] disabled:opacity-50 whitespace-nowrap"
            >
              Generate All {remainingGap} Remaining
            </button>
          </div>
        </section>
      </div>

      {/* Section 3 Prep Card */}
      <section className="rounded-xl border border-[#DDE5F0] bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <h2 className="text-base font-bold text-[#0F294A]">
              3. Section 3 — Routine &amp; Non-Routine Pilot Messages ({stats.pilotMessagesTotal}{' '}
              Exercises)
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-[#526780]">
              15 routine + 15 non-routine pilot transmissions (e.g., passing FL240, sick passenger on
              board, weather deviation, hydraulic/flap advisories) with 3 gaps each, active European
              VHF frequencies, baked cockpit radio distortion &amp; RF static, plus Phase of Flight,
              Context, and Useful Vocabulary revealed in answers.
            </p>
          </div>
          <div className="flex items-center gap-4 text-right font-mono text-xs text-[#526780] tabular-nums">
            <div>
              <p className="font-sans text-[10px] uppercase text-[#526780]">Routine</p>
              <p className="font-bold text-[#0F294A]">
                {
                  snapshot.pilotMessages.filter(
                    (p) => p.messageType === 'routine' && p.hasLocalAudio
                  ).length
                }
                /{snapshot.pilotMessages.filter((p) => p.messageType === 'routine').length}
              </p>
            </div>
            <div>
              <p className="font-sans text-[10px] uppercase text-[#526780]">Non-Routine</p>
              <p className="font-bold text-[#0F294A]">
                {
                  snapshot.pilotMessages.filter(
                    (p) => p.messageType === 'non_routine' && p.hasLocalAudio
                  ).length
                }
                /{snapshot.pilotMessages.filter((p) => p.messageType === 'non_routine').length}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-[#E6EDF5] pt-4">
          <button
            type="button"
            disabled={batchJob.running || remainingPilot === 0}
            onClick={() => void onBatchPilotMessages(10)}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#0369A1] px-4 text-xs font-semibold text-white hover:bg-[#075985] disabled:opacity-50 whitespace-nowrap"
          >
            <Waves className="h-3.5 w-3.5" />
            Generate Next 10 Calls
          </button>
          <button
            type="button"
            disabled={batchJob.running || remainingPilot === 0}
            onClick={() => void onBatchPilotMessages(undefined)}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#D4DFEC] bg-white px-4 text-xs font-semibold text-[#0F294A] hover:bg-[#F7F9FC] disabled:opacity-50 whitespace-nowrap"
          >
            Generate All {remainingPilot} Remaining
          </button>
        </div>
      </section>

      {/* Moodle SCORM 1.2 Export Packages */}
      <section className="rounded-xl border border-[#DDE5F0] bg-white">
        <div className="border-b border-[#E6EDF5] px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-[#0F294A]">
                4. Download Moodle SCORM 1.2 Packages (&lt; 100 MB each)
              </h2>
              <p className="mt-0.5 text-xs text-[#526780]">
                Each ZIP includes <span className="font-mono">imsmanifest.xml</span>, offline
                student interface, and bundled audio. Auto-splits cleanly by file size (~85 MB max)
                without splitting by phase of flight.
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
              No gradebook / passing-score lock
            </span>
          </div>
        </div>

        <div className="divide-y divide-[#EEF3F8]">
          {scormPlans.map((plan) => (
            <div
              key={plan.id}
              className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 hover:bg-[#FAFBFD]"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-xs text-[#526780]">
                  <Package className="h-4 w-4 text-[#0369A1]" />
                  <span className="font-semibold text-[#0F294A]">{plan.name}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">
                    Est. {formatBytesMb(plan.estimatedBytes)}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span
                    className={`font-medium ${
                      plan.underLimit ? 'text-emerald-700' : 'text-red-700'
                    }`}
                  >
                    {plan.underLimit ? 'Under 100 MB Moodle limit' : 'Exceeds 100 MB'}
                  </span>
                </div>
                <p className="mt-1 text-xs text-[#526780]">{plan.description}</p>
                <p className="mt-0.5 font-mono text-[11px] text-[#7B8FA6]">{plan.filename}</p>
              </div>

              <div className="shrink-0">
                {plan.readyCount > 0 ? (
                  <a
                    href={`/api/hub/scorm/${encodeURIComponent(plan.id)}`}
                    download={plan.filename}
                    className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#0369A1] px-4 text-xs font-semibold text-white transition-colors hover:bg-[#075985] whitespace-nowrap"
                  >
                    <Download className="h-4 w-4" />
                    Download SCORM 1.2 (.zip)
                  </a>
                ) : (
                  <span className="text-xs font-medium text-[#7B8FA6]">
                    Prepare at least 1 exercise first
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Simple Moodle Upload Reminder */}
        <div className="border-t border-[#E6EDF5] bg-[#F7F9FC] px-6 py-4 text-xs text-[#425874]">
          <strong className="text-[#0F294A]">Uploading to Moodle:</strong> Turn editing on →{' '}
          <em>Add an activity or resource</em> → choose <strong>SCORM package</strong> → drop the
          downloaded <span className="font-mono">.zip</span> file into <em>Package file</em> → under{' '}
          <em>Grade</em> set Grading method to <strong>Learning Objects</strong> (or ungraded) →
          Save and display.
        </div>
      </section>
    </div>
  );
}
