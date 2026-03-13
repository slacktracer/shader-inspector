// ── Vector constructors ──────────────────────────────────────────────────────

function _v2(x, y)       { return { x, y, r:x, g:y,           type:'vec2' }; }
function _v3(x, y, z)    { return { x, y, z, r:x, g:y, b:z,   type:'vec3' }; }
function _v4(x, y, z, w) { return { x, y, z, w, r:x, g:y, b:z, a:w, type:'vec4' }; }

export function vec2(a, b) {
  if (b === undefined) return _v2(+a, +a);
  return _v2(+a, +b);
}
export function vec3(a, b, c) {
  if (b === undefined) return _v3(+a, +a, +a);
  if (c === undefined) {
    if (a && a.type === 'vec2') return _v3(a.x, a.y, +b);
    return _v3(+a, +b, +b);
  }
  return _v3(+a, +b, +c);
}
export function vec4(a, b, c, d) {
  if (b === undefined) return _v4(+a, +a, +a, +a);
  if (d === undefined) {
    if (a && a.type === 'vec3') return _v4(a.x, a.y, a.z, +b);
    if (a && a.type === 'vec2' && b && b.type === 'vec2') return _v4(a.x, a.y, b.x, b.y);
    return _v4(+a, +b, +c ?? +b, +b);
  }
  return _v4(+a, +b, +c, +d);
}

// ── Swizzle ──────────────────────────────────────────────────────────────────

export function sw(v, s) {
  const map = { x:v.x, y:v.y, z:v.z||0, w:v.w||0, r:v.r, g:v.g, b:v.b||0, a:v.a||0 };
  if (s.length === 2) return vec2(map[s[0]], map[s[1]]);
  if (s.length === 3) return vec3(map[s[0]], map[s[1]], map[s[2]]);
  if (s.length === 4) return vec4(map[s[0]], map[s[1]], map[s[2]], map[s[3]]);
  return map[s];
}

// ── Component-wise arithmetic ─────────────────────────────────────────────────

function _applyOp(a, b, op) {
  const scalar = typeof b === 'number';
  if (a.type === 'vec2') return vec2(op(a.x, scalar?b:b.x), op(a.y, scalar?b:b.y));
  if (a.type === 'vec3') return vec3(op(a.x, scalar?b:b.x), op(a.y, scalar?b:b.y), op(a.z, scalar?b:b.z));
  if (a.type === 'vec4') return vec4(op(a.x, scalar?b:b.x), op(a.y, scalar?b:b.y), op(a.z, scalar?b:b.z), op(a.w, scalar?b:b.w));
  return op(a, b);
}

export function vadd(a, b) {
  if (typeof a === 'number' && typeof b === 'number') return a + b;
  if (typeof a === 'number') return _applyOp(b, a, (x, y) => x + y);
  return _applyOp(a, b, (x, y) => x + y);
}
export function vsub(a, b) {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return _applyOp(a, b, (x, y) => x - y);
}
export function vmul(a, b) {
  if (typeof a === 'number' && typeof b === 'number') return a * b;
  if (typeof a === 'number') return _applyOp(b, a, (x, y) => x * y);
  return _applyOp(a, b, (x, y) => x * y);
}
export function vdiv(a, b) {
  if (typeof a === 'number' && typeof b === 'number') return a / b;
  return _applyOp(a, b, (x, y) => x / y);
}
export function vneg(a) {
  if (typeof a === 'number') return -a;
  if (a.type === 'vec2') return vec2(-a.x, -a.y);
  if (a.type === 'vec3') return vec3(-a.x, -a.y, -a.z);
  if (a.type === 'vec4') return vec4(-a.x, -a.y, -a.z, -a.w);
}

// ── GLSL built-in math ────────────────────────────────────────────────────────

