import { assertEquals, assertExists, assert } from "jsr:@std/assert";
import { compileShader, renderShader } from "../shader-runner.js";
import { vec2 } from "../glsl-runtime.js";

// Minimal canvas context stub for renderShader tests
function makeCtx(res) {
  const data = new Uint8ClampedArray(res * res * 4);
  return {
    data,
    createImageData(w, h) {
      return { data: new Uint8ClampedArray(w * h * 4), width: w, height: h };
    },
    putImageData(imageData) {
      data.set(imageData.data);
    },
  };
}

// ── compileShader ─────────────────────────────────────────────────────────────

Deno.test("compileShader: valid code returns fn", () => {
  const { fn, error } = compileShader("return vec4(1.0, 0.0, 0.0, 1.0);");
  assertExists(fn);
  assertEquals(error, null);
  assertEquals(typeof fn, "function");
});

Deno.test("compileShader: syntax error returns null fn and error string", () => {
  const { fn, error } = compileShader("return vec4(((");
  assertEquals(fn, null);
  assertExists(error);
  assert(typeof error === "string" && error.length > 0);
});

Deno.test("compileShader: compiled fn returns a vec4", () => {
  const { fn } = compileShader("return vec4(0.2, 0.4, 0.6, 1.0);");
  const noop = () => {};
  const result = fn(vec2(0.5, 0.5), vec2(128, 128), 0, noop);
  assertEquals(result.type, "vec4");
  assertEquals(result.r, 0.2);
  assertEquals(result.g, 0.4);
  assertEquals(result.b, 0.6);
  assertEquals(result.a, 1.0);
});

Deno.test("compileShader: debug() calls are passed to the log callback", () => {
  const { fn } = compileShader(`
    debug("myval", 42);
    return vec4(0, 0, 0, 1);
  `);
  const entries = [];
  fn(vec2(0.5, 0.5), vec2(128, 128), 0, (label, value) => entries.push({ label, value }));
  assertEquals(entries.length, 1);
  assertEquals(entries[0].label, "myval");
  assertEquals(entries[0].value, 42);
});

// ── renderShader ──────────────────────────────────────────────────────────────

Deno.test("renderShader: constant red fills all pixels", () => {
  const { fn } = compileShader("return vec4(1.0, 0.0, 0.0, 1.0);");
  const res = 4;
  const ctx = makeCtx(res);
  renderShader(fn, 0, -1, -1, ctx, res);
  // Every pixel should be r=255, g=0, b=0, a=255
  for (let i = 0; i < res * res; i++) {
    assertEquals(ctx.data[i * 4],     255, `r at pixel ${i}`);
    assertEquals(ctx.data[i * 4 + 1],   0, `g at pixel ${i}`);
    assertEquals(ctx.data[i * 4 + 2],   0, `b at pixel ${i}`);
    assertEquals(ctx.data[i * 4 + 3], 255, `a at pixel ${i}`);
  }
});

Deno.test("renderShader: returns null log when no inspect pixel", () => {
  const { fn } = compileShader("return vec4(1, 1, 1, 1);");
  const ctx = makeCtx(4);
  const { log, error } = renderShader(fn, 0, undefined, undefined, ctx, 4);
  assertEquals(log, null);
  assertEquals(error, null);
});

Deno.test("renderShader: inspect log has correct fragCoord and result", () => {
  const { fn } = compileShader("return vec4(0.5, 0.25, 0.75, 1.0);");
  const res = 8;
  const ctx = makeCtx(res);
  // Inspect pixel (2, 3) in screen-space
  const { log } = renderShader(fn, 0, 2, 3, ctx, res);
  assertExists(log);
  // fragCoord follows GLSL convention: y is flipped
  assertEquals(log.fragCoord.x, 2.5);
  assertEquals(log.fragCoord.y, (res - 1 - 3) + 0.5);
  assertEquals(log.iResolution.x, res);
  assertEquals(log.iResolution.y, res);
  assertEquals(log.iTime, 0);
  assertEquals(log.result.r, 0.5);
});

Deno.test("renderShader: debug calls only captured for inspected pixel", () => {
  const { fn } = compileShader(`
    debug("pos", fragCoord);
    return vec4(0, 0, 0, 1);
  `);
  const res = 4;
  const ctx = makeCtx(res);
  const { log } = renderShader(fn, 0, 1, 1, ctx, res);
  assertExists(log);
  assertEquals(log.debug.length, 1);
  assertEquals(log.debug[0].label, "pos");
});

Deno.test("renderShader: iTime is forwarded to shader", () => {
  const { fn } = compileShader("return vec4(iTime, 0, 0, 1);");
  const res = 2;
  const ctx = makeCtx(res);
  const { log } = renderShader(fn, 3.0, 0, 0, ctx, res);
  assertExists(log);
  assertEquals(log.result.r, 3.0);
});

Deno.test("renderShader: runtime error in shader returns error message and error color", () => {
  const { fn } = compileShader("throw new Error('boom'); return vec4(0,0,0,1);");
  const res = 2;
  const ctx = makeCtx(res);
  const { error } = renderShader(fn, 0, -1, -1, ctx, res);
  // Error is surfaced in the return value
  assert(error !== null && error.includes('boom'), `expected error message, got: ${error}`);
  // Error color is vec4(1, 0, 0.5, 1) → r=255, g=0, b=127, a=255
  assertEquals(ctx.data[0], 255);
  assertEquals(ctx.data[1], 0);
  assertEquals(ctx.data[3], 255);
});
