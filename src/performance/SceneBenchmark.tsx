import { useEffect, useRef } from 'react';
import type { WebGLRenderer } from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { benchmarkMode, summarizeFrames } from './benchmark';
import { useGraphicsQuality } from './useGraphicsQuality';
import { useAstronomy } from '../astronomy/useAstronomy';

const WARMUP_MS = 5000;
const SAMPLE_MS = 20000;

export function SceneBenchmark({ scenario, onReport }: { scenario: string; onReport: (report: string) => void }) {
  const { gl, size } = useThree();
  const { preference, tier } = useGraphicsQuality();
  const { timeRef, observer: location, rate } = useAstronomy();
  const sample = useRef({ start: 0, previous: 0, cold: [] as number[], warm: [] as number[], longTasks: 0, longTaskMs: 0, maxCalls: 0, maxTriangles: 0 });

  useEffect(() => {
    const started = performance.now();
    sample.current = { start: started, previous: 0, cold: [], warm: [], longTasks: 0, longTaskMs: 0, maxCalls: 0, maxTriangles: 0 };
    const restoreInfo = accumulateRenderInfo(gl);
    let interrupted = document.hidden;
    const onVisibility = () => { interrupted = true; };
    document.addEventListener('visibilitychange', onVisibility);
    let observer: PerformanceObserver | undefined;
    if (PerformanceObserver.supportedEntryTypes.includes('longtask')) {
      observer = new PerformanceObserver((entries) => {
        for (const entry of entries.getEntries()) {
          if (entry.startTime >= started && entry.startTime < started + WARMUP_MS + SAMPLE_MS) {
            sample.current.longTasks++;
            sample.current.longTaskMs += entry.duration;
          }
        }
      });
      observer.observe({ entryTypes: ['longtask'] });
    }
    const timer = window.setInterval(() => {
      const s = sample.current;
      const elapsed = performance.now() - s.start;
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      onReport(JSON.stringify({
        status: interrupted ? 'invalid: visibility changed' : elapsed >= WARMUP_MS + SAMPLE_MS ? 'complete' : elapsed < WARMUP_MS ? 'warming' : 'sampling',
        quality: { preference, tier }, simulationTime: new Date(timeRef.current).toISOString(), rate, observer: location,
        scenario, route: benchmarkMode, build: __BUILD_SHA__, userAgent: navigator.userAgent,
        viewport: [size.width, size.height], dpr: gl.getPixelRatio(),
        visibility: document.visibilityState,
        cold: summarizeFrames(s.cold), warm: summarizeFrames(s.warm),
        longTasks: s.longTasks, longTaskMs: Math.round(s.longTaskMs),
        peakDrawCalls: s.maxCalls, peakTriangles: s.maxTriangles,
        textures: gl.info.memory.textures, geometries: gl.info.memory.geometries,
        transferredBytes: resources.reduce((sum, r) => sum + r.transferSize, 0),
        resources: resources.length,
        note: 'Resource bytes are page-cumulative; cross-origin/cache entries may report zero. Resource counts are not VRAM bytes. Cold is the first 5s after scene mount; warm is the following 20s.',
      }, null, 2));
      if (elapsed >= WARMUP_MS + SAMPLE_MS) window.clearInterval(timer);
    }, 1000);
    return () => {
      restoreInfo();
      document.removeEventListener('visibilitychange', onVisibility);
      observer?.disconnect();
      window.clearInterval(timer);
    };
  }, [gl, scenario, onReport, size.width, size.height, preference, tier, timeRef, location, rate]);

  useFrame(() => {
    const now = performance.now();
    const s = sample.current;
    const elapsed = now - s.start;
    if (s.previous && elapsed < WARMUP_MS + SAMPLE_MS) {
      (elapsed < WARMUP_MS ? s.cold : s.warm).push(now - s.previous);
      s.maxCalls = Math.max(s.maxCalls, gl.info.render.calls);
      s.maxTriangles = Math.max(s.maxTriangles, gl.info.render.triangles);
    }
    s.previous = now;
    gl.info.reset();
  }, -100);

  return null;
}

function accumulateRenderInfo(gl: WebGLRenderer) {
  const previous = gl.info.autoReset;
  gl.info.autoReset = false;
  return () => { gl.info.autoReset = previous; };
}
