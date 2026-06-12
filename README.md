# Indie Profile Page — Huijin Kang

A pure static, single-page indie profile that lists my apps and their **monthly revenue (MRR)** — built in public.
No framework, **no build step**. HTML + CSS + vanilla JS, with [Chart.js](https://www.chartjs.org/), [Three.js](https://threejs.org/) (ES modules via import map) and Google Fonts loaded from a CDN — nothing to compile.

The profile features an **interactive 3D robot** (`profile3d.js`): it follows your cursor, waves on load, and plays a random emote when clicked. Model: [RobotExpressive](https://github.com/mrdoob/three.js/tree/dev/examples/models/gltf/RobotExpressive) (CC0), stored locally in `assets/models/`. If WebGL or the model fails to load, it falls back to the avatar image.

**Live:** https://huijinkang.github.io/

## Files

```
index.html   skeleton (header / app-list / footer containers) + inline anti-FOUC theme script
style.css    design tokens (light/dark) + all styles
data.js      ← edit ONLY this file to maintain (profile + apps). Exposes `profile`, `apps` globals
app.js       reads data.js → renders DOM, sums total MRR, handles dark-mode toggle
assets/      avatar (optional) + app icons (downloaded locally, no hotlinking)
```

`data.js` loads first, `app.js` second. Rendering code never touches the data.

## Maintenance — updating revenue

Every month, edit the `mrr` number for each app in `data.js` and push. The header total recalculates automatically.
Adding an app = append one object to the `apps` array in `data.js`.

- `mrr` totals are formatted with `Intl.NumberFormat`; values ≥ 1000 abbreviate to `$1.2k/mo`.
- `status`: `live` | `acquired` (optional `soldFor`) | `discontinued`.
- Card order follows the `data.js` array order (no re-sorting).

## Dark mode

Priority: saved `localStorage` choice → `prefers-color-scheme` → light.
The theme is applied by an inline `<head>` script before paint to avoid flash (FOUC), then persisted on toggle.

## Deploy (GitHub Pages)

1. Repo must be named exactly **`HuijinKang.github.io`** (user-site) so it serves from the root `https://huijinkang.github.io/`. Push all files to the `main` branch root.
2. **Settings → Pages → Build and deployment → Source: Deploy from a branch** → branch `main` / folder `/ (root)` → Save.
3. Wait 1–2 min, then open https://huijinkang.github.io/.
4. (Optional) Custom domain: Settings → Pages → Custom domain.

All paths are relative (`./assets/...`, `./data.js`) so the site also works under a sub-path and in local preview.

## Local preview

```
python3 -m http.server 8000
# open http://localhost:8000
```
