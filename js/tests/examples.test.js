import { assert, assertEquals } from "jsr:@std/assert";
import { EXAMPLES } from "../examples.js";

const KEYS = Object.keys(EXAMPLES);

// ── Structural tests (no transpiler needed) ────────────────────────────────────

// EXAMPLES has exactly 7 entries
Deno.test("examples: has 7 entries", () => {
  assertEquals(KEYS.length, 7);
});

// Every value is a non-empty string
for (const key of KEYS) {
  Deno.test(`examples: "${key}" is a non-empty string`, () => {
    assert(typeof EXAMPLES[key] === "string" && EXAMPLES[key].length > 0);
  });
}

// Every example is a valid Shadertoy-style GLSL shader
for (const key of KEYS) {
  Deno.test(`examples: "${key}" contains void mainImage`, () => {
    assert(
      EXAMPLES[key].includes("void mainImage"),
      `Expected 'void mainImage' in example "${key}"`,
    );
  });
}

// ── Transpile + render tests ───────────────────────────────────────────────────
// These require the CDN transpiler (https://esm.sh/glsl-transpiler).
// They are marked ignore until a deno.json with the glsl-transpiler dep is added.

for (const key of KEYS) {
  Deno.test({
    name: `examples: "${key}" compiles and renders (requires glsl-transpiler)`,
    ignore: true,
    fn() {
      // TODO: import compileGLSL, compile example, call renderShader on a 4×4 ctx
    },
  });
}
