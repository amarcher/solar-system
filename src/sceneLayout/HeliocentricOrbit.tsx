import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Vector3, type Group, type ShaderMaterial } from 'three';
import { useFocusedSpace } from './useFocusedSpace';
import { orbitReference } from './focusedSpace';
const vertex = `varying vec3 worldPosition;
void main() { vec4 world = modelMatrix * vec4(position, 1.0); worldPosition = world.xyz; gl_Position = projectionMatrix * viewMatrix * world; }`;
const fragment = `uniform vec3 focusPosition; uniform float clearance; uniform float opacity; varying vec3 worldPosition;
void main() {
 float fade = 1.0;
 if (clearance > 0.001) {
   vec3 toFocus = focusPosition - cameraPosition;
   vec3 ray = normalize(worldPosition - cameraPosition);
   float along = dot(toFocus, ray);
   // A distant foreground arc can project through the local system despite
   // never entering it in 3D. Protect that silhouette, not just its volume.
   if (length(toFocus) < clearance) fade = 0.0;
   else if (along > 0.0) fade = smoothstep(clearance, clearance * 1.25, length(toFocus - ray * along));
 }
 gl_FragColor = vec4(1.0, 1.0, 1.0, opacity * fade);
}`;
/** Scale only the path geometry. Bodies and local satellite groups are siblings. */
export function HeliocentricOrbit({ id, points, ringRadius }: { id: string; points: Float32Array; ringRadius?: number }) {
  const space = useFocusedSpace();
  const line = useRef<Group>(null), material = useRef<ShaderMaterial>(null);
  const uniforms = useMemo(() => ({ focusPosition: { value: new Vector3() }, clearance: { value: 0 }, opacity: { value: ringRadius === undefined ? 0.08 : 0.06 } }), [ringRadius]);
  useEffect(() => {
    const path = orbitReference(points); space.paths.set(id, path);
    return () => { if (space.paths.get(id) === path) space.paths.delete(id); };
  }, [space, id, points]);
  useFrame(() => {
    if (line.current) { line.current.position.copy(space.offset); line.current.scale.setScalar(space.scale); }
    if (material.current) {
      material.current.uniforms.focusPosition.value.copy(space.focusPosition);
      material.current.uniforms.clearance.value = space.clearance;
    }
  }, -3);
  const materialElement = <shaderMaterial ref={material} uniforms={uniforms} vertexShader={vertex} fragmentShader={fragment} transparent depthWrite={false} />;
  return <group ref={line}>
    {ringRadius === undefined ? <lineLoop>
      <bufferGeometry><bufferAttribute attach="attributes-position" args={[points, 3]} /></bufferGeometry>
      {materialElement}
    </lineLoop> : <mesh rotation-x={Math.PI / 2}>
      <ringGeometry args={[ringRadius - 0.02, ringRadius + 0.02, 128]} />
      {materialElement}
    </mesh>}
  </group>;
}
