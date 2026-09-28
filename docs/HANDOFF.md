# Kitaeru — PM handoff

This is the current state for a new Claude session picking up the project. Claude acts as **project manager**: it researches, plans, "hires" agents, oversees the build, tests, gathers the founder's feedback and iterates. **Marketing and launch planning start only once the founder says they're happy with the product.**

## Where things are
- **Code:** this folder, which is a git repo. It's synced by OneDrive between the founder's two PCs.
- **Live site:** https://hirakc1.github.io/kitaeru/ (GitHub Pages, main branch, served from the repo root). The repo is github.com/hirakc1/kitaeru.
- **Git identity** (repo-local): `hirakc1` / `hirakc1@users.noreply.github.com`. Keep using the noreply address.
- **Deploy:** `python deploy.py "message"`. It bumps the `VERSION` in `sw.js` so phones update, then commits and pushes. Note that it runs `git add -A`, so work-in-progress files must be committed or excluded first.
- **Run locally:** `python -m http.server 8770`, then open `/?nosw`. There is no Node on the machine; Python 3 is used for everything.
- **Specs:** `docs/CONTRACTS.md` (module APIs), `docs/research.md` (training science), `docs/world-movement.md` (world movement traditions, v1.2 plan).
- **Tests:** `tests/planner.test.html` in the browser. The last run was 86,882 passed, 0 failed. `anim-test.html` is the animation gallery.

## Decisions made
- Vanilla-JS PWA with no build step and no backend or accounts. Data lives in localStorage with export/import. The app stays free.
- Japanese-minimal design: washi, sumi, vermilion.

## Shipped
- **v1.0:** onboarding, plan engine (research-based), 82 exercises with a 2D skeletal animation and muscle highlight, workout player, weekly-primary streaks with freezes, progress, library.
- **v1.1** (2026-09-28): Quick workout with no setup. You pick a time plus a goal or a body area; body-map muscle tapping uses `generateQuickSession`. Also fixed from founder feedback: day chips sync with days/week, the weight format is st&lb | kg | lb, plank baseline is entered in min+sec, and preferences have an edit hub.

- **Timed holds** (2026-09-28, committed but not deployed yet): Start runs a 3-2-1 get-ready, then counts down to the target (the top of the `holdSec` range). It auto-logs at 0, and "Stop & log" still logs early.

## In progress / next
1. **Animation level-up.** This is founder feedback: "much higher quality, better skeleton, more fluid, a real level up".
   - A senior animator was building two prototypes in `js/anim/v2/`, `js/vendor/` and `anim-v2-compare.html`, with screenshots in `docs/anim-v2/`:
     - **A:** premium 2D anatomical.
     - **B:** 3D with three.js vendored.
   - Each prototype covers push_up, bodyweight_squat and pull_up, plus a rotational move.
   - The prototypes are **complete** (2026-09-28) but **not committed**.
   - Both directions share one 3D rig: C2 splines, tempo, two-bone IK with no sliding, and secondary motion.
   - **A** adds about 15–26 KB gzipped and is recommended as the default. **B** adds about 171 KB of three.js, which the animator suggests offering later as an optional "3D view" for Tai Chi and rotation moves.
   - Converting all 82 exercises takes about 4–6 weeks of agent work. Stepping with a support-foot switch needs about 1 more week.
   - Still rough: the pelvis and hand silhouettes need an art pass.
   - **Decided (2026-09-28): A now, B later.** A becomes the default renderer for all 82 exercises. B comes later as an optional "3D view" for the v1.2 world-movement and rotation moves. Prototypes are committed.
   - **Next:** convert all 82 exercises to A while keeping the `createSkeletonPlayer` API, plus the pelvis/hands art pass. Review in batches with the founder before deploying.
   - The world-movement wave needs trunk rotation, stepping with weight transfer, flows, hand shapes and a breath indicator. That leans towards 3D.
2. **v1.2 world-movement wave:** see `docs/world-movement.md` §7. It covers Radio Taisō No.1 (movements only; the music is copyrighted, and the name/trademark needs checking), Tai Chi singles and short flow, Baduanjin, horse stance, Hindu push-up and squat, rotation / anti-rotation families, and schema additions (`tradition`, `nativeName`, `sequence`, `plane`). Each tradition must be reviewed and credited by a practitioner before it ships.
3. **Known gaps:**
   - A reactive deload isn't done.
   - Deleting a log doesn't roll back level changes.
   - Offline mode on a real phone hasn't been confirmed.
   - Weaker v1 animations: inchworm, bear crawl, front-view arm circles.

## Working rules
- Don't run Claude sessions on **both** PCs at the same time in this folder. OneDrive syncing `.git` mid-write can corrupt the repo.
- Commit or deploy only when the founder asks, or as part of an agreed deploy.
