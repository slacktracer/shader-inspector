import { clamp } from './glsl-runtime.js';

export function fmt(v, digits = 4) {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'number') return v.toFixed(digits);
  if (v.type === 'vec2') return `vec2(${fmt(v.x, digits)}, ${fmt(v.y, digits)})`;
  if (v.type === 'vec3') return `vec3(${fmt(v.x, digits)}, ${fmt(v.y, digits)}, ${fmt(v.z, digits)})`;
  if (v.type === 'vec4') return `vec4(${fmt(v.x, digits)}, ${fmt(v.y, digits)}, ${fmt(v.z, digits)}, ${fmt(v.w, digits)})`;
  return JSON.stringify(v);
}

export function toHex(r, g, b) {
  const c = (v) => Math.round(clamp(v, 0, 1) * 255).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}
