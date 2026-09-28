# Kitaeru 鍛える

A free calisthenics app. It builds a training plan from your goals, time, body, injuries and equipment, and shows skeletal animations of every exercise with the muscles in use highlighted. It also tracks your progress and streaks.

- No account, no ads, no backend. Your data stays in your browser's local storage, and you can export or import it.
- It's an installable PWA that works offline.
- Vanilla JavaScript ES modules, with no build step and no dependencies.

**Live:** https://hirakc1.github.io/kitaeru/

## Run locally

```bash
python -m http.server 8770
```

Then open http://localhost:8770. Add `?nosw` to the URL to turn off the offline cache while developing.

## Deploy

```bash
python deploy.py "What changed"
```

This bumps the service-worker cache version so installed phones update, then commits and pushes. GitHub Pages republishes within 1–2 minutes.

## Layout

| Path | What |
|---|---|
| `js/data/` | Exercise library (82 exercises) and muscles |
| `js/engine/planner.js` | Plan generation, progression and streaks (pure functions) |
| `js/anim/` | Skeletal animation renderer, poses and body map |
| `js/ui/`, `js/app.js`, `js/store.js` | Screens, router and persistence |
| `docs/research.md` | Evidence base for the programming rules |
| `docs/CONTRACTS.md` | Module interfaces |
| `tests/planner.test.html` | Planner test suite (open in a browser) |
| `anim-test.html` | Gallery of every animation |

Kitaeru isn't medical advice. See the in-app disclaimer.
