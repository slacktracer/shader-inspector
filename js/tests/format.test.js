import { assertEquals } from "jsr:@std/assert";
import { fmt, toHex } from "../format.js";
import { vec2, vec3, vec4 } from "../glsl-runtime.js";

// ── fmt ───────────────────────────────────────────────────────────────────────

Deno.test("fmt: number default 4 decimals", () => assertEquals(fmt(0.12345), "0.1235"));
Deno.test("fmt: number custom digits", () => assertEquals(fmt(1, 2), "1.00"));
Deno.test("fmt: zero", () => assertEquals(fmt(0), "0.0000"));
Deno.test("fmt: negative", () => assertEquals(fmt(-1.5, 1), "-1.5"));
Deno.test("fmt: null", () => assertEquals(fmt(null), "null"));
Deno.test("fmt: undefined", () => assertEquals(fmt(undefined), "null"));

Deno.test("fmt: vec2", () => {
  assertEquals(fmt(vec2(1, 2)), "vec2(1.0000, 2.0000)");
});
Deno.test("fmt: vec3", () => {
  assertEquals(fmt(vec3(1, 2, 3)), "vec3(1.0000, 2.0000, 3.0000)");
});
Deno.test("fmt: vec4", () => {
  assertEquals(fmt(vec4(1, 2, 3, 4)), "vec4(1.0000, 2.0000, 3.0000, 4.0000)");
});
Deno.test("fmt: vec2 custom digits", () => {
  assertEquals(fmt(vec2(0.5, 0.25), 2), "vec2(0.50, 0.25)");
});

// ── toHex ─────────────────────────────────────────────────────────────────────

Deno.test("toHex: red", () => assertEquals(toHex(1, 0, 0), "#ff0000"));
Deno.test("toHex: green", () => assertEquals(toHex(0, 1, 0), "#00ff00"));
Deno.test("toHex: blue", () => assertEquals(toHex(0, 0, 1), "#0000ff"));
Deno.test("toHex: black", () => assertEquals(toHex(0, 0, 0), "#000000"));
Deno.test("toHex: white", () => assertEquals(toHex(1, 1, 1), "#ffffff"));
Deno.test("toHex: midgrey", () => assertEquals(toHex(0.5, 0.5, 0.5), "#808080"));
Deno.test("toHex: clamps above 1", () => assertEquals(toHex(2, 0, 0), "#ff0000"));
Deno.test("toHex: clamps below 0", () => assertEquals(toHex(-1, 0, 0), "#000000"));
Deno.test("toHex: mixed clamp", () => assertEquals(toHex(2, -1, 0.5), "#ff0080")); // 0.5*255=127.5 → rounds to 128
