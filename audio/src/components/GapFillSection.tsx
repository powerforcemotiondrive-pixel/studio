import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  HelpCircle,
  Loader2,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  Waves,
  XCircle,
} from 'lucide-react';
import type { GapFillCategory, GapFillExercise } from '../types/hub';
import { checkBlankAnswer, formatTimeSec } from '../utils/hubFormatters';

interface GapFillSectionProps {
  exercises: GapFillExercise[];
  initialCategory?: GapFillCategory;
  completedIds: Set<string>;
  generatingIds: Set<string>;
  onGenerateAudio: (id: string, force?: boolean) => void;
  onMarkCompleted: (id: string) => void;
}

const CATEGORIES: Array<{ id: GapFillCategory; label: string; desc: string }> = [
  { id: 'atis', label: 'ATIS', desc: 'Automatic Terminal Information Service broadcasts' },
  { id: 'afis', label: 'AFIS', desc: 'Aerodrome Flight Information Service advisories' },
  {
    id: 'clearance',
    label: 'Route Clearance',
    desc: 'IFR delivery clearances, SIDs, initial climb, squawk & departure frequencies',
  },
  { id: 'ground', label: 'Ground', desc: 'Start-up approvals, CTOT slots, stands & de-icing' },
  { id: 'pushback', label: 'Pushback', desc: 'Pushback headings, release points & traffic cautions' },
  { id: 'taxiway', label: 'Taxiway Movements', desc: 'Taxi routes, holding points, crossings & stop bars' },
];

