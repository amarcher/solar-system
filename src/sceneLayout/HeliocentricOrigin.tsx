import { useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import { useFocusedSpace } from './useFocusedSpace';
export function HeliocentricOrigin({ children }: { children: ReactNode }) {
  const space = useFocusedSpace(), group = useRef<Group>(null);
  useFrame(() => { group.current?.position.copy(space.offset); }, -3);
  return <group ref={group}>{children}</group>;
}
