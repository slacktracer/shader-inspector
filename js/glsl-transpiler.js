import { compileShader } from './shader-runner.js';

// ── CDN loader (lazy, one-time) ───────────────────────────────────────────────

let _compiler = null;

async function loadCompiler() {
  if (_compiler) return _compiler;
  const mod = await import('https://esm.sh/glsl-transpiler');
  _compiler = mod.default;
  return _compiler;
}

// ── GLSL stdlib rename ────────────────────────────────────────────────────────
// glsl-transpiler crashes on known GLSL stdlib function calls due to a
// type-resolution bug. Fix: rename them to _g_* before transpiling. The
// transpiler treats unknown names as extern calls and passes them through with
// already-transpiled arguments. We inject our own Float32Array-aware impls.

const STDLIB_FNS = [
  'length','normalize','dot','cross','distance','reflect','refract',
  'smoothstep','step','mix','clamp',
  'sin','cos','tan','asin','acos','atan','sinh','cosh','tanh',
  'pow','exp','log','exp2','log2','sqrt','inversesqrt',
  'abs','sign','floor','ceil','round','fract','mod',
  'min','max',
  'radians','degrees',
  'all','any','not',
  'texture','texture2D','textureCube','texture2DLod',
  'dFdx','dFdy','fwidth',
  'matrixCompMult','transpose','determinant','inverse',
  'lessThan','greaterThan','lessThanEqual','greaterThanEqual','equal','notEqual',
];

// Negative lookbehind on "." prevents matching field access like "vec.length".
const _stdlibRE = new RegExp(
  `(?<![.])\\b(${STDLIB_FNS.join('|')})\\s*\\(`,
  'g'
);

function renameStdlib(glsl) {
  return glsl.replace(_stdlibRE, (_, name) => `_g_${name}(`);
}

