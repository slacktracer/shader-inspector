import { clamp } from './glsl-runtime.js';
import { fmt, toHex } from './format.js';

export function updateInspector(log) {
  const panel = document.getElementById('inspector-content');
  if (!log) {
    panel.innerHTML = `<div class="insp-empty">Click a pixel to inspect its values.</div>`;
    return;
  }

  const { fragCoord, iResolution, iTime, result, debug } = log;
  const r = clamp(result.r ?? result.x ?? 0, 0, 1);
  const g = clamp(result.g ?? result.y ?? 0, 0, 1);
  const b = clamp(result.b ?? result.z ?? 0, 0, 1);
  const a = clamp(result.a ?? result.w ?? 1, 0, 1);
  const hex = toHex(r, g, b);

  let html = `
    <div class="insp-section">Uniforms</div>
    <div class="insp-row"><span class="insp-label">fragCoord</span><span class="insp-value vec">${fmt(fragCoord)}</span></div>
    <div class="insp-row"><span class="insp-label">iResolution</span><span class="insp-value vec">${fmt(iResolution)}</span></div>
    <div class="insp-row"><span class="insp-label">iTime</span><span class="insp-value float">${fmt(iTime)}</span></div>
    <div class="insp-section">Output</div>
    <div class="insp-row">
      <span class="insp-label">gl_FragColor</span>
      <span class="insp-value color-swatch">
        <span class="swatch" style="background:${hex}"></span>
        ${fmt(result)}
      </span>
    </div>
    <div class="insp-row"><span class="insp-label">hex</span><span class="insp-value">${hex}</span></div>
    <div class="insp-row"><span class="insp-label">r g b a</span><span class="insp-value float">${fmt(r,3)} &nbsp; ${fmt(g,3)} &nbsp; ${fmt(b,3)} &nbsp; ${fmt(a,3)}</span></div>
  `;

  if (debug && debug.length > 0) {
    html += `<div class="insp-section">Debug Calls</div>`;
    for (const entry of debug) {
      html += `<div class="insp-row"><span class="insp-label insp-debug">${entry.label}</span><span class="insp-value vec">${fmt(entry.value)}</span></div>`;
    }
  } else {
    html += `<div class="insp-row"><span style="color:var(--muted);font-size:11px">Use <span style="color:#c080f0">debug(label, value)</span> to log intermediate values</span></div>`;
  }

  panel.innerHTML = html;
}
