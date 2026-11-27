#!/usr/bin/env node
/**
 * Automated Audio Optimizer for ENAC GSEA Studio
 * Converts .wav and oversized .mp3 clips to mono AAC (.m4a) using macOS afconvert,
 * updates DATA audioSrc references in index.html, and refreshes imsmanifest.xml.
 *
 * Usage:
 *   node scripts/optimize-audio.js [bitrate]
 *   (default bitrate: 48000 = 48 kbps mono AAC)
 */

const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

const ROOT_DIR = path.resolve(__dirname, '..');
const AUDIO_DIR = path.join(ROOT_DIR, 'audio');
const INDEX_HTML_PATH = path.join(ROOT_DIR, 'index.html');
const MANIFEST_PATH = path.join(ROOT_DIR, 'imsmanifest.xml');
const AFCONVERT_BIN = '/usr/bin/afconvert';
const CONCURRENCY = 6;

const argBitrate = process.argv[2] ? Number(process.argv[2]) : 48000;
if (!Number.isFinite(argBitrate) || argBitrate <= 0) {
  console.error('❌ Invalid bitrate argument. Example: node scripts/optimize-audio.js 48000');
  process.exit(1);
}
const BITRATE = Math.round(argBitrate);

function getDirBytes(dirPath) {
  if (!fs.existsSync(dirPath)) return 0;
  return fs.readdirSync(dirPath).reduce((sum, name) => {
    const p = path.join(dirPath, name);
    const st = fs.statSync(p);
    return st.isFile() ? sum + st.size : sum;
  }, 0);
}

function findDataBounds(html) {
  const startMarker = 'var DATA = {';
  const startIdx = html.indexOf(startMarker);
  if (startIdx === -1) {
    throw new Error('Could not locate "var DATA = {" in index.html');
  }
  const jsonStart = startIdx + 'var DATA = '.length;
  const lineEndIdx = html.indexOf('};\n', jsonStart);
  const crlfEndIdx = html.indexOf('};\r\n', jsonStart);
  let endIdx = -1;
  if (lineEndIdx !== -1 && crlfEndIdx !== -1) {
    endIdx = Math.min(lineEndIdx, crlfEndIdx);
  } else {
    endIdx = lineEndIdx !== -1 ? lineEndIdx : crlfEndIdx;
  }
  if (endIdx === -1) {
    endIdx = html.indexOf('};', jsonStart);
  }
  if (endIdx === -1) {
    throw new Error('Could not locate end of DATA object in index.html');
  }
  return { jsonStart, jsonEnd: endIdx + 1 };
}

async function convertToM4a(srcPath, destPath) {
  await execFileAsync(AFCONVERT_BIN, [
    '-f', 'm4af',
    '-d', 'aac@24000',
    '-b', String(BITRATE),
    '-c', '1',
    srcPath,
    destPath
  ]);
}

async function runPool(items, concurrency, worker) {
  let cursor = 0;
  async function next() {
    while (cursor < items.length) {
      const idx = cursor++;
      await worker(items[idx], idx);
    }
  }
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, next);
  await Promise.all(workers);
}

