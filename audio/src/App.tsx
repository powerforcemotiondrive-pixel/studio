import { useCallback, useEffect, useState } from 'react';
import { Loader2, Package } from 'lucide-react';
import { GapFillSection } from './components/GapFillSection';
import { HubHomeView } from './components/HubHomeView';
import { InstructorScormView } from './components/InstructorScormView';
import { PilotMessagesSection } from './components/PilotMessagesSection';
import { RealAtcSection } from './components/RealAtcSection';
import type { BatchJobStatus, GapFillCategory, HubStateSnapshot } from './types/hub';

type HubView = 'home' | 'real_atc' | 'gap_fill' | 'pilot_messages' | 'instructor';

export default function App() {
  const [view, setView] = useState<HubView>('home');
  const [gapCategory, setGapCategory] = useState<GapFillCategory>('atis');
  const [activeRealId, setActiveRealId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [snapshot, setSnapshot] = useState<HubStateSnapshot | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const [completedRealIds, setCompletedRealIds] = useState<Set<string>>(new Set());
  const [completedGapIds, setCompletedGapIds] = useState<Set<string>>(new Set());
  const [completedPilotIds, setCompletedPilotIds] = useState<Set<string>>(new Set());
  const [preparingIds, setPreparingIds] = useState<Set<string>>(new Set());
  const [generatingIds, setGeneratingIds] = useState<Set<string>>(new Set());
  const [generatingPilotIds, setGeneratingPilotIds] = useState<Set<string>>(new Set());
  const [syncingDrive, setSyncingDrive] = useState(false);

  const loadState = useCallback(async () => {
    try {
      const res = await fetch('/api/hub/state');
      if (!res.ok) throw new Error('Unable to load ENAC GSEA Hub.');
      const data = (await res.json()) as HubStateSnapshot;
      setSnapshot(data);
      setActiveRealId((prev) => {
        if (prev && data.realAtcDrills.some((d) => d.id === prev)) return prev;
        return (
          data.realAtcDrills.find((d) => d.status === 'ready')?.id ??
          data.realAtcDrills[0]?.id ??
          null
        );
      });
    } catch (err) {
      setErrorBanner(err instanceof Error ? err.message : 'Unable to connect to server.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadState();
  }, [loadState]);

  // Live SSE updates for batch transcription, TTS generation, and Google Drive sync
  useEffect(() => {
    const es = new EventSource('/api/hub/events');
    es.addEventListener('state_update', (evt) => {
      try {
        const next = JSON.parse((evt as MessageEvent).data) as HubStateSnapshot;
        setSnapshot(next);
      } catch {
        // ignore
      }
    });
    es.addEventListener('batch_status', (evt) => {
      try {
        const job = JSON.parse((evt as MessageEvent).data) as BatchJobStatus;
        setSnapshot((prev) => (prev ? { ...prev, batchJob: job } : prev));
      } catch {
        // ignore
      }
    });
    return () => es.close();
  }, []);

  const handlePrepareRealDrill = async (id: string, force = false) => {
    setErrorBanner(null);
    setPreparingIds((prev) => new Set(prev).add(id));
    try {
      const res = await fetch(`/api/hub/real-atc/${encodeURIComponent(id)}/prepare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to prepare clip.');
      if (data.snapshot) setSnapshot(data.snapshot);
    } catch (err) {
      setErrorBanner(err instanceof Error ? err.message : 'Clip preparation failed.');
    } finally {
      setPreparingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleGenerateGapAudio = async (id: string, force = false) => {
    setErrorBanner(null);
    setGeneratingIds((prev) => new Set(prev).add(id));
    try {
      const res = await fetch(`/api/hub/gap-fill/${encodeURIComponent(id)}/generate-audio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate audio.');
      if (data.snapshot) setSnapshot(data.snapshot);
    } catch (err) {
      setErrorBanner(err instanceof Error ? err.message : 'Audio generation failed.');
    } finally {
      setGeneratingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleGeneratePilotAudio = async (id: string, force = false) => {
    setErrorBanner(null);
    setGeneratingPilotIds((prev) => new Set(prev).add(id));
    try {
      const res = await fetch(`/api/hub/pilot-messages/${encodeURIComponent(id)}/generate-audio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate cockpit VHF audio.');
      if (data.snapshot) setSnapshot(data.snapshot);
    } catch (err) {
      setErrorBanner(err instanceof Error ? err.message : 'Cockpit VHF audio generation failed.');
    } finally {
      setGeneratingPilotIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleSyncDrive = async (folderUrl: string) => {
    setSyncingDrive(true);
    setErrorBanner(null);
    try {
      const res = await fetch('/api/hub/drive/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Google Drive sync failed.');
      if (data.snapshot) setSnapshot(data.snapshot);
    } finally {
      setSyncingDrive(false);
    }
  };

  const handleBatchRealAtc = async (limit?: number) => {
    setErrorBanner(null);
    const res = await fetch('/api/hub/real-atc/batch-prepare', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ limit }),
    });
    const data = await res.json();
    if (!res.ok) {
      setErrorBanner(data.error || 'Unable to start Real ATC batch preparation.');
    }
  };

  const handleBatchGapFill = async (limit?: number) => {
    setErrorBanner(null);
    const res = await fetch('/api/hub/gap-fill/batch-generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ limit }),
    });
    const data = await res.json();
    if (!res.ok) {
      setErrorBanner(data.error || 'Unable to start AI audio batch generation.');
    }
  };

  const handleBatchPilotMessages = async (limit?: number) => {
    setErrorBanner(null);
    const res = await fetch('/api/hub/pilot-messages/batch-generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ limit }),
    });
    const data = await res.json();
    if (!res.ok) {
      setErrorBanner(data.error || 'Unable to start pilot message audio batch generation.');
    }
  };

  const handleStopBatch = async () => {
    await fetch('/api/hub/batch/stop', { method: 'POST' });
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#F7F9FC] text-[#0F294A]">
      {/* Clean 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 border-b border-[#DDE5F0] bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-8 px-4 sm:px-6">
          {/* Zone 1: Brand Wordmark */}
          <button
            type="button"
            onClick={() => setView('home')}
            className="font-display text-lg font-bold tracking-tight text-[#0F294A] whitespace-nowrap shrink-0"
          >
            ENAC GSEA Listening Hub
          </button>

          {/* Zone 2: Clean Single-Line Nav Links */}
          <nav
            className="hidden md:flex items-center gap-7 text-sm font-medium text-[#526780]"
            aria-label="Hub sections"
          >
            <button
              type="button"
              onClick={() => setView('home')}
              className={`border-b-2 py-1 transition-colors whitespace-nowrap shrink-0 ${
                view === 'home'
                  ? 'border-[#0369A1] text-[#0F294A] font-semibold'
                  : 'border-transparent hover:text-[#0F294A]'
              }`}
            >
              Hub Home
            </button>
            <button
              type="button"
              onClick={() => setView('real_atc')}
              className={`border-b-2 py-1 transition-colors whitespace-nowrap shrink-0 ${
                view === 'real_atc'
                  ? 'border-[#0369A1] text-[#0F294A] font-semibold'
                  : 'border-transparent hover:text-[#0F294A]'
              }`}
            >
              Section 1: Real ATC
            </button>
            <button
              type="button"
              onClick={() => setView('gap_fill')}
              className={`border-b-2 py-1 transition-colors whitespace-nowrap shrink-0 ${
                view === 'gap_fill'
                  ? 'border-[#0369A1] text-[#0F294A] font-semibold'
                  : 'border-transparent hover:text-[#0F294A]'
              }`}
            >
              Section 2: ICAO Gap-Fill
            </button>
            <button
              type="button"
              onClick={() => setView('pilot_messages')}
              className={`border-b-2 py-1 transition-colors whitespace-nowrap shrink-0 ${
                view === 'pilot_messages'
                  ? 'border-[#0369A1] text-[#0F294A] font-semibold'
                  : 'border-transparent hover:text-[#0F294A]'
              }`}
            >
              Section 3: Pilot Messages
            </button>
          </nav>

          {/* Zone 3: 1 Primary CTA */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => setView('instructor')}
              className={`inline-flex h-9 items-center gap-2 rounded-lg px-4 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                view === 'instructor'
                  ? 'bg-[#0F294A] text-white'
                  : 'bg-[#0369A1] text-white hover:bg-[#075985]'
              }`}
            >
              <Package className="h-3.5 w-3.5" />
              Instructor &amp; SCORM
            </button>
          </div>
        </div>

        {/* Mobile Section Bar */}
        <div className="flex items-center gap-4 overflow-x-auto border-t border-[#EEF3F8] px-4 py-2 text-xs font-medium text-[#526780] md:hidden">
          <button
            type="button"
            onClick={() => setView('home')}
            className={`whitespace-nowrap ${view === 'home' ? 'font-semibold text-[#0369A1]' : ''}`}
          >
            Hub Home
          </button>
          <button
            type="button"
            onClick={() => setView('real_atc')}
            className={`whitespace-nowrap ${view === 'real_atc' ? 'font-semibold text-[#0369A1]' : ''}`}
          >
            Section 1: Real ATC
          </button>
          <button
            type="button"
            onClick={() => setView('gap_fill')}
            className={`whitespace-nowrap ${view === 'gap_fill' ? 'font-semibold text-[#0369A1]' : ''}`}
          >
            Section 2: ICAO Gap-Fill
          </button>
          <button
            type="button"
            onClick={() => setView('pilot_messages')}
            className={`whitespace-nowrap ${view === 'pilot_messages' ? 'font-semibold text-[#0369A1]' : ''}`}
          >
            Section 3: Pilot Messages
          </button>
        </div>
      </header>

      {errorBanner && (
        <div className="border-b border-red-200 bg-red-50 px-6 py-2.5 text-xs text-red-800">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
            <span>{errorBanner}</span>
            <button
              type="button"
              onClick={() => setErrorBanner(null)}
              className="font-semibold text-red-700 hover:underline"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        {loading || !snapshot ? (
          <div className="flex h-64 items-center justify-center gap-3 text-sm text-[#526780]">
            <Loader2 className="h-5 w-5 animate-spin text-[#0369A1]" />
            Loading ENAC GSEA Listening Hub...
          </div>
        ) : view === 'home' ? (
          <HubHomeView
            snapshot={snapshot}
            completedRealCount={completedRealIds.size}
            completedGapCount={completedGapIds.size}
            completedPilotCount={completedPilotIds.size}
            onOpenRealAtc={() => setView('real_atc')}
            onOpenGapFill={(cat) => {
              if (cat) setGapCategory(cat);
              setView('gap_fill');
            }}
            onOpenPilotMessages={() => setView('pilot_messages')}
            onOpenInstructor={() => setView('instructor')}
          />
        ) : view === 'real_atc' ? (
          <RealAtcSection
            drills={snapshot.realAtcDrills}
            activeDrillId={activeRealId}
            completedIds={completedRealIds}
            preparingIds={preparingIds}
            onSelectDrill={(id) => setActiveRealId(id)}
            onPrepareDrill={(id, force) => void handlePrepareRealDrill(id, force)}
            onMarkCompleted={(id) =>
              setCompletedRealIds((prev) => new Set(prev).add(id))
            }
          />
        ) : view === 'gap_fill' ? (
          <GapFillSection
            exercises={snapshot.gapFillExercises}
            initialCategory={gapCategory}
            completedIds={completedGapIds}
            generatingIds={generatingIds}
            onGenerateAudio={(id, force) => void handleGenerateGapAudio(id, force)}
            onMarkCompleted={(id) =>
              setCompletedGapIds((prev) => new Set(prev).add(id))
            }
          />
        ) : view === 'pilot_messages' ? (
          <PilotMessagesSection
            exercises={snapshot.pilotMessages}
            completedIds={completedPilotIds}
            generatingIds={generatingPilotIds}
            onGenerateAudio={(id, force) => void handleGeneratePilotAudio(id, force)}
            onMarkCompleted={(id) =>
              setCompletedPilotIds((prev) => new Set(prev).add(id))
            }
          />
        ) : (
          <InstructorScormView
            snapshot={snapshot}
            syncingDrive={syncingDrive}
            onSyncDrive={handleSyncDrive}
            onBatchRealAtc={handleBatchRealAtc}
            onBatchGapFill={handleBatchGapFill}
            onBatchPilotMessages={handleBatchPilotMessages}
            onStopBatch={handleStopBatch}
          />
        )}
      </main>
    </div>
  );
}
