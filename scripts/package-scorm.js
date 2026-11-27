#!/usr/bin/env node
/**
 * Automated SCORM 1.2 Packaging Script for ENAC GSEA Studio
 * Automatically runs validation before bundling.
 */

const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const ZIP_NAME = 'ENAC_GSEA_Listening_Hub_Complete_SCORM12.zip';
const ZIP_PATH = path.join(ROOT_DIR, ZIP_NAME);

console.log('📦 Starting SCORM 1.2 Packaging Process...');

// 1. Run full validation suite first
console.log('Step 1: Running validation suite...');
try {
  cp.execSync('node scripts/validate.js', { cwd: ROOT_DIR, stdio: 'inherit' });
} catch (err) {
  console.error('\n❌ Packaging halted: Validation tests failed.');
  process.exit(1);
}

// 2. Package the SCORM zip
console.log('\nStep 2: Bundling SCORM 1.2 zip archive...');
try {
  // Zip assets, audio, imsmanifest.xml, index.html
  const cmd = `zip -r -q -FS "${ZIP_PATH}" index.html imsmanifest.xml .nojekyll assets/ audio/ -x "*.DS_Store"`;
  cp.execSync(cmd, { cwd: ROOT_DIR });
  
  const stats = fs.statSync(ZIP_PATH);
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
  console.log(`✅ Successfully bundled: ${ZIP_NAME} (${sizeMB} MB)`);
} catch (err) {
  console.error('❌ Error packaging zip:', err.message);
  process.exit(1);
}

console.log('🎉 Packaging complete and verified.');
