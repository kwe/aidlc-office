# AI-DLC v2 · Mission Control: The Office

A single-file browser game that walks one intent through the AWS AI-DLC v2 lifecycle inside a 3D office.

- `v3.html` is the game. Open it in a browser; it has no server or install step. Fonts load from Google Fonts and fall back to system fonts offline.
- `v2.html` is the original 2D version, unchanged.

## Layout

| Path | What it is |
|---|---|
| `src/game.html` | Game shell, styles, method data, scenario and engine. Derived from `v2.html`. |
| `src/office/` | The three.js office: scene, camera, characters, effects, painted screens. |
| `blender/build_assets.py` | Generates every 3D asset (office, 14 agent bots, Conductor, 5 humans, props). |
| `blender/out/office.glb` | The generated asset file that gets embedded in `v3.html`. |
| `build.mjs` | Bundles `src/office` with esbuild and inlines it and the GLB into `v3.html`. |
| `tools/check.mjs` | Parses the built game script so a syntax error fails the build. |

## Build

```bash
npm install
npm run assets   # only after editing blender/build_assets.py (needs Blender 5.x at /Applications/Blender.app)
npm run build    # writes v3.html
```

The game talks to the office only through the `NET` bridge in `src/game.html`. The office reads room, desk, dock and gate
positions from `A_*` empties in the GLB, so the layout lives in the Blender script alone.

## Method data

Stage slugs, modes, lead, support and reviewer agents, conditional flags and imported sensors are in the `UPSTREAM` table in
`src/game.html`. It is generated from the stage frontmatter of
[awslabs/aidlc-workflows](https://github.com/awslabs/aidlc-workflows) (release 2.11.4, commit `8c4f79b`). Scope switches
(sensors, reviewers, plan approval, walking skeleton, collaborators, Guard Policy, depth) are in `PROFILES` and mirror
`core/scopes/aidlc-{express,feature,enterprise}.md`. The scenario, scoring, gate ownership and the incident are game fiction.

## Third-party

- [three.js](https://threejs.org) (MIT) is bundled into `v3.html`; its licence notice is kept in the bundle.
- Method data is derived from [awslabs/aidlc-workflows](https://github.com/awslabs/aidlc-workflows) (MIT-0). This project is
  not affiliated with or endorsed by AWS.
- Fonts (Space Grotesk, Inter, JetBrains Mono) load from Google Fonts at run time.

## Autoplay (testing)

`v3.html?auto=1&role=po&prof=feature&speed=60` plays a full run by itself and sets `window.__done` at the debrief.

- `auto=1` best answers · `auto=bad` worst answers and rubber stamps · `auto=fix` worst answers, then request every fix
- `role` = `po` `eng` `pm` `ops` `sec` · `prof` = `express` `feature` `enterprise`
- `motion=0` reduced motion · `hold=boss` stop at the incident · `slow=3.5` play one stage at normal speed
