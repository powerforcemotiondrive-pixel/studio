import fs from 'node:fs';
import { GoogleGenAI, Type } from '@google/genai';
import type { GapFillExercise, PilotMessageExercise, TranscriptLine } from '../types/hub.ts';

function createAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY is not configured. Add it in Settings > Secrets to enable audio transcription and AI audio generation.'
    );
  }
  return new GoogleGenAI({
    apiKey,
    apiVersion: 'v1beta',
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function formatGeminiError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  try {
    const parsed = JSON.parse(raw) as { error?: { code?: number; message?: string; status?: string } };
    if (parsed.error?.message) {
      return `Gemini API (${parsed.error.code ?? parsed.error.status ?? 'error'}): ${parsed.error.message}`;
    }
  } catch {
    // plain string
  }
  return raw;
}

function isTransientError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes('503') ||
    msg.includes('429') ||
    msg.includes('UNAVAILABLE') ||
    msg.includes('overloaded') ||
    msg.includes('high demand')
  );
}

async function withTransientRetry<T>(fn: () => Promise<T>, maxAttempts = 3): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!isTransientError(err) || attempt === maxAttempts) {
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, attempt * 1500));
    }
  }
  throw lastErr;
}

const WORD_DRILL_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    title: {
      type: Type.STRING,
      description: 'Short clear exercise title (3-7 words) describing the ATC clip for B1/B2 students.',
    },
    contextHint: {
      type: Type.STRING,
      description: 'One short, clear B1/B2 English sentence telling the student what to listen for.',
    },
    heardWords: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description:
        '6 to 8 exact aviation words or short 2-3 word phrases that LITERALLY appear in the transcript (e.g., "runway two seven", "maintain", "emergency", "squawk", "descend").',
    },
    distractorWords: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description:
        '5 to 6 plausible aviation words or short phrases that DO NOT appear anywhere in the transcript (good B1/B2 listening distractors).',
    },
    transcriptLines: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          speaker: {
            type: Type.STRING,
            description: 'Must be ATC, PILOT, or OTHER.',
          },
          text: {
            type: Type.STRING,
            description: 'Clean, accurate radio utterance text.',
          },
        },
        required: ['speaker', 'text'],
      },
    },
  },
  required: ['title', 'contextHint', 'heardWords', 'distractorWords', 'transcriptLines'],
};

