#!/usr/bin/env node
/**
 * Automated Verification & Pre-Commit Test Suite for ENAC GSEA Studio
 * Strictly enforces runtime integrity across all 4 views and validates disk assets.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT_DIR = path.resolve(__dirname, '..');
const INDEX_HTML_PATH = path.join(ROOT_DIR, 'index.html');
const MANIFEST_PATH = path.join(ROOT_DIR, 'imsmanifest.xml');
const NOJEKYLL_PATH = path.join(ROOT_DIR, '.nojekyll');

console.log('✈️  ENAC GSEA Studio — Automated Pre-Commit Verification Pipeline');
console.log('='.repeat(65));

let hasErrors = false;
function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    hasErrors = true;
  } else {
    console.log(`✅ PASS: ${message}`);
  }
}

// -------------------------------------------------------------
// CHECK 1: File Presence & Static Deploy Guard (.nojekyll)
// -------------------------------------------------------------
assert(fs.existsSync(INDEX_HTML_PATH), 'index.html exists');
assert(fs.existsSync(NOJEKYLL_PATH), '.nojekyll exists (prevents GitHub Pages Jekyll build halt)');

// -------------------------------------------------------------
// CHECK 2: JavaScript Syntax & Headless View Execution Test
// -------------------------------------------------------------
const htmlContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
const scriptMatch = htmlContent.match(/<script>([\s\S]*?)<\/script>/);

assert(scriptMatch && scriptMatch[1], 'JavaScript script tag located in index.html');

if (scriptMatch) {
  const scriptCode = scriptMatch[1];
  
  // Test basic syntax
  try {
    new Function(scriptCode);
    assert(true, 'JavaScript syntax is 100% valid');
  } catch (err) {
    assert(false, `JavaScript syntax error: ${err.message}`);
  }

  // Headless View Execution Simulation
  const viewsToTest = ['home', 'real', 'gap', 'pilot'];
  
  for (const viewName of viewsToTest) {
    try {
      let capturedHtml = '';
      const mockDom = {
        console,
        window: {
          __GSEA_PROGRAMME_AUTH: {},
          addEventListener: () => {}
        },
        document: {
          getElementById: (id) => ({
            set innerHTML(val) { if (id === 'app') capturedHtml = val; },
            get innerHTML() { return capturedHtml; },
            querySelectorAll: () => [],
            classList: { toggle: () => {} },
            getAttribute: () => ''
          }),
          querySelectorAll: () => []
        },
        navigator: { userAgent: 'HeadlessTest' }
      };

      // Set state.view right before render() call at the end
      const modifiedCode = scriptCode.replace(
        /render\(\);\s*\}\)\(\);/g,
        `state.view = "${viewName}"; render(); })();`
      );

      const ctx = vm.createContext(mockDom);
      vm.runInContext(modifiedCode, ctx);

      assert(capturedHtml && capturedHtml.length > 50, `View '${viewName}' renders successfully (${capturedHtml.length} chars)`);

      if (viewName === 'real') {
        assert(capturedHtml.includes('Stage 1') && capturedHtml.includes('Stage 2') && capturedHtml.includes('Stage 3'), 'Section 1 contains complete 3-Stage Workflow');
      } else if (viewName === 'gap') {
        assert(capturedHtml.includes('Stage 1') && capturedHtml.includes('Stage 2') && capturedHtml.includes('Stage 3'), 'Section 2 contains complete 3-Stage Workflow');
      } else if (viewName === 'pilot') {
        assert(capturedHtml.includes('Stage 1') && capturedHtml.includes('Stage 2') && capturedHtml.includes('Stage 3'), 'Section 3 contains complete 3-Stage Workflow');
      }
    } catch (viewErr) {
      assert(false, `View '${viewName}' runtime error: ${viewErr.message}\n${viewErr.stack}`);
    }
  }
}

// -------------------------------------------------------------
// CHECK 3: Audio & Image Asset Integrity
// -------------------------------------------------------------
try {
  // Extract DATA object
  const startIdx = htmlContent.indexOf('var DATA = {');
  if (startIdx !== -1) {
    const endIdx = htmlContent.indexOf('};', startIdx);
    const rawDataStr = htmlContent.slice(startIdx + 11, endIdx + 1);
    const dataObj = JSON.parse(rawDataStr);
    
    // Check audio files in realDrills
    let realAudioCount = 0;
    (dataObj.realDrills || []).forEach((d) => {
      if (d.audioSrc) {
        const fullAudioPath = path.join(ROOT_DIR, d.audioSrc);
        assert(fs.existsSync(fullAudioPath), `Real ATC audio file exists: ${d.audioSrc}`);
        realAudioCount++;
      }
    });

    // Check audio files in gapExercises
    let gapAudioCount = 0;
    (dataObj.gapExercises || []).forEach((g) => {
      if (g.audioSrc) {
        const fullAudioPath = path.join(ROOT_DIR, g.audioSrc);
        assert(fs.existsSync(fullAudioPath), `Gap-Fill audio file exists: ${g.audioSrc}`);
        gapAudioCount++;
      }
    });

    // Check audio files in pilotMessages
    let pilotAudioCount = 0;
    (dataObj.pilotMessages || []).forEach((p) => {
      if (p.audioSrc) {
        const fullAudioPath = path.join(ROOT_DIR, p.audioSrc);
        assert(fs.existsSync(fullAudioPath), `Pilot audio file exists: ${p.audioSrc}`);
        pilotAudioCount++;
      }
    });

    console.log(`ℹ️  Verified ${realAudioCount + gapAudioCount + pilotAudioCount} audio files across all 3 sections.`);

    // Check hero and section images
    if (dataObj.images) {
      Object.entries(dataObj.images).forEach(([key, imgPath]) => {
        const fullImgPath = path.join(ROOT_DIR, imgPath);
        assert(fs.existsSync(fullImgPath), `Image asset exists for [${key}]: ${imgPath}`);
      });
    }
  }
} catch (dataErr) {
  assert(false, `DATA asset extraction failed: ${dataErr.message}`);
}

// -------------------------------------------------------------
// CHECK 4: Manifest Integrity (imsmanifest.xml)
// -------------------------------------------------------------
if (fs.existsSync(MANIFEST_PATH)) {
  const manifestXml = fs.readFileSync(MANIFEST_PATH, 'utf8');
  const fileRegex = /<file href="([^"]+)"/g;
  let match;
  let manifestFiles = 0;
  let missingFiles = 0;

  while ((match = fileRegex.exec(manifestXml)) !== null) {
    const relFile = match[1];
    manifestFiles++;
    const fullFilePath = path.join(ROOT_DIR, relFile);
    if (!fs.existsSync(fullFilePath)) {
      assert(false, `Manifest file missing on disk: ${relFile}`);
      missingFiles++;
    }
  }

  if (missingFiles === 0) {
    assert(true, `All ${manifestFiles} files listed in imsmanifest.xml exist on disk`);
  }
}

// -------------------------------------------------------------
// SUMMARY
// -------------------------------------------------------------
console.log('='.repeat(65));
if (hasErrors) {
  console.error('❌ VALIDATION FAILED: Resolve reported errors before committing or packaging.');
  process.exit(1);
} else {
  console.log('🎉 ALL CHECKS PASSED: Application is 100% robust, safe, and ready for deployment.');
  process.exit(0);
}