// Float32Array-aware JS implementations injected into every transpiled shader.
const STDLIB_IMPL = `
function _g(v,f){if(v instanceof Float32Array){var r=new Float32Array(v.length);for(var i=0;i<v.length;i++)r[i]=f(v[i]);return r;}return f(v);}
function _g2(a,b,f){if(a instanceof Float32Array){var r=new Float32Array(a.length);for(var i=0;i<a.length;i++)r[i]=f(a[i],b instanceof Float32Array?b[i]:b);return r;}return f(a,b instanceof Float32Array?b[0]:b);}
function _g_sin(v){return _g(v,Math.sin);}
function _g_cos(v){return _g(v,Math.cos);}
function _g_tan(v){return _g(v,Math.tan);}
function _g_asin(v){return _g(v,Math.asin);}
function _g_acos(v){return _g(v,Math.acos);}
function _g_atan(a,b){if(b===undefined)return _g(a,Math.atan);return _g2(a,b,Math.atan2);}
function _g_sinh(v){return _g(v,Math.sinh);}
function _g_cosh(v){return _g(v,Math.cosh);}
function _g_tanh(v){return _g(v,Math.tanh);}
function _g_sqrt(v){return _g(v,Math.sqrt);}
function _g_inversesqrt(v){return _g(v,function(x){return 1/Math.sqrt(x);});}
function _g_abs(v){return _g(v,Math.abs);}
function _g_sign(v){return _g(v,Math.sign);}
function _g_floor(v){return _g(v,Math.floor);}
function _g_ceil(v){return _g(v,Math.ceil);}
function _g_round(v){return _g(v,Math.round);}
function _g_fract(v){return _g(v,function(x){return x-Math.floor(x);});}
function _g_exp(v){return _g(v,Math.exp);}
function _g_log(v){return _g(v,Math.log);}
function _g_exp2(v){return _g(v,function(x){return Math.pow(2,x);});}
function _g_log2(v){return _g(v,Math.log2);}
function _g_pow(a,b){return _g2(a,b,Math.pow);}
function _g_radians(v){return _g(v,function(x){return x*0.01745329251;});}
function _g_degrees(v){return _g(v,function(x){return x*57.2957795131;});}
function _g_min(a,b){return _g2(a,b,Math.min);}
function _g_max(a,b){return _g2(a,b,Math.max);}
function _g_clamp(v,lo,hi){return _g_min(_g_max(v,lo),hi);}
function _g_mod(a,b){return _g2(a,b,function(x,y){return x-Math.floor(x/y)*y;});}
function _g_mix(a,b,t){if(a instanceof Float32Array){var r=new Float32Array(a.length);for(var i=0;i<a.length;i++){var ti=t instanceof Float32Array?t[i]:t;var bi=b instanceof Float32Array?b[i]:b;r[i]=a[i]+ti*(bi-a[i]);}return r;}var _t=t instanceof Float32Array?t[0]:t;var _b=b instanceof Float32Array?b[0]:b;return a*(1-_t)+_b*_t;}
function _g_step(e,x){if(x instanceof Float32Array){var r=new Float32Array(x.length);var eb=e instanceof Float32Array;for(var i=0;i<x.length;i++)r[i]=x[i]>=(eb?e[i]:e)?1:0;return r;}return x>=(e instanceof Float32Array?e[0]:e)?1:0;}
function _g_smoothstep(lo,hi,x){function _ss(l,h,v){if(h===l)return 0;var t=Math.max(0,Math.min(1,(v-l)/(h-l)));return t*t*(3-2*t);}if(x instanceof Float32Array){var r=new Float32Array(x.length);var lb=lo instanceof Float32Array,hb=hi instanceof Float32Array;for(var i=0;i<x.length;i++)r[i]=_ss(lb?lo[i]:lo,hb?hi[i]:hi,x[i]);return r;}return _ss(lo instanceof Float32Array?lo[0]:lo,hi instanceof Float32Array?hi[0]:hi,x);}
function _g_length(v){if(v instanceof Float32Array){var s=0;for(var i=0;i<v.length;i++)s+=v[i]*v[i];return Math.sqrt(s);}return Math.abs(v);}
function _g_normalize(v){var l=_g_length(v);if(v instanceof Float32Array){var r=new Float32Array(v.length);for(var i=0;i<v.length;i++)r[i]=l>0?v[i]/l:0;return r;}return l>0?1:0;}
function _g_dot(a,b){if(a instanceof Float32Array){var s=0;for(var i=0;i<a.length;i++)s+=a[i]*(b instanceof Float32Array?b[i]:b);return s;}return a*(b instanceof Float32Array?b[0]:b);}
function _g_cross(a,b){return new Float32Array([a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]);}
function _g_distance(a,b){if(a instanceof Float32Array){var s=0;for(var i=0;i<a.length;i++){var d=a[i]-(b instanceof Float32Array?b[i]:b);s+=d*d;}return Math.sqrt(s);}return Math.abs(a-(b instanceof Float32Array?b[0]:b));}
function _g_reflect(i,n){var d=_g_dot(n,i)*2;var r=new Float32Array(i.length);for(var k=0;k<i.length;k++)r[k]=i[k]-d*(n instanceof Float32Array?n[k]:n);return r;}
function _g_refract(i,n,eta){var d=_g_dot(n,i);var k=1-eta*eta*(1-d*d);if(k<0)return new Float32Array(i.length);var r=new Float32Array(i.length);var f=eta*d+Math.sqrt(k);for(var j=0;j<i.length;j++)r[j]=eta*i[j]-f*(n instanceof Float32Array?n[j]:n);return r;}
function _g_texture2D(s,uv){return new Float32Array([0,0,0,1]);}
function _g_texture(s,uv){return new Float32Array([0,0,0,1]);}
function _g_textureCube(s,uv){return new Float32Array([0,0,0,1]);}
function _g_texture2DLod(s,uv,l){return new Float32Array([0,0,0,1]);}
function _g_dFdx(v){return v instanceof Float32Array?new Float32Array(v.length):0;}
function _g_dFdy(v){return v instanceof Float32Array?new Float32Array(v.length):0;}
function _g_fwidth(v){return v instanceof Float32Array?new Float32Array(v.length):0;}
function _g_matrixCompMult(a,b){return a;}
function _g_transpose(m){return m;}
function _g_determinant(m){return 1;}
function _g_inverse(m){return m;}
function _g_lessThan(a,b){if(a instanceof Float32Array){var r=new Float32Array(a.length);for(var i=0;i<a.length;i++)r[i]=a[i]<(b instanceof Float32Array?b[i]:b)?1:0;return r;}return a<b?1:0;}
function _g_greaterThan(a,b){if(a instanceof Float32Array){var r=new Float32Array(a.length);for(var i=0;i<a.length;i++)r[i]=a[i]>(b instanceof Float32Array?b[i]:b)?1:0;return r;}return a>b?1:0;}
function _g_lessThanEqual(a,b){if(a instanceof Float32Array){var r=new Float32Array(a.length);for(var i=0;i<a.length;i++)r[i]=a[i]<=(b instanceof Float32Array?b[i]:b)?1:0;return r;}return a<=b?1:0;}
function _g_greaterThanEqual(a,b){if(a instanceof Float32Array){var r=new Float32Array(a.length);for(var i=0;i<a.length;i++)r[i]=a[i]>=(b instanceof Float32Array?b[i]:b)?1:0;return r;}return a>=b?1:0;}
function _g_equal(a,b){if(a instanceof Float32Array){var r=new Float32Array(a.length);for(var i=0;i<a.length;i++)r[i]=a[i]===(b instanceof Float32Array?b[i]:b)?1:0;return r;}return a===b?1:0;}
function _g_notEqual(a,b){if(a instanceof Float32Array){var r=new Float32Array(a.length);for(var i=0;i<a.length;i++)r[i]=a[i]!==(b instanceof Float32Array?b[i]:b)?1:0;return r;}return a!==b?1:0;}
function _g_all(v){if(v instanceof Float32Array){for(var i=0;i<v.length;i++)if(!v[i])return 0;return 1;}return v?1:0;}
function _g_any(v){if(v instanceof Float32Array){for(var i=0;i<v.length;i++)if(v[i])return 1;return 0;}return v?1:0;}
function _g_not(v){if(v instanceof Float32Array){var r=new Float32Array(v.length);for(var i=0;i<v.length;i++)r[i]=v[i]?0:1;return r;}return v?0:1;}
`;

