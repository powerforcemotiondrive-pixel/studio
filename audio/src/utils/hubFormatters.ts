export function formatBytesMb(bytes: number): string {
  if (!bytes || bytes <= 0) return '0.0 MB';
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(0)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function formatTimeSec(sec: number): string {
  const safe = Math.max(0, Math.floor(Number.isFinite(sec) ? sec : 0));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function normalizeAviationAnswer(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9.]/g, '').trim();
}

export function checkBlankAnswer(
  studentInput: string,
  primaryAnswer: string,
  acceptedAnswers: string[]
): boolean {
  const norm = normalizeAviationAnswer(studentInput);
  if (!norm) return false;
  if (norm === normalizeAviationAnswer(primaryAnswer)) return true;
  return acceptedAnswers.some((ans) => normalizeAviationAnswer(ans) === norm);
}

/** Deterministic seeded shuffle so word tiles stay stable per clip during a session */
export function deterministicShuffle<T>(items: T[], seedStr: string): T[] {
  const out = [...items];
  let seed = 0;
  for (let i = 0; i < seedStr.length; i++) {
    seed = (seed * 33 + seedStr.charCodeAt(i)) >>> 0;
  }
  for (let i = out.length - 1; i > 0; i--) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const j = seed % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
