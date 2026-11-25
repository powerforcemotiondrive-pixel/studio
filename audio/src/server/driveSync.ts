import fs from 'node:fs';
import path from 'node:path';

export const DEFAULT_DRIVE_FOLDER_ID = '1tYwV4HI-ULiYMQQgNgdWVwfSuyS0o0b9';

const ALLOWED_DRIVE_HOSTS = new Set([
  'drive.google.com',
  'drive.usercontent.google.com',
  'docs.google.com',
]);

const MAX_CLIP_BYTES = 20 * 1024 * 1024; // 20 MB per clip safety cap

export interface DriveAudioEntry {
  fileId: string;
  filename: string;
  cleanTitle: string;
  contextHint: string;
}

export function extractDriveFolderId(input: string): string | null {
  const trimmed = input.trim();
  if (/^[a-zA-Z0-9_-]{10,80}$/.test(trimmed)) {
    return trimmed;
  }
  try {
    const url = new URL(trimmed);
    if (!ALLOWED_DRIVE_HOSTS.has(url.hostname.toLowerCase())) {
      return null;
    }
    const m = url.pathname.match(/\/folders\/([a-zA-Z0-9_-]{10,80})/);
    if (m && m[1]) return m[1];
    const idParam = url.searchParams.get('id');
    if (idParam && /^[a-zA-Z0-9_-]{10,80}$/.test(idParam)) return idParam;
  } catch {
    return null;
  }
  return null;
}

export function isValidDriveId(id: string): boolean {
  return /^[a-zA-Z0-9_-]{10,80}$/.test(id);
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

export function buildFriendlyClipTitle(filename: string, indexNumber: number): {
  cleanTitle: string;
  contextHint: string;
} {
  const stem = filename.replace(/\.(mp3|wav|m4a|ogg)$/i, '').replace(/\s*\(\d+\)$/, '');
  const icaoMatch = stem.toUpperCase().match(/(?:^|[^A-Z])(K[A-Z]{3}|P[A-Z]{3}|T[A-Z]{3}|E[A-Z]{3}|L[A-Z]{3}|C[A-Z]{3})(?:[^A-Z]|$)/);
  const icao = icaoMatch ? icaoMatch[1] : '';

  const lower = stem.toLowerCase();
  const topicMap: Array<[RegExp, string]> = [
    [/7700/, 'Squawk 7700 Emergency'],
    [/birdstrike/, 'Birdstrike Report'],
    [/blowntire|tire/, 'Blown Tire'],
    [/belly/, 'Belly / Gear-Up Landing'],
    [/canopy/, 'Open Canopy'],
    [/drone/, 'Drone Sighting'],
    [/fumes|smoke/, 'Fumes / Smoke in Cabin'],
    [/divert/, 'Flight Diversion'],
    [/unruly/, 'Unruly Passenger'],
    [/weather|storm|wind/, 'Weather / Deviation'],
    [/wingclip/, 'Wingtip Incident'],
    [/towbar/, 'Towbar Incident'],
    [/dirtlanding|endrunway/, 'Runway Excursion / Landing'],
    [/water/, 'Water / Ditching Alert'],
    [/goaround|go-around/, 'Go-Around'],
    [/gear/, 'Landing Gear Issue'],
    [/engine|fire/, 'Engine / Fire Call'],
    [/medical/, 'Medical Priority'],
    [/laser/, 'Laser Illumination'],
    [/fuel/, 'Minimum Fuel / Priority'],
  ];

  let topic = '';
  for (const [regex, label] of topicMap) {
    if (regex.test(lower)) {
      topic = label;
      break;
    }
  }

  let facility = '';
  if (/twr|tower/i.test(stem)) facility = 'Tower';
  else if (/app|approach|tracon|socal/i.test(stem)) facility = 'Approach';
  else if (/gnd|ground/i.test(stem)) facility = 'Ground';
  else if (/guard/i.test(stem)) facility = 'Guard';
  else if (/dep|departure/i.test(stem)) facility = 'Departure';

  const parts = [topic || stem.slice(0, 32).replace(/[_-]+/g, ' ').trim()];
  if (icao || facility) {
    parts.push([icao, facility].filter(Boolean).join(' '));
  }

  const cleanTitle = `Clip ${String(indexNumber).padStart(2, '0')} — ${parts.join(' · ')}`;
  const contextHint =
    'Listen carefully to the real pilot–controller exchange and select every word or phrase you hear.';
  return { cleanTitle, contextHint };
}

export async function listPublicDriveAudioFiles(folderId: string): Promise<DriveAudioEntry[]> {
  if (!isValidDriveId(folderId)) {
    throw new Error('Invalid Google Drive folder ID.');
  }

  const url = `https://drive.google.com/embeddedfolderview?id=${encodeURIComponent(folderId)}#list`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ENAC-GSEA-Hub/1.0)',
        Accept: 'text/html',
      },
    });
    if (!res.ok) {
      throw new Error(`Google Drive folder request failed (HTTP ${res.status}). Check that link sharing is set to "Anyone with the link can view".`);
    }

    const html = await res.text();
    const seen = new Set<string>();
    const entries: DriveAudioEntry[] = [];
    const regex = /id="entry-([a-zA-Z0-9_-]{10,80})"[\s\S]*?<div class="flip-entry-title">([^<]+)<\/div>/g;

    let match: RegExpExecArray | null;
    while ((match = regex.exec(html)) !== null) {
      const fileId = match[1];
      const rawName = decodeHtmlEntities(match[2].trim());
      if (seen.has(fileId)) continue;
      if (!/\.(mp3|wav|m4a|ogg)$/i.test(rawName)) continue;
      seen.add(fileId);

      const { cleanTitle, contextHint } = buildFriendlyClipTitle(rawName, entries.length + 1);
      entries.push({
        fileId,
        filename: rawName,
        cleanTitle,
        contextHint,
      });
    }

    return entries;
  } finally {
    clearTimeout(timeout);
  }
}

