import fs from 'node:fs';
import path from 'node:path';
import type {
  GapFillExercise,
  PilotMessageExercise,
  RealAtcDrill,
  ScormPackagePlan,
} from '../types/hub.ts';
import { CATEGORY_META } from './gapFillSeed.ts';
import { resolveSafeHubAudioPath } from './hubStore.ts';
import { buildZipBuffer, type ZipEntryInput } from './zipBuilder.ts';

const BUNDLED_IMAGES: Array<{
  key: 'hero' | 'realAtc' | 'groundOps' | 'pilotMessages';
  sourceRelative: string;
  zipPath: string;
}> = [
  {
    key: 'hero',
    sourceRelative: 'src/assets/images/enac_tower_banner_1795609456718.jpg',
    zipPath: 'assets/hero-banner.jpg',
  },
  {
    key: 'realAtc',
    sourceRelative: 'src/assets/images/section_real_atc_1795609458634.jpg',
    zipPath: 'assets/section-real-atc.jpg',
  },
  {
    key: 'groundOps',
    sourceRelative: 'src/assets/images/section_ground_ops_1795609458640.jpg',
    zipPath: 'assets/section-ground-ops.jpg',
  },
  {
    key: 'pilotMessages',
    sourceRelative: 'src/assets/images/section_pilot_messages_1795610608599.jpg',
    zipPath: 'assets/section-pilot-messages.jpg',
  },
];

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildImsManifest(title: string, pkgId: string, assetPaths: string[]): string {
  const safeId = pkgId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileTags = assetPaths
    .map((p) => `      <file href="${escapeXml(p)}" />`)
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="ENAC_GSEA_${safeId}" version="1.0"
  xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.imsproject.org/xsd/imscp_rootv1p1p2 imscp_rootv1p1p2.xsd http://www.adlnet.org/xsd/adlcp_rootv1p2 adlcp_rootv1p2.xsd">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>1.2</schemaversion>
  </metadata>
  <organizations default="ENAC_GSEA_ORG">
    <organization identifier="ENAC_GSEA_ORG">
      <title>${escapeXml(title)}</title>
      <item identifier="ITEM_1" identifierref="RES_1" isvisible="true">
        <title>${escapeXml(title)}</title>
      </item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="RES_1" type="webcontent" adlcp:scormtype="sco" href="index.html">
      <file href="index.html" />
${fileTags}
    </resource>
  </resources>
</manifest>
`;
}

interface EmbeddedRealDrill {
  id: string;
  indexNumber: number;
  title: string;
  contextHint: string;
  audioSrc: string;
  heardWords: string[];
  distractorWords: string[];
  transcriptLines: Array<{ speaker: string; text: string }>;
}

interface EmbeddedGapExercise {
  id: string;
  category: string;
  categoryLabel: string;
  indexInCategory: number;
  airportIcao: string;
  airportName: string;
  facility: string;
  title: string;
  instructions: string;
  templateText: string;
  spokenScript: string;
  audioSrc: string;
  blanks: Array<{
    answer: string;
    acceptedAnswers: string[];
    hint: string;
  }>;
}

interface EmbeddedPilotMessage {
  id: string;
  indexNumber: number;
  messageType: 'routine' | 'non_routine';
  callsign: string;
  sector: string;
  frequencyMHz: string;
  title: string;
  templateText: string;
  spokenScript: string;
  phaseOfFlight: string;
  contextSummary: string;
  usefulVocabulary: Array<{ term: string; meaning: string }>;
  audioSrc: string;
  blanks: Array<{
    answer: string;
    acceptedAnswers: string[];
    hint: string;
  }>;
}

function buildStandaloneScormHtml(payload: {
  packageTitle: string;
  realDrills: EmbeddedRealDrill[];
  gapExercises: EmbeddedGapExercise[];
  pilotMessages: EmbeddedPilotMessage[];
  images: {
    hero: string | null;
    realAtc: string | null;
    groundOps: string | null;
    pilotMessages: string | null;
  };
}): string {
  // Escape '<' safely so embedded JSON can never break out of the script tag
  const safeJson = JSON.stringify(payload).replace(/</g, '\\u003c');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeXml(payload.packageTitle)}</title>
<style>
  :root {
    --bg: #f7f9fc;
    --surface: #ffffff;
    --border: #dde5f0;
    --border-soft: #e6edf5;
    --ink: #0f294a;
    --body: #425874;
    --muted: #526780;
    --accent: #0369a1;
    --accent-hover: #075985;
    --ok-bg: #ecfdf5;
    --ok-bd: #6ee7b7;
    --ok-ink: #065f46;
    --miss-bg: #fffbeb;
    --miss-bd: #fcd34d;
    --miss-ink: #92400e;
    --bad-bg: #fef2f2;
    --bad-bd: #fca5a5;
    --bad-ink: #991b1b;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: "DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    background: var(--bg);
    color: var(--ink);
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
  }
  header {
    background: rgba(255, 255, 255, 0.96);
    border-bottom: 1px solid var(--border);
    position: sticky;
    top: 0;
    z-index: 30;
  }
  .header-inner {
    max-width: 1200px;
    margin: 0 auto;
    height: 64px;
    padding: 0 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
  }
  .brand {
    font-size: 17px;
    font-weight: 700;
    letter-spacing: -0.01em;
    color: var(--ink);
    white-space: nowrap;
  }
  nav {
    display: flex;
    align-items: center;
    gap: 24px;
    overflow-x: auto;
  }
  nav button {
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    padding: 6px 2px;
    font-size: 14px;
    font-weight: 500;
    color: var(--muted);
    cursor: pointer;
    white-space: nowrap;
    transition: color 0.15s ease, border-color 0.15s ease;
  }
  nav button:hover { color: var(--ink); }
  nav button.active {
    color: var(--ink);
    font-weight: 600;
    border-bottom-color: var(--accent);
  }
  main {
    max-width: 1200px;
    margin: 0 auto;
    padding: 28px 24px 48px;
  }
  .card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 24px 28px;
  }
  .hero-shell {
    overflow: hidden;
    border: 1px solid var(--border);
    border-radius: 12px;
    background: var(--surface);
    margin-bottom: 28px;
  }
  .hero-banner {
    position: relative;
    min-height: 270px;
    background: linear-gradient(135deg, #0b2240 0%, #0f2f57 55%, #0369a1 100%);
    display: flex;
    align-items: center;
  }
  .hero-banner img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center;
  }
  .hero-scrim {
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, rgba(9, 29, 56, 0.92) 0%, rgba(13, 40, 75, 0.80) 55%, rgba(13, 40, 75, 0.25) 100%);
  }
  .hero-content {
    position: relative;
    z-index: 2;
    max-width: 650px;
    padding: 36px 36px;
  }
  .hero-kicker {
    font-size: 12px;
    font-weight: 600;
    color: #bae6fd;
    margin: 0 0 8px;
  }
  .hero-title {
    margin: 0;
    font-size: 32px;
    line-height: 1.15;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: #ffffff;
  }
  .hero-sub {
    margin: 12px 0 0;
    font-size: 15px;
    line-height: 1.6;
    color: #f1f5f9;
  }
  .hero-actions {
    margin-top: 22px;
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
  }
  .btn-hero-light {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    height: 40px;
    padding: 0 20px;
    border-radius: 8px;
    border: none;
    background: #ffffff;
    color: var(--ink);
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
  }
  .btn-hero-light:hover { background: #f0f9ff; }
  .btn-hero-ghost {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    height: 40px;
    padding: 0 20px;
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.42);
    background: rgba(11, 34, 64, 0.58);
    color: #ffffff;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
  }
  .btn-hero-ghost:hover { background: rgba(11, 34, 64, 0.82); }
  .hero-steps {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    background: #ffffff;
  }
  .hero-step {
    padding: 18px 24px;
    border-right: 1px solid var(--border-soft);
  }
  .hero-step:last-child { border-right: none; }
  .step-num {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 12px;
    font-weight: 600;
    color: var(--accent);
    margin: 0;
  }
  .step-head {
    font-size: 14px;
    font-weight: 600;
    color: var(--ink);
    margin: 4px 0 2px;
  }
  .step-body {
    font-size: 12px;
    color: var(--muted);
    margin: 0;
  }
  .grid-sections {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: 24px;
  }
  .debrief-grid {
    display: grid;
    grid-template-columns: 1fr 2fr;
    gap: 14px;
    margin-top: 20px;
    padding-top: 18px;
    border-top: 1px solid var(--border-soft);
  }
  .debrief-box {
    background: #f7f9fc;
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 14px 16px;
  }
  .debrief-kicker {
    font-size: 11px;
    font-weight: 700;
    color: var(--accent);
    margin: 0;
  }
  .debrief-phase {
    font-size: 16px;
    font-weight: 700;
    color: var(--ink);
    margin: 6px 0 4px;
  }
  .vocab-box {
    margin-top: 14px;
    background: #ffffff;
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 14px 16px;
  }
  .vocab-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 10px;
    margin-top: 10px;
  }
  .vocab-item {
    background: #fafbfd;
    border: 1px solid var(--border-soft);
    border-radius: 6px;
    padding: 10px 12px;
  }
  .vocab-term {
    font-family: ui-monospace, Menlo, monospace;
    font-size: 12px;
    font-weight: 700;
    color: var(--ink);
    margin: 0;
  }
  .vocab-meaning {
    font-size: 12px;
    color: var(--body);
    margin: 4px 0 0;
  }
  .section-card {
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
  }
  .section-media {
    position: relative;
    height: 204px;
    background: linear-gradient(135deg, #0f294a, #0369a1);
  }
  .section-media img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .section-media-scrim {
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, transparent 40%, rgba(11, 31, 58, 0.72) 100%);
  }
  .section-media-meta {
    position: absolute;
    left: 20px;
    right: 20px;
    bottom: 12px;
    display: flex;
    justify-content: space-between;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 12px;
    font-weight: 500;
    color: #ffffff;
  }
  .section-body {
    display: flex;
    flex: 1;
    flex-direction: column;
    justify-content: space-between;
    padding: 24px 26px;
  }
  .section-title {
    margin: 0;
    font-size: 20px;
    font-weight: 700;
    color: var(--ink);
  }
  .section-desc {
    margin: 8px 0 0;
    font-size: 14px;
    color: var(--body);
    line-height: 1.6;
  }
  .section-list {
    margin: 18px 0 0;
    padding: 16px 0 0;
    border-top: 1px solid var(--border-soft);
    font-size: 13px;
    color: var(--body);
  }
  .section-list ol {
    margin: 6px 0 0;
    padding-left: 18px;
  }
  .section-list li { margin-bottom: 4px; }
  .cat-mini-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
    margin-top: 18px;
  }
  .cat-mini-btn {
    border: 1px solid #e2e9f2;
    background: #f7f9fc;
    border-radius: 8px;
    padding: 9px 12px;
    text-align: left;
    cursor: pointer;
    transition: border-color 0.15s ease, background 0.15s ease;
  }
  .cat-mini-btn:hover {
    border-color: rgba(3, 105, 161, 0.5);
    background: #eff6fc;
  }
  .cat-mini-title {
    font-size: 12px;
    font-weight: 600;
    color: var(--ink);
    margin: 0;
  }
  .cat-mini-sub {
    font-size: 11px;
    color: var(--muted);
    margin: 2px 0 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .section-footer {
    margin-top: 22px;
    padding-top: 18px;
    border-top: 1px solid var(--border-soft);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  .section-header-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 20px 24px;
    margin-bottom: 20px;
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    justify-content: space-between;
    gap: 16px;
  }
  .section-header-kicker {
    font-size: 12px;
    font-weight: 600;
    color: var(--accent);
    margin: 0;
  }
  .section-header-title {
    font-size: 23px;
    font-weight: 700;
    letter-spacing: -0.015em;
    color: var(--ink);
    margin: 4px 0 0;
  }
  .section-header-sub {
    font-size: 13px;
    color: var(--muted);
    margin: 4px 0 0;
  }
  .section-header-stats {
    display: flex;
    align-items: center;
    gap: 16px;
    text-align: right;
  }
  .stat-val {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 17px;
    font-weight: 700;
    color: var(--ink);
    margin: 0;
  }
  .stat-lbl {
    font-size: 11px;
    color: var(--muted);
    margin: 0;
  }
  .steps-strip {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
    margin: 16px 0 20px;
    padding: 14px 16px;
    background: #f1f6fb;
    border: 1px solid var(--border);
    border-radius: 8px;
    font-size: 13px;
    color: var(--body);
  }
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    height: 38px;
    padding: 0 16px;
    border-radius: 8px;
    border: 1px solid #cbd5e1;
    background: var(--surface);
    color: var(--ink);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
  }
  .btn:hover:not(:disabled) { background: #f1f5f9; }
  .btn:disabled { opacity: 0.45; cursor: not-allowed; }
  .btn-primary {
    background: var(--accent);
    border-color: var(--accent);
    color: #ffffff;
  }
  .btn-primary:hover:not(:disabled) { background: var(--accent-hover); }
  .audio-box {
    background: #f8fafc;
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 14px 16px;
    margin-bottom: 20px;
  }
  audio { width: 100%; height: 40px; }
  .speed-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 10px;
    align-items: center;
    font-size: 12px;
    color: var(--muted);
  }
  .spd-btn {
    height: 30px;
    padding: 0 10px;
    border-radius: 6px;
    border: 1px solid #cbd5e1;
    background: #ffffff;
    color: var(--ink);
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
  }
  .spd-btn.active {
    background: var(--accent);
    border-color: var(--accent);
    color: #ffffff;
  }
  .word-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(185px, 1fr));
    gap: 10px;
    margin: 14px 0 22px;
  }
  .word-tile {
    text-align: left;
    padding: 12px 14px;
    border-radius: 8px;
    border: 1px solid #cbd5e1;
    background: #ffffff;
    font-size: 14px;
    font-weight: 500;
    color: var(--ink);
    cursor: pointer;
    transition: border-color 0.12s ease, background 0.12s ease;
  }
  .word-tile:hover:not(:disabled) { border-color: var(--accent); background: #f8fbff; }
  .word-tile.selected {
    border-color: var(--accent);
    background: #e0f2fe;
    color: #0c4a6e;
    font-weight: 600;
  }
  .word-tile.ok { border-color: var(--ok-bd); background: var(--ok-bg); color: var(--ok-ink); }
  .word-tile.missed { border-color: var(--miss-bd); background: var(--miss-bg); color: var(--miss-ink); }
  .word-tile.wrong { border-color: var(--bad-bd); background: var(--bad-bg); color: var(--bad-ink); }
  .word-state { display: block; font-size: 11px; margin-top: 4px; font-weight: 600; }
  .feedback-box {
    padding: 14px 16px;
    border-radius: 8px;
    border: 1px solid var(--border);
    background: #f8fafc;
    margin-bottom: 18px;
    font-size: 14px;
    color: var(--ink);
  }
  .transcript {
    border-top: 1px solid var(--border);
    padding-top: 20px;
    margin-top: 22px;
  }
  .t-line { margin: 8px 0; font-size: 14px; color: var(--ink); }
  .t-speaker {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 12px;
    font-weight: 700;
    color: var(--accent);
    margin-right: 8px;
  }
  .hl { background: #fef08a; padding: 1px 4px; border-radius: 3px; font-weight: 600; }
  .gap-text { font-size: 16px; line-height: 2.3; margin: 18px 0 22px; color: var(--ink); }
  .gap-input {
    display: inline-block;
    width: 138px;
    padding: 4px 10px;
    margin: 0 4px;
    border: 1px solid #94a3b8;
    border-radius: 6px;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 14px;
    font-weight: 600;
    color: var(--ink);
    background: #ffffff;
  }
  .gap-input:focus { outline: 2px solid var(--accent); outline-offset: 1px; border-color: var(--accent); }
  .gap-input.ok { border-color: var(--ok-bd); background: var(--ok-bg); color: var(--ok-ink); }
  .gap-input.wrong { border-color: var(--bad-bd); background: var(--bad-bg); color: var(--bad-ink); }
  .gap-ans { font-family: ui-monospace, Menlo, monospace; font-size: 12px; color: var(--ok-ink); margin-left: 4px; font-weight: 700; }
  .tabs { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 14px; }
  .tab {
    padding: 8px 14px;
    border-radius: 8px;
    border: 1px solid var(--border);
    background: #ffffff;
    font-size: 13px;
    font-weight: 600;
    color: var(--muted);
    cursor: pointer;
  }
  .tab.active { background: var(--accent); border-color: var(--accent); color: #ffffff; }
  .clip-nav {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 18px;
    max-height: 116px;
    overflow-y: auto;
    padding: 2px 0;
  }
  .clip-num {
    min-width: 36px;
    height: 32px;
    padding: 0 8px;
    border-radius: 6px;
    border: 1px solid var(--border);
    background: #ffffff;
    font-family: ui-monospace, Menlo, monospace;
    font-size: 12px;
    color: var(--ink);
    cursor: pointer;
  }
  .clip-num.active { background: var(--accent); border-color: var(--accent); color: #ffffff; font-weight: 700; }
  .clip-num.done { border-color: var(--ok-bd); background: var(--ok-bg); color: var(--ok-ink); }
  .meta { font-size: 12px; color: var(--muted); margin-bottom: 6px; }
  .row-between { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
  @media (max-width: 840px) {
    .grid-sections { grid-template-columns: 1fr; }
    .debrief-grid { grid-template-columns: 1fr; }
    .hero-steps { grid-template-columns: 1fr; }
    .hero-step { border-right: none; border-bottom: 1px solid var(--border-soft); }
    .hero-step:last-child { border-bottom: none; }
    .steps-strip { grid-template-columns: 1fr; }
    .hero-content { padding: 28px 22px; }
    .hero-title { font-size: 25px; }
  }
</style>
</head>
<body>
<header>
  <div class="header-inner">
    <div class="brand">ENAC GSEA Listening Hub</div>
    <nav id="top-nav" aria-label="Hub sections"></nav>
  </div>
</header>
<main id="app"></main>
<script>
(function() {
  var DATA = ${safeJson};
  var sectionCount = (DATA.realDrills.length > 0 ? 1 : 0) + (DATA.gapExercises.length > 0 ? 1 : 0) + (DATA.pilotMessages.length > 0 ? 1 : 0);
  var initialView = sectionCount >= 2 ? 'home' : (DATA.realDrills.length > 0 ? 'real' : (DATA.gapExercises.length > 0 ? 'gap' : 'pilot'));
  var state = {
    view: initialView,
    realIdx: 0,
    gapCat: (DATA.gapExercises[0] && DATA.gapExercises[0].category) || 'atis',
    gapIdx: 0,
    pilotFilter: 'all',
    pilotIdx: 0,
    selectedWords: {},
    checkedReal: {},
    wordOrderCache: {},
    gapValues: {},
    checkedGap: {},
    pilotValues: {},
    checkedPilot: {},
    showHints: false,
    showGapScript: {},
    showPilotScript: {},
    speed: 1.0
  };

  // Minimal SCORM 1.2 LMS bridge (completion only, no grade cutoff)
  var scormApi = null;
  function findScorm(win) {
    var tries = 0;
    while (win && !win.API && tries < 8) {
      if (win.parent === win) break;
      win = win.parent;
      tries++;
    }
    return (win && win.API) ? win.API : null;
  }
  try {
    scormApi = findScorm(window) || (window.opener ? findScorm(window.opener) : null);
    if (scormApi) {
      scormApi.LMSInitialize('');
      scormApi.LMSSetValue('cmi.core.lesson_status', 'incomplete');
      scormApi.LMSCommit('');
    }
  } catch (e) {}
  window.addEventListener('beforeunload', function() {
    try {
      if (scormApi) {
        scormApi.LMSCommit('');
        scormApi.LMSFinish('');
      }
    } catch (e) {}
  });
  function markProgress() {
    try {
      if (!scormApi) return;
      var doneCount = Object.keys(state.checkedReal).length + Object.keys(state.checkedGap).length + Object.keys(state.checkedPilot).length;
      if (doneCount > 0) {
        scormApi.LMSSetValue('cmi.core.lesson_status', 'completed');
        scormApi.LMSCommit('');
      }
    } catch (e) {}
  }

  function esc(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function normAns(s) {
    return String(s || '').toLowerCase().replace(/[^a-z0-9.]/g, '');
  }

  function getShuffledWords(drill) {
    if (state.wordOrderCache[drill.id]) return state.wordOrderCache[drill.id];
    var all = drill.heardWords.map(function(w) { return { text: w, heard: true }; })
      .concat(drill.distractorWords.map(function(w) { return { text: w, heard: false }; }));
    for (var i = all.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = all[i]; all[i] = all[j]; all[j] = tmp;
    }
    state.wordOrderCache[drill.id] = all;
    return all;
  }

  function highlightTranscript(text, heardWords) {
    var html = esc(text);
    var patterns = heardWords
      .slice()
      .sort(function(a, b) { return b.length - a.length; })
      .map(function(w) { return esc(w).replace(/[.*+?^$()|[\\]\\\\]/g, '\\\\$&'); })
      .filter(Boolean);
    if (patterns.length === 0) return html;
    return html.replace(new RegExp('(' + patterns.join('|') + ')', 'gi'), '<span class="hl">$1</span>');
  }

  function renderNav() {
    var nav = document.getElementById('top-nav');
    var items = [];
    if (sectionCount >= 2) {
      items.push(['home', 'Hub Home']);
    }
    if (DATA.realDrills.length > 0) {
      items.push(['real', 'Section 1: Real ATC (' + DATA.realDrills.length + ')']);
    }
    if (DATA.gapExercises.length > 0) {
      items.push(['gap', 'Section 2: ICAO Gap-Fill (' + DATA.gapExercises.length + ')']);
    }
    if (DATA.pilotMessages.length > 0) {
      items.push(['pilot', 'Section 3: Pilot Messages (' + DATA.pilotMessages.length + ')']);
    }
    nav.innerHTML = items.map(function(it) {
      return '<button data-nav="' + it[0] + '" class="' + (state.view === it[0] ? 'active' : '') + '">' + esc(it[1]) + '</button>';
    }).join('');
    nav.querySelectorAll('button').forEach(function(btn) {
      btn.onclick = function() { state.view = btn.getAttribute('data-nav'); render(); };
    });
  }

  function renderHome() {
    var heroImg = DATA.images && DATA.images.hero ? '<img src="' + esc(DATA.images.hero) + '" alt="Air traffic control tower overlooking a European airport runway" />' : '';
    var realImg = DATA.images && DATA.images.realAtc ? '<img src="' + esc(DATA.images.realAtc) + '" alt="Air traffic control tower console and headset" />' : '';
    var gapImg = DATA.images && DATA.images.groundOps ? '<img src="' + esc(DATA.images.groundOps) + '" alt="Commercial aircraft pushing back onto airport taxiway" />' : '';
    var pilotImg = DATA.images && DATA.images.pilotMessages ? '<img src="' + esc(DATA.images.pilotMessages) + '" alt="Airliner flight deck cruising above European clouds" />' : '';
    var realDone = Object.keys(state.checkedReal).length;
    var gapDone = Object.keys(state.checkedGap).length;
    var pilotDone = Object.keys(state.checkedPilot).length;

    var catCards = [
      ['atis', 'ATIS', 'Weather, runways, QNH & transition level'],
      ['afis', 'AFIS', 'Traffic advisories & aerodrome info'],
      ['clearance', 'Route Clearance', 'IFR delivery, SIDs, initial climb & squawk'],
      ['ground', 'Ground', 'Start-up, CTOT slots, stands & de-icing'],
      ['pushback', 'Pushback', 'Nose/tail headings & release points'],
      ['taxiway', 'Taxiway Movements', 'Routes, hold short & runway crossings']
    ].map(function(c) {
      var cnt = DATA.gapExercises.filter(function(g) { return g.category === c[0]; }).length;
      if (cnt === 0) return '';
      return '<button class="cat-mini-btn" data-home-cat="' + c[0] + '">' +
        '<p class="cat-mini-title">' + esc(c[1]) + ' <span style="font-weight:400;color:var(--muted);">· ' + cnt + ' drills</span></p>' +
        '<p class="cat-mini-sub">' + esc(c[2]) + '</p>' +
      '</button>';
    }).join('');

    var cardsHtml = '';
    if (DATA.realDrills.length > 0) {
      cardsHtml += '<section class="section-card">' +
          '<div class="section-media">' + realImg + '<div class="section-media-scrim"></div>' +
            '<div class="section-media-meta"><span>Section 1 · ' + DATA.realDrills.length + ' Real ATC Clips</span>' +
            (realDone > 0 ? '<span style="color:#a7f3d0;">' + realDone + ' practiced</span>' : '') + '</div>' +
          '</div>' +
          '<div class="section-body">' +
            '<div>' +
              '<h2 class="section-title">Real Pilot–Controller Word Identification</h2>' +
              '<p class="section-desc">Authentic pilot and controller recordings across all phases of flight. Select every spoken word or phrase from a mixed word box, then review the verified transcript.</p>' +
              '<div class="section-list"><strong>What you will do:</strong><ol><li>Play a real ATC radio recording from the clip list.</li><li>Click every word or phrase you heard (watch out for distractors).</li><li>Check your answers and read the highlighted transcript.</li></ol></div>' +
            '</div>' +
            '<div class="section-footer">' +
              '<span class="meta" style="margin:0;font-family:ui-monospace,Menlo,monospace;">' + DATA.realDrills.length + ' clips ready offline</span>' +
              '<button class="btn btn-primary" id="go-real">Start Section 1 →</button>' +
            '</div>' +
          '</div>' +
        '</section>';
    }
    if (DATA.gapExercises.length > 0) {
      cardsHtml += '<section class="section-card">' +
          '<div class="section-media">' + gapImg + '<div class="section-media-scrim"></div>' +
            '<div class="section-media-meta"><span>Section 2 · ' + DATA.gapExercises.length + ' ICAO Gap-Fill Drills</span>' +
            (gapDone > 0 ? '<span style="color:#a7f3d0;">' + gapDone + ' practiced</span>' : '') + '</div>' +
          '</div>' +
          '<div class="section-body">' +
            '<div>' +
              '<h2 class="section-title">European &amp; ICAO Ground Operations Gap-Fill</h2>' +
              '<p class="section-desc">VHF radio drills covering <strong>LFBO Toulouse-Blagnac</strong>, <strong>LFPG Paris CDG</strong>, <strong>EGLL Heathrow</strong>, and regional fields. Type missing runways, QNH, taxiways, and clearances.</p>' +
              '<div class="cat-mini-grid">' + catCards + '</div>' +
            '</div>' +
            '<div class="section-footer">' +
              '<span class="meta" style="margin:0;font-family:ui-monospace,Menlo,monospace;">' + DATA.gapExercises.length + ' drills ready offline</span>' +
              '<button class="btn btn-primary" id="go-gap">Start Section 2 →</button>' +
            '</div>' +
          '</div>' +
        '</section>';
    }
    if (DATA.pilotMessages.length > 0) {
      cardsHtml += '<section class="section-card">' +
          '<div class="section-media">' + pilotImg + '<div class="section-media-scrim"></div>' +
            '<div class="section-media-meta"><span>Section 3 · ' + DATA.pilotMessages.length + ' Pilot Messages</span>' +
            (pilotDone > 0 ? '<span style="color:#a7f3d0;">' + pilotDone + ' practiced</span>' : '') + '</div>' +
          '</div>' +
          '<div class="section-body">' +
            '<div>' +
              '<h2 class="section-title">Routine &amp; Non-Routine Pilot Messages</h2>' +
              '<p class="section-desc">Distorted cockpit VHF calls on active European frequencies—passing FL240, sick passenger on board, weather deviations, and technical reports. Fill 3 gaps, then unlock Phase of Flight, Context, and Useful Vocabulary.</p>' +
              '<div class="section-list"><strong>After checking each call:</strong><ol><li>See the exact <strong>Phase of Flight</strong> &amp; active frequency.</li><li>Read a concise <strong>Situation Context</strong> briefing.</li><li>Study 3 key <strong>Useful Aviation Vocabulary</strong> terms.</li></ol></div>' +
            '</div>' +
            '<div class="section-footer">' +
              '<span class="meta" style="margin:0;font-family:ui-monospace,Menlo,monospace;">' + DATA.pilotMessages.length + ' calls ready offline</span>' +
              '<button class="btn btn-primary" id="go-pilot">Start Section 3 →</button>' +
            '</div>' +
          '</div>' +
        '</section>';
    }

    return '<section class="hero-shell">' +
        '<div class="hero-banner">' +
          heroImg +
          '<div class="hero-scrim"></div>' +
          '<div class="hero-content">' +
            '<p class="hero-kicker">ENAC GSEA · B1 / B2 Listening Comprehension</p>' +
            '<h1 class="hero-title">ATC Listening Comprehension Hub</h1>' +
            '<p class="hero-sub">Train with real pilot–controller radio recordings, European ICAO ground operations drills, and routine &amp; non-routine cockpit pilot messages. Listen as many times as you need—there is no passing score and no grade penalty.</p>' +
            '<div class="hero-actions">' +
              (DATA.realDrills.length > 0 ? '<button class="btn-hero-light" id="hero-real">Start Section 1</button>' : '') +
              (DATA.gapExercises.length > 0 ? '<button class="btn-hero-ghost" id="hero-gap">Open Section 2 →</button>' : '') +
              (DATA.pilotMessages.length > 0 ? '<button class="btn-hero-ghost" id="hero-pilot">Section 3: Pilot Calls →</button>' : '') +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="hero-steps">' +
          '<div class="hero-step"><p class="step-num">01. Listen</p><p class="step-head">Replay at your own pace</p><p class="step-body">Play clips freely or switch to 0.85x speed when radio phraseology is fast.</p></div>' +
          '<div class="hero-step"><p class="step-num">02. Complete</p><p class="step-head">Select words or fill gaps</p><p class="step-body">Pick spoken words in real ATC clips, or type key ICAO figures and pilot details.</p></div>' +
          '<div class="hero-step"><p class="step-num">03. Review</p><p class="step-head">Check &amp; read the debrief</p><p class="step-body">See immediate feedback, transcripts, phase of flight, context, and key vocabulary.</p></div>' +
        '</div>' +
      '</section>' +
      '<div class="grid-sections">' + cardsHtml + '</div>';
  }

  function renderReal() {
    var drill = DATA.realDrills[state.realIdx];
    if (!drill) return '<div class="card">No Real ATC clips included in this package.</div>';
    var words = getShuffledWords(drill);
    var sel = state.selectedWords[drill.id] || {};
    var checked = !!state.checkedReal[drill.id];

    var navBtns = DATA.realDrills.map(function(d, idx) {
      var cls = 'clip-num' + (idx === state.realIdx ? ' active' : '') + (state.checkedReal[d.id] ? ' done' : '');
      return '<button class="' + cls + '" data-ridx="' + idx + '">' + String(d.indexNumber).padStart(2, '0') + '</button>';
    }).join('');

    var summaryHtml = '';
    if (checked) {
      var hits = 0, wrong = 0;
      words.forEach(function(w) {
        var picked = !!sel[w.text];
        if (w.heard && picked) hits++;
        else if (!w.heard && picked) wrong++;
      });
      summaryHtml = '<div class="feedback-box"><strong>How you did:</strong> You identified <strong>' + hits + ' of ' + drill.heardWords.length + '</strong> spoken words/phrases' +
        (wrong > 0 ? ', and selected <strong>' + wrong + '</strong> distractor(s) not heard in the clip.' : ' with zero distractors selected.') +
        ' Review the transcript below with the key words highlighted.</div>';
    }

    var tilesHtml = words.map(function(w) {
      var picked = !!sel[w.text];
      var cls = 'word-tile';
      var note = '';
      if (!checked) {
        if (picked) cls += ' selected';
      } else {
        if (w.heard && picked) { cls += ' ok'; note = 'Correct — heard in clip'; }
        else if (w.heard && !picked) { cls += ' missed'; note = 'Missed — was in clip'; }
        else if (!w.heard && picked) { cls += ' wrong'; note = 'Not heard in clip'; }
      }
      return '<button class="' + cls + '" data-word="' + esc(w.text) + '"' + (checked ? ' disabled' : '') + '>' +
        esc(w.text) + (note ? '<span class="word-state">' + note + '</span>' : '') + '</button>';
    }).join('');

    var transcriptHtml = checked ? (
      '<div class="transcript">' +
        '<h3 style="margin:0 0 10px;font-size:16px;">Actual Transcript</h3>' +
        drill.transcriptLines.map(function(line) {
          return '<div class="t-line"><span class="t-speaker">' + esc(line.speaker) + '</span>' + highlightTranscript(line.text, drill.heardWords) + '</div>';
        }).join('') +
      '</div>'
    ) : '';

    return '<div class="section-header-card">' +
        '<div>' +
          '<p class="section-header-kicker">Section 1 · Real Pilot–Controller Recordings</p>' +
          '<h1 class="section-header-title">Select Words You Heard</h1>' +
          '<p class="section-header-sub">Listen to real ATC clips, select every word or phrase you heard, and review the verified transcript.</p>' +
        '</div>' +
        '<div class="section-header-stats">' +
          '<div><p class="stat-lbl">Clips</p><p class="stat-val">' + DATA.realDrills.length + '</p></div>' +
          '<div><p class="stat-lbl">Practiced</p><p class="stat-val" style="color:var(--ok-ink);">' + Object.keys(state.checkedReal).length + '</p></div>' +
        '</div>' +
      '</div>' +
      '<div class="clip-nav">' + navBtns + '</div>' +
      '<div class="card">' +
        '<div class="meta">Clip ' + (state.realIdx + 1) + ' of ' + DATA.realDrills.length + '</div>' +
        '<h2 style="margin:0 0 4px;font-size:21px;">' + esc(drill.title) + '</h2>' +
        '<p style="margin:0;color:var(--muted);font-size:14px;">' + esc(drill.contextHint) + '</p>' +
        '<div class="steps-strip">' +
          '<div><strong>Step 1.</strong> Listen to the real ATC clip (replay as often as you need).</div>' +
          '<div><strong>Step 2.</strong> Click every word or phrase you heard in the clip.</div>' +
          '<div><strong>Step 3.</strong> Click <strong>Check My Answers</strong> to see the full transcript.</div>' +
        '</div>' +
        '<div class="audio-box">' +
          '<audio id="clip-audio" controls src="' + esc(drill.audioSrc) + '"></audio>' +
          '<div class="speed-row">Playback speed:' +
            '<button class="spd-btn' + (state.speed === 0.85 ? ' active' : '') + '" data-spd="0.85">0.85x (Slower)</button>' +
            '<button class="spd-btn' + (state.speed === 1 ? ' active' : '') + '" data-spd="1">1.0x (Normal)</button>' +
          '</div>' +
        '</div>' +
        summaryHtml +
        '<div style="font-size:13px;font-weight:600;color:var(--muted);">Select all words and phrases that you heard:</div>' +
        '<div class="word-grid">' + tilesHtml + '</div>' +
        '<div class="row-between">' +
          '<div style="display:flex;gap:8px;">' +
            (!checked ? '<button class="btn btn-primary" id="check-real">Check My Answers</button>' : '<button class="btn" id="retry-real">Try Clip Again</button>') +
          '</div>' +
          '<div style="display:flex;gap:8px;">' +
            '<button class="btn" id="prev-real"' + (state.realIdx === 0 ? ' disabled' : '') + '>Previous</button>' +
            '<button class="btn btn-primary" id="next-real"' + (state.realIdx >= DATA.realDrills.length - 1 ? ' disabled' : '') + '>Next Clip</button>' +
          '</div>' +
        '</div>' +
        transcriptHtml +
      '</div>';
  }

  function renderGap() {
    var cats = ['atis', 'afis', 'clearance', 'ground', 'pushback', 'taxiway'];
    var catNames = { atis: 'ATIS', afis: 'AFIS', clearance: 'Route Clearance', ground: 'Ground', pushback: 'Pushback', taxiway: 'Taxiway Movements' };
    var byCat = DATA.gapExercises.filter(function(g) { return g.category === state.gapCat; });
    if (byCat.length === 0) {
      for (var c = 0; c < cats.length; c++) {
        var list = DATA.gapExercises.filter(function(g) { return g.category === cats[c]; });
        if (list.length > 0) { state.gapCat = cats[c]; byCat = list; state.gapIdx = 0; break; }
      }
    }
    var ex = byCat[state.gapIdx] || byCat[0];
    if (!ex) return '<div class="card">No Section 2 exercises included in this package.</div>';

    var vals = state.gapValues[ex.id] || {};
    var checked = !!state.checkedGap[ex.id];

    var catTabs = cats.map(function(c) {
      var cnt = DATA.gapExercises.filter(function(g) { return g.category === c; }).length;
      if (cnt === 0) return '';
      return '<button class="tab' + (state.gapCat === c ? ' active' : '') + '" data-cat="' + c + '">' + catNames[c] + ' (' + cnt + ')</button>';
    }).join('');

    var exNums = byCat.map(function(item, idx) {
      var cls = 'clip-num' + (idx === state.gapIdx ? ' active' : '') + (state.checkedGap[item.id] ? ' done' : '');
      return '<button class="' + cls + '" data-gidx="' + idx + '">' + String(idx + 1).padStart(2, '0') + '</button>';
    }).join('');

    var correctCount = 0;
    var renderedText = esc(ex.templateText).replace(/\\{\\{(\\d+)\\}\\}/g, function(_m, idxStr) {
      var idx = Number(idxStr);
      var blank = ex.blanks[idx];
      if (!blank) return '';
      var val = vals[idx] || '';
      var isOk = false;
      if (checked) {
        var nVal = normAns(val);
        isOk = blank.acceptedAnswers.some(function(a) { return normAns(a) === nVal; }) || normAns(blank.answer) === nVal;
        if (isOk) correctCount++;
      }
      var cls = 'gap-input' + (checked ? (isOk ? ' ok' : ' wrong') : '');
      var ph = state.showHints ? blank.hint : 'Type answer';
      return '<input class="' + cls + '" data-blank="' + idx + '" value="' + esc(val) + '" placeholder="' + esc(ph) + '"' + (checked ? ' disabled' : '') + ' />' +
        (checked && !isOk ? '<span class="gap-ans">(' + esc(blank.answer) + ')</span>' : '');
    });

    var summaryHtml = checked ? (
      '<div class="feedback-box"><strong>How you did:</strong> You got <strong>' + correctCount + ' of ' + ex.blanks.length + '</strong> gaps correct. Any corrections are shown in green beside the blank.</div>'
    ) : '';

    var scriptHtml = checked && state.showGapScript[ex.id] && ex.spokenScript ? (
      '<div class="transcript"><h3 style="margin:0 0 8px;font-size:15px;">Full Spoken Script</h3><p style="margin:0;font-size:14px;color:var(--body);">' + esc(ex.spokenScript) + '</p></div>'
    ) : '';

    return '<div class="section-header-card">' +
        '<div>' +
          '<p class="section-header-kicker">Section 2 · European &amp; ICAO Ground Operations</p>' +
          '<h1 class="section-header-title">VHF Radio Gap-Fill Drills</h1>' +
          '<p class="section-header-sub">Listen to authentic VHF radio transmissions across ATIS, AFIS, Route Clearance, Ground, Pushback, and Taxiway Movements.</p>' +
        '</div>' +
        '<div class="section-header-stats">' +
          '<div><p class="stat-lbl">Exercises</p><p class="stat-val">' + DATA.gapExercises.length + '</p></div>' +
          '<div><p class="stat-lbl">Practiced</p><p class="stat-val" style="color:var(--ok-ink);">' + Object.keys(state.checkedGap).length + '</p></div>' +
        '</div>' +
      '</div>' +
      '<div class="tabs">' + catTabs + '</div>' +
      '<div class="clip-nav">' + exNums + '</div>' +
      '<div class="card">' +
        '<div class="meta">' + esc(ex.categoryLabel) + ' · ' + esc(ex.airportIcao) + ' ' + esc(ex.airportName) + ' · ' + esc(ex.facility) + '</div>' +
        '<h2 style="margin:0 0 4px;font-size:21px;">' + esc(ex.title) + '</h2>' +
        '<div class="steps-strip">' +
          '<div><strong>Step 1.</strong> Listen to the European/ICAO radio clip.</div>' +
          '<div><strong>Step 2.</strong> Type the missing numbers, runways, taxiways, or words into each blank.</div>' +
          '<div><strong>Step 3.</strong> Click <strong>Check My Answers</strong> to see how you did.</div>' +
        '</div>' +
        '<div class="audio-box">' +
          '<audio id="gap-audio" controls src="' + esc(ex.audioSrc) + '"></audio>' +
          '<div class="speed-row">Playback speed:' +
            '<button class="spd-btn' + (state.speed === 0.85 ? ' active' : '') + '" data-spd="0.85">0.85x (Slower)</button>' +
            '<button class="spd-btn' + (state.speed === 1 ? ' active' : '') + '" data-spd="1">1.0x (Normal)</button>' +
            '<button class="spd-btn" id="toggle-hints" style="margin-left:auto;">' + (state.showHints ? 'Hide Hints' : 'Show B1 Hints') + '</button>' +
          '</div>' +
        '</div>' +
        summaryHtml +
        '<div class="gap-text">' + renderedText + '</div>' +
        '<div class="row-between">' +
          '<div style="display:flex;gap:8px;flex-wrap:wrap;">' +
            (!checked ? '<button class="btn btn-primary" id="check-gap">Check My Answers</button>' : '<button class="btn" id="retry-gap">Try Again</button>') +
            (checked ? '<button class="btn" id="toggle-gap-script">' + (state.showGapScript[ex.id] ? 'Hide Full Script' : 'Show Full Script') + '</button>' : '') +
          '</div>' +
          '<div style="display:flex;gap:8px;">' +
            '<button class="btn" id="prev-gap"' + (state.gapIdx === 0 ? ' disabled' : '') + '>Previous</button>' +
            '<button class="btn btn-primary" id="next-gap"' + (state.gapIdx >= byCat.length - 1 ? ' disabled' : '') + '>Next Exercise</button>' +
          '</div>' +
        '</div>' +
        scriptHtml +
      '</div>';
  }

  function getFilteredPilotMessages() {
    if (state.pilotFilter === 'all') return DATA.pilotMessages;
    return DATA.pilotMessages.filter(function(p) { return p.messageType === state.pilotFilter; });
  }

  function renderPilot() {
    var list = getFilteredPilotMessages();
    if (list.length === 0) {
      state.pilotFilter = 'all';
      list = DATA.pilotMessages;
      state.pilotIdx = 0;
    }
    var ex = list[state.pilotIdx] || list[0];
    if (!ex) return '<div class="card">No Section 3 pilot messages included in this package.</div>';

    var vals = state.pilotValues[ex.id] || {};
    var checked = !!state.checkedPilot[ex.id];
    var routineCnt = DATA.pilotMessages.filter(function(p) { return p.messageType === 'routine'; }).length;
    var nonRoutineCnt = DATA.pilotMessages.filter(function(p) { return p.messageType === 'non_routine'; }).length;

    var filterTabs = [
      ['all', 'All Messages (' + DATA.pilotMessages.length + ')'],
      ['routine', 'Routine (' + routineCnt + ')'],
      ['non_routine', 'Non-Routine (' + nonRoutineCnt + ')']
    ].map(function(f) {
      return '<button class="tab' + (state.pilotFilter === f[0] ? ' active' : '') + '" data-pfilter="' + f[0] + '">' + esc(f[1]) + '</button>';
    }).join('');

    var exNums = list.map(function(item, idx) {
      var cls = 'clip-num' + (idx === state.pilotIdx ? ' active' : '') + (state.checkedPilot[item.id] ? ' done' : '');
      return '<button class="' + cls + '" data-pidx="' + idx + '">' + String(item.indexNumber).padStart(2, '0') + '</button>';
    }).join('');

    var correctCount = 0;
    var renderedText = esc(ex.templateText).replace(/\\{\\{(\\d+)\\}\\}/g, function(_m, idxStr) {
      var idx = Number(idxStr);
      var blank = ex.blanks[idx];
      if (!blank) return '';
      var val = vals[idx] || '';
      var isOk = false;
      if (checked) {
        var nVal = normAns(val);
        isOk = blank.acceptedAnswers.some(function(a) { return normAns(a) === nVal; }) || normAns(blank.answer) === nVal;
        if (isOk) correctCount++;
      }
      var cls = 'gap-input' + (checked ? (isOk ? ' ok' : ' wrong') : '');
      var ph = state.showHints ? blank.hint : ('Gap ' + (idx + 1));
      return '<input class="' + cls + '" data-pblank="' + idx + '" value="' + esc(val) + '" placeholder="' + esc(ph) + '"' + (checked ? ' disabled' : '') + ' />' +
        (checked && !isOk ? '<span class="gap-ans">(' + esc(blank.answer) + ')</span>' : '');
    });

    var summaryHtml = checked ? (
      '<div class="feedback-box"><strong>How you did:</strong> You got <strong>' + correctCount + ' of ' + ex.blanks.length + '</strong> gaps correct. Review the Phase of Flight, Situation Context, and Useful Vocabulary below.</div>'
    ) : '';

    var debriefHtml = '';
    if (checked) {
      var vocabItems = (ex.usefulVocabulary || []).map(function(v) {
        return '<div class="vocab-item"><p class="vocab-term">' + esc(v.term) + '</p><p class="vocab-meaning">' + esc(v.meaning) + '</p></div>';
      }).join('');
      debriefHtml = '<div class="debrief-grid">' +
          '<div class="debrief-box">' +
            '<p class="debrief-kicker">Phase of Flight</p>' +
            '<p class="debrief-phase">' + esc(ex.phaseOfFlight) + '</p>' +
            '<p class="meta" style="margin:0;font-family:ui-monospace,Menlo,monospace;">' + esc(ex.sector) + ' · ' + esc(ex.frequencyMHz) + ' MHz</p>' +
          '</div>' +
          '<div class="debrief-box">' +
            '<p class="debrief-kicker">Situation Context</p>' +
            '<p style="margin:6px 0 0;font-size:13px;color:var(--body);line-height:1.6;">' + esc(ex.contextSummary) + '</p>' +
          '</div>' +
        '</div>' +
        '<div class="vocab-box">' +
          '<p class="debrief-kicker" style="color:var(--ink);">Useful Aviation Vocabulary</p>' +
          '<div class="vocab-grid">' + vocabItems + '</div>' +
        '</div>';
    }

    var scriptHtml = checked && state.showPilotScript[ex.id] && ex.spokenScript ? (
      '<div class="transcript"><h3 style="margin:0 0 8px;font-size:15px;">Full Spoken Script</h3><p style="margin:0;font-size:14px;color:var(--body);">' + esc(ex.spokenScript) + '</p></div>'
    ) : '';

    var typeLabel = ex.messageType === 'non_routine' ? 'Non-Routine Pilot Call' : 'Routine Pilot Call';
    var typeColor = ex.messageType === 'non_routine' ? '#b45309' : 'var(--accent)';

    return '<div class="section-header-card">' +
        '<div>' +
          '<p class="section-header-kicker">Section 3 · Routine &amp; Non-Routine Pilot Messages</p>' +
          '<h1 class="section-header-title">Pilot Radio Transmissions (3-Gap Drills)</h1>' +
          '<p class="section-header-sub">Distorted VHF cockpit messages on active European frequencies. Complete 3 gaps to reveal Phase of Flight, Context, and Useful Vocabulary.</p>' +
        '</div>' +
        '<div class="section-header-stats">' +
          '<div><p class="stat-lbl">Messages</p><p class="stat-val">' + DATA.pilotMessages.length + '</p></div>' +
          '<div><p class="stat-lbl">Practiced</p><p class="stat-val" style="color:var(--ok-ink);">' + Object.keys(state.checkedPilot).length + '</p></div>' +
        '</div>' +
      '</div>' +
      '<div class="tabs">' + filterTabs + '</div>' +
      '<div class="clip-nav">' + exNums + '</div>' +
      '<div class="card">' +
        '<div class="meta"><strong style="color:' + typeColor + ';">' + esc(typeLabel) + '</strong> · <strong style="font-family:ui-monospace,Menlo,monospace;color:var(--ink);">' + esc(ex.frequencyMHz) + ' MHz</strong> · ' + esc(ex.sector) + ' · ' + esc(ex.callsign) + '</div>' +
        '<h2 style="margin:0 0 4px;font-size:21px;">' + esc(ex.title) + '</h2>' +
        '<div class="steps-strip">' +
          '<div><strong>Step 1.</strong> Tune to ' + esc(ex.frequencyMHz) + ' MHz and listen to the distorted VHF cockpit call.</div>' +
          '<div><strong>Step 2.</strong> Fill the 3 missing details from the pilot’s transmission.</div>' +
          '<div><strong>Step 3.</strong> Click <strong>Check My Answers</strong> to see Phase of Flight, Context &amp; Vocabulary.</div>' +
        '</div>' +
        '<div class="audio-box">' +
          '<audio id="pilot-audio" controls src="' + esc(ex.audioSrc) + '"></audio>' +
          '<div class="speed-row">Playback speed:' +
            '<button class="spd-btn' + (state.speed === 0.85 ? ' active' : '') + '" data-spd="0.85">0.85x (Slower)</button>' +
            '<button class="spd-btn' + (state.speed === 1 ? ' active' : '') + '" data-spd="1">1.0x (Normal)</button>' +
            '<span style="font-family:ui-monospace,Menlo,monospace;">' + esc(ex.frequencyMHz) + ' MHz · VHF distorted</span>' +
            '<button class="spd-btn" id="toggle-pilot-hints" style="margin-left:auto;">' + (state.showHints ? 'Hide Hints' : 'Show B1 Hints') + '</button>' +
          '</div>' +
        '</div>' +
        summaryHtml +
        '<div class="gap-text">' + renderedText + '</div>' +
        '<div class="row-between">' +
          '<div style="display:flex;gap:8px;flex-wrap:wrap;">' +
            (!checked ? '<button class="btn btn-primary" id="check-pilot">Check My Answers</button>' : '<button class="btn" id="retry-pilot">Try Again</button>') +
            (checked ? '<button class="btn" id="toggle-pilot-script">' + (state.showPilotScript[ex.id] ? 'Hide Full Script' : 'Show Full Script') + '</button>' : '') +
          '</div>' +
          '<div style="display:flex;gap:8px;">' +
            '<button class="btn" id="prev-pilot"' + (state.pilotIdx === 0 ? ' disabled' : '') + '>Previous</button>' +
            '<button class="btn btn-primary" id="next-pilot"' + (state.pilotIdx >= list.length - 1 ? ' disabled' : '') + '>Next Message</button>' +
          '</div>' +
        '</div>' +
        debriefHtml +
        scriptHtml +
      '</div>';
  }

  function render() {
    renderNav();
    var root = document.getElementById('app');
    if (state.view === 'home') {
      root.innerHTML = renderHome();
      var b1 = document.getElementById('go-real');
      var b2 = document.getElementById('go-gap');
      var b3 = document.getElementById('go-pilot');
      var h1 = document.getElementById('hero-real');
      var h2 = document.getElementById('hero-gap');
      var h3 = document.getElementById('hero-pilot');
      if (b1) b1.onclick = function() { state.view = 'real'; render(); };
      if (b2) b2.onclick = function() { state.view = 'gap'; render(); };
      if (b3) b3.onclick = function() { state.view = 'pilot'; render(); };
      if (h1) h1.onclick = function() { state.view = 'real'; render(); };
      if (h2) h2.onclick = function() { state.view = 'gap'; render(); };
      if (h3) h3.onclick = function() { state.view = 'pilot'; render(); };
      root.querySelectorAll('[data-home-cat]').forEach(function(btn) {
        btn.onclick = function() {
          state.gapCat = btn.getAttribute('data-home-cat');
          state.gapIdx = 0;
          state.view = 'gap';
          render();
        };
      });
      return;
    }
    if (state.view === 'real') {
      root.innerHTML = renderReal();
      var drill = DATA.realDrills[state.realIdx];
      var audio = document.getElementById('clip-audio');
      if (audio) audio.playbackRate = state.speed;
      root.querySelectorAll('[data-spd]').forEach(function(b) {
        b.onclick = function() {
          state.speed = Number(b.getAttribute('data-spd'));
          if (audio) audio.playbackRate = state.speed;
          root.querySelectorAll('[data-spd]').forEach(function(x) {
            x.classList.toggle('active', Number(x.getAttribute('data-spd')) === state.speed);
          });
        };
      });
      root.querySelectorAll('[data-ridx]').forEach(function(b) {
        b.onclick = function() { state.realIdx = Number(b.getAttribute('data-ridx')); render(); };
      });
      root.querySelectorAll('[data-word]').forEach(function(b) {
        b.onclick = function() {
          var w = b.getAttribute('data-word');
          if (!state.selectedWords[drill.id]) state.selectedWords[drill.id] = {};
          state.selectedWords[drill.id][w] = !state.selectedWords[drill.id][w];
          render();
        };
      });
      var chk = document.getElementById('check-real');
      if (chk) chk.onclick = function() { state.checkedReal[drill.id] = true; markProgress(); render(); };
      var retry = document.getElementById('retry-real');
      if (retry) retry.onclick = function() { delete state.checkedReal[drill.id]; state.selectedWords[drill.id] = {}; render(); };
      var prev = document.getElementById('prev-real');
      if (prev) prev.onclick = function() { if (state.realIdx > 0) { state.realIdx--; render(); } };
      var next = document.getElementById('next-real');
      if (next) next.onclick = function() { if (state.realIdx < DATA.realDrills.length - 1) { state.realIdx++; render(); } };
      return;
    }

    if (state.view === 'pilot') {
      root.innerHTML = renderPilot();
      var pList = getFilteredPilotMessages();
      var pEx = pList[state.pilotIdx] || pList[0];
      var pAudio = document.getElementById('pilot-audio');
      if (pAudio) pAudio.playbackRate = state.speed;
      root.querySelectorAll('[data-spd]').forEach(function(b) {
        b.onclick = function() {
          state.speed = Number(b.getAttribute('data-spd'));
          if (pAudio) pAudio.playbackRate = state.speed;
          root.querySelectorAll('[data-spd]').forEach(function(x) {
            x.classList.toggle('active', Number(x.getAttribute('data-spd')) === state.speed);
          });
        };
      });
      root.querySelectorAll('[data-pfilter]').forEach(function(b) {
        b.onclick = function() { state.pilotFilter = b.getAttribute('data-pfilter'); state.pilotIdx = 0; render(); };
      });
      root.querySelectorAll('[data-pidx]').forEach(function(b) {
        b.onclick = function() { state.pilotIdx = Number(b.getAttribute('data-pidx')); render(); };
      });
      root.querySelectorAll('[data-pblank]').forEach(function(inp) {
        inp.oninput = function() {
          var idx = Number(inp.getAttribute('data-pblank'));
          if (!state.pilotValues[pEx.id]) state.pilotValues[pEx.id] = {};
          state.pilotValues[pEx.id][idx] = inp.value;
        };
      });
      var tph = document.getElementById('toggle-pilot-hints');
      if (tph) tph.onclick = function() { state.showHints = !state.showHints; render(); };
      var cp = document.getElementById('check-pilot');
      if (cp) cp.onclick = function() { state.checkedPilot[pEx.id] = true; markProgress(); render(); };
      var rp = document.getElementById('retry-pilot');
      if (rp) rp.onclick = function() { delete state.checkedPilot[pEx.id]; state.pilotValues[pEx.id] = {}; render(); };
      var tps = document.getElementById('toggle-pilot-script');
      if (tps) tps.onclick = function() { state.showPilotScript[pEx.id] = !state.showPilotScript[pEx.id]; render(); };
      var pp = document.getElementById('prev-pilot');
      if (pp) pp.onclick = function() { if (state.pilotIdx > 0) { state.pilotIdx--; render(); } };
      var np = document.getElementById('next-pilot');
      if (np) np.onclick = function() { if (state.pilotIdx < pList.length - 1) { state.pilotIdx++; render(); } };
      return;
    }

    root.innerHTML = renderGap();
    var byCat = DATA.gapExercises.filter(function(g) { return g.category === state.gapCat; });
    var ex = byCat[state.gapIdx] || byCat[0];
    var gAudio = document.getElementById('gap-audio');
    if (gAudio) gAudio.playbackRate = state.speed;
    root.querySelectorAll('[data-spd]').forEach(function(b) {
      b.onclick = function() {
        state.speed = Number(b.getAttribute('data-spd'));
        if (gAudio) gAudio.playbackRate = state.speed;
        root.querySelectorAll('[data-spd]').forEach(function(x) {
          x.classList.toggle('active', Number(x.getAttribute('data-spd')) === state.speed);
        });
      };
    });
    root.querySelectorAll('[data-cat]').forEach(function(b) {
      b.onclick = function() { state.gapCat = b.getAttribute('data-cat'); state.gapIdx = 0; render(); };
    });
    root.querySelectorAll('[data-gidx]').forEach(function(b) {
      b.onclick = function() { state.gapIdx = Number(b.getAttribute('data-gidx')); render(); };
    });
    root.querySelectorAll('[data-blank]').forEach(function(inp) {
      inp.oninput = function() {
        var idx = Number(inp.getAttribute('data-blank'));
        if (!state.gapValues[ex.id]) state.gapValues[ex.id] = {};
        state.gapValues[ex.id][idx] = inp.value;
      };
    });
    var th = document.getElementById('toggle-hints');
    if (th) th.onclick = function() { state.showHints = !state.showHints; render(); };
    var cg = document.getElementById('check-gap');
    if (cg) cg.onclick = function() { state.checkedGap[ex.id] = true; markProgress(); render(); };
    var rg = document.getElementById('retry-gap');
    if (rg) rg.onclick = function() { delete state.checkedGap[ex.id]; state.gapValues[ex.id] = {}; render(); };
    var tgs = document.getElementById('toggle-gap-script');
    if (tgs) tgs.onclick = function() { state.showGapScript[ex.id] = !state.showGapScript[ex.id]; render(); };
    var pg = document.getElementById('prev-gap');
    if (pg) pg.onclick = function() { if (state.gapIdx > 0) { state.gapIdx--; render(); } };
    var ng = document.getElementById('next-gap');
    if (ng) ng.onclick = function() { if (state.gapIdx < byCat.length - 1) { state.gapIdx++; render(); } };
  }

  render();
})();
</script>
</body>
</html>`;
}

