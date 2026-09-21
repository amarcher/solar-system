/** Rotation only: all celestial layers sit at infinity, independent of camera translation. */
export const celestialVertex = /* glsl */ `
  varying vec3 vDirection;
  varying float vAltitude;
  void main() {
    vDirection = normalize(position);
    vec3 worldDirection = mat3(modelMatrix) * position;
    vAltitude = normalize(worldDirection).y;
    gl_Position = projectionMatrix * vec4(mat3(viewMatrix) * worldDirection, 1.0);
    gl_Position.z = gl_Position.w * 0.99999;
  }
`;

export const galaxyFragment = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uOpacity;
  uniform bool uHorizon;
  varying vec3 vDirection;
  varying float vAltitude;
  void main() {
    if (uHorizon && vAltitude < 0.0) discard;
    vec3 direction = normalize(vDirection);
    vec2 uv = vec2(atan(direction.z, direction.x) / 6.28318530718 + 0.5,
                   asin(clamp(direction.y, -1.0, 1.0)) / 3.14159265359 + 0.5);
    gl_FragColor = vec4(texture2D(uMap, uv).rgb, uOpacity);
    #include <colorspace_fragment>
  }
`;

export const constellationFragment = /* glsl */ `
  uniform float uOpacity;
  uniform bool uHorizon;
  varying float vAltitude;
  void main() {
    if (uHorizon && vAltitude < 0.0) discard;
    gl_FragColor = vec4(0.21, 0.39, 0.75, uOpacity);
    #include <colorspace_fragment>
  }
`;
