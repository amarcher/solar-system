export const benchmarkMode = new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search).get('benchmark');
export const benchmarkEnabled = benchmarkMode === '1' || benchmarkMode === 'orbit';
export const BENCHMARK_DATE = '2026-09-21T00:00:00Z';

export function summarizeFrames(frames: number[]) {
  const sorted = [...frames].sort((a, b) => a - b);
  const percentile = (p: number) => sorted[Math.max(0, Math.ceil(sorted.length * p) - 1)] ?? 0;
  return {
    frames: frames.length,
    medianMs: Number(percentile(0.5).toFixed(2)),
    p95Ms: Number(percentile(0.95).toFixed(2)),
    maxMs: Number((sorted.at(-1) ?? 0).toFixed(2)),
    over33Ms: frames.filter((ms) => ms > 33.34).length,
    over50Ms: frames.filter((ms) => ms > 50).length,
  };
}
