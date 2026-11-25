import { useState } from 'react';
import { ArrowRight, CheckCircle2, Headphones, Mic, Plane, Radio } from 'lucide-react';
import type { GapFillCategory, HubStateSnapshot } from '../types/hub';

interface HubHomeViewProps {
  snapshot: HubStateSnapshot;
  completedRealCount: number;
  completedGapCount: number;
  completedPilotCount: number;
  onOpenRealAtc: () => void;
  onOpenGapFill: (category?: GapFillCategory) => void;
  onOpenPilotMessages: () => void;
  onOpenInstructor: () => void;
}

const HERO_BANNER_SRC = '/src/assets/images/enac_tower_banner_1795609456718.jpg';
const REAL_ATC_IMG_SRC = '/src/assets/images/section_real_atc_1795609458634.jpg';
const GROUND_OPS_IMG_SRC = '/src/assets/images/section_ground_ops_1795609458640.jpg';
const PILOT_MESSAGES_IMG_SRC = '/src/assets/images/section_pilot_messages_1795610608599.jpg';

const GAP_CATEGORIES: Array<{
  id: GapFillCategory;
  label: string;
  desc: string;
}> = [
  { id: 'atis', label: 'ATIS', desc: 'Weather, runways, QNH & transition level' },
  { id: 'afis', label: 'AFIS', desc: 'Traffic advisories & aerodrome info' },
  { id: 'clearance', label: 'Route Clearance', desc: 'IFR delivery, SIDs, initial climb & squawk' },
  { id: 'ground', label: 'Ground', desc: 'Start-up, CTOT slots, stands & de-icing' },
  { id: 'pushback', label: 'Pushback', desc: 'Nose/tail headings & release points' },
  { id: 'taxiway', label: 'Taxiway Movements', desc: 'Routes, hold short & runway crossings' },
];