function normalizeMatchText(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

export async function transcribeAndBuildWordDrill(params: {
  filePath: string;
  mimeType: string;
  originalFilename: string;
  fallbackTitle: string;
}): Promise<{
  title: string;
  contextHint: string;
  heardWords: string[];
  distractorWords: string[];
  transcript: string;
  transcriptLines: TranscriptLine[];
}> {
  const ai = createAiClient();
  const stat = fs.statSync(params.filePath);
  // Keep inline audio payload safely under 12 MB
  const maxInlineBytes = 12 * 1024 * 1024;
  const rawBuffer = fs.readFileSync(params.filePath);
  const audioBuffer =
    stat.size > maxInlineBytes ? rawBuffer.subarray(0, maxInlineBytes) : rawBuffer;
  const base64Audio = audioBuffer.toString('base64');

  // Step 1: Transcribe the real pilot-controller clip with gemini-3.5-transcribe
  let rawTranscript = '';
  try {
    const trResp = await withTransientRetry(() =>
      ai.models.generateContent({
        model: 'gemini-3.5-transcribe',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: params.mimeType,
                data: base64Audio,
              },
            },
            {
              text:
                'Transcribe this real pilot–air traffic control radio clip accurately in English. Label each speaker turn as ATC: or PILOT:. Keep callsigns, runway numbers, altitudes, headings, and key aviation words faithful to what is spoken.',
            },
          ],
        },
      })
    );
    rawTranscript = (trResp.text ?? '').trim();
  } catch (err) {
    throw new Error(formatGeminiError(err));
  }

  if (!rawTranscript) {
    throw new Error('Audio transcription returned empty text for this clip.');
  }

  // Step 2: Build B1/B2 ENAC "Select Words You Heard" drill JSON
  const prompt = `Build a B1/B2 aviation English listening comprehension drill for ENAC GSEA students from this real ATC radio transcript.
Original clip filename: ${params.originalFilename}

Transcript:
${rawTranscript}

Rules:
1. "heardWords": Pick 6 to 8 important aviation words or short phrases (1 to 3 words each) that LITERALLY appear in the transcript above. Match the exact spelling used in transcriptLines.
2. "distractorWords": Invent 5 to 6 realistic aviation distractors (1 to 3 words each) that DO NOT appear anywhere in the transcript (e.g., a different runway, opposite climb/descend verb, or related ATC term not spoken).
3. "transcriptLines": Clean up the transcript into clear alternating ATC / PILOT speaker lines faithful to what was actually spoken.
4. "contextHint": Write one clear, encouraging B1/B2 instruction hint (max 18 words).`;

  const buildStructReq = (model: string) => ({
    model,
    contents: prompt,
    config: {
      systemInstruction:
        'You are an ENAC aviation English instructor designing clear, fair B1/B2 listening comprehension exercises for GSEA students.',
      responseMimeType: 'application/json',
      responseSchema: WORD_DRILL_SCHEMA,
    },
  });

  let structResp;
  try {
    structResp = await withTransientRetry(() => ai.models.generateContent(buildStructReq('gemini-4-hydrogen')), 2);
  } catch (err) {
    if (!isTransientError(err)) {
      throw new Error(formatGeminiError(err));
    }
    try {
      structResp = await withTransientRetry(
        () => ai.models.generateContent(buildStructReq('gemini-3.1-flash-lite')),
        2
      );
    } catch (fallbackErr) {
      throw new Error(formatGeminiError(fallbackErr));
    }
  }

  const parsed = JSON.parse((structResp.text ?? '{}').trim()) as {
    title?: string;
    contextHint?: string;
    heardWords?: unknown;
    distractorWords?: unknown;
    transcriptLines?: unknown;
  };

  const transcriptLines: TranscriptLine[] = Array.isArray(parsed.transcriptLines)
    ? parsed.transcriptLines
        .map((row) => {
          const r = row as Record<string, unknown>;
          const sp = String(r.speaker ?? 'ATC').toUpperCase();
          const speaker: TranscriptLine['speaker'] =
            sp === 'PILOT' ? 'PILOT' : sp === 'OTHER' ? 'OTHER' : 'ATC';
          return {
            speaker,
            text: String(r.text ?? '').trim(),
          };
        })
        .filter((l) => l.text.length > 0)
    : [{ speaker: 'ATC', text: rawTranscript }];

  const fullTranscriptText = transcriptLines.map((l) => `${l.speaker}: ${l.text}`).join('\n');
  const normTranscript = ` ${normalizeMatchText(fullTranscriptText)} `;

  // Validate heardWords actually appear in the transcript and distractorWords do NOT
  const seenWords = new Set<string>();
  const rawHeard = Array.isArray(parsed.heardWords)
    ? parsed.heardWords.map((w) => String(w).trim()).filter(Boolean)
    : [];

  const heardWords: string[] = [];
  for (const w of rawHeard) {
    const norm = normalizeMatchText(w);
    if (!norm || seenWords.has(norm)) continue;
    if (normTranscript.includes(norm)) {
      seenWords.add(norm);
      heardWords.push(w);
    }
  }

  // Fallback if strict check filtered too aggressively
  if (heardWords.length < 3) {
    for (const w of rawHeard) {
      const norm = normalizeMatchText(w);
      if (!norm || seenWords.has(norm)) continue;
      seenWords.add(norm);
      heardWords.push(w);
      if (heardWords.length >= 6) break;
    }
  }

  const rawDistractors = Array.isArray(parsed.distractorWords)
    ? parsed.distractorWords.map((w) => String(w).trim()).filter(Boolean)
    : [];
  const distractorWords: string[] = [];
  for (const w of rawDistractors) {
    const norm = normalizeMatchText(w);
    if (!norm || seenWords.has(norm)) continue;
    if (!normTranscript.includes(norm)) {
      seenWords.add(norm);
      distractorWords.push(w);
    }
  }

  // Ensure at least 4 distractors exist
  const backupDistractors = [
    'holding pattern',
    'pushback approved',
    'runway vacated',
    'squawk ident',
    'go around',
    'transition level',
    'wind shear',
    'line up and wait',
  ];
  for (const backup of backupDistractors) {
    if (distractorWords.length >= 5) break;
    const norm = normalizeMatchText(backup);
    if (!seenWords.has(norm) && !normTranscript.includes(norm)) {
      seenWords.add(norm);
      distractorWords.push(backup);
    }
  }

  return {
    title: parsed.title?.trim() || params.fallbackTitle,
    contextHint:
      parsed.contextHint?.trim() ||
      'Listen carefully to the radio exchange and select every word or phrase you hear.',
    heardWords: heardWords.slice(0, 8),
    distractorWords: distractorWords.slice(0, 6),
    transcript: fullTranscriptText,
    transcriptLines,
  };
}

