import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGraphicsQuality } from './useGraphicsQuality';

export function QualityMonitor() {
  const { reportFrameWindow } = useGraphicsQuality();
  const sample = useRef({ elapsed: 0, frames: [] as number[] });
  const resumed = useRef(false);
  useEffect(() => {
    const onVisibility = () => {
      sample.current = { elapsed: 0, frames: [] };
      resumed.current = true;
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);
  useFrame((_, delta) => {
    const current = sample.current;
    if (document.hidden || resumed.current) {
      current.elapsed = 0;
      current.frames = [];
      resumed.current = false;
      return;
    }
    current.elapsed += delta;
    current.frames.push(delta * 1000);
    if (current.elapsed < 2) return;
    current.frames.sort((a, b) => a - b);
    reportFrameWindow(current.frames[Math.ceil(current.frames.length * 0.95) - 1]);
    current.elapsed = 0;
    current.frames = [];
  });
  return null;
}
