# Vansh Agarwal: portfolio

A road-trip themed, single-page portfolio with a 3D avatar, built with Vite, TypeScript and Three.js.
Fully static, deployed on GitHub Pages at https://vansh-agarwal.github.io/Portfolio/

## Run it locally

```bash
npm install
npm run dev        # http://localhost:5173/Portfolio/
npm run build      # type-checks, then builds to dist/
npm run preview    # serves dist/ at http://localhost:4173/Portfolio/
```

Node 20 or newer is required (CI uses Node 22).

## Deploy to GitHub Pages

Deployment is automatic through `.github/workflows/deploy.yml`.

1. Push this repo to `github.com/vansh-agarwal/Portfolio`.
2. On GitHub, open **Settings > Pages** and set **Source** to **GitHub Actions** (one-time setup).
3. Push to `main`. The workflow runs `npm ci` and `npm run build`, then publishes `dist/`.
4. Watch progress in the **Actions** tab. The site goes live at https://vansh-agarwal.github.io/Portfolio/

You can also trigger a deploy by hand from **Actions > Deploy to GitHub Pages > Run workflow**.

If the repo is ever renamed, update `base` in `vite.config.ts` and the absolute URLs (canonical, Open Graph,
JSON-LD) at the top of `index.html`.

## Project structure

```
index.html                 All page content, SEO tags, JSON-LD, and the inline SVG fallback avatar
src/main.ts                Entry: loads fonts and styles, starts the UI modules
src/styles/tokens.css      Colour, type, spacing, radius and shadow tokens
src/styles/base.css        Reset, buttons, chips, nav, odometer, focus styles
src/styles/sections.css    Hero, about, skills, work, experience, contact, footer
src/ui/                    Nav, odometer, scroll reveals, magnetic buttons, extras, hero stage
src/avatar/config.ts       Avatar settings: procedural or GLB, bone names, palette
src/avatar/procedural.ts   The stylized character built from primitives
src/avatar/glb.ts          Loader path for a real .glb model
src/avatar/animator.ts     Breathing, weight shift, look-at, wave intro, groove reaction
src/avatar/scene.ts        Renderer, camera, ground disc, input, render loop
scripts/render-assets.mjs  Renders public/og.png and public/apple-touch-icon.png from the 3D scene
tools/                     Dev-only render harness (not part of the production build)
public/                    favicon.svg, og.png, apple-touch-icon.png
assets/reference/          Reference photo for the avatar (not shipped)
```

## How the hero avatar loads

1. The SVG illustration in `index.html` paints instantly and is the fallback.
2. If WebGL works, reduced motion is off and Save-Data is off, Three.js is lazy-loaded on the first
   interaction (or about 2.5 s after the page settles), and the 3D canvas crossfades in.
3. The render loop pauses when the hero is off screen or the tab is hidden. Phones get a lower pixel
   ratio and lighter geometry, with no post-processing (outlines use the cheap inverted-hull trick).

## Swapping in a real .glb model

1. Export a rigged character facing +Z, feet at the origin, about 1.75 units tall.
2. Save it as `public/models/vansh.glb`.
3. In `src/avatar/config.ts` set `source: 'glb'` and update `glb.bones` to match your skeleton
   (Mixamo names are the default). Tweak `scale`, `yOffset` and `rotationY` if needed.

The animator only talks to the `AvatarRig` interface in `src/avatar/rig.ts`, so the wave, look-at and
groove reactions keep working with the new model.

## Regenerating the share image and icon

After changing the avatar, run:

```bash
npm run render-assets
```

This starts a temporary Vite server and uses headless Chrome to write `public/og.png` (1200x630) and
`public/apple-touch-icon.png`. Set `CHROME_PATH` if Chrome isn't found automatically.
`public/favicon.svg` is hand-made from the SVG avatar's head.

## Budgets

- JS: about 3.5 KB gzipped on first load; the Three.js scene chunk is about 158 KB gzipped and lazy.
- Light theme only, AA contrast, keyboard navigable, reduced-motion aware.