/**
 * Applies authentic aviation VHF AM radio audio processing directly to 12kHz mono PCM samples:
 * - 340 Hz 2nd-order Butterworth high-pass + 2950 Hz 2nd-order Butterworth low-pass (classic VHF voice band)
 * - Gentle soft-clipping AGC so digits and callsigns remain evenly audible
 * - Subtle band-limited VHF carrier static hiss + brief mic-key squelch at start/end
 * Baked directly into the WAV so live playback AND offline Moodle SCORM packages sound like real VHF radio by default.
 */
function applyVhfRadioDsp(
  samples: Float32Array,
  sampleRate: number,
  seed: number,
  profile: 'ground_vhf' | 'cockpit_distorted' = 'ground_vhf'
): Float32Array {
  const n = samples.length;
  if (n === 0) return samples;

  // Deterministic lightweight PRNG for natural band-limited static hiss
  let rng = (seed ^ 0x9e3779b9) >>> 0;
  const nextNoise = (): number => {
    rng = (Math.imul(rng, 1664525) + 1013904223) >>> 0;
    return (rng / 0xffffffff) * 2 - 1;
  };

  // Helper: 2nd-order biquad filter coefficients
  const makeBiquad = (type: 'highpass' | 'lowpass' | 'peaking', freq: number, q: number, gainDb = 0) => {
    const w0 = (2 * Math.PI * freq) / sampleRate;
    const cosW0 = Math.cos(w0);
    const sinW0 = Math.sin(w0);
    const alpha = sinW0 / (2 * q);
    let b0 = 1, b1 = 0, b2 = 0, a0 = 1, a1 = 0, a2 = 0;

    if (type === 'highpass') {
      b0 = (1 + cosW0) / 2;
      b1 = -(1 + cosW0);
      b2 = (1 + cosW0) / 2;
      a0 = 1 + alpha;
      a1 = -2 * cosW0;
      a2 = 1 - alpha;
    } else if (type === 'lowpass') {
      b0 = (1 - cosW0) / 2;
      b1 = 1 - cosW0;
      b2 = (1 - cosW0) / 2;
      a0 = 1 + alpha;
      a1 = -2 * cosW0;
      a2 = 1 - alpha;
    } else {
      const A = Math.pow(10, gainDb / 40);
      b0 = 1 + alpha * A;
      b1 = -2 * cosW0;
      b2 = 1 - alpha * A;
      a0 = 1 + alpha / A;
      a1 = -2 * cosW0;
      a2 = 1 - alpha / A;
    }

    return {
      b0: b0 / a0,
      b1: b1 / a0,
      b2: b2 / a0,
      a1: a1 / a0,
      a2: a2 / a0,
      x1: 0,
      x2: 0,
      y1: 0,
      y2: 0,
    };
  };

  const runFilter = (f: ReturnType<typeof makeBiquad>, x: number): number => {
    const y = f.b0 * x + f.b1 * f.x1 + f.b2 * f.x2 - f.a1 * f.y1 - f.a2 * f.y2;
    f.x2 = f.x1;
    f.x1 = x;
    f.y2 = f.y1;
    f.y1 = y;
    return y;
  };

  const isCockpit = profile === 'cockpit_distorted';

  // Voice path: tighter aviation AM band + sharper harmonic presence for cockpit transmissions
  const voiceHp = makeBiquad('highpass', isCockpit ? 370 : 340, 0.75);
  const voiceLp = makeBiquad('lowpass', isCockpit ? 2700 : 2950, 0.8);
  const voiceMid = makeBiquad('peaking', isCockpit ? 1550 : 1450, 1.2, isCockpit ? 4.2 : 3.2);

  // Noise path: band-limited VHF receiver static
  const noiseHp = makeBiquad('highpass', 420, 0.707);
  const noiseLp = makeBiquad('lowpass', isCockpit ? 2900 : 3100, 0.707);

  const out = new Float32Array(n);
  const squelchLen = Math.min(Math.floor(sampleRate * (isCockpit ? 0.065 : 0.045)), Math.floor(n / 6));
  const drive = isCockpit ? 2.15 : 1.45;
  const postGain = isCockpit ? 0.78 : 0.84;
  const staticLevel = isCockpit ? 0.068 : 0.046;
  const crackleThresh = isCockpit ? 0.992 : 0.9965;

  for (let i = 0; i < n; i++) {
    // 1. Bandpass + realistic VHF AM transmitter saturation / distortion
    let v = runFilter(voiceHp, samples[i]);
    v = runFilter(voiceLp, v);
    v = runFilter(voiceMid, v);
    // Asymmetric mild clipping on cockpit VHF mic for real-world radio grit
    const driven = v * drive;
    v = Math.tanh(driven + (isCockpit ? 0.08 * driven * driven : 0)) * postGain;

    // 2. Band-limited VHF background static + subtle RF crackle & airborne cockpit hum
    const rawStatic = nextNoise();
    const filteredStatic = runFilter(noiseLp, runFilter(noiseHp, rawStatic));
    const microCrackle = Math.abs(rawStatic) > crackleThresh ? rawStatic * (isCockpit ? 0.14 : 0.09) : 0;
    const cabinHum = isCockpit
      ? Math.sin((2 * Math.PI * 400 * i) / sampleRate) * 0.008 +
        Math.sin((2 * Math.PI * 195 * i) / sampleRate) * 0.006
      : 0;

    // Subtle slow RF fade modulation on airborne long-range cockpit transmissions
    const rfFade = isCockpit ? 0.92 + 0.08 * Math.sin((2 * Math.PI * 0.65 * i) / sampleRate) : 1;

    // Brief PTT squelch tail at start & end of transmission
    let squelchBoost = 1;
    if (i < squelchLen) {
      squelchBoost = 1 + (1 - i / squelchLen) * (isCockpit ? 2.9 : 2.2);
    } else if (i > n - squelchLen) {
      squelchBoost = 1 + ((i - (n - squelchLen)) / squelchLen) * (isCockpit ? 3.2 : 2.4);
    }

    const staticBed = filteredStatic * staticLevel * squelchBoost + microCrackle + cabinHum;
    const mixed = Math.max(-0.96, Math.min(0.96, v * rfFade + staticBed));
    out[i] = mixed;
  }

  return out;
}