export function sin(v)  { return typeof v==='number' ? Math.sin(v)  : _applyOp(v,0,(x)=>Math.sin(x)); }
export function cos(v)  { return typeof v==='number' ? Math.cos(v)  : _applyOp(v,0,(x)=>Math.cos(x)); }
export function tan(v)  { return typeof v==='number' ? Math.tan(v)  : _applyOp(v,0,(x)=>Math.tan(x)); }
export function sqrt(v) { return typeof v==='number' ? Math.sqrt(v) : _applyOp(v,0,(x)=>Math.sqrt(x)); }
export function abs(v)  { return typeof v==='number' ? Math.abs(v)  : _applyOp(v,0,(x)=>Math.abs(x)); }
export function floor(v){ return typeof v==='number' ? Math.floor(v): _applyOp(v,0,(x)=>Math.floor(x)); }
export function ceil(v) { return typeof v==='number' ? Math.ceil(v) : _applyOp(v,0,(x)=>Math.ceil(x)); }
export function sign(v) { return typeof v==='number' ? Math.sign(v) : _applyOp(v,0,(x)=>Math.sign(x)); }
export function exp(v)  { return typeof v==='number' ? Math.exp(v)  : _applyOp(v,0,(x)=>Math.exp(x)); }
export function log(v)  { return typeof v==='number' ? Math.log(v)  : _applyOp(v,0,(x)=>Math.log(x)); }
export function atan(y, x) {
  if (x === undefined) return typeof y === 'number' ? Math.atan(y) : _applyOp(y,0,(v)=>Math.atan(v));
  return typeof y === 'number' ? Math.atan2(y, x) : _applyOp(y,x,(a,b)=>Math.atan2(a,b));
}
export function pow(a, b) {
  if (typeof a === 'number') return Math.pow(a, b);
  return _applyOp(a, b, (x, y) => Math.pow(x, y));
}
export function mod(a, b) {
  if (typeof a === 'number') return a - b * Math.floor(a / b);
  return _applyOp(a, b, (x, y) => x - y * Math.floor(x / y));
}
export function fract(v) {
  if (typeof v === 'number') return v - Math.floor(v);
  return _applyOp(v, 0, (x) => x - Math.floor(x));
}
export function clamp(v, lo, hi) {
  if (typeof v === 'number') return Math.max(lo, Math.min(hi, v));
  return _applyOp(v, 0, (x) => Math.max(lo, Math.min(hi, x)));
}
export function mix(a, b, t) {
  if (typeof a === 'number') return a + (b - a) * t;
  const scalar = typeof t === 'number';
  if (a.type === 'vec2') return vec2(mix(a.x,b.x,scalar?t:t.x), mix(a.y,b.y,scalar?t:t.y));
  if (a.type === 'vec3') return vec3(mix(a.x,b.x,scalar?t:t.x), mix(a.y,b.y,scalar?t:t.y), mix(a.z,b.z,scalar?t:t.z));
  if (a.type === 'vec4') return vec4(mix(a.x,b.x,scalar?t:t.x), mix(a.y,b.y,scalar?t:t.y), mix(a.z,b.z,scalar?t:t.z), mix(a.w,b.w,scalar?t:t.w));
}
export function step(edge, v) {
  if (typeof v === 'number') return v < edge ? 0.0 : 1.0;
  return _applyOp(v, 0, (x) => x < edge ? 0.0 : 1.0);
}
export function smoothstep(lo, hi, v) {
  if (typeof v === 'number') {
    const t = clamp((v - lo) / (hi - lo), 0, 1);
    return t * t * (3 - 2 * t);
  }
  return _applyOp(v, 0, (x) => smoothstep(lo, hi, x));
}
export function length(v) {
  if (typeof v === 'number') return Math.abs(v);
  if (v.type === 'vec2') return Math.sqrt(v.x*v.x + v.y*v.y);
  if (v.type === 'vec3') return Math.sqrt(v.x*v.x + v.y*v.y + v.z*v.z);
  if (v.type === 'vec4') return Math.sqrt(v.x*v.x + v.y*v.y + v.z*v.z + v.w*v.w);
}
export function normalize(v) {
  const len = length(v);
  if (len === 0) return v;
  return vdiv(v, len);
}
export function dot(a, b) {
  if (a.type === 'vec2') return a.x*b.x + a.y*b.y;
  if (a.type === 'vec3') return a.x*b.x + a.y*b.y + a.z*b.z;
  if (a.type === 'vec4') return a.x*b.x + a.y*b.y + a.z*b.z + a.w*b.w;
}
export function cross(a, b) {
  return vec3(a.y*b.z - a.z*b.y, a.z*b.x - a.x*b.z, a.x*b.y - a.y*b.x);
}
export function reflect(i, n) { return vsub(i, vmul(n, 2.0 * dot(n, i))); }
export function distance(a, b) { return length(vsub(a, b)); }
export function max(a, b) {
  if (typeof a === 'number' && typeof b === 'number') return Math.max(a, b);
  if (typeof a === 'number') return _applyOp(b, a, (x, y) => Math.max(x, y));
  if (typeof b === 'number') return _applyOp(a, b, (x, y) => Math.max(x, y));
  return _applyOp(a, b, (x, y) => Math.max(x, y));
}
export function min(a, b) {
  if (typeof a === 'number' && typeof b === 'number') return Math.min(a, b);
  if (typeof a === 'number') return _applyOp(b, a, (x, y) => Math.min(x, y));
  if (typeof b === 'number') return _applyOp(a, b, (x, y) => Math.min(x, y));
  return _applyOp(a, b, (x, y) => Math.min(x, y));
}

export const PI  = Math.PI;
export const TAU = Math.PI * 2;
