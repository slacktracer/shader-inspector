export const EXAMPLES = {
  uv: `// UV Coordinates — classic first shader
// fragCoord goes from (0,0) to iResolution (pixels)
// Dividing normalizes it to the 0.0 → 1.0 range

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  // Normalize to [0, 1]
  vec2 uv = fragCoord / iResolution.xy;

  // R = x position, G = y position, B = constant
  fragColor = vec4(uv.x, uv.y, 0.5, 1.0);
}`,

  circle: `// Signed Distance Function — Circle
// An SDF returns: negative = inside shape, positive = outside
// The distance drives smooth edges via smoothstep

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 uv = fragCoord / iResolution.xy;
  float aspect = iResolution.x / iResolution.y;

  // Center and correct aspect ratio
  vec2 p = (uv - 0.5) * vec2(aspect, 1.0);

  // Circle SDF: distance to edge (negative inside, positive outside)
  float d = length(p) - 0.3;

  // smoothstep creates a soft anti-aliased edge
  float edge = smoothstep(0.01, -0.01, d);

  vec3 bg  = vec3(0.05, 0.05, 0.10);
  vec3 col = vec3(0.20, 0.70, 1.00);
  vec3 res = mix(bg, col, edge);

  fragColor = vec4(res.rgb, 1.0);
}`,

  stripes: `// Stripes & Smoothstep
// fract() repeats 0→1 continuously, creating a periodic pattern
// smoothstep() gives an anti-aliased soft edge instead of a hard step

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 uv = fragCoord / iResolution.xy;

  // fract creates a sawtooth wave in x (repeating 0→1)
  float stripe = fract(uv.x * 10.0);

  // smoothstep: 0 below 0.45, 1 above 0.55, smooth in-between
  float mask = smoothstep(0.45, 0.55, stripe);

  vec3 a = vec3(0.05, 0.05, 0.15);
  vec3 b = vec3(0.90, 0.50, 0.10);
  vec3 res = mix(a, b, mask);

  fragColor = vec4(res.rgb, 1.0);
}`,

  plasma: `// Plasma Wave — iTime animation
// Try pressing ▶ Animate!
// Summing sine waves with different frequencies and phases makes plasma

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 uv = fragCoord / iResolution.xy;
  float aspect = iResolution.x / iResolution.y;
  vec2 p = vec2(uv.x * aspect, uv.y);

  // Four overlapping sine waves
  vec2 center = vec2(0.5 * aspect, 0.5);
  float dist = length(p - center);

  float v  = sin(p.x * 10.0 + iTime);
  v += sin(p.y * 10.0 + iTime * 0.70);
  v += sin((p.x + p.y) * 8.0 + iTime * 1.30);
  v += sin(dist * 12.0 - iTime * 2.0);
  v /= 4.0;

  // Map the scalar to an RGB color using phase-shifted sines
  float r = sin(v * 3.14159 + 0.000) * 0.5 + 0.5;
  float g = sin(v * 3.14159 + 2.094) * 0.5 + 0.5;
  float b = sin(v * 3.14159 + 4.189) * 0.5 + 0.5;

  fragColor = vec4(r, g, b, 1.0);
}`,

  checkerboard: `// Checkerboard — mod and floor
// floor(uv * N) gives integer cell indices
// Adding x and y indices and taking mod 2 gives a checkerboard

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 uv = fragCoord / iResolution.xy;

  // Scale uv to get 8×8 grid of cells
  vec2 grid = uv * 8.0;

  // mod(floor(x) + floor(y), 2) alternates 0/1 across cells
  float checker = mod(floor(grid.x) + floor(grid.y), 2.0);

  vec3 dark  = vec3(0.08, 0.08, 0.12);
  vec3 light = vec3(0.85, 0.85, 0.90);
  vec3 res = mix(dark, light, checker);

  fragColor = vec4(res.rgb, 1.0);
}`,

  gradient: `// Radial Gradient + vignette
// Measures distance from the center to create circular gradients
// Multiplying by a vignette darkens the edges

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 uv = fragCoord / iResolution.xy;
  float aspect = iResolution.x / iResolution.y;

  // Distance from center (aspect-corrected)
  vec2 p = vec2(uv.x * aspect, uv.y) - vec2(0.5 * aspect, 0.5);
  float dist = length(p);

  // Gradient: bright at center, dark at edges
  float t = smoothstep(0.60, 0.0, dist);

  vec3 inner = vec3(0.90, 0.40, 0.10);
  vec3 outer = vec3(0.05, 0.03, 0.10);
  vec3 col = mix(outer, inner, t);

  // Vignette: multiply by a radial falloff
  float vignette = smoothstep(0.70, 0.20, dist);
  col *= vignette;

  fragColor = vec4(col.rgb, 1.0);
}`,

  normals: `// Normal Map Visualization
// Approximates surface gradients and encodes them as RGB
// This is how normal maps work: store (dx, dy, up) as color

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 uv = fragCoord / iResolution.xy;
  float aspect = iResolution.x / iResolution.y;

  // Aspect-correct centered coordinates
  vec2 p = vec2((uv.x - 0.5) * aspect, uv.y - 0.5);

  // A bumpy height field: two sine waves multiplied
  float h  = sin(p.x * 12.0) * sin(p.y * 12.0) * 0.5 + 0.5;

  // Approximate partial derivatives (finite differences)
  float eps = 0.005;
  float hx = sin((p.x + eps) * 12.0) * sin(p.y * 12.0)        * 0.5 + 0.5;
  float hy = sin(p.x * 12.0)        * sin((p.y + eps) * 12.0) * 0.5 + 0.5;

  float dhdx = (hx - h) / eps;
  float dhdy = (hy - h) / eps;

  // Encode gradient as normal: remap -1..1 → 0..1 for display
  float nx = dhdx * 0.5 + 0.5;
  float ny = dhdy * 0.5 + 0.5;
  float nz = clamp(1.0, 0.0, 1.0);

  fragColor = vec4(nx, ny, nz, 1.0);
}`,
};