export function buildScorm12Zip(params: {
  plan: ScormPackagePlan;
  allRealDrills: RealAtcDrill[];
  allGapExercises: GapFillExercise[];
  allPilotMessages: PilotMessageExercise[];
}): Buffer {
  const realMap = new Map(params.allRealDrills.map((d) => [d.id, d]));
  const gapMap = new Map(params.allGapExercises.map((g) => [g.id, g]));
  const pilotMap = new Map(params.allPilotMessages.map((p) => [p.id, p]));

  const entries: ZipEntryInput[] = [];
  const assetPaths: string[] = [];
  const embeddedReal: EmbeddedRealDrill[] = [];
  const embeddedGaps: EmbeddedGapExercise[] = [];
  const embeddedPilots: EmbeddedPilotMessage[] = [];

  // Bundle the visual banner & section photos into the SCORM ZIP so Moodle looks identical
  const bundledImageMap: {
    hero: string | null;
    realAtc: string | null;
    groundOps: string | null;
    pilotMessages: string | null;
  } = { hero: null, realAtc: null, groundOps: null, pilotMessages: null };

  for (const img of BUNDLED_IMAGES) {
    const absImgPath = path.resolve(process.cwd(), img.sourceRelative);
    if (fs.existsSync(absImgPath)) {
      entries.push({
        name: img.zipPath,
        data: fs.readFileSync(absImgPath),
        compress: false, // JPEG is already compressed
      });
      assetPaths.push(img.zipPath);
      bundledImageMap[img.key] = img.zipPath;
    }
  }

  for (const id of params.plan.realAtcIds) {
    const drill = realMap.get(id);
    if (!drill || drill.status !== 'ready' || !drill.hasLocalAudio) continue;
    const safePath = resolveSafeHubAudioPath('real_atc', drill.localFilename);
    if (!safePath || !fs.existsSync(safePath)) continue;
    const relPath = `audio/real_${drill.localFilename}`;
    entries.push({
      name: relPath,
      data: fs.readFileSync(safePath),
      compress: false, // MP3 already compressed
    });
    assetPaths.push(relPath);
    embeddedReal.push({
      id: drill.id,
      indexNumber: drill.indexNumber,
      title: drill.title,
      contextHint: drill.contextHint,
      audioSrc: relPath,
      heardWords: drill.heardWords,
      distractorWords: drill.distractorWords,
      transcriptLines: drill.transcriptLines,
    });
  }

  for (const id of params.plan.gapFillIds) {
    const ex = gapMap.get(id);
    if (!ex || ex.audioStatus !== 'ready' || !ex.hasLocalAudio) continue;
    const safePath = resolveSafeHubAudioPath('ai_gapfill', ex.audioFilename);
    if (!safePath || !fs.existsSync(safePath)) continue;
    const relPath = `audio/gap_${ex.audioFilename}`;
    entries.push({
      name: relPath,
      data: fs.readFileSync(safePath),
      compress: true, // PCM WAV benefits from deflate compression inside ZIP
    });
    assetPaths.push(relPath);
    embeddedGaps.push({
      id: ex.id,
      category: ex.category,
      categoryLabel: CATEGORY_META[ex.category].label,
      indexInCategory: ex.indexInCategory,
      airportIcao: ex.airportIcao,
      airportName: ex.airportName,
      facility: ex.facility,
      title: ex.title,
      instructions: ex.instructions,
      templateText: ex.templateText,
      spokenScript: ex.spokenScript,
      audioSrc: relPath,
      blanks: ex.blanks.map((b) => ({
        answer: b.answer,
        acceptedAnswers: b.acceptedAnswers,
        hint: b.hint,
      })),
    });
  }

  for (const id of params.plan.pilotMessageIds) {
    const pm = pilotMap.get(id);
    if (!pm || pm.audioStatus !== 'ready' || !pm.hasLocalAudio) continue;
    const safePath = resolveSafeHubAudioPath('pilot_messages', pm.audioFilename);
    if (!safePath || !fs.existsSync(safePath)) continue;
    const relPath = `audio/pilot_${pm.audioFilename}`;
    entries.push({
      name: relPath,
      data: fs.readFileSync(safePath),
      compress: true,
    });
    assetPaths.push(relPath);
    embeddedPilots.push({
      id: pm.id,
      indexNumber: pm.indexNumber,
      messageType: pm.messageType,
      callsign: pm.callsign,
      sector: pm.sector,
      frequencyMHz: pm.frequencyMHz,
      title: pm.title,
      templateText: pm.templateText,
      spokenScript: pm.spokenScript,
      phaseOfFlight: pm.phaseOfFlight,
      contextSummary: pm.contextSummary,
      usefulVocabulary: pm.usefulVocabulary,
      audioSrc: relPath,
      blanks: pm.blanks.map((b) => ({
        answer: b.answer,
        acceptedAnswers: b.acceptedAnswers,
        hint: b.hint,
      })),
    });
  }

  if (embeddedReal.length === 0 && embeddedGaps.length === 0 && embeddedPilots.length === 0) {
    throw new Error('No prepared exercises with audio found for this SCORM package yet.');
  }

  const indexHtml = buildStandaloneScormHtml({
    packageTitle: params.plan.name,
    realDrills: embeddedReal,
    gapExercises: embeddedGaps,
    pilotMessages: embeddedPilots,
    images: bundledImageMap,
  });

  const manifestXml = buildImsManifest(params.plan.name, params.plan.id, assetPaths);

  entries.unshift(
    { name: 'imsmanifest.xml', data: Buffer.from(manifestXml, 'utf8'), compress: true },
    { name: 'index.html', data: Buffer.from(indexHtml, 'utf8'), compress: true }
  );

  return buildZipBuffer(entries);
}