/**
 * Downsamples a 24kHz mono 16-bit PCM WAV buffer by 2x to 12kHz mono 16-bit WAV
 * and applies authentic aviation VHF AM radio + background static processing.
 */
function downsampleWav24kTo12kWithVhf(
  wavBuf: Buffer,
  seed: number,
  profile: 'ground_vhf' | 'cockpit_distorted' = 'ground_vhf'
): Buffer {
  if (wavBuf.length < 48 || wavBuf.toString('ascii', 0, 4) !== 'RIFF') {
    return wavBuf;
  }
  const sampleRate = wavBuf.readUInt32LE(24);
  const bitsPerSample = wavBuf.readUInt16LE(34);
  const channels = wavBuf.readUInt16LE(22);
  if ((sampleRate !== 24000 && sampleRate !== 12000) || bitsPerSample !== 16 || channels !== 1) {
    return wavBuf;
  }

  // Locate 'data' chunk offset safely
  let pos = 12;
  let dataOffset = -1;
  let dataSize = 0;
  while (pos + 8 <= wavBuf.length) {
    const chunkId = wavBuf.toString('ascii', pos, pos + 4);
    const chunkSize = wavBuf.readUInt32LE(pos + 4);
    if (chunkId === 'data') {
      dataOffset = pos + 8;
      dataSize = Math.min(chunkSize, wavBuf.length - dataOffset);
      break;
    }
    pos += 8 + chunkSize;
  }
  if (dataOffset < 0 || dataSize < 4) return wavBuf;

  const inSamples = Math.floor(dataSize / 2);
  const decimate = sampleRate === 24000 ? 2 : 1;
  const outSamples = Math.floor(inSamples / decimate);
  const floatSamples = new Float32Array(outSamples);

  for (let i = 0; i < outSamples; i++) {
    if (decimate === 2) {
      const s1 = wavBuf.readInt16LE(dataOffset + i * 4);
      const s2 = wavBuf.readInt16LE(dataOffset + i * 4 + 2);
      floatSamples[i] = (s1 + s2) / (2 * 32768);
    } else {
      floatSamples[i] = wavBuf.readInt16LE(dataOffset + i * 2) / 32768;
    }
  }

  const vhfSamples = applyVhfRadioDsp(floatSamples, 12000, seed, profile);
  const outDataSize = outSamples * 2;
  const out = Buffer.alloc(44 + outDataSize);

  // Write clean 44-byte RIFF/WAVE header at 12000 Hz mono 16-bit
  out.write('RIFF', 0, 'ascii');
  out.writeUInt32LE(36 + outDataSize, 4);
  out.write('WAVE', 8, 'ascii');
  out.write('fmt ', 12, 'ascii');
  out.writeUInt32LE(16, 16);
  out.writeUInt16LE(1, 20);
  out.writeUInt16LE(1, 22);
  out.writeUInt32LE(12000, 24);
  out.writeUInt32LE(24000, 28);
  out.writeUInt16LE(2, 32);
  out.writeUInt16LE(16, 34);
  out.write('data', 36, 'ascii');
  out.writeUInt32LE(outDataSize, 40);

  for (let i = 0; i < outSamples; i++) {
    const val = Math.max(-32768, Math.min(32767, Math.round(vhfSamples[i] * 32767)));
    out.writeInt16LE(val, 44 + i * 2);
  }
  return out;
}