// ── debug() pragma extraction ─────────────────────────────────────────────────

function extractDebugCalls(glsl) {
  const calls = [];
  const clean = glsl.replace(
    /\bdebug\s*\(\s*"([^"]+)"\s*,\s*([^;)]+)\s*\)\s*;/g,
    (_, label, expr) => {
      calls.push({ label: label.trim(), expr: expr.trim() });
      return '';
    }
  );
  return { clean, calls };
}

// ── GLSL preprocessing ────────────────────────────────────────────────────────

function preprocessGLSL(glsl) {
  const preamble = ['precision mediump float;'];
  if (!/\buniform\s+\w+\s+iResolution\b/.test(glsl))
    preamble.push('uniform vec2 iResolution;');
  if (!/\buniform\s+\w+\s+iTime\b/.test(glsl))
    preamble.push('uniform float iTime;');
  if (!/\buniform\s+\w+\s+iMouse\b/.test(glsl))
    preamble.push('uniform vec4 iMouse;');

  let code = glsl.replace(/\bprecision\s+\w+\s+\w+\s*;/g, '');

  // Hoist fragColor as a global; remove the `out vec4 fragColor` parameter.
  // The transpiler emits in-place modification (fragColor[0]=r, …) rather than
  // reassignment, so the outer-scope Float32Array is updated via closure.
  code = code.replace(
    /void\s+mainImage\s*\(\s*out\s+vec4\s+(\w+)\s*(?:,\s*in\s+vec2\s+(\w+)\s*)?\)/,
    (_, colorVar, coordVar) => {
      preamble.push(`vec4 ${colorVar};`);
      return `void mainImage(${coordVar ? `in vec2 ${coordVar}` : ''})`;
    }
  );

  code = renameStdlib(code);

  return preamble.join('\n') + '\n' + code;
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function compileGLSL(glslCode) {
  let GLSL;
  try {
    GLSL = await loadCompiler();
  } catch (e) {
    return { fn: null, error: 'Failed to load transpiler: ' + e.message };
  }

  const { clean, calls } = extractDebugCalls(glslCode);
  const processed = preprocessGLSL(clean);

  // No custom uniform handler — let the transpiler declare uniforms with
  // default zero values. We override them after the block (see below).
  const compile = GLSL({ debug: true });

  let jsBody;
  try {
    jsBody = compile(processed);
  } catch (e) {
    return { fn: null, error: 'GLSL transpile error: ' + e.message };
  }

  const debugSuffix = calls
    .map(({ label, expr }) =>
      `try { _debugLog(${JSON.stringify(label)}, ${expr}); } catch(_e) {}`
    )
    .join('\n');

  // compileShader wraps this in:
  //   function mainImage(fragCoord, _iRes, _iTime, _debugLog) {
  //     var iResolution = _iRes; var iTime = _iTime;  ← aliases (for compat)
  //     [wrappedCode]
  //   }
  // The transpiler declares uniforms as `var iResolution = 0` etc. We override
  // them immediately after the transpiled block with the real Float32Array values.
  const wrappedCode = `
    ${STDLIB_IMPL}
    var _iResFA   = new Float32Array([_iRes.x, _iRes.y]);
    var _iMouseFA = new Float32Array([0, 0, 0, 0]);
    ${jsBody}
    iResolution = _iResFA;
    iTime = _iTime;
    iMouse = _iMouseFA;
    mainImage(new Float32Array([fragCoord.x, fragCoord.y]));
    ${debugSuffix}
    return vec4(fragColor[0], fragColor[1], fragColor[2], fragColor[3]);
  `;

  return compileShader(wrappedCode);
}