async function main() {
  if (!fs.existsSync(AFCONVERT_BIN)) {
    console.error(`❌ ${AFCONVERT_BIN} not found (macOS required).`);
    process.exit(1);
  }
  if (!fs.existsSync(AUDIO_DIR)) {
    console.log('ℹ️  No audio/ directory found; skipping audio optimization.');
    return;
  }

  const origBytes = getDirBytes(AUDIO_DIR);
  for (const f of fs.readdirSync(AUDIO_DIR)) {
    if (f.startsWith('.tmp_opt_')) {
      fs.unlinkSync(path.join(AUDIO_DIR, f));
    }
  }
  const candidates = fs.readdirSync(AUDIO_DIR)
    .filter((f) => {
      const lower = f.toLowerCase();
      return !f.startsWith('.tmp_opt_') && (lower.endsWith('.wav') || lower.endsWith('.mp3'));
    })
    .sort();

  console.log(`🎧 Optimizing audio in audio/ (${candidates.length} .wav/.mp3 candidates at ${Math.round(BITRATE / 1000)} kbps mono AAC)...`);

  const convertedMap = {}; // "audio/old.ext" -> "audio/new.m4a"
  let wavConverted = 0;
  let mp3Converted = 0;
  let mp3Kept = 0;

  await runPool(candidates, CONCURRENCY, async (file) => {
    const ext = path.extname(file);
    const lowerExt = ext.toLowerCase();
    const base = file.slice(0, -ext.length);
    const srcPath = path.join(AUDIO_DIR, file);
    const finalM4aName = `${base}.m4a`;
    const finalM4aPath = path.join(AUDIO_DIR, finalM4aName);
    const tempM4aPath = path.join(AUDIO_DIR, `.tmp_opt_${base}_${Date.now()}.m4a`);

    try {
      await convertToM4a(srcPath, tempM4aPath);
      const origSize = fs.statSync(srcPath).size;
      const newSize = fs.statSync(tempM4aPath).size;

      if (lowerExt === '.wav') {
        fs.renameSync(tempM4aPath, finalM4aPath);
        fs.unlinkSync(srcPath);
        convertedMap[`audio/${file}`] = `audio/${finalM4aName}`;
        wavConverted++;
      } else if (lowerExt === '.mp3') {
        if (newSize < origSize) {
          fs.renameSync(tempM4aPath, finalM4aPath);
          fs.unlinkSync(srcPath);
          convertedMap[`audio/${file}`] = `audio/${finalM4aName}`;
          mp3Converted++;
        } else {
          fs.unlinkSync(tempM4aPath);
          mp3Kept++;
        }
      }
    } catch (err) {
      if (fs.existsSync(tempM4aPath)) {
        fs.unlinkSync(tempM4aPath);
      }
      throw new Error(`afconvert failed for ${file}: ${err.message}`);
    }
  });

  // Update index.html DATA audioSrc entries (also handles idempotency if .m4a already exists)
  if (fs.existsSync(INDEX_HTML_PATH)) {
    const html = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
    const { jsonStart, jsonEnd } = findDataBounds(html);
    const dataObj = JSON.parse(html.slice(jsonStart, jsonEnd));
    let updatedRefs = 0;

    for (const key of ['realDrills', 'gapExercises', 'pilotMessages']) {
      const list = dataObj[key];
      if (!Array.isArray(list)) continue;
      for (const item of list) {
        if (!item || !item.audioSrc) continue;
        if (convertedMap[item.audioSrc]) {
          item.audioSrc = convertedMap[item.audioSrc];
          updatedRefs++;
        } else {
          const origDisk = path.join(ROOT_DIR, item.audioSrc);
          const ext = path.extname(item.audioSrc);
          const m4aRel = item.audioSrc.slice(0, -ext.length) + '.m4a';
          const m4aDisk = path.join(ROOT_DIR, m4aRel);
          if (!fs.existsSync(origDisk) && fs.existsSync(m4aDisk)) {
            item.audioSrc = m4aRel;
            updatedRefs++;
          }
        }
      }
    }

    const updatedHtml = html.slice(0, jsonStart) + JSON.stringify(dataObj) + html.slice(jsonEnd);
    fs.writeFileSync(INDEX_HTML_PATH, updatedHtml, 'utf8');
    console.log(`✓ Updated ${updatedRefs} audioSrc references in index.html.`);
  }

  // Update imsmanifest.xml with current audio/ files
  if (fs.existsSync(MANIFEST_PATH)) {
    let manifest = fs.readFileSync(MANIFEST_PATH, 'utf8');
    const allAudio = fs.readdirSync(AUDIO_DIR)
      .filter((f) => /\.(m4a|mp3|wav)$/i.test(f) && !f.startsWith('.tmp_opt_'))
      .sort();
    const audioFilesXml = allAudio.map((f) => `      <file href="audio/${f}"/>`).join('\n');
    manifest = manifest.replace(/^[ \t]*<file href="audio\/[^"]+"\s*\/>\r?\n?/gm, '');
    manifest = manifest.replace('    </resource>', audioFilesXml + '\n    </resource>');
    fs.writeFileSync(MANIFEST_PATH, manifest, 'utf8');
    console.log(`✓ Updated imsmanifest.xml with ${allAudio.length} audio entries.`);
  }

  const finalBytes = getDirBytes(AUDIO_DIR);
  const origMB = (origBytes / (1024 * 1024)).toFixed(2);
  const finalMB = (finalBytes / (1024 * 1024)).toFixed(2);
  const pct = origBytes > 0 ? (((origBytes - finalBytes) / origBytes) * 100).toFixed(1) : '0.0';

  console.log(`✅ Audio Optimization Summary:`);
  console.log(`   • Candidates processed: ${candidates.length} (.wav converted: ${wavConverted}, .mp3 converted: ${mp3Converted}, .mp3 kept: ${mp3Kept})`);
  console.log(`   • audio/ size: ${origMB} MB → ${finalMB} MB (-${pct}%)`);
}

main().catch((err) => {
  console.error('❌ Audio optimization failed:', err.message);
  process.exit(1);
});