export async function synthesizeGapFillWav(
  exercise: GapFillExercise,
  destPath: string
): Promise<{ fileSizeBytes: number }> {
  const ai = createAiClient();
  let base64Audio: string | undefined;

  if (exercise.voiceRole === 'atc_pilot_exchange' && exercise.spokenScript.includes('Controller:')) {
    const pilotIdx = exercise.spokenScript.indexOf('Pilot:');
    const ctrlIdx = exercise.spokenScript.indexOf('Controller:');
    const pilotLine =
      pilotIdx >= 0 && ctrlIdx > pilotIdx
        ? exercise.spokenScript.slice(pilotIdx + 6, ctrlIdx).trim()
        : '';
    const ctrlLine = ctrlIdx >= 0 ? exercise.spokenScript.slice(ctrlIdx + 11).trim() : exercise.spokenScript;

    try {
      const resp = await withTransientRetry(
        () =>
          ai.models.generateContent({
            model: 'gemini-3.8-flash-tts',
            contents: [
              {
                role: 'user',
                parts: [
                  ...(pilotLine
                    ? [
                        {
                          text: `Pilot: ${pilotLine}`,
                          speechMetadata: {
                            speaker: 'Pilot',
                            style: 'Clear European commercial pilot speaking over VHF aircraft radio, steady B1/B2 pace',
                          },
                        },
                      ]
                    : []),
                  {
                    text: `Controller: ${ctrlLine}`,
                    speechMetadata: {
                      speaker: 'Controller',
                      style: 'Clear, professional European ICAO air traffic controller over VHF radio, crisp enunciation',
                    },
                  },
                ],
              },
            ],
            config: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                multiSpeakerVoiceConfig: {
                  speakerVoiceConfigs: [
                    {
                      speaker: 'Controller',
                      voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Charon' } },
                    },
                    {
                      speaker: 'Pilot',
                      voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } },
                    },
                  ],
                },
              },
            },
          }),
        2
      );
      base64Audio = resp.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    } catch (err) {
      if (!isTransientError(err)) {
        throw new Error(formatGeminiError(err));
      }
      // Fall through to gemini-3.8-flash-lite-tts below
    }
  }

  if (!base64Audio) {
    const cleanSpeechText = exercise.spokenScript
      .replace(/\bPilot:\s*/g, '')
      .replace(/\bController:\s*/g, ' ... ');
    try {
      const liteResp = await withTransientRetry(() =>
        ai.models.generateContent({
          model: 'gemini-3.8-flash-lite-tts',
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: cleanSpeechText,
                  speechMetadata: {
                    style:
                      exercise.category === 'atis'
                        ? 'Clear, measured European airport ATIS automated broadcast voice, crisp pronunciation of numbers and NATO alphabet'
                        : 'Clear, professional European ICAO air traffic controller speaking on VHF radio at a moderate student-friendly pace',
                  },
                },
              ],
            },
          ],
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: exercise.category === 'atis' ? 'Kore' : 'Charon',
                },
              },
            },
          },
        })
      );
      base64Audio = liteResp.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    } catch (err) {
      throw new Error(formatGeminiError(err));
    }
  }

  if (!base64Audio) {
    throw new Error('Gemini TTS did not return audio data.');
  }

  const rawWav = Buffer.from(base64Audio, 'base64');
  let seed = 0x12345678;
  for (let i = 0; i < exercise.id.length; i++) {
    seed = ((seed << 5) - seed + exercise.id.charCodeAt(i)) | 0;
  }
  const compactWav = downsampleWav24kTo12kWithVhf(rawWav, seed, 'ground_vhf');
  fs.writeFileSync(destPath, compactWav);
  return { fileSizeBytes: compactWav.length };
}

