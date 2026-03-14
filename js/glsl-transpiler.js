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
function _gdiv_s(a,b){if(a instanceof Float32Array){var r=new Float32Array(a.length);for(var i=0;i<a.length;i++)r[i]=a[i]/b;return r;}return a/b;}
function _gmul_s(a,b){if(a instanceof Float32Array){var r=new Float32Array(a.length);for(var i=0;i<a.length;i++)r[i]=a[i]*b;return r;}return a*b;}
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

// ── Stdlib aliases + gl-vec-style methods ────────────────────────────────────
// The transpiler may emit bare stdlib names (dot, length, sin, …) for its own
// internal matrix/vector expansions, bypassing our _g_* rename. Shadow the
// outer-scope rt.* parameters with our Float32Array-aware _g_* versions so
// those calls work correctly.
//
// The transpiler also emits gl-vec-style calls like vec3.add(out, a, b) when
// expanding matrix-vector products. We patch add/sub/scale onto the constructor
// functions so those calls resolve correctly.
const STDLIB_SETUP = `
var sin=_g_sin,cos=_g_cos,tan=_g_tan,asin=_g_asin,acos=_g_acos,atan=_g_atan,
    sinh=_g_sinh,cosh=_g_cosh,tanh=_g_tanh,sqrt=_g_sqrt,inversesqrt=_g_inversesqrt,
    abs=_g_abs,sign=_g_sign,floor=_g_floor,ceil=_g_ceil,round=_g_round,
    fract=_g_fract,exp=_g_exp,log=_g_log,exp2=_g_exp2,log2=_g_log2,pow=_g_pow,
    radians=_g_radians,degrees=_g_degrees,min=_g_min,max=_g_max,clamp=_g_clamp,
    mod=_g_mod,mix=_g_mix,step=_g_step,smoothstep=_g_smoothstep,
    length=_g_length,normalize=_g_normalize,dot=_g_dot,cross=_g_cross,
    distance=_g_distance,reflect=_g_reflect,refract=_g_refract;
function _gva(N,o,a,b){if(!o||!o.length)o=new Float32Array(N);for(var i=0;i<N;i++)o[i]=a[i]+b[i];return o;}
function _gvs(N,o,a,b){if(!o||!o.length)o=new Float32Array(N);for(var i=0;i<N;i++)o[i]=a[i]-b[i];return o;}
function _gvm(N,o,a,s){if(!o||!o.length)o=new Float32Array(N);for(var i=0;i<N;i++)o[i]=a[i]*s;return o;}
vec2.add=function(o,a,b){return _gva(2,o,a,b);};vec2.sub=function(o,a,b){return _gvs(2,o,a,b);};vec2.scale=function(o,a,s){return _gvm(2,o,a,s);};
vec3.add=function(o,a,b){return _gva(3,o,a,b);};vec3.sub=function(o,a,b){return _gvs(3,o,a,b);};vec3.scale=function(o,a,s){return _gvm(3,o,a,s);};
vec4.add=function(o,a,b){return _gva(4,o,a,b);};vec4.sub=function(o,a,b){return _gvs(4,o,a,b);};vec4.scale=function(o,a,s){return _gvm(4,o,a,s);};
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

  // Strip GLSL float-literal suffix: 0.5f → 0.5 (valid GLSL, invalid JS)
  code = code.replace(/(\d+\.\d*|\d*\.\d+|\d+)[fF]\b/g, '$1');

  // Normalize trailing-dot float literals: 50. → 50.0 (valid GLSL, invalid JS)
  // Must run after f-suffix strip. Only matches standalone number literals, not
  // property accesses like vec2.add (guarded by \b before the digits).
  code = code.replace(/\b(\d+)\.(?![0-9eE])/g, '$1.0');

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

// ── jsBody post-processors ────────────────────────────────────────────────────
// The transpiler generates certain patterns that are valid JS syntax but produce
// NaN at runtime when Float32Arrays are involved. Fix them before wrapping.

// Fix 1: arr.map(function(_){return _ OP this;}, expr)
// When expr is a Float32Array, `this` is the whole array and _ OP array = NaN.
// Use the map index to pick the right element instead.
function _fixMapThisArg(code) {
  return code.replace(
    /\.map\(function\s*\(_\)\s*\{return\s*_\s*([+\-*/])\s*this;\}/g,
    // Do NOT include the closing ) — the thisArg that follows (if any) still
    // needs to close the .map() call.  Adding ) here creates an extra one.
    '.map(function(_,__i){var __t=this;return _$1(__t instanceof Float32Array?__t[__i]:__t);}'
  );
}

// Fix 2: +_g_func(args) → (_g_func(args))[0]
// Transpiler uses unary + to "extract a scalar" from a vec result when building
// Float32Array([+vec_expr, other]) constructors.  Float32Array coerces to NaN.
function _fixUnaryPlusOnVec(code) {
  let out = '', i = 0;
  while (i < code.length) {
    if (code[i] === '+' && code.slice(i + 1, i + 4) === '_g_') {
      let j = i + 1;
      while (j < code.length && /\w/.test(code[j])) j++;
      if (j < code.length && code[j] === '(') {
        let depth = 1, k = j + 1;
        while (k < code.length && depth > 0) {
          if (code[k] === '(') depth++;
          else if (code[k] === ')') depth--;
          k++;
        }
        out += '(' + code.slice(i + 1, k) + ')[0]';
        i = k;
        continue;
      }
    }
    out += code[i++];
  }
  return out;
}

// Fix 3: (expr_containing_g_calls) / numericLiteral → _gdiv_s(expr, num)
// Float32Array / number = NaN in JS; wrap with our element-wise helper.
// Similarly for *: (expr) * num → _gmul_s(expr, num)
//
// NOTE: must replace the FULL span (openParen … endOfNum), not just the
// tail ") / num" — otherwise the opening ( is left dangling.
function _fixVecScalarArith(code) {
  function collectFixes(src, opRe, fn) {
    const fixes = [];
    const re = new RegExp('\\)\\s*' + opRe + '\\s*(\\d+(?:\\.\\d+)?(?:e[+-]?\\d+)?)\\b', 'g');
    let m;
    while ((m = re.exec(src)) !== null) {
      const closePos = m.index;
      let depth = 1, j = closePos - 1;
      while (j >= 0 && depth > 0) {
        if (src[j] === ')') depth++;
        else if (src[j] === '(') depth--;
        j--;
      }
      if (depth !== 0) continue;
      const openPos = j + 1;
      const inner = src.slice(openPos + 1, closePos);
      if (!inner.includes('_g_')) continue;
      fixes.push({ start: openPos, end: m.index + m[0].length,
                   replacement: fn + '(' + inner + ',' + m[1] + ')' });
    }
    return fixes;
  }

  const fixes = [
    ...collectFixes(code, '\\/', '_gdiv_s'),
    ...collectFixes(code, '\\*', '_gmul_s'),
  ].sort((a, b) => a.start - b.start);

  let result = '', pos = 0;
  for (const { start, end, replacement } of fixes) {
    if (start >= pos) {
      result += code.slice(pos, start) + replacement;
      pos = end;
    }
  }
  return result + code.slice(pos);
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
    // glsl-parser errors may carry line/column on the error object itself,
    // or embedded in the message as "... at line N col M".
    const srcLines = processed.split('\n');
    let lineNo = e.line ?? e.lineNumber ?? null;
    // Fallback: parse "line N" from message string
    if (lineNo == null) {
      const m = String(e.message).match(/\bline[:\s]+(\d+)/i);
      if (m) lineNo = parseInt(m[1]);
    }
    let detail = e.message || String(e);
    if (lineNo != null && lineNo >= 1 && lineNo <= srcLines.length) {
      const lo = Math.max(0, lineNo - 2);
      const hi = Math.min(srcLines.length - 1, lineNo);
      const ctx = srcLines.slice(lo, hi + 1)
        .map((l, i) => `${lo + i + 1 === lineNo ? '→' : ' '} ${lo + i + 1}  ${l}`)
        .join('\n');
      detail = `line ${lineNo}: ${e.message}\n\n${ctx}`;
    }
    return { fn: null, error: 'GLSL parse error: ' + detail };
  }

  jsBody = _fixMapThisArg(jsBody);
  jsBody = _fixUnaryPlusOnVec(jsBody);
  jsBody = _fixVecScalarArith(jsBody);

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
    ${STDLIB_SETUP}
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

  const result = compileShader(wrappedCode);
  if (result.error) {
    // Log the generated JS so the browser DevTools console can highlight
    // the exact syntax error (open Console and look for the logged snippet).
    console.error('[glsl-transpiler] Generated JS failed to compile — ' + result.error + '\n\n' + wrappedCode);
    return { fn: null, error: 'Generated JS compile error: ' + result.error + '\n(transpiled code logged to console — open DevTools for details)' };
  }
  return result;
}
