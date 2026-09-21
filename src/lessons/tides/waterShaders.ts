// Decorative capillary-like ripples sit on top of the unchanged equilibrium tide.
// They do not rotate its bulges or model ocean currents or tidal friction.
const rippleFunctions = `
  uniform float waterTime;
  float waveA(vec3 n) { return dot(n, vec3(0.81, 0.32, 0.49)) * 38.0 + waterTime * 0.75; }
  float waveB(vec3 n) { return dot(n, vec3(-0.28, 0.91, 0.30)) * 51.0 - waterTime * 0.58; }
  float ripple(vec3 n) { return 0.62 * sin(waveA(n)) + 0.38 * sin(waveB(n)); }
  vec3 rippleGradient(vec3 n) {
    return 0.62 * 38.0 * cos(waveA(n)) * vec3(0.81, 0.32, 0.49)
         + 0.38 * 51.0 * cos(waveB(n)) * vec3(-0.28, 0.91, 0.30);
  }
`;
export const shellVertex = `
  uniform vec3 moonDirection;
  uniform vec3 sunDirection;
  uniform vec2 strengths;
  varying vec3 surfaceNormal;
  varying vec3 surfaceDirection;
  varying vec3 eyeDirection;
  ${rippleFunctions}
  void main() {
    vec3 n = normalize(position);
    float m = dot(n, moonDirection);
    float s = dot(n, sunDirection);
    float potential = strengths.x * (3.0*m*m-1.0)/2.0 + strengths.y * (3.0*s*s-1.0)/2.0;
    // P2 still owns the large bulges. Wave displacement is at most 0.004 Earth radii.
    float radius = max(1.01, 1.18 + 0.22 * potential + 0.004 * ripple(n));
    vec3 gradient = 0.22 * 3.0 * (strengths.x * m * moonDirection + strengths.y * s * sunDirection)
                  + 0.004 * rippleGradient(n);
    vec3 tangentGradient = gradient - n * dot(n, gradient);
    vec3 displaced = n * radius;
    surfaceNormal = normalize(normalMatrix * normalize(n - tangentGradient / radius));
    surfaceDirection = n;
    vec4 viewPosition = modelViewMatrix * vec4(displaced, 1.0);
    eyeDirection = -viewPosition.xyz;
    gl_Position = projectionMatrix * viewPosition;
  }
`;
export const shellFragment = `
  uniform float opacityScale;
  varying vec3 surfaceNormal;
  varying vec3 surfaceDirection;
  varying vec3 eyeDirection;
  ${rippleFunctions}
  void main() {
    vec3 n = normalize(surfaceDirection);
    vec3 normal = normalize(surfaceNormal);
    vec3 view = normalize(eyeDirection);
    float rim = pow(1.0 - clamp(dot(normal, view), 0.0, 1.0), 2.2);
    // Thin intersecting highlights suggest rippling water without an opaque blue coating.
    float ribbons = pow(0.5 + 0.5 * sin(waveA(n) + 1.2 * sin(waveB(n))), 10.0);
    float fineWave = dot(n, vec3(0.42, -0.36, 0.83)) * 83.0 + waterTime * 0.46;
    float fine = pow(0.5 + 0.5 * sin(fineWave + 1.4 * ripple(n)), 14.0);
    float highlights = ribbons * 0.7 + fine * 0.3;
    vec3 color = mix(vec3(0.08, 0.35, 0.58), vec3(0.53, 0.86, 1.0), rim);
    color = mix(color, vec3(0.83, 0.96, 1.0), highlights * (0.28 + 0.45 * rim));
    float alpha = 0.10 + 0.46 * rim + 0.15 * highlights;
    gl_FragColor = vec4(color, alpha * opacityScale);
  }
`;
