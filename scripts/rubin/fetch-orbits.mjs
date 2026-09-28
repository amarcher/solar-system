#!/usr/bin/env node
// Refresh orbital elements for the curated Rubin asteroids from JPL SBDB.
//
//   node scripts/rubin/fetch-orbits.mjs              # refresh every entry
//   node scripts/rubin/fetch-orbits.mjs "2025 XY1"   # add or refresh one
//
// Keys are JPL search strings (designations). Curated names and blurbs live in
// src/data/rubinAsteroids.ts; this file only stores numbers JPL publishes.
import { readFile, writeFile } from 'node:fs/promises';

const OUT = new URL('../../src/data/rubinAsteroidOrbits.json', import.meta.url);
const SBDB = 'https://ssd-api.jpl.nasa.gov/sbdb.api';

const existing = JSON.parse(await readFile(OUT, 'utf8').catch(() => '{}'));
const designations = process.argv.length > 2 ? process.argv.slice(2) : Object.keys(existing);

const num = (value) => (value == null || value === '' ? null : Number(value));

for (const designation of designations) {
  const url = `${SBDB}?sstr=${encodeURIComponent(designation)}&phys-par=1&full-prec=1`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${designation}: HTTP ${res.status}`);
  const data = await res.json();
  if (!data.orbit) throw new Error(`${designation}: ${JSON.stringify(data).slice(0, 200)}`);

  const el = Object.fromEntries(data.orbit.elements.map((e) => [e.name, e.value]));
  const phys = Object.fromEntries((data.phys_par ?? []).map((p) => [p.name, p.value]));
  existing[designation] = {
    fullName: data.object.fullname.trim(),
    orbitClass: data.object.orbit_class?.code ?? null,
    neo: Boolean(data.object.neo),
    pha: Boolean(data.object.pha),
    epochJd: num(data.orbit.epoch),
    e: num(el.e),
    q: num(el.q),
    i: num(el.i),
    om: num(el.om),
    w: num(el.w),
    tpJd: num(el.tp),
    H: num(phys.H),
    diameterKm: num(phys.diameter),
    rotationHours: num(phys.rot_per),
    conditionCode: num(data.orbit.condition_code),
    arcDays: num(data.orbit.data_arc),
    retrieved: new Date().toISOString().slice(0, 10),
  };
  console.log(`${designation}: ${existing[designation].fullName} (${existing[designation].orbitClass})`);
  await new Promise((resolve) => setTimeout(resolve, 300));
}

await writeFile(OUT, `${JSON.stringify(existing, null, 2)}\n`);
