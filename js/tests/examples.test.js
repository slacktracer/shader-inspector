import { assert, assertExists, assertEquals } from "jsr:@std/assert";
import { EXAMPLES } from "../examples.js";
import { compileShader, renderShader } from "../shader-runner.js";
import { vec2 } from "../glsl-runtime.js";

function makeCtx(res) {
  const data = new Uint8ClampedArray(res * res * 4);
  return {
    data,
    createImageData(w, h) {
      return { data: new Uint8ClampedArray(w * h * 4), width: w, height: h };
    },
    putImageData(imageData) { data.set(imageData.data); },
  };
}

const KEYS = Object.keys(EXAMPLES);

// Every example must compile without error
for (const key of KEYS) {
  Deno.test(`examples: "${key}" compiles without error`, () => {
    const { fn, error } = compileShader(EXAMPLES[key]);
    assertEquals(error, null, `compile error: ${error}`);
    assertExists(fn);
  });
}

// Every compiled example must return a valid vec4 for a sample pixel
for (const key of KEYS) {
  Deno.test(`examples: "${key}" returns a valid vec4 for a sample pixel`, () => {
    const { fn } = compileShader(EXAMPLES[key]);
    const noop = () => {};
    const result = fn(vec2(64.5, 64.5), vec2(128, 128), 0, noop);
    assertExists(result);
    assertEquals(result.type, "vec4");
    assert(result.r >= 0 && result.r <= 1, `r out of range: ${result.r}`);
    assert(result.g >= 0 && result.g <= 1, `g out of range: ${result.g}`);
    assert(result.b >= 0 && result.b <= 1, `b out of range: ${result.b}`);
    assert(result.a >= 0 && result.a <= 1, `a out of range: ${result.a}`);
  });
}

// Every example renders a full 4×4 frame without throwing
for (const key of KEYS) {
  Deno.test(`examples: "${key}" renders a full frame`, () => {
    const { fn } = compileShader(EXAMPLES[key]);
    const ctx = makeCtx(4);
    renderShader(fn, 0, -1, -1, ctx, 4);
    // At least one pixel should be non-zero
    const hasContent = ctx.data.some((v) => v > 0);
    assert(hasContent, "all pixels are zero — shader produced no output");
  });
}

// EXAMPLES has exactly 7 entries
Deno.test("examples: has 7 entries", () => {
  assertEquals(KEYS.length, 7);
});