export async function synthesizePilotMessageWav(
  exercise: PilotMessageExercise,
  destPath: string
): Promise<{ fileSizeBytes: number }> {
  const ai = createAiClient();
  let base64Audio: string | undefined;

  const stylePrompt =
    exercise.messageType === 'non_routine'
      ? 'Commercial airline pilot speaking urgently but clearly and calmly over airborne cockpit VHF radio, crisp European aviation English'
      : 'Commercial airline pilot making a standard routine position or request call over airborne cockpit VHF radio, clear European aviation English';

  try {
    const resp = await withTransientRetry(() =>
      ai.models.generateContent({
        model: 'gemini-3.8-flash-lite-tts',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: exercise.spokenScript,
                speechMetadata: {
                  style: stylePrompt,
                },
              },
            ],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: exercise.voiceName,
              },
            },
          },
        },
      })
    );
    base64Audio = resp.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  } catch (err) {
    throw new Error(formatGeminiError(err));
  }

  if (!base64Audio) {
    throw new Error('Gemini TTS did not return pilot message audio data.');
  }

  const rawWav = Buffer.from(base64Audio, 'base64');
  let seed = 0x51a7c309;
  for (let i = 0; i < exercise.id.length; i++) {
    seed = ((seed << 5) - seed + exercise.id.charCodeAt(i)) | 0;
  }
  const distortedWav = downsampleWav24kTo12kWithVhf(rawWav, seed, 'cockpit_distorted');
  fs.writeFileSync(destPath, distortedWav);
  return { fileSizeBytes: distortedWav.length };
}
