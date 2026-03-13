export const EXAMPLES = {
  uv: `// UV Coordinates — classic first shader
// fragCoord goes from (0,0) to (iResolution)
// We normalize it to 0.0 → 1.0

let uv = vdiv(fragCoord, iResolution);

debug("uv", uv);
debug("uv.x", uv.x);

// R=x, G=y, B=0, A=1
return vec4(uv.x, uv.y, 0.0, 1.0);`,

  circle: `// Signed Distance Function — Circle
// SDF returns: negative = inside, positive = outside

let uv = vdiv(fragCoord, iResolution);
let aspect = iResolution.x / iResolution.y;

// Center UV and fix aspect ratio
let p = vsub(uv, vec2(0.5));
p = vec2(p.x * aspect, p.y);

debug("centered p", p);

// Circle SDF: d < 0 means we're inside
let d = length(p) - 0.3;

debug("SDF distance d", d);

// Smooth edge with smoothstep
let edge = smoothstep(0.01, -0.01, d);

debug("edge value", edge);

let col = mix(
  vec3(0.05, 0.05, 0.1),   // background
  vec3(0.2, 0.7, 1.0),     // circle color
  edge
);

return vec4(col.x, col.y, col.z, 1.0);`,

  stripes: `// Stripes & Smoothstep
// Shows how smoothstep creates anti-aliased edges

let uv = vdiv(fragCoord, iResolution);

// Create repeating pattern
let stripes = mod(uv.x * 10.0, 1.0);

debug("raw stripe value", stripes);

// Hard edge (aliased)
//let mask = step(0.5, stripes);

// Soft edge (anti-aliased)
let mask = smoothstep(0.45, 0.55, stripes);

debug("smoothstep mask", mask);

let col = mix(
  vec3(0.05, 0.05, 0.15),
  vec3(0.9, 0.5, 0.1),
  mask
);

return vec4(col.x, col.y, col.z, 1.0);`,

  plasma: `// Plasma Wave — iTime animation
// Try pressing ▶ Animate!

let uv = vdiv(fragCoord, iResolution);
let aspect = iResolution.x / iResolution.y;
let p = vec2(uv.x * aspect, uv.y);

debug("uv", uv);

let v1 = sin(p.x * 10.0 + iTime);
let v2 = sin(p.y * 10.0 + iTime * 0.7);
let v3 = sin((p.x + p.y) * 8.0 + iTime * 1.3);
let v4 = sin(length(vsub(p, vec2(0.5, 0.5))) * 12.0 - iTime * 2.0);

let plasma = (v1 + v2 + v3 + v4) / 4.0;

debug("plasma value", plasma);

// Map -1..1 to colors
let r = sin(plasma * PI + 0.0) * 0.5 + 0.5;
let g = sin(plasma * PI + 2.094) * 0.5 + 0.5;
let b = sin(plasma * PI + 4.189) * 0.5 + 0.5;

return vec4(r, g, b, 1.0);`,

  checkerboard: `// Checkerboard — mod and floor
// Classic way to create grid patterns

let uv = vdiv(fragCoord, iResolution);

let cells = 8.0;
let gridUV = vmul(uv, cells);

debug("gridUV", gridUV);

// mod 2 then floor gives alternating 0/1
let checker = mod(
  floor(gridUV.x) + floor(gridUV.y),
  2.0
);

debug("checker value", checker);

let col = mix(
  vec3(0.08, 0.08, 0.12),
  vec3(0.85, 0.85, 0.9),
  checker
);

return vec4(col.x, col.y, col.z, 1.0);`,

  gradient: `// Radial Gradient + vignette

let uv = vdiv(fragCoord, iResolution);
let aspect = iResolution.x / iResolution.y;

// Distance from center
let center = vec2(0.5, 0.5);
let p = vsub(uv, center);
p = vec2(p.x * aspect, p.y);
let dist = length(p);

debug("dist from center", dist);

// Radial gradient
let t = smoothstep(0.6, 0.0, dist);

debug("radial t", t);

// Color bands
let innerCol = vec3(0.9, 0.4, 0.1);
let outerCol = vec3(0.05, 0.03, 0.1);
let col = mix(outerCol, innerCol, t);

// Vignette
let vignette = smoothstep(0.7, 0.2, dist);
col = vmul(col, vignette);

return vec4(col.x, col.y, col.z, 1.0);`,

  normals: `// Normal Map Visualization
// Encodes gradient directions as colors (like normal maps)

let uv = vdiv(fragCoord, iResolution);
let aspect = iResolution.x / iResolution.y;
let p = vec2((uv.x - 0.5) * aspect, uv.y - 0.5);

// A bumpy height field
let h = sin(p.x * 12.0) * sin(p.y * 12.0) * 0.5 + 0.5;

// Approximate gradient (partial derivatives)
let eps = 0.01;
let hx = sin((p.x + eps) * 12.0) * sin(p.y * 12.0) * 0.5 + 0.5;
let hy = sin(p.x * 12.0) * sin((p.y + eps) * 12.0) * 0.5 + 0.5;
let dhdx = (hx - h) / eps;
let dhdy = (hy - h) / eps;

debug("height h", h);
debug("gradient", vec2(dhdx, dhdy));

// Normal from gradient (encode -1..1 → 0..1)
let nx = dhdx * 0.5 + 0.5;
let ny = dhdy * 0.5 + 0.5;
let nz = 1.0; // pointing "up"

return vec4(nx, ny, clamp(nz, 0.0, 1.0), 1.0);`,
};
