import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  Search,
  Sparkles,
  XCircle,
} from 'lucide-react';
import type { RealAtcDrill } from '../types/hub';
import { deterministicShuffle, formatTimeSec } from '../utils/hubFormatters';

interface RealAtcSectionProps {
  drills: RealAtcDrill[];
  activeDrillId: string | null;
  completedIds: Set<string>;
  preparingIds: Set<string>;
  onSelectDrill: (id: string) => void;
  onPrepareDrill: (id: string, force?: boolean) => void;
  onMarkCompleted: (id: string) => void;
}

interface WordOption {
  text: string;
  heard: boolean;
}

function renderHighlightedLine(text: string, heardWords: string[]) {
  if (heardWords.length === 0) return text;
  const escaped = [...heardWords]
    .sort((a, b) => b.length - a.length)
    .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .filter(Boolean);
  if (escaped.length === 0) return text;

  const regex = new RegExp(`(${escaped.join('|')})`, 'gi');
  const parts = text.split(regex);
  return parts.map((part, idx) => {
    const isMatch = heardWords.some((w) => w.toLowerCase() === part.toLowerCase());
    if (isMatch) {
      return (
        <mark
          key={idx}
          className="rounded bg-amber-100 px-1 py-0.5 font-semibold text-[#0F294A]"
        >
          {part}
        </mark>
      );
    }
    return <Fragment key={idx}>{part}</Fragment>;
  });
}

