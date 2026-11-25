# ENAC GSEA Listening Comprehension Studio — AI Agent Guidelines & Architecture Rules

This repository houses the official **ATC & Aeronautical English Listening Comprehension Hub and SCORM 1.2 Package** for ENAC (École Nationale de l'Aviation Civile). It powers interactive aeronautical listening drills across authentic pilot-controller recordings, European ICAO ground operations, and routine & non-routine cockpit messages.

---

## 1. System Architecture & Invariant Rules (Permanent)

These architectural rules apply across all releases and must be strictly maintained during any modification or refactoring:

### A. SCORM 1.2 Strict Offline Self-Containment
- **Zero External Dependencies**: The package must run completely offline within LMS environments (ENAC Moodle / eCampus). Do not use external CDNs for scripts, fonts, icons, or stylesheets.
- **Asset Indexing**: All distributed assets (HTML, compiled CSS, local scripts, local images, audio files) must be tracked in `imsmanifest.xml`.
- **Packaging Integrity**: Every file listed in `imsmanifest.xml` must exist on disk. Run `npm test` and `npm run package` to automatically validate manifest integrity and bundle `ENAC_GSEA_Listening_Hub_Complete_SCORM12.zip`.

### B. Mandatory Automated Pre-Commit Headless Validation Invariant
- **Zero-Bug Enforcement**: No commit or push may EVER be executed without first running `npm test` (`node scripts/validate.js`) and verifying a 100% pass rate.
- **Headless Runtime View Test**: The test suite programmatically compiles and renders all 4 views (`Hub Home`, `Section 1: Real ATC`, `Section 2: ICAO Ground Ops`, `Section 3: Pilot Messages`) in a simulated headless DOM.
- **Strict Exception Halting**: Any unhandled `ReferenceError` (e.g. missing helper functions like `getFilteredPilotMessages`), `TypeError`, or syntax glitch halts the build immediately.

### C. Mandatory Pre-Implementation Response & Approval Gate
- **No Direct Changes Without Prior Response**: ALL questions, requests, or suggested modifications from the user require a thorough review, report, and recommendation from the AI assistant **BEFORE** implementing any changes.
- **Proceed / Ignore Prompt**: Every proposal or review must conclude with an explicit prompt asking the user whether to **proceed or ignore/adjust** (e.g. *"Please let me know if you would like me to proceed with these changes, or ignore/adjust."*).
- **Explicit Confirmation Required**: The assistant must wait for explicit approval (such as *"Proceed"*, *"Approved"*, the author shorthand code **`PX`**, or further instructions) before modifying any codebase files.
- **Tiered On-Demand Detail Protocol (Default Ultra-Concise)**:
  - **Level 1 (Default — Ultra-Concise)**: Default to brief, 1–3 line confirmations for routine actions, builds, backups, or approvals.
  - **Level 2 ("More detail" / "Expand" / "Detail")**: When requested, expand with exact file paths, size metrics, key differences, and summary tables.
  - **Level 3 ("Full detail" / "Deep dive")**: Full technical breakdowns, line diffs, architectural analyses, and test logs.

### D. Protected SCORM Ingestion Pipeline (`npm run ingest`)
- When the user provides a newly exported SCORM zip from their generator:
  - Run `npm run ingest <path-to-zip>` (`node scripts/ingest.js`).
  - The script extracts only the audio assets and drill DATA payload into protected layers.
  - It preserves the vetted 3-Stage UI/UX shell, textured picture banners, non-resetting audio event listeners, and responsive styling.
  - Automatically runs `npm test` and `npm run package` before reporting a clean diff.

### E. Static Deployment Guard (`.nojekyll` & GitHub Pages)
- **`.nojekyll` Invariant**: The `.nojekyll` file must permanently remain in the repository root to prevent GitHub Pages from invoking the default Jekyll builder (which chokes on JavaScript template brackets `{{...}}`).
- **Single-Step Remote Synchronization**: When instructed to commit or deploy, both `git commit` AND `git push origin main` must be executed together, ensuring GitHub Pages reflects changes immediately.

### F. Student Privacy & Zero PII Protocol
- **Strict Codebase Anonymity**: The Git codebase must NEVER contain real student names, PII, or credentials.
- **Zero Student PII in AI Chat**: Real student names must NEVER be entered or output in conversation history.

---

## 2. Standard Development & Verification Commands

```bash
# Run automated pre-commit test suite (validates all 4 views + assets + manifest)
npm test

# Bundle and verify SCORM 1.2 package zip
npm run package

# Safely ingest a newly dropped SCORM export zip
npm run ingest path/to/incoming.zip
```
