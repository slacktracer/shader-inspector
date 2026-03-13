# GLSL Pixel Inspector — Project Context

## What I wanted

I'm studying GLSL shaders and wanted a tool to help me understand how fragment shaders work internally. Specifically, I wanted something that could:

- Simulate a fragment shader **pixel by pixel** in software (CPU-side), without needing a GPU or WebGL context
- Let me **inspect the exact output values** of any pixel by clicking on it
- Show intermediate values (uniforms, computed variables) so I can trace *why* a pixel has a certain color
- Be usable as a **learning tool** — not just a renderer, but a debugger for shader logic

I also asked about existing libraries for converting GLSL to JS (glsl-transpiler, glsl-simulator, gpu.js) before deciding to build a custom interactive tool.

---

## What was built

A single-file HTML tool: `shader-inspector.html`

### Architecture

**1. GLSL Runtime in JavaScript**

Since JS has no operator overloading, a full GLSL type system was implemented manually:

- `vec2`, `vec3`, `vec4` as plain objects with `x/y/z/w` and `r/g/b/a` aliases
- `vadd`, `vsub`, `vmul`, `vdiv`, `vneg` for component-wise arithmetic
- `sw(v, 'xy')` helper for swizzling
- All standard GLSL built-ins: `sin`, `cos`, `sqrt`, `abs`, `floor`, `fract`, `mod`, `clamp`, `mix`, `step`, `smoothstep`, `length`, `normalize`, `dot`, `cross`, `reflect`, `distance`, `pow`, `atan`, `mix`, etc.
- Constants: `PI`, `TAU`

**2. Shader Execution Model**

The user writes a `mainImage(fragCoord, iResolution, iTime, debug)` function — matching the Shadertoy convention. For each pixel:

- `fragCoord` is the pixel center in GLSL convention (origin bottom-left)
- `iResolution` is the canvas size as a `vec2`
- `iTime` is elapsed time in seconds (for animation)
- The function must return a `vec4` (RGBA, values 0–1)

The entire canvas is rendered by calling this function once per pixel and writing the result into a 2D canvas `ImageData` buffer.

**3. Per-Pixel Inspector**

Clicking any pixel re-renders the full canvas while capturing a debug log for that specific pixel. The inspector panel shows:

- `fragCoord` — the exact pixel coordinate passed to the shader
- `iResolution` and `iTime` — the uniform values at render time
- `gl_FragColor` — the `vec4` output with a color swatch and hex value
- Individual R/G/B/A channels as floats (0.0–1.0)
- Any values logged via `debug("label", value)` inside the shader code — this is the key introspection mechanism

**4. Editor & Controls**

- Textarea with syntax highlighting via font/color treatment
- `Ctrl+Enter` to run
- `▶ Animate` button drives `iTime` via `requestAnimationFrame`
- Resolution selector: 64×64, 128×128, 256×256
- Render time display (ms)
- 7 built-in example shaders (selectable from a dropdown)

**5. Example Shaders Included**

Each example is annotated with comments explaining the concepts:

| Example | Concepts covered |
|---|---|
| UV Coordinates | Normalizing fragCoord, basic color mapping |
| SDF Circle | Signed distance fields, aspect ratio correction |
| Stripes & Smoothstep | Repeating patterns, anti-aliased edges |
| Plasma Wave | Multi-frequency sine waves, iTime animation |
| Checkerboard | `mod` + `floor` for grid patterns |
| Radial Gradient | Distance from center, vignette |
| Normal Map Look | Gradient approximation, encoding directions as color |

---

## Why this approach

- **No dependencies, ever** — the project is intentionally vanilla JS. No npm, no bundler, no transpiler. Keep it that way.
- **No transpiler dependency** — writing the runtime from scratch means every operation is inspectable and debuggable; there's no black-box translation layer
- **CPU-side execution** — running on CPU (instead of WebGL) is what makes pixel-level inspection possible; GPU shaders execute in parallel on hardware with no way to observe intermediate values
- **Shadertoy-compatible API** — `mainImage` / `iResolution` / `iTime` naming means knowledge transfers directly to Shadertoy and other GLSL environments
- **Single HTML file** — zero build step, zero dependencies, works offline, easy to serve with Deno (`deno run --allow-net --allow-read jsr:@std/http/file-server .`)
- **`debug()` function** — the key pedagogical feature; it lets the learner instrument their own shader and see exactly what value a variable holds at a specific pixel, the same way `console.log` works in regular JS

---

## How to serve it

```bash
deno run --allow-net --allow-read jsr:@std/http/file-server .
# open http://localhost:4507/shader-inspector.html
```

Or with a minimal custom server:

```ts
// server.ts
Deno.serve({ port: 8000 }, async (req) => {
  const file = await Deno.readFile("shader-inspector.html");
  return new Response(file, { headers: { "content-type": "text/html" } });
});
```