export async function downloadDriveAudioFile(
  fileId: string,
  destPath: string
): Promise<{ fileSizeBytes: number; mimeType: string }> {
  if (!isValidDriveId(fileId)) {
    throw new Error('Invalid Google Drive file ID.');
  }

  const initialUrl = new URL(
    `https://drive.usercontent.google.com/download?id=${encodeURIComponent(fileId)}&export=download&confirm=t`
  );

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    let currentUrl = initialUrl;
    let res: Response | null = null;
    for (let hops = 0; hops < 4; hops++) {
      res = await fetch(currentUrl.toString(), {
        signal: controller.signal,
        redirect: 'manual',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ENAC-GSEA-Hub/1.0)',
        },
      });
      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get('location');
        if (!loc) break;
        const nextUrl = new URL(loc, currentUrl);
        if (
          nextUrl.protocol !== 'https:' ||
          (!ALLOWED_DRIVE_HOSTS.has(nextUrl.hostname.toLowerCase()) &&
            !nextUrl.hostname.toLowerCase().endsWith('.googleusercontent.com'))
        ) {
          throw new Error('Blocked redirect outside Google Drive hosts.');
        }
        currentUrl = nextUrl;
        continue;
      }
      break;
    }

    if (!res || !res.ok) {
      throw new Error(`Google Drive download failed (HTTP ${res?.status ?? 'unknown'}).`);
    }

    const contentType = (res.headers.get('content-type') || 'audio/mpeg').toLowerCase();
    if (contentType.includes('text/html')) {
      throw new Error('Google Drive returned an HTML warning page instead of audio bytes.');
    }

    const reader = res.body?.getReader();
    if (!reader) {
      throw new Error('Empty audio stream received from Google Drive.');
    }

    const chunks: Uint8Array[] = [];
    let totalBytes = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        totalBytes += value.byteLength;
        if (totalBytes > MAX_CLIP_BYTES) {
          reader.cancel();
          throw new Error('Audio clip exceeds 20 MB limit.');
        }
        chunks.push(value);
      }
    }

    if (totalBytes < 512) {
      throw new Error('Downloaded file was too small to be valid audio.');
    }

    const buf = Buffer.concat(chunks);
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.writeFileSync(destPath, buf);

    const ext = path.extname(destPath).toLowerCase();
    const mimeType =
      ext === '.wav'
        ? 'audio/wav'
        : ext === '.m4a'
          ? 'audio/mp4'
          : ext === '.ogg'
            ? 'audio/ogg'
            : 'audio/mpeg';

    return { fileSizeBytes: buf.length, mimeType };
  } finally {
    clearTimeout(timeout);
  }
}