export function HubHomeView({
  snapshot,
  completedRealCount,
  completedGapCount,
  completedPilotCount,
  onOpenRealAtc,
  onOpenGapFill,
  onOpenPilotMessages,
  onOpenInstructor,
}: HubHomeViewProps) {
  const [heroImgFailed, setHeroImgFailed] = useState(false);
  const [realImgFailed, setRealImgFailed] = useState(false);
  const [gapImgFailed, setGapImgFailed] = useState(false);
  const [pilotImgFailed, setPilotImgFailed] = useState(false);

  return (
    <div className="space-y-8">
      {/* Aviation Hero Banner + 3-Step Student Guide */}
      <section className="overflow-hidden rounded-xl border border-[#DDE5F0] bg-white">
        <div className="relative min-h-[270px] bg-gradient-to-br from-[#0B2240] via-[#0F2F57] to-[#0369A1] sm:min-h-[300px]">
          {!heroImgFailed && (
            <img
              src={HERO_BANNER_SRC}
              alt="European air traffic control tower overlooking a sunlit international airport runway and taxiway apron"
              referrerPolicy="no-referrer"
              onError={() => setHeroImgFailed(true)}
              className="absolute inset-0 h-full w-full object-cover object-center"
            />
          )}
          {/* Measured directional contrast scrim so white typography passes WCAG AA across all frames */}
          <div
            className="absolute inset-0 bg-gradient-to-r from-[#091D38]/92 via-[#0D284B]/80 to-[#0D284B]/25"
            aria-hidden="true"
          />

          <div className="relative z-10 flex h-full flex-col justify-center px-6 py-9 sm:px-9 sm:py-11">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold tracking-wide text-sky-200">
                ENAC GSEA · B1 / B2 Listening Comprehension
              </p>
              <h1 className="mt-2.5 text-balance font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
                ATC Listening Comprehension Hub
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-slate-100 sm:text-base">
                Train with real pilot–controller recordings, European ICAO ground operations drills,
                and routine &amp; non-routine cockpit pilot messages. Listen as many times as you
                need—there is no passing score and no grade penalty.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={onOpenRealAtc}
                  className="inline-flex h-10 items-center gap-2 rounded-lg bg-white px-5 text-sm font-semibold text-[#0F294A] transition-colors hover:bg-sky-50 whitespace-nowrap"
                >
                  <Headphones className="h-4 w-4 text-[#0369A1]" />
                  Start Section 1
                </button>
                <button
                  type="button"
                  onClick={() => onOpenGapFill('atis')}
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/40 bg-[#0B2240]/55 px-5 text-sm font-semibold text-white backdrop-blur-xs transition-colors hover:bg-[#0B2240]/80 whitespace-nowrap"
                >
                  Open Section 2
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={onOpenPilotMessages}
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/40 bg-[#0B2240]/55 px-5 text-sm font-semibold text-white backdrop-blur-xs transition-colors hover:bg-[#0B2240]/80 whitespace-nowrap"
                >
                  Section 3: Pilot Calls
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Clean 3-Step Guide anchored directly below banner */}
        <div className="grid grid-cols-1 divide-y divide-[#E6EDF5] bg-white sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <div className="px-6 py-4 sm:px-7">
            <p className="font-mono text-xs font-semibold text-[#0369A1]">01. Listen</p>
            <p className="mt-1 text-sm font-semibold text-[#0F294A]">Replay at your own pace</p>
            <p className="mt-0.5 text-xs leading-relaxed text-[#526780]">
              Play clips freely or switch to 0.85x speed when radio phraseology is fast.
            </p>
          </div>
          <div className="px-6 py-4 sm:px-7">
            <p className="font-mono text-xs font-semibold text-[#0369A1]">02. Complete</p>
            <p className="mt-1 text-sm font-semibold text-[#0F294A]">Select words or fill gaps</p>
            <p className="mt-0.5 text-xs leading-relaxed text-[#526780]">
              Pick the spoken words in real ATC clips, or type key ICAO figures in ground drills.
            </p>
          </div>
          <div className="px-6 py-4 sm:px-7">
            <p className="font-mono text-xs font-semibold text-[#0369A1]">03. Review</p>
            <p className="mt-1 text-sm font-semibold text-[#0F294A]">Check &amp; read the script</p>
            <p className="mt-0.5 text-xs leading-relaxed text-[#526780]">
              Get instant self-check feedback showing what you caught, missed, and the transcript.
            </p>
          </div>
        </div>
      </section>

      {/* Three Distinct Training Sections */}
      <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-3">
        {/* Section 1: Real ATC */}
        <section className="flex flex-col overflow-hidden rounded-xl border border-[#DDE5F0] bg-white">
          <div className="relative h-48 w-full bg-gradient-to-br from-[#0F294A] to-[#1D4E89] sm:h-52">
            {!realImgFailed ? (
              <img
                src={REAL_ATC_IMG_SRC}
                alt="Air traffic control tower workstation with aviation headset and radar display overlooking active runway"
                referrerPolicy="no-referrer"
                onError={() => setRealImgFailed(true)}
                className="h-full w-full object-cover object-center"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sky-200">
                <Radio className="h-10 w-10" />
              </div>
            )}
            <div
              className="absolute inset-0 bg-gradient-to-t from-[#0B1F3A]/65 via-transparent to-transparent"
              aria-hidden="true"
            />
            <div className="absolute bottom-3 left-5 right-5 flex items-center justify-between text-xs font-medium text-white">
              <span className="font-mono tracking-wide">
                Section 1 · {snapshot.stats.realAtcTotal} Real ATC Clips
              </span>
              {completedRealCount > 0 && (
                <span className="inline-flex items-center gap-1 text-emerald-200 tabular-nums">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {completedRealCount} practiced
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-1 flex-col justify-between p-6 sm:p-7">
            <div>
              <h2 className="font-display text-xl font-bold text-[#0F294A]">
                Real Pilot–Controller Word Identification
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-[#425874]">
                Authentic pilot and controller recordings across all phases of flight. Listen to
                each clip, select every word and phrase actually spoken from a mixed word box, and
                compare your answers with the verified transcript.
              </p>

              <div className="mt-5 border-t border-[#E6EDF5] pt-4 text-xs text-[#425874]">
                <p className="font-semibold text-[#0F294A]">What you will do:</p>
                <ol className="mt-1.5 list-decimal space-y-1 pl-4">
                  <li>Play a real ATC radio recording from the clip list.</li>
                  <li>Click every word or phrase you heard (watch out for distractors).</li>
                  <li>Check your answers and read the highlighted transcript.</li>
                </ol>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[#E6EDF5] pt-5">
              <span className="font-mono text-xs text-[#526780] tabular-nums">
                {snapshot.stats.realAtcReady} of {snapshot.stats.realAtcTotal} pre-transcribed
              </span>
              <button
                type="button"
                onClick={onOpenRealAtc}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#0369A1] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#075985] whitespace-nowrap"
              >
                <Headphones className="h-4 w-4" />
                Start Section 1
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>

        {/* Section 2: AI European/ICAO Ground Operations Gap-Fill */}
        <section className="flex flex-col overflow-hidden rounded-xl border border-[#DDE5F0] bg-white">
          <div className="relative h-48 w-full bg-gradient-to-br from-[#0F294A] to-[#0369A1] sm:h-52">
            {!gapImgFailed ? (
              <img
                src={GROUND_OPS_IMG_SRC}
                alt="Commercial airliner pushing back at a European airport apron onto yellow taxiway centerlines"
                referrerPolicy="no-referrer"
                onError={() => setGapImgFailed(true)}
                className="h-full w-full object-cover object-center"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sky-200">
                <Mic className="h-10 w-10" />
              </div>
            )}
            <div
              className="absolute inset-0 bg-gradient-to-t from-[#0B1F3A]/65 via-transparent to-transparent"
              aria-hidden="true"
            />
            <div className="absolute bottom-3 left-5 right-5 flex items-center justify-between text-xs font-medium text-white">
              <span className="font-mono tracking-wide">
                Section 2 · {snapshot.stats.gapFillTotal} ICAO Gap-Fill Drills
              </span>
              {completedGapCount > 0 && (
                <span className="inline-flex items-center gap-1 text-emerald-200 tabular-nums">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {completedGapCount} practiced
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-1 flex-col justify-between p-6 sm:p-7">
            <div>
              <h2 className="font-display text-xl font-bold text-[#0F294A]">
                European &amp; ICAO Ground Operations Gap-Fill
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-[#425874]">
                AI-voiced European ICAO radio drills covering <strong>LFBO Toulouse-Blagnac</strong>,{' '}
                <strong>LFPG Paris CDG</strong>, <strong>EGLL Heathrow</strong>, and regional
                fields. Type the missing runways, QNH values, taxiways, and clearances.
              </p>

              <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {GAP_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => onOpenGapFill(cat.id)}
                    className="rounded-lg border border-[#E2E9F2] bg-[#F7F9FC] px-3.5 py-2.5 text-left transition-colors hover:border-[#0369A1]/50 hover:bg-[#EFF6FC]"
                  >
                    <p className="text-xs font-semibold text-[#0F294A]">
                      {cat.label}{' '}
                      <span className="font-mono font-normal text-[#526780]">· 30 drills</span>
                    </p>
                    <p className="mt-0.5 line-clamp-1 text-[11px] text-[#526780]">{cat.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[#E6EDF5] pt-5">
              <span className="font-mono text-xs text-[#526780] tabular-nums">
                {snapshot.stats.gapFillReady} of {snapshot.stats.gapFillTotal} audio files cached
              </span>
              <button
                type="button"
                onClick={() => onOpenGapFill('atis')}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#0369A1] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#075985] whitespace-nowrap"
              >
                Start Section 2
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>

        {/* Section 3: Routine & Non-Routine Pilot Messages */}
        <section className="flex flex-col overflow-hidden rounded-xl border border-[#DDE5F0] bg-white">
          <div className="relative h-48 w-full bg-gradient-to-br from-[#0F294A] to-[#0369A1] sm:h-52">
            {!pilotImgFailed ? (
              <img
                src={PILOT_MESSAGES_IMG_SRC}
                alt="Commercial airliner flight deck cruising above clouds over European airspace"
                referrerPolicy="no-referrer"
                onError={() => setPilotImgFailed(true)}
                className="h-full w-full object-cover object-center"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sky-200">
                <Plane className="h-10 w-10" />
              </div>
            )}
            <div
              className="absolute inset-0 bg-gradient-to-t from-[#0B1F3A]/65 via-transparent to-transparent"
              aria-hidden="true"
            />
            <div className="absolute bottom-3 left-5 right-5 flex items-center justify-between text-xs font-medium text-white">
              <span className="font-mono tracking-wide">
                Section 3 · {snapshot.stats.pilotMessagesTotal} Pilot Messages
              </span>
              {completedPilotCount > 0 && (
                <span className="inline-flex items-center gap-1 text-emerald-200 tabular-nums">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {completedPilotCount} practiced
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-1 flex-col justify-between p-6 sm:p-7">
            <div>
              <h2 className="font-display text-xl font-bold text-[#0F294A]">
                Routine &amp; Non-Routine Pilot Messages
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-[#425874]">
                Distorted cockpit VHF calls on active European frequencies—passing FL240, sick
                passenger on board, weather deviations, and technical events. Complete 3 gaps per
                call.
              </p>

              <div className="mt-5 border-t border-[#E6EDF5] pt-4 text-xs text-[#425874]">
                <p className="font-semibold text-[#0F294A]">Included in every answer debrief:</p>
                <ol className="mt-1.5 list-decimal space-y-1 pl-4">
                  <li>Exact <strong>Phase of Flight</strong> &amp; active VHF frequency.</li>
                  <li>Brief <strong>Situation Context</strong> explanation for B1/B2 review.</li>
                  <li>3 key <strong>Useful Aviation Vocabulary</strong> terms with meanings.</li>
                </ol>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[#E6EDF5] pt-5">
              <span className="font-mono text-xs text-[#526780] tabular-nums">
                {snapshot.stats.pilotMessagesReady} of {snapshot.stats.pilotMessagesTotal} calls
                cached
              </span>
              <button
                type="button"
                onClick={onOpenPilotMessages}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#0369A1] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#075985] whitespace-nowrap"
              >
                Start Section 3
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* Instructor-only Footer Strip (Excluded from Student Moodle SCORM Packages) */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#DDE5F0] bg-white px-6 py-4 text-xs text-[#526780]">
        <p>
          <strong className="text-[#0F294A]">Instructor Tools (Hidden in Moodle):</strong>{' '}
          Batch-transcribe your Google Drive clips, synthesize Section 2 &amp; 3 VHF audio, and
          export student-only Moodle SCORM 1.2 packages (&lt;100 MB).
        </p>
        <button
          type="button"
          onClick={onOpenInstructor}
          className="font-semibold text-[#0369A1] hover:underline whitespace-nowrap"
        >
          Open Instructor &amp; SCORM Exporter →
        </button>
      </div>
    </div>
  );
}
