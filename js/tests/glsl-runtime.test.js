import { assertEquals, assertAlmostEquals } from "jsr:@std/assert";
import {
  vec2, vec3, vec4, sw,
  vadd, vsub, vmul, vdiv, vneg,
  sin, cos, sqrt, abs, floor, ceil, sign, fract, mod,
  clamp, mix, step, smoothstep,
  length, normalize, dot, cross, reflect, distance,
  max, min, pow, atan, exp, log,
  PI, TAU,
} from "../glsl-runtime.js";

const EPS = 1e-6;
const near = (a, b) => assertAlmostEquals(a, b, EPS);

// ── vec constructors ──────────────────────────────────────────────────────────

Deno.test("vec2: two args", () => {
  const v = vec2(1, 2);
  assertEquals(v.x, 1); assertEquals(v.y, 2);
  assertEquals(v.r, 1); assertEquals(v.g, 2);
  assertEquals(v.type, 'vec2');
});
Deno.test("vec2: scalar broadcast", () => {
  const v = vec2(5);
  assertEquals(v.x, 5); assertEquals(v.y, 5);
});
Deno.test("vec3: three args", () => {
  const v = vec3(1, 2, 3);
  assertEquals(v.x, 1); assertEquals(v.y, 2); assertEquals(v.z, 3);
  assertEquals(v.type, 'vec3');
});
Deno.test("vec3: scalar broadcast", () => {
  const v = vec3(7);
  assertEquals(v.x, 7); assertEquals(v.y, 7); assertEquals(v.z, 7);
});
Deno.test("vec3: from vec2 + float", () => {
  const v = vec3(vec2(1, 2), 3);
  assertEquals(v.x, 1); assertEquals(v.y, 2); assertEquals(v.z, 3);
});
Deno.test("vec4: four args", () => {
  const v = vec4(1, 2, 3, 4);
  assertEquals(v.x, 1); assertEquals(v.y, 2); assertEquals(v.z, 3); assertEquals(v.w, 4);
  assertEquals(v.r, 1); assertEquals(v.g, 2); assertEquals(v.b, 3); assertEquals(v.a, 4);
  assertEquals(v.type, 'vec4');
});
Deno.test("vec4: scalar broadcast", () => {
  const v = vec4(3);
  assertEquals(v.x, 3); assertEquals(v.y, 3); assertEquals(v.z, 3); assertEquals(v.w, 3);
});
Deno.test("vec4: from vec3 + float", () => {
  const v = vec4(vec3(1, 2, 3), 4);
  assertEquals(v.x, 1); assertEquals(v.y, 2); assertEquals(v.z, 3); assertEquals(v.w, 4);
});
Deno.test("vec4: from vec2 + vec2", () => {
  const v = vec4(vec2(1, 2), vec2(3, 4));
  assertEquals(v.x, 1); assertEquals(v.y, 2); assertEquals(v.z, 3); assertEquals(v.w, 4);
});

// ── swizzle ───────────────────────────────────────────────────────────────────

Deno.test("sw: xy from vec4", () => {
  const v = sw(vec4(1, 2, 3, 4), 'xy');
  assertEquals(v.type, 'vec2'); assertEquals(v.x, 1); assertEquals(v.y, 2);
});
Deno.test("sw: zw from vec4", () => {
  const v = sw(vec4(1, 2, 3, 4), 'zw');
  assertEquals(v.type, 'vec2'); assertEquals(v.x, 3); assertEquals(v.y, 4);
});
Deno.test("sw: xyz from vec4", () => {
  const v = sw(vec4(1, 2, 3, 4), 'xyz');
  assertEquals(v.type, 'vec3'); assertEquals(v.x, 1); assertEquals(v.y, 2); assertEquals(v.z, 3);
});
Deno.test("sw: rgba from vec4", () => {
  const v = sw(vec4(0.1, 0.2, 0.3, 0.4), 'rgba');
  assertEquals(v.type, 'vec4');
  near(v.x, 0.1); near(v.y, 0.2); near(v.z, 0.3); near(v.w, 0.4);
});
Deno.test("sw: single component", () => {
  assertEquals(sw(vec3(1, 2, 3), 'z'), 3);
});

// ── arithmetic ────────────────────────────────────────────────────────────────

Deno.test("vadd: vec+vec", () => {
  const v = vadd(vec2(1, 2), vec2(3, 4));
  assertEquals(v.x, 4); assertEquals(v.y, 6);
});
Deno.test("vadd: vec+scalar", () => {
  const v = vadd(vec2(1, 2), 10);
  assertEquals(v.x, 11); assertEquals(v.y, 12);
});
Deno.test("vadd: scalar+vec", () => {
  const v = vadd(10, vec2(1, 2));
  assertEquals(v.x, 11); assertEquals(v.y, 12);
});
Deno.test("vadd: scalar+scalar", () => assertEquals(vadd(3, 4), 7));

Deno.test("vsub: vec-vec", () => {
  const v = vsub(vec2(5, 6), vec2(1, 2));
  assertEquals(v.x, 4); assertEquals(v.y, 4);
});
Deno.test("vsub: scalar-scalar", () => assertEquals(vsub(10, 3), 7));

Deno.test("vmul: vec*vec", () => {
  const v = vmul(vec2(2, 3), vec2(4, 5));
  assertEquals(v.x, 8); assertEquals(v.y, 15);
});
Deno.test("vmul: vec*scalar", () => {
  const v = vmul(vec2(2, 3), 2);
  assertEquals(v.x, 4); assertEquals(v.y, 6);
});
Deno.test("vmul: scalar*vec", () => {
  const v = vmul(3, vec2(2, 4));
  assertEquals(v.x, 6); assertEquals(v.y, 12);
});

