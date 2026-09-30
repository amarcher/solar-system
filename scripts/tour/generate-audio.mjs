#!/usr/bin/env node
// Record Stella's narrated tour lines with ElevenLabs text-to-speech.
//
//   ELEVENLABS_API_KEY=sk_... node scripts/tour/generate-audio.mjs          # every step
//   ELEVENLABS_API_KEY=sk_... node scripts/tour/generate-audio.mjs rubin    # one step
//
// The lines live in src/tour/tourScript.ts. The voice matches the live Stella
// agent so the tour and a conversation sound like the same guide.
import { mkdir, writeFile } from 'node:fs/promises';
import { TOUR_STEPS } from '../../src/tour/tourScript.ts';

const VOICE_ID = 'EXAVITQu4vr4xnSDxMaL';
const OUT_DIR = new URL('../../public/audio/tour/', import.meta.url);
const key = process.env.ELEVENLABS_API_KEY?.trim();
if (!key) throw new Error('Set ELEVENLABS_API_KEY');

const only = process.argv.slice(2);
const steps = only.length ? TOUR_STEPS.filter((s) => only.includes(s.id)) : TOUR_STEPS;
await mkdir(OUT_DIR, { recursive: true });

for (const step of steps) {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=mp3_44100_64`, {
    method: 'POST',
    headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: step.text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: { stability: 0.5, similarity_boost: 0.8, style: 0.3, speed: 1.0 },
    }),
  });
  if (!res.ok) throw new Error(`${step.id}: ${res.status} ${await res.text()}`);
  const audio = Buffer.from(await res.arrayBuffer());
  await writeFile(new URL(`${step.id}.mp3`, OUT_DIR), audio);
  console.log(`${step.id}.mp3  ${(audio.length / 1024).toFixed(0)} KB`);
}
