import { EXAMPLES } from './examples.js';
import { RES, setResolution, compileShader, renderShader } from './shader-runner.js';
import { updateInspector } from './inspector.js';

// ── State ────────────────────────────────────────────────────────────────────

let compiledFn   = null;
let inspectPixel = null;
let animating    = false;
let animFrame    = null;
let startTime    = performance.now();
let lastITime    = 0;

const canvas = document.getElementById('canvas');

// ── Shader execution ──────────────────────────────────────────────────────────

function showError(msg) {
  const bar = document.getElementById('error-bar');
  if (msg) { bar.textContent = '⚠ ' + msg; bar.classList.add('visible'); }
  else { bar.classList.remove('visible'); }
}

function runShader() {
  const code = document.getElementById('shader-code').value;
  const { fn, error } = compileShader(code);
  showError(error);
  if (!fn) return;
  compiledFn = fn;

  const iTime   = animating ? (performance.now() - startTime) / 1000 : lastITime;
  const t0      = performance.now();
  const log     = renderShader(fn, iTime, inspectPixel?.x, inspectPixel?.y);
  const elapsed = (performance.now() - t0).toFixed(1);
  document.getElementById('render-time').textContent = `${elapsed} ms`;
  if (log) updateInspector(log);
}

document.getElementById('run-btn').addEventListener('click', runShader);

document.getElementById('shader-code').addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); runShader(); }
  if (e.key === 'Tab') {
    e.preventDefault();
    const el = e.target;
    const s  = el.selectionStart;
    el.value = el.value.slice(0, s) + '  ' + el.value.slice(el.selectionEnd);
    el.selectionStart = el.selectionEnd = s + 2;
  }
});

// ── Animation ─────────────────────────────────────────────────────────────────

const animBtn = document.getElementById('anim-btn');

function tick() {
  if (!animating || !compiledFn) return;
  const iTime   = (performance.now() - startTime) / 1000;
  lastITime     = iTime;
  const t0      = performance.now();
  const log     = renderShader(compiledFn, iTime, inspectPixel?.x, inspectPixel?.y);
  const elapsed = (performance.now() - t0).toFixed(1);
  document.getElementById('render-time').textContent = `${elapsed} ms`;
  if (log && inspectPixel) updateInspector(log);
  animFrame = requestAnimationFrame(tick);
}

animBtn.addEventListener('click', () => {
  animating = !animating;
  if (animating) {
    startTime = performance.now() - lastITime * 1000;
    animBtn.classList.add('active');
    animBtn.textContent = '■ Stop';
    const { fn, error } = compileShader(document.getElementById('shader-code').value);
    showError(error);
    if (fn) { compiledFn = fn; animFrame = requestAnimationFrame(tick); }
  } else {
    animBtn.classList.remove('active');
    animBtn.textContent = '▶ Animate';
    cancelAnimationFrame(animFrame);
  }
});

// ── Pixel selection ───────────────────────────────────────────────────────────

function selectPixel(px, py) {
  inspectPixel = { x: px, y: py };

  const rect     = canvas.getBoundingClientRect();
  const wrapRect = document.getElementById('canvas-wrap').getBoundingClientRect();
  const ch       = document.getElementById('crosshair');
  const cx       = (px + 0.5) / RES * rect.width;
  const cy       = (py + 0.5) / RES * rect.height;
  ch.style.display = 'block';
  ch.style.left    = (rect.left - wrapRect.left + cx) + 'px';
  ch.style.top     = (rect.top  - wrapRect.top  + cy) + 'px';

  if (compiledFn) {
    const iTime = animating ? (performance.now() - startTime) / 1000 : lastITime;
    const log   = renderShader(compiledFn, iTime, px, py);
    updateInspector(log);
  }
}

canvas.addEventListener('click', (e) => {
  const rect   = canvas.getBoundingClientRect();
  const scaleX = RES / rect.width;
  const scaleY = RES / rect.height;
  const px     = Math.floor((e.clientX - rect.left) * scaleX);
  const py     = Math.floor((e.clientY - rect.top)  * scaleY);
  if (px < 0 || px >= RES || py < 0 || py >= RES) return;
  canvas.focus();
  selectPixel(px, py);
});

const ARROW_DELTA = { ArrowLeft:[-1,0], ArrowRight:[1,0], ArrowUp:[0,-1], ArrowDown:[0,1] };
canvas.addEventListener('keydown', (e) => {
  const delta = ARROW_DELTA[e.key];
  if (!delta) return;
  e.preventDefault();
  const cur = inspectPixel ?? { x: Math.floor(RES / 2), y: Math.floor(RES / 2) };
  selectPixel((cur.x + delta[0] + RES) % RES, (cur.y + delta[1] + RES) % RES);
});

// ── Controls ──────────────────────────────────────────────────────────────────

document.getElementById('resolution-select').addEventListener('change', (e) => {
  setResolution(parseInt(e.target.value));
  inspectPixel = null;
  document.getElementById('crosshair').style.display = 'none';
  runShader();
});

document.getElementById('example-select').addEventListener('change', (e) => {
  const key = e.target.value;
  if (key && EXAMPLES[key]) {
    document.getElementById('shader-code').value = EXAMPLES[key];
    runShader();
  }
  e.target.value = '';
});

// ── Font size ─────────────────────────────────────────────────────────────────

let fontSize = parseFloat(localStorage.getItem('ui-fs') ?? '12.5');
const FONT_MIN = 8, FONT_MAX = 24, FONT_STEP = 1.5;

function applyFontSize() {
  document.documentElement.style.setProperty('--ui-fs', fontSize + 'px');
  localStorage.setItem('ui-fs', fontSize);
}

document.getElementById('font-inc').addEventListener('click', () => {
  fontSize = Math.min(FONT_MAX, fontSize + FONT_STEP);
  applyFontSize();
});
document.getElementById('font-dec').addEventListener('click', () => {
  fontSize = Math.max(FONT_MIN, fontSize - FONT_STEP);
  applyFontSize();
});

// ── Right pane resize ─────────────────────────────────────────────────────────

const rightPane          = document.getElementById('right-pane');
const rightResizeHandle  = document.getElementById('right-resize-handle');
const WIDE_THRESHOLD     = 480;

function updateLayout() {
  rightPane.classList.toggle('wide', rightPane.offsetWidth >= WIDE_THRESHOLD);
}

let _resizing = false, _resizeStartX = 0, _resizeStartW = 0;

rightResizeHandle.addEventListener('mousedown', (e) => {
  _resizing    = true;
  _resizeStartX = e.clientX;
  _resizeStartW = rightPane.offsetWidth;
  rightResizeHandle.classList.add('dragging');
  document.body.style.cursor     = 'col-resize';
  document.body.style.userSelect = 'none';
  e.preventDefault();
});

document.addEventListener('mousemove', (e) => {
  if (!_resizing) return;
  const newW = Math.max(220, _resizeStartW + (_resizeStartX - e.clientX));
  rightPane.style.width = newW + 'px';
  updateLayout();
});

document.addEventListener('mouseup', () => {
  if (!_resizing) return;
  _resizing = false;
  rightResizeHandle.classList.remove('dragging');
  document.body.style.cursor     = '';
  document.body.style.userSelect = '';
  localStorage.setItem('pane-width', rightPane.offsetWidth);
});

// ── Init ──────────────────────────────────────────────────────────────────────

const savedPaneWidth = localStorage.getItem('pane-width');
if (savedPaneWidth) rightPane.style.width = savedPaneWidth + 'px';
applyFontSize();
document.getElementById('shader-code').value = EXAMPLES.circle;
setResolution(128);
updateLayout();
runShader();
