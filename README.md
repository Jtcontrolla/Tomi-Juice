# Tomi Juice — three-flavour immersive site

Vite + Three.js + GSAP ScrollTrigger. One pinned, scroll-scrubbed hero plays
**Mango → Cranberry → Orange**, then hands off to the rest of the page.

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # production build in dist/
npm run prep:assets  # regenerate public/ textures + images from /assets
```

## How the hero works
- `src/hero/scene.js` – one WebGL context. The can is a real 3D cylinder whose
  front and back halves wrap **genuine Tomi label photos** (cropped/straightened
  by `scripts/prep-assets.mjs`). Each flavour change is a physical 180° turn that
  brings the next label round; the hidden face is swapped while it faces away.
- `src/hero/fruit.js` – procedural mango / cranberry / orange pieces drawn with
  `InstancedMesh` (one draw call per fruit type), layered back/mid/front.
- `src/main.js` – the single pinned GSAP timeline (0–2 Mango · 2–4 transition ·
  4–6 Cranberry · 6–8 transition · 8–9.2 Orange · 9.2–10 hand-off), picker sync,
  sections, and the Instagram-DM order builder.
- After the hero, the same fixed 3D stage keeps the can on screen: it glides into
  an empty right-hand "can rail" (`--rail` in `styles.css`; on phones it tucks
  behind the right edge), turns with the scroll showing a new flavour every
  half-turn, then at the footer moves centre, tips over and pours a juice stream
  that splashes onto "Pour yourself some #tomitime".
- Layering: section backgrounds sit below the canvas and section content above
  it, so the can never covers text. On mobile the hero copy sits on top and the
  can floats underneath.
- Rendering pauses when the tab is hidden; mobile gets fewer fruit, lower
  DPR and no pointer tilt; `prefers-reduced-motion` disables idle motion.

## Content notes
All copy comes from the packaging or @tomi.juice; headlines are the brief's
creative lines. No prices, partner names or awards are invented — the Partners
section is a contact CTA until real partner logos are supplied.
