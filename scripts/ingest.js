#!/usr/bin/env node
/**
 * Safe SCORM Package Ingestion Pipeline for ENAC GSEA Studio
 * Safely ingests new audio assets and drill data from an incoming author SCORM zip
 * while protecting and preserving the vetted 3-stage UI/UX shell, event handlers,
 * and responsive styling.
 * 
 * Usage:
 *   node scripts/ingest.js <path-to-new-scorm.zip>
 */

const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const INDEX_HTML_PATH = path.join(ROOT_DIR, 'index.html');
const AUDIO_DIR = path.join(ROOT_DIR, 'audio');
const MANIFEST_PATH = path.join(ROOT_DIR, 'imsmanifest.xml');

const targetZip = process.argv[2];

if (!targetZip) {
  console.log('Usage: node scripts/ingest.js <path-to-zip>');
  console.log('Example: node scripts/ingest.js ./incoming_scorm.zip');
  process.exit(1);
}

const fullZipPath = path.resolve(process.cwd(), targetZip);

if (!fs.existsSync(fullZipPath)) {
  console.error(`❌ Error: ZIP file not found at: ${fullZipPath}`);
  process.exit(1);
}

console.log(`🚀 Starting Protected Ingestion Pipeline for: ${path.basename(fullZipPath)}`);

const tempDir = path.join(ROOT_DIR, '.tmp_ingest_' + Date.now());
fs.mkdirSync(tempDir, { recursive: true });

try {
  // Step 1: Unzip incoming package to staging
  console.log('Step 1: Extracting incoming package to staging sandbox...');
  cp.execSync(`unzip -q "${fullZipPath}" -d "${tempDir}"`);

  // Step 2: Copy audio assets safely
  const incomingAudioDir = path.join(tempDir, 'audio');
  if (fs.existsSync(incomingAudioDir)) {
    console.log('Step 2: Synchronizing new audio files into audio/ directory...');
    fs.mkdirSync(AUDIO_DIR, { recursive: true });
    const audioFiles = fs.readdirSync(incomingAudioDir);
    let copiedAudio = 0;
    audioFiles.forEach(f => {
      if (f.endsWith('.mp3') || f.endsWith('.wav')) {
        fs.copyFileSync(path.join(incomingAudioDir, f), path.join(AUDIO_DIR, f));
        copiedAudio++;
      }
    });
    console.log(`✅ Synced ${copiedAudio} audio recordings.`);
  }

  // Step 3: Extract DATA object from incoming index.html
  const incomingIndex = path.join(tempDir, 'index.html');
  if (!fs.existsSync(incomingIndex)) {
    throw new Error('Incoming package does not contain an index.html file.');
  }

  console.log('Step 3: Extracting exercise & transmission DATA payload...');
  const incomingHtml = fs.readFileSync(incomingIndex, 'utf8');
  const startIdx = incomingHtml.indexOf('var DATA = {');
  if (startIdx === -1) {
    throw new Error('Could not locate "var DATA = {" in incoming index.html');
  }
  const endIdx = incomingHtml.indexOf('};', startIdx);
  const incomingDataStr = incomingHtml.slice(startIdx + 11, endIdx + 1);
  const parsedData = JSON.parse(incomingDataStr);

  // Preserve existing vetted hero and section banner images if not present or default
  if (!parsedData.images || !parsedData.images.hero) {
    parsedData.images = {
      hero: 'assets/hero-aircraft-air.jpg',
      realAtc: 'assets/section-real-atc.jpg',
      groundOps: 'assets/section-ground-ops.jpg',
      pilotMessages: 'assets/section-pilot-messages.jpg'
    };
  } else {
    // Ensure our approved aircraft in flight hero is preserved
    parsedData.images.hero = 'assets/hero-aircraft-air.jpg';
  }

  console.log(`✅ Extracted DATA: ${parsedData.realDrills?.length || 0} Section 1 clips, ${parsedData.gapExercises?.length || 0} Section 2 drills, ${parsedData.pilotMessages?.length || 0} Section 3 calls.`);

  // Step 4: Inject DATA safely into production index.html (preserving 3-stage UI/UX)
  console.log('Step 4: Hydrating production 3-Stage UI/UX shell with new DATA...');
  let prodHtml = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const prodStartIdx = prodHtml.indexOf('var DATA = {');
  const prodEndIdx = prodHtml.indexOf('};', prodStartIdx);

  if (prodStartIdx === -1 || prodEndIdx === -1) {
    throw new Error('Could not locate DATA boundary in production index.html');
  }

  const newProdHtml = prodHtml.slice(0, prodStartIdx + 11) + JSON.stringify(parsedData) + prodHtml.slice(prodEndIdx + 1);
  fs.writeFileSync(INDEX_HTML_PATH, newProdHtml, 'utf8');
  console.log('✅ Successfully hydrated production index.html with new data.');

  // Step 5: Update imsmanifest.xml with all available audio assets
  if (fs.existsSync(MANIFEST_PATH)) {
    console.log('Step 5: Updating imsmanifest.xml asset index...');
    let manifestContent = fs.readFileSync(MANIFEST_PATH, 'utf8');
    const allAudio = fs.readdirSync(AUDIO_DIR).filter(f => f.endsWith('.mp3') || f.endsWith('.wav'));
    
    // Build file list for manifest
    let audioFilesXml = allAudio.map(f => `      <file href="audio/${f}"/>`).join('\n');
    
    // Replace audio entries in manifest
    manifestContent = manifestContent.replace(/      <file href="audio\/[^"]+"\/>\n?/g, '');
    manifestContent = manifestContent.replace('    </resource>', audioFilesXml + '\n    </resource>');
    fs.writeFileSync(MANIFEST_PATH, manifestContent, 'utf8');
    console.log(`✅ Manifest updated with ${allAudio.length} audio assets.`);
  }

  // Step 6: Run full automated verification suite
  console.log('\nStep 6: Executing automated pre-flight verification suite...');
  cp.execSync('node scripts/validate.js', { cwd: ROOT_DIR, stdio: 'inherit' });

  // Step 7: Bundle production SCORM package
  console.log('\nStep 7: Bundling new verified SCORM 1.2 package...');
  cp.execSync('node scripts/package-scorm.js', { cwd: ROOT_DIR, stdio: 'inherit' });

  console.log('\n🎉 INGESTION COMPLETE: All data ingested, verified, and packaged with zero errors.');

} catch (err) {
  console.error('\n❌ INGESTION FAILED:', err.message);
  process.exit(1);
} finally {
  // Clean up temporary sandbox directory
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}