Deno.test("vdiv: vec/scalar", () => {
  const v = vdiv(vec2(6, 8), 2);
  assertEquals(v.x, 3); assertEquals(v.y, 4);
});
Deno.test("vdiv: scalar/scalar", () => assertEquals(vdiv(10, 2), 5));

Deno.test("vneg: vec2", () => {
  const v = vneg(vec2(1, -2));
  assertEquals(v.x, -1); assertEquals(v.y, 2);
});
Deno.test("vneg: vec3", () => {
  const v = vneg(vec3(1, 2, 3));
  assertEquals(v.x, -1); assertEquals(v.y, -2); assertEquals(v.z, -3);
});
Deno.test("vneg: scalar", () => assertEquals(vneg(5), -5));

// ── scalar builtins ───────────────────────────────────────────────────────────

Deno.test("sin/cos", () => {
  near(sin(0), 0); near(cos(0), 1);
  near(sin(Math.PI / 2), 1); near(cos(Math.PI), -1);
});
Deno.test("sqrt", () => near(sqrt(4), 2));
Deno.test("abs", () => { assertEquals(abs(-3), 3); assertEquals(abs(3), 3); });
Deno.test("floor/ceil", () => {
  assertEquals(floor(2.9), 2); assertEquals(ceil(2.1), 3);
});
Deno.test("sign", () => {
  assertEquals(sign(-5), -1); assertEquals(sign(0), 0); assertEquals(sign(3), 1);
});
Deno.test("fract", () => near(fract(3.75), 0.75));
Deno.test("mod", () => near(mod(7, 3), 1));
Deno.test("clamp", () => {
  assertEquals(clamp(0.5, 0, 1), 0.5);
  assertEquals(clamp(-1, 0, 1), 0);
  assertEquals(clamp(2, 0, 1), 1);
});
Deno.test("pow", () => near(pow(2, 10), 1024));
Deno.test("atan one-arg", () => near(atan(1), Math.PI / 4));
Deno.test("atan two-arg (atan2)", () => near(atan(1, 1), Math.PI / 4));
Deno.test("exp/log", () => { near(exp(1), Math.E); near(log(Math.E), 1); });

// ── vec builtins ──────────────────────────────────────────────────────────────

Deno.test("sin vec2 component-wise", () => {
  const v = sin(vec2(0, Math.PI / 2));
  near(v.x, 0); near(v.y, 1);
});
Deno.test("abs vec2 component-wise", () => {
  const v = abs(vec2(-1, 2));
  assertEquals(v.x, 1); assertEquals(v.y, 2);
});
Deno.test("floor vec3 component-wise", () => {
  const v = floor(vec3(1.9, 2.1, -0.5));
  assertEquals(v.x, 1); assertEquals(v.y, 2); assertEquals(v.z, -1);
});

// ── mix ───────────────────────────────────────────────────────────────────────

Deno.test("mix: scalar", () => near(mix(0, 10, 0.3), 3));
Deno.test("mix: vec2 scalar t", () => {
  const v = mix(vec2(0, 0), vec2(10, 20), 0.5);
  near(v.x, 5); near(v.y, 10);
});
Deno.test("mix: vec2 vec t", () => {
  const v = mix(vec2(0, 0), vec2(10, 20), vec2(0.2, 0.5));
  near(v.x, 2); near(v.y, 10);
});

// ── step / smoothstep ─────────────────────────────────────────────────────────

Deno.test("step", () => {
  assertEquals(step(0.5, 0.3), 0); assertEquals(step(0.5, 0.7), 1);
});
Deno.test("smoothstep: below lo", () => assertEquals(smoothstep(0.2, 0.8, 0.1), 0));
Deno.test("smoothstep: above hi", () => assertEquals(smoothstep(0.2, 0.8, 0.9), 1));
Deno.test("smoothstep: midpoint", () => near(smoothstep(0, 1, 0.5), 0.5));

// ── length / normalize / dot / cross / reflect / distance ─────────────────────

Deno.test("length vec2", () => near(length(vec2(3, 4)), 5));
Deno.test("length vec3", () => near(length(vec3(1, 2, 2)), 3));
Deno.test("length scalar", () => near(length(-7), 7));

Deno.test("normalize vec2", () => {
  const v = normalize(vec2(3, 4));
  near(length(v), 1);
});

Deno.test("dot vec2", () => near(dot(vec2(1, 2), vec2(3, 4)), 11));
Deno.test("dot vec3", () => near(dot(vec3(1, 0, 0), vec3(0, 1, 0)), 0));

Deno.test("cross", () => {
  const v = cross(vec3(1, 0, 0), vec3(0, 1, 0));
  near(v.x, 0); near(v.y, 0); near(v.z, 1);
});

Deno.test("reflect", () => {
  const i = vec3(1, -1, 0);
  const n = vec3(0,  1, 0);
  const r = reflect(i, n);
  near(r.x, 1); near(r.y, 1); near(r.z, 0);
});

Deno.test("distance", () => near(distance(vec2(0, 0), vec2(3, 4)), 5));

// ── min / max ─────────────────────────────────────────────────────────────────

Deno.test("min: scalar", () => assertEquals(min(2, 5), 2));
Deno.test("max: scalar", () => assertEquals(max(2, 5), 5));
Deno.test("min: vec+scalar", () => {
  const v = min(vec2(3, 1), 2);
  assertEquals(v.x, 2); assertEquals(v.y, 1);
});
Deno.test("max: vec+vec", () => {
  const v = max(vec2(1, 5), vec2(3, 2));
  assertEquals(v.x, 3); assertEquals(v.y, 5);
});

// ── constants ─────────────────────────────────────────────────────────────────

Deno.test("PI", () => near(PI, 3.141592653589793));
Deno.test("TAU", () => near(TAU, 6.283185307179586));