export function GapFillSection({
  exercises,
  initialCategory = 'atis',
  completedIds,
  generatingIds,
  onGenerateAudio,
  onMarkCompleted,
}: GapFillSectionProps) {
  const [category, setCategory] = useState<GapFillCategory>(initialCategory);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [answersByEx, setAnswersByEx] = useState<Record<string, Record<number, string>>>({});
  const [checkedByEx, setCheckedByEx] = useState<Record<string, boolean>>({});
  const [showHints, setShowHints] = useState(false);
  const [showScript, setShowScript] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState<0.85 | 1>(1);

  useEffect(() => {
    setCategory(initialCategory);
  }, [initialCategory]);

  const categoryExercises = useMemo(
    () => exercises.filter((e) => e.category === category),
    [exercises, category]
  );

  const activeExercise = useMemo(() => {
    const found = categoryExercises.find((e) => e.id === activeId);
    return found ?? categoryExercises[0] ?? null;
  }, [categoryExercises, activeId]);

  const activeIdx = activeExercise
    ? categoryExercises.findIndex((e) => e.id === activeExercise.id)
    : -1;


  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setShowScript(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.playbackRate = speed;
    }
  }, [activeExercise?.id, speed]);

  if (!activeExercise) {
    return null;
  }

  const isGenerating =
    generatingIds.has(activeExercise.id) || activeExercise.audioStatus === 'generating';
  const currentAnswers = answersByEx[activeExercise.id] ?? {};
  const isChecked = Boolean(checkedByEx[activeExercise.id]);

  const setBlankValue = (blankIndex: number, val: string) => {
    if (isChecked) return;
    setAnswersByEx((prev) => ({
      ...prev,
      [activeExercise.id]: {
        ...(prev[activeExercise.id] ?? {}),
        [blankIndex]: val,
      },
    }));
  };

  const handleCheck = () => {
    setCheckedByEx((prev) => ({ ...prev, [activeExercise.id]: true }));
    onMarkCompleted(activeExercise.id);
  };

  const handleRetry = () => {
    setCheckedByEx((prev) => {
      const next = { ...prev };
      delete next[activeExercise.id];
      return next;
    });
    setAnswersByEx((prev) => ({ ...prev, [activeExercise.id]: {} }));
    setShowScript(false);
  };

  const togglePlay = () => {
    const el = audioRef.current;
    if (!el || !activeExercise.hasLocalAudio) return;
    if (el.paused) {
      el.playbackRate = speed;
      void el.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    } else {
      el.pause();
      setIsPlaying(false);
    }
  };

  const skipBy = (delta: number) => {
    const el = audioRef.current;
    if (!el) return;
    const next = Math.max(0, Math.min(duration || 9999, el.currentTime + delta));
    el.currentTime = next;
    setCurrentTime(next);
  };

  const blankResults = activeExercise.blanks.map((b, idx) =>
    checkBlankAnswer(currentAnswers[idx] ?? '', b.answer, b.acceptedAnswers)
  );
  const correctCount = blankResults.filter(Boolean).length;

  // Split templateText around {{0}}, {{1}}, ...
  const templateParts = activeExercise.templateText.split(/(\{\{\d+\}\})/g);
  const audioUrl = activeExercise.hasLocalAudio
    ? `/api/hub/audio/ai_gapfill/${encodeURIComponent(activeExercise.audioFilename)}`
    : undefined;
  const activeCatMeta = CATEGORIES.find((c) => c.id === category)!;

  return (
    <div className="space-y-6">
      {/* Crisp Daylight Section Header + 6 Category Tabs */}
      <div className="rounded-xl border border-[#DDE5F0] bg-white px-6 py-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-[#0369A1]">
              Section 2 · European &amp; ICAO Ground Operations
            </p>
            <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-[#0F294A]">
              VHF Radio Gap-Fill Drills
            </h1>
            <p className="mt-1 text-sm text-[#526780]">{activeCatMeta.desc}</p>
          </div>
          <div className="flex items-center gap-4 text-right font-mono text-xs text-[#526780] tabular-nums">
            <div>
              <p className="font-sans text-[11px] text-[#647991]">Total drills</p>
              <p className="text-base font-bold text-[#0F294A]">{exercises.length}</p>
            </div>
            <div className="h-8 w-px bg-[#E6EDF5]" aria-hidden="true" />
            <div>
              <p className="font-sans text-[11px] text-[#647991]">Practiced</p>
              <p className="text-base font-bold text-emerald-700">{completedIds.size}</p>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-[#E6EDF5] pt-4">
          {CATEGORIES.map((cat) => {
            const catCount = exercises.filter((e) => e.category === cat.id).length;
            const readyInCat = exercises.filter(
              (e) => e.category === cat.id && e.hasLocalAudio
            ).length;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setCategory(cat.id);
                  const first = exercises.find((e) => e.category === cat.id);
                  if (first) setActiveId(first.id);
                }}
                className={`rounded-lg border px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                  category === cat.id
                    ? 'border-[#0369A1] bg-[#0369A1] text-white'
                    : 'border-[#DDE5F0] bg-[#F7F9FC] text-[#425874] hover:bg-[#EFF6FC] hover:text-[#0F294A]'
                }`}
                title={`${readyInCat} of ${catCount} VHF audio files cached`}
              >
                {cat.label}{' '}
                <span className={`ml-1 font-mono text-[11px] ${category === cat.id ? 'text-sky-100' : 'text-[#647991]'}`}>
                  {catCount}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left List: 30 Exercises in Active Category */}
        <aside className="flex max-h-[760px] flex-col rounded-xl border border-[#DDE5F0] bg-white lg:col-span-4 xl:col-span-3">
          <div className="border-b border-[#E6EDF5] px-4 py-3.5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#0F294A]">{activeCatMeta.label} Drills</h2>
              <span className="font-mono text-xs text-[#526780] tabular-nums">
                {categoryExercises.length} exercises
              </span>
            </div>
          </div>
          <div className="flex-1 divide-y divide-[#EEF3F8] overflow-y-auto">
            {categoryExercises.map((ex) => {
              const selected = ex.id === activeExercise.id;
              const done = completedIds.has(ex.id);
              return (
                <button
                  key={ex.id}
                  type="button"
                  onClick={() => setActiveId(ex.id)}
                  className={`flex w-full items-start gap-2.5 px-4 py-3 text-left transition-colors ${
                    selected ? 'bg-[#EFF6FC]' : 'hover:bg-[#F7F9FC]'
                  }`}
                >
                  <span className="mt-0.5 w-5 shrink-0 font-mono text-xs font-semibold text-[#0369A1] tabular-nums">
                    {String(ex.indexInCategory).padStart(2, '0')}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#526780]">
                      <span className="font-semibold text-[#0F294A]">{ex.airportIcao}</span>
                      <span>·</span>
                      <span className="truncate">{ex.airportName}</span>
                    </div>
                    <p
                      className={`mt-0.5 truncate text-xs font-medium ${
                        selected ? 'text-[#0369A1]' : 'text-[#334A66]'
                      }`}
                    >
                      {ex.title.replace(/^[A-Z]{4}\s+[^—]+—\s*/, '')}
                    </p>
                  </div>
                  {done && (
                    <CheckCircle2
                      className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600"
                      aria-label="Practiced"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </aside>

        {/* Main Gap-Fill Exercise Card */}
        <section className="lg:col-span-8 xl:col-span-9">
          <div className="rounded-xl border border-[#DDE5F0] bg-white p-6">
            {/* Header */}
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#E6EDF5] pb-4">
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-[#526780]">
                  <span className="font-semibold text-[#0369A1]">{activeCatMeta.label}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono font-semibold text-[#0F294A]">
                    {activeExercise.airportIcao}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{activeExercise.airportName}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono">{activeExercise.facility}</span>
                </div>
                <h1 className="mt-1.5 text-xl font-bold text-[#0F294A]">{activeExercise.title}</h1>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  disabled={activeIdx <= 0}
                  onClick={() => {
                    if (activeIdx > 0) setActiveId(categoryExercises[activeIdx - 1].id);
                  }}
                  className="inline-flex h-9 items-center gap-1 rounded-lg border border-[#D4DFEC] bg-white px-3 text-xs font-semibold text-[#0F294A] hover:bg-[#F7F9FC] disabled:opacity-40 whitespace-nowrap"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </button>
                <button
                  type="button"
                  disabled={activeIdx < 0 || activeIdx >= categoryExercises.length - 1}
                  onClick={() => {
                    if (activeIdx >= 0 && activeIdx < categoryExercises.length - 1) {
                      setActiveId(categoryExercises[activeIdx + 1].id);
                    }
                  }}
                  className="inline-flex h-9 items-center gap-1 rounded-lg border border-[#D4DFEC] bg-white px-3 text-xs font-semibold text-[#0F294A] hover:bg-[#F7F9FC] disabled:opacity-40 whitespace-nowrap"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Clear 3-Step Student Instructions */}
            <div className="mt-4 grid grid-cols-1 gap-3 rounded-lg border border-[#E2E9F2] bg-[#F7F9FC] p-3.5 text-xs text-[#334A66] sm:grid-cols-3">
              <div>
                <strong className="text-[#0F294A]">1. Listen:</strong> Play the European/ICAO radio
                message below.
              </div>
              <div>
                <strong className="text-[#0F294A]">2. Fill the gaps:</strong> Type the missing
                numbers, runways, taxiways, or words.
              </div>
              <div>
                <strong className="text-[#0F294A]">3. Check:</strong> Click{' '}
                <strong>Check My Answers</strong> to see how you did.
              </div>
            </div>

            {/* Audio Player OR One-Click Audio Synthesis */}
            <div className="mt-5 rounded-lg border border-[#DCE5F0] bg-[#F7F9FC] p-4">
              {activeExercise.hasLocalAudio ? (
                <>
                  <audio
                    ref={audioRef}
                    src={audioUrl}
                    preload="metadata"
                    crossOrigin="anonymous"
                    onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                    onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
                    onEnded={() => setIsPlaying(false)}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                  />
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={togglePlay}
                      className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#0369A1] px-5 text-sm font-semibold text-white hover:bg-[#075985] whitespace-nowrap"
                    >
                      {isPlaying ? (
                        <Pause className="h-4 w-4 fill-current" />
                      ) : (
                        <Play className="h-4 w-4 fill-current" />
                      )}
                      {isPlaying ? 'Pause Audio' : 'Play Audio'}
                    </button>

                    <button
                      type="button"
                      onClick={() => skipBy(-5)}
                      className="inline-flex h-10 items-center gap-1 rounded-lg border border-[#D4DFEC] bg-white px-3 font-mono text-xs font-semibold text-[#0F294A] hover:bg-[#EFF6FC]"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      5s
                    </button>
                    <button
                      type="button"
                      onClick={() => skipBy(5)}
                      className="inline-flex h-10 items-center gap-1 rounded-lg border border-[#D4DFEC] bg-white px-3 font-mono text-xs font-semibold text-[#0F294A] hover:bg-[#EFF6FC]"
                    >
                      5s
                      <RotateCw className="h-3.5 w-3.5" />
                    </button>

                    <div className="flex-1 min-w-[140px]">
                      <input
                        type="range"
                        min={0}
                        max={duration || 100}
                        step={0.1}
                        value={currentTime}
                        onChange={(e) => {
                          const t = Number(e.target.value);
                          setCurrentTime(t);
                          if (audioRef.current) audioRef.current.currentTime = t;
                        }}
                        className="h-2 w-full cursor-pointer accent-[#0369A1]"
                        aria-label="Audio playback position"
                      />
                      <div className="mt-1 flex justify-between font-mono text-[11px] text-[#526780] tabular-nums">
                        <span>{formatTimeSec(currentTime)}</span>
                        <span>{formatTimeSec(duration)}</span>
                      </div>
                    </div>

                    <span className="font-mono text-[11px] text-[#526780] whitespace-nowrap">
                      VHF radio · static
                    </span>

                    <div className="flex items-center gap-1 rounded-lg border border-[#D4DFEC] bg-white p-1">
                      <button
                        type="button"
                        onClick={() => setSpeed(0.85)}
                        className={`rounded px-2.5 py-1 font-mono text-xs font-semibold ${
                          speed === 0.85 ? 'bg-[#0369A1] text-white' : 'text-[#526780]'
                        }`}
                      >
                        0.85x
                      </button>
                      <button
                        type="button"
                        onClick={() => setSpeed(1)}
                        className={`rounded px-2.5 py-1 font-mono text-xs font-semibold ${
                          speed === 1 ? 'bg-[#0369A1] text-white' : 'text-[#526780]'
                        }`}
                      >
                        1.0x
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-4 py-2">
                  <div>
                    <p className="text-sm font-semibold text-[#0F294A]">
                      {isGenerating
                        ? 'Generating VHF radio audio with static...'
                        : 'VHF audio not generated yet for this exercise'}
                    </p>
                    <p className="mt-0.5 text-xs text-[#526780]">
                      Generate once to save the VHF radio WAV clip (with subtle background static)
                      for students and Moodle SCORM export.
                    </p>
                    {activeExercise.audioError && (
                      <p className="mt-1.5 text-xs text-red-700">{activeExercise.audioError}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={isGenerating}
                    onClick={() => onGenerateAudio(activeExercise.id, true)}
                    className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#0369A1] px-4 text-xs font-semibold text-white hover:bg-[#075985] disabled:opacity-60 whitespace-nowrap"
                  >
                    {isGenerating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Waves className="h-4 w-4" />
                    )}
                    {isGenerating ? 'Generating...' : 'Generate Audio Now'}
                  </button>
                </div>
              )}
            </div>

            {/* Self-Check Result Banner */}
            {isChecked && (
              <div className="mt-5 rounded-lg border border-[#CBD9E9] bg-[#F1F6FC] p-4">
                <p className="text-sm font-bold text-[#0F294A]">
                  How you did: {correctCount} of {activeExercise.blanks.length} gaps correct
                </p>
                <p className="mt-1 text-xs text-[#425874]">
                  {correctCount === activeExercise.blanks.length
                    ? 'Spot on! Every operational figure and phrase matches standard ICAO readback.'
                    : 'Any missed blanks show the expected ICAO answer in green beside the box. Replay the clip to hear them again.'}
                </p>
              </div>
            )}

            {/* Inline Gap-Fill Exercise Box */}
            <div className="mt-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-bold text-[#0F294A]">
                  Complete the missing operational information
                </h2>
                <button
                  type="button"
                  onClick={() => setShowHints((v) => !v)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0369A1] hover:underline"
                >
                  <HelpCircle className="h-3.5 w-3.5" />
                  {showHints ? 'Hide B1 Hints' : 'Show B1 Hints'}
                </button>
              </div>

              <div className="mt-3 rounded-lg border border-[#DDE5F0] bg-[#FAFBFD] p-5 text-[16px] leading-[2.4] text-[#0F294A]">
                {templateParts.map((part, i) => {
                  const match = part.match(/^\{\{(\d+)\}\}$/);
                  if (!match) {
                    return <Fragment key={i}>{part}</Fragment>;
                  }
                  const blankIndex = Number(match[1]);
                  const blank = activeExercise.blanks[blankIndex];
                  if (!blank) return null;

                  const val = currentAnswers[blankIndex] ?? '';
                  const isCorrect = blankResults[blankIndex];

                  return (
                    <span key={i} className="inline-flex items-center gap-1 align-baseline mx-1">
                      <input
                        type="text"
                        value={val}
                        disabled={isChecked}
                        onChange={(e) => setBlankValue(blankIndex, e.target.value)}
                        placeholder={showHints ? blank.hint : `Gap ${blankIndex + 1}`}
                        aria-label={blank.hint}
                        className={`h-9 w-36 rounded-md border px-2.5 font-mono text-sm font-semibold transition-colors focus:outline-none ${
                          !isChecked
                            ? 'border-[#9FB3C8] bg-white text-[#0F294A] placeholder:font-sans placeholder:text-xs placeholder:font-normal placeholder:text-[#8095AC] focus:border-[#0369A1]'
                            : isCorrect
                              ? 'border-emerald-400 bg-emerald-50 text-emerald-900'
                              : 'border-red-300 bg-red-50 text-red-900'
                        }`}
                      />
                      {isChecked &&
                        (isCorrect ? (
                          <CheckCircle2
                            className="h-4 w-4 shrink-0 text-emerald-600"
                            aria-label="Correct"
                          />
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-800">
                            <XCircle className="h-4 w-4 shrink-0 text-red-600" aria-label="Incorrect" />
                            <span className="font-mono">({blank.answer})</span>
                          </span>
                        ))}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Action Row */}
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#E6EDF5] pt-4">
              <div className="flex flex-wrap items-center gap-2.5">
                {!isChecked ? (
                  <button
                    type="button"
                    onClick={handleCheck}
                    className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#0369A1] px-5 text-sm font-semibold text-white hover:bg-[#075985]"
                  >
                    Check My Answers
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleRetry}
                    className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#D4DFEC] bg-white px-4 text-sm font-semibold text-[#0F294A] hover:bg-[#F7F9FC]"
                  >
                    Try Again
                  </button>
                )}

                {isChecked && (
                  <button
                    type="button"
                    onClick={() => setShowScript((v) => !v)}
                    className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-[#D4DFEC] bg-white px-3.5 text-xs font-semibold text-[#425874] hover:bg-[#F7F9FC]"
                  >
                    {showScript ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    {showScript ? 'Hide Full Spoken Script' : 'Show Full Spoken Script'}
                  </button>
                )}
              </div>

              {activeIdx >= 0 && activeIdx < categoryExercises.length - 1 && (
                <button
                  type="button"
                  onClick={() => setActiveId(categoryExercises[activeIdx + 1].id)}
                  className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-[#0369A1]/40 bg-[#EFF6FC] px-4 text-sm font-semibold text-[#0369A1] hover:bg-[#E0F0FB]"
                >
                  Next {activeCatMeta.label} Drill
                  <ChevronRight className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Optional Full Spoken Script */}
            {isChecked && showScript && (
              <div className="mt-4 rounded-lg border border-[#DDE5F0] bg-[#F7F9FC] p-4">
                <p className="text-xs font-bold text-[#0F294A]">Full Spoken Radio Script</p>
                <p className="mt-1.5 text-sm leading-relaxed text-[#334A66]">
                  {activeExercise.spokenScript}
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
