import * as rt from './glsl-runtime.js';

export let RES = 128;

let _canvas = null;
let _ctx    = null;

function _getCtx() {
  if (!_ctx) {
    _canvas = document.getElementById('canvas');
    _ctx    = _canvas.getContext('2d');
  }
  return _ctx;
}

export function setResolution(r) {
  RES = r;
  const canvas = _canvas ?? document.getElementById('canvas');
  _canvas = canvas;
  _ctx = canvas.getContext('2d');
  canvas.width  = r;
  canvas.height = r;
  canvas.style.width  = Math.min(r * (r < 128 ? 4 : r < 256 ? 2 : 1), 260) + 'px';
  canvas.style.height = canvas.style.width;
  document.getElementById('canvas-label').textContent = `Preview · ${r} × ${r}`;
}

export function compileShader(code) {
  const wrapper = `
    "use strict";
    return function mainImage(fragCoord, iResolution, iTime, _debugLog) {
      function debug(label, value) { _debugLog(label, value); }
      ${code}
    };
  `;
  try {
    const factory = new Function(
      'vec2','vec3','vec4','sw',
      'vadd','vsub','vmul','vdiv','vneg',
      'sin','cos','tan','sqrt','abs','floor','ceil','sign','exp','log',
      'atan','pow','mod','fract','clamp','mix','step','smoothstep',
      'length','normalize','dot','cross','reflect','distance',
      'max','min','PI','TAU',
      wrapper
    );
    return {
      fn: factory(
        rt.vec2, rt.vec3, rt.vec4, rt.sw,
        rt.vadd, rt.vsub, rt.vmul, rt.vdiv, rt.vneg,
        rt.sin, rt.cos, rt.tan, rt.sqrt, rt.abs, rt.floor, rt.ceil, rt.sign, rt.exp, rt.log,
        rt.atan, rt.pow, rt.mod, rt.fract, rt.clamp, rt.mix, rt.step, rt.smoothstep,
        rt.length, rt.normalize, rt.dot, rt.cross, rt.reflect, rt.distance,
        rt.max, rt.min, rt.PI, rt.TAU
      ),
      error: null,
    };
  } catch (e) {
    return { fn: null, error: e.message };
  }
}

// ctxOverride and resOverride allow tests to inject a fake canvas context.
export function renderShader(fn, iTime, inspectX, inspectY, ctxOverride, resOverride) {
  if (!fn) return null;
  const ctx = ctxOverride ?? _getCtx();
  const res = resOverride ?? RES;

  const imageData = ctx.createImageData(res, res);
  const data      = imageData.data;
  const iRes      = rt.vec2(res, res);
  let inspectLog  = null;

  for (let py = 0; py < res; py++) {
    for (let px = 0; px < res; px++) {
      const fragCoord = rt.vec2(px + 0.5, (res - 1 - py) + 0.5);
      let debugEntries = null;
      const debugLog = (label, value) => {
        if (debugEntries) debugEntries.push({ label, value });
      };

      const isInspect = (px === inspectX && py === inspectY);
      if (isInspect) debugEntries = [];

      let result;
      try {
        result = fn(fragCoord, iRes, iTime, debugLog);
      } catch (_e) {
        result = rt.vec4(1, 0, 0.5, 1);
      }

      if (!result) result = rt.vec4(0, 0, 0, 1);
      const idx   = (py * res + px) * 4;
      data[idx]   = Math.round(rt.clamp(result.r ?? result.x ?? 0, 0, 1) * 255);
      data[idx+1] = Math.round(rt.clamp(result.g ?? result.y ?? 0, 0, 1) * 255);
      data[idx+2] = Math.round(rt.clamp(result.b ?? result.z ?? 0, 0, 1) * 255);
      data[idx+3] = Math.round(rt.clamp(result.a ?? result.w ?? 1, 0, 1) * 255);

      if (isInspect) {
        inspectLog = { fragCoord, iResolution: iRes, iTime, result, debug: debugEntries };
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return inspectLog;
}