export function RealAtcSection({
  drills,
  activeDrillId,
  completedIds,
  preparingIds,
  onSelectDrill,
  onPrepareDrill,
  onMarkCompleted,
}: RealAtcSectionProps) {
  const [filterMode, setFilterMode] = useState<'all' | 'ready'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedByDrill, setSelectedByDrill] = useState<Record<string, Record<string, boolean>>>({});
  const [checkedByDrill, setCheckedByDrill] = useState<Record<string, boolean>>({});

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState<0.85 | 1>(1);

  const filteredDrills = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return drills.filter((d) => {
      if (filterMode === 'ready' && d.status !== 'ready') return false;
      if (!q) return true;
      return (
        d.title.toLowerCase().includes(q) ||
        d.originalFilename.toLowerCase().includes(q) ||
        String(d.indexNumber).includes(q)
      );
    });
  }, [drills, filterMode, searchQuery]);

  const activeDrill = useMemo(
    () =>
      drills.find((d) => d.id === activeDrillId) ??
      drills.find((d) => d.status === 'ready') ??
      drills[0] ??
      null,
    [drills, activeDrillId]
  );

  const activeIndexInAll = activeDrill
    ? drills.findIndex((d) => d.id === activeDrill.id)
    : -1;

  // Reset playback state when switching clips
  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.playbackRate = speed;
    }
  }, [activeDrill?.id, speed]);

  const wordOptions: WordOption[] = useMemo(() => {
    if (!activeDrill || activeDrill.status !== 'ready') return [];
    const combined: WordOption[] = [
      ...activeDrill.heardWords.map((text) => ({ text, heard: true })),
      ...activeDrill.distractorWords.map((text) => ({ text, heard: false })),
    ];
    return deterministicShuffle(combined, activeDrill.id);
  }, [activeDrill]);

  if (!activeDrill) {
    return (
      <div className="rounded-xl border border-[#DDE5F0] bg-white p-10 text-center">
        <p className="text-base font-semibold text-[#0F294A]">No Real ATC clips loaded yet</p>
        <p className="mt-1.5 text-sm text-[#526780]">
          Open Instructor &amp; SCORM to sync your Google Drive audio folder.
        </p>
      </div>
    );
  }

  const isBusy = preparingIds.has(activeDrill.id) || activeDrill.status === 'processing';
  const selectedMap = selectedByDrill[activeDrill.id] ?? {};
  const isChecked = Boolean(checkedByDrill[activeDrill.id]);

  const toggleWord = (word: string) => {
    if (isChecked) return;
    setSelectedByDrill((prev) => ({
      ...prev,
      [activeDrill.id]: {
        ...(prev[activeDrill.id] ?? {}),
        [word]: !(prev[activeDrill.id]?.[word] ?? false),
      },
    }));
  };

  const handleCheck = () => {
    setCheckedByDrill((prev) => ({ ...prev, [activeDrill.id]: true }));
    onMarkCompleted(activeDrill.id);
  };

  const handleRetry = () => {
    setCheckedByDrill((prev) => {
      const next = { ...prev };
      delete next[activeDrill.id];
      return next;
    });
    setSelectedByDrill((prev) => ({ ...prev, [activeDrill.id]: {} }));
  };

  const togglePlay = () => {
    const el = audioRef.current;
    if (!el || !activeDrill.hasLocalAudio) return;
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

  const selectedCount = Object.values(selectedMap).filter(Boolean).length;
  const hitCount = wordOptions.filter((w) => w.heard && selectedMap[w.text]).length;
  const wrongPickCount = wordOptions.filter((w) => !w.heard && selectedMap[w.text]).length;
  const missedCount = wordOptions.filter((w) => w.heard && !selectedMap[w.text]).length;

  const audioUrl = activeDrill.hasLocalAudio
    ? `/api/hub/audio/real_atc/${encodeURIComponent(activeDrill.localFilename)}`
    : undefined;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4 rounded-xl border border-[#DDE5F0] bg-white px-6 py-5">
        <div>
          <p className="text-xs font-semibold text-[#0369A1]">
            Section 1 · Real Pilot–Controller Recordings
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-[#0F294A]">
            Select Words You Heard
          </h1>
          <p className="mt-1 text-sm text-[#526780]">
            Listen to real ATC clips, select every word or phrase you heard, and review the verified transcript.
          </p>
        </div>
        <div className="flex items-center gap-4 text-right font-mono text-xs text-[#526780] tabular-nums">
          <div>
            <p className="text-[11px] font-sans text-[#647991]">Clips available</p>
            <p className="text-base font-bold text-[#0F294A]">{drills.length}</p>
          </div>
          <div className="h-8 w-px bg-[#E6EDF5]" aria-hidden="true" />
          <div>
            <p className="text-[11px] font-sans text-[#647991]">Practiced</p>
            <p className="text-base font-bold text-emerald-700">{completedIds.size}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      {/* Left Sidebar: Clean Clip Selector (71 Real Clips) */}
      <aside className="rounded-xl border border-[#DDE5F0] bg-white lg:col-span-4 xl:col-span-3 flex flex-col max-h-[780px]">
        <div className="border-b border-[#E6EDF5] p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-[#0F294A]">Real ATC Clips</h2>
            <span className="font-mono text-xs text-[#526780] tabular-nums">
              {drills.filter((d) => d.status === 'ready').length}/{drills.length} ready
            </span>
          </div>

          <div className="relative mt-3">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-[#7B8FA6]" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Find clip number or topic..."
              className="h-9 w-full rounded-lg border border-[#D4DFEC] bg-[#F7F9FC] pr-3 pl-8 text-xs text-[#0F294A] placeholder:text-[#7B8FA6] focus:border-[#0369A1] focus:bg-white focus:outline-none"
            />
          </div>

          <div className="mt-2.5 flex items-center gap-1 rounded-lg border border-[#E2E9F2] bg-[#F7F9FC] p-1">
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`flex-1 rounded-md py-1 text-xs font-medium transition-colors ${
                filterMode === 'all'
                  ? 'bg-white text-[#0F294A] shadow-xs'
                  : 'text-[#526780] hover:text-[#0F294A]'
              }`}
            >
              All ({drills.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('ready')}
              className={`flex-1 rounded-md py-1 text-xs font-medium transition-colors ${
                filterMode === 'ready'
                  ? 'bg-white text-[#0F294A] shadow-xs'
                  : 'text-[#526780] hover:text-[#0F294A]'
              }`}
            >
              Ready ({drills.filter((d) => d.status === 'ready').length})
            </button>
          </div>
        </div>

        <div className="flex-1 divide-y divide-[#EEF3F8] overflow-y-auto">
          {filteredDrills.map((d) => {
            const isSelected = d.id === activeDrill.id;
            const isDone = completedIds.has(d.id);
            return (
              <button
                key={d.id}
                type="button"
                onClick={() => onSelectDrill(d.id)}
                className={`flex w-full items-start gap-2.5 px-4 py-3 text-left transition-colors ${
                  isSelected ? 'bg-[#EFF6FC]' : 'hover:bg-[#F7F9FC]'
                }`}
              >
                <span className="mt-0.5 w-6 shrink-0 font-mono text-xs font-semibold text-[#0369A1] tabular-nums">
                  {String(d.indexNumber).padStart(2, '0')}
                </span>
                <div className="min-w-0 flex-1">
                  <p
                    className={`truncate text-xs font-semibold ${
                      isSelected ? 'text-[#0369A1]' : 'text-[#0F294A]'
                    }`}
                  >
                    {d.title.replace(/^Clip\s+\d+\s*—\s*/i, '')}
                  </p>
                  <p className="mt-0.5 text-[11px] text-[#647991]">
                    {d.status === 'ready'
                      ? `${d.heardWords.length} target words`
                      : d.status === 'processing'
                        ? 'Transcribing...'
                        : 'Click to prepare clip'}
                  </p>
                </div>
                {isDone && (
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

      {/* Main Exercise Workspace */}
      <section className="space-y-5 lg:col-span-8 xl:col-span-9">
        <div className="rounded-xl border border-[#DDE5F0] bg-white p-6">
          {/* Header Metadata (Zero Pills) */}
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#E6EDF5] pb-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-[#526780]">
                <span className="font-semibold text-[#0369A1]">Section 1 · Real ATC</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">
                  Clip {activeDrill.indexNumber} of {drills.length}
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-mono text-[11px]">{activeDrill.originalFilename}</span>
              </div>
              <h1 className="mt-1.5 text-xl font-bold text-[#0F294A]">{activeDrill.title}</h1>
              <p className="mt-1 text-sm text-[#425874]">{activeDrill.contextHint}</p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                disabled={activeIndexInAll <= 0}
                onClick={() => {
                  if (activeIndexInAll > 0) onSelectDrill(drills[activeIndexInAll - 1].id);
                }}
                className="inline-flex h-9 items-center gap-1 rounded-lg border border-[#D4DFEC] bg-white px-3 text-xs font-semibold text-[#0F294A] hover:bg-[#F7F9FC] disabled:opacity-40 whitespace-nowrap"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>
              <button
                type="button"
                disabled={activeIndexInAll < 0 || activeIndexInAll >= drills.length - 1}
                onClick={() => {
                  if (activeIndexInAll >= 0 && activeIndexInAll < drills.length - 1) {
                    onSelectDrill(drills[activeIndexInAll + 1].id);
                  }
                }}
                className="inline-flex h-9 items-center gap-1 rounded-lg border border-[#D4DFEC] bg-white px-3 text-xs font-semibold text-[#0F294A] hover:bg-[#F7F9FC] disabled:opacity-40 whitespace-nowrap"
              >
                Next Clip
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Clear 3-Step Student Instructions */}
          <div className="mt-4 grid grid-cols-1 gap-3 rounded-lg border border-[#E2E9F2] bg-[#F7F9FC] p-3.5 text-xs text-[#334A66] sm:grid-cols-3">
            <div>
              <strong className="text-[#0F294A]">1. Listen:</strong> Play the real radio clip as
              many times as you need.
            </div>
            <div>
              <strong className="text-[#0F294A]">2. Select:</strong> Click every word or phrase you
              hear in the box below.
            </div>
            <div>
              <strong className="text-[#0F294A]">3. Review:</strong> Click{' '}
              <strong>Check My Answers</strong> to see the full transcript.
            </div>
          </div>

          {/* Unprepared / Processing / Ready State */}
          {activeDrill.status !== 'ready' ? (
            <div className="mt-6 rounded-lg border border-[#E2E9F2] bg-[#F7F9FC] px-6 py-12 text-center">
              {isBusy ? (
                <div className="flex flex-col items-center">
                  <Loader2 className="h-8 w-8 animate-spin text-[#0369A1]" />
                  <p className="mt-3 text-sm font-semibold text-[#0F294A]">
                    Downloading clip &amp; generating transcript with Gemini...
                  </p>
                  <p className="mt-1 text-xs text-[#526780]">
                    This takes about 5–10 seconds and is saved permanently for future students and
                    SCORM export.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <Sparkles className="h-8 w-8 text-[#0369A1]" />
                  <h3 className="mt-3 text-base font-bold text-[#0F294A]">
                    Ready to prepare this clip
                  </h3>
                  <p className="mt-1 max-w-md text-xs leading-relaxed text-[#526780]">
                    Click below to download the MP3 from Google Drive, transcribe what was spoken,
                    and build the &ldquo;Select words you heard&rdquo; exercise automatically.
                  </p>
                  {activeDrill.errorMessage && (
                    <p className="mt-3 max-w-lg rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                      {activeDrill.errorMessage}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => onPrepareDrill(activeDrill.id, true)}
                    className="mt-5 inline-flex h-10 items-center gap-2 rounded-lg bg-[#0369A1] px-5 text-sm font-semibold text-white hover:bg-[#075985]"
                  >
                    <Sparkles className="h-4 w-4" />
                    Transcribe &amp; Build This Drill
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="mt-5 space-y-6">
              {/* Simple, High-Clarity Audio Player */}
              <div className="rounded-lg border border-[#DCE5F0] bg-[#F7F9FC] p-4">
                <audio
                  ref={audioRef}
                  src={audioUrl}
                  preload="metadata"
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
                    className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#0369A1] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#075985] whitespace-nowrap"
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
                    title="Rewind 5 seconds"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    5s
                  </button>
                  <button
                    type="button"
                    onClick={() => skipBy(5)}
                    className="inline-flex h-10 items-center gap-1 rounded-lg border border-[#D4DFEC] bg-white px-3 font-mono text-xs font-semibold text-[#0F294A] hover:bg-[#EFF6FC]"
                    title="Forward 5 seconds"
                  >
                    5s
                    <RotateCw className="h-3.5 w-3.5" />
                  </button>

                  <div className="flex-1 min-w-[160px]">
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

                  <div className="flex items-center gap-1 rounded-lg border border-[#D4DFEC] bg-white p-1">
                    <button
                      type="button"
                      onClick={() => setSpeed(0.85)}
                      className={`rounded px-2.5 py-1 font-mono text-xs font-semibold transition-colors whitespace-nowrap ${
                        speed === 0.85 ? 'bg-[#0369A1] text-white' : 'text-[#526780] hover:text-[#0F294A]'
                      }`}
                    >
                      0.85x
                    </button>
                    <button
                      type="button"
                      onClick={() => setSpeed(1)}
                      className={`rounded px-2.5 py-1 font-mono text-xs font-semibold transition-colors whitespace-nowrap ${
                        speed === 1 ? 'bg-[#0369A1] text-white' : 'text-[#526780] hover:text-[#0F294A]'
                      }`}
                    >
                      1.0x
                    </button>
                  </div>
                </div>
              </div>

              {/* Self-Check Summary Banner (Shown After Checking) */}
              {isChecked && (
                <div className="rounded-lg border border-[#CBD9E9] bg-[#F1F6FC] p-4">
                  <p className="text-sm font-bold text-[#0F294A]">
                    How you did: {hitCount} of {activeDrill.heardWords.length} spoken words
                    identified
                  </p>
                  <p className="mt-1 text-xs text-[#425874]">
                    {missedCount === 0 && wrongPickCount === 0
                      ? 'Excellent listening! You spotted every target word and avoided all distractors.'
                      : `${missedCount > 0 ? `You missed ${missedCount} word(s) shown in amber. ` : ''}${
                          wrongPickCount > 0
                            ? `${wrongPickCount} selected item(s) in red were not spoken in this clip. `
                            : ''
                        }Read the transcript below while replaying the audio to train your ear.`}
                  </p>
                </div>
              )}

              {/* Select Words You Heard Box */}
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-sm font-bold text-[#0F294A]">
                    Select the words and phrases that you heard
                  </h2>
                  <span className="font-mono text-xs text-[#526780] tabular-nums">
                    {selectedCount} selected
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                  {wordOptions.map((opt) => {
                    const picked = Boolean(selectedMap[opt.text]);

                    let cardClass =
                      'border-[#CBD5E1] bg-white text-[#0F294A] hover:border-[#0369A1] hover:bg-[#F7FAFE]';
                    let stateLabel: string | null = null;
                    let StateIcon: typeof Check | null = null;

                    if (!isChecked) {
                      if (picked) {
                        cardClass = 'border-[#0369A1] bg-[#E0F2FE] text-[#0C4A6E]';
                        StateIcon = Check;
                      }
                    } else if (opt.heard && picked) {
                      cardClass = 'border-emerald-400 bg-emerald-50 text-emerald-900';
                      stateLabel = 'Correct — heard in clip';
                      StateIcon = CheckCircle2;
                    } else if (opt.heard && !picked) {
                      cardClass = 'border-amber-400 bg-amber-50 text-amber-900';
                      stateLabel = 'Missed — was in clip';
                      StateIcon = AlertCircle;
                    } else if (!opt.heard && picked) {
                      cardClass = 'border-red-300 bg-red-50 text-red-900';
                      stateLabel = 'Not heard in clip';
                      StateIcon = XCircle;
                    } else {
                      cardClass = 'border-[#E6EDF5] bg-[#F9FBFD] text-[#8396AB]';
                    }

                    return (
                      <button
                        key={opt.text}
                        type="button"
                        disabled={isChecked}
                        onClick={() => toggleWord(opt.text)}
                        className={`flex min-h-[48px] flex-col justify-center rounded-lg border px-3.5 py-2.5 text-left transition-colors ${cardClass}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold">{opt.text}</span>
                          {StateIcon && <StateIcon className="h-4 w-4 shrink-0" />}
                        </div>
                        {stateLabel && (
                          <span className="mt-1 text-[11px] font-medium">{stateLabel}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Action Row */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E6EDF5] pt-4">
                <div className="flex items-center gap-2.5">
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
                      Try This Clip Again
                    </button>
                  )}
                </div>

                {activeIndexInAll >= 0 && activeIndexInAll < drills.length - 1 && (
                  <button
                    type="button"
                    onClick={() => onSelectDrill(drills[activeIndexInAll + 1].id)}
                    className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-[#0369A1]/40 bg-[#EFF6FC] px-4 text-sm font-semibold text-[#0369A1] hover:bg-[#E0F0FB]"
                  >
                    Next Clip
                    <ChevronRight className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Full Verified Transcript Reveal (Shown After Check) */}
              {isChecked && (
                <div className="rounded-lg border border-[#DDE5F0] bg-[#FAFBFD] p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E6EDF5] pb-3">
                    <h3 className="text-sm font-bold text-[#0F294A]">
                      Actual Transcript (Highlighted Target Words)
                    </h3>
                    <span className="text-xs text-[#526780]">
                      Replay the audio above while reading along
                    </span>
                  </div>
                  <div className="mt-3 space-y-2.5">
                    {activeDrill.transcriptLines.map((line, i) => (
                      <div key={i} className="flex items-baseline gap-3 text-sm leading-relaxed">
                        <span
                          className={`w-12 shrink-0 font-mono text-xs font-bold ${
                            line.speaker === 'ATC' ? 'text-[#0369A1]' : 'text-[#0F294A]'
                          }`}
                        >
                          {line.speaker}
                        </span>
                        <p className="text-[#1E3552]">
                          {renderHighlightedLine(line.text, activeDrill.heardWords)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
      </div>
    </div>
  );
}
