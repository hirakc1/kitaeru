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
- **Timed holds:** 3-2-1 get-ready, then a countdown to the top of the `holdSec` range. It auto-logs at 0, and "Stop & log" still logs early.
- **Opening screen:**
  - One stage only: no pulsing boot square, and the splash is skipped before setup because the Welcome screen is the opening.
  - It shows the seal, the name, "鍛える · to forge" and the line "Movement disciplines from around the world, brought together to strengthen body and mind."
  - It runs 3.6 s (the founder found 2.8 s too fast) and can be tapped to skip.
  - Nothing in the app is tilted: the logo seal, every stamp (forge, completion, 済) and the seal-like marks all sit straight (founder, 2026-09-28).
- **Anim v2, direction A** (deployed as v2026.09.28-1455):
  - 37 of the 82 exercises (batches 1 and 2) use it, lazy-loaded (~2 KB at first load). v1 is the fallback for the rest.
  - The breath ring and motion trail are controlled by Me → Animation extras.
  - Stepping and weight transfer are built (Tai Chi pilots).
  - Phone speed is still unmeasured: ask the founder how it feels.

## Decisions log (2026-09-28)
- Animation: A now, B (3D) later as an optional view.
- **Logo: direction B, the carved seal (白文).** Assets are in `docs/brand/b/` on the designer's branch. Every character is an OFL-font vector path (`docs/brand/LICENSES.md`); nothing depends on a font at runtime. A hand-carved seal by a 篆刻家 is a possible later upgrade.
- Theme: Auto is the default. Light is the brand identity for store screenshots and marketing.
- **No paid reviewers (no budget).** Accuracy comes from sources instead:
  - at least 2 independent sources per move, official ones where they exist;
  - an independent fact-check agent sets `verified`, never the author;
  - cards show a "Sources" line, never "Reviewed by".
- "Suggest a correction" is **parked**: the founder wants a way to filter out bad information first.
- Radio Taisō:
  - Shown as "Morning Taisō"; the music is never used.
  - Attribution: "the Radio Taisō No. 1 movements (NHK / Japan Post Insurance). Kitaeru is not affiliated with them."
  - The trademark status of the name is unconfirmed.
- A `balance` goal is added. Morning Taisō keeps the day streak alive but doesn't count towards the weekly target.

## In progress / next
1. **Logo B into the app:** seal(), splash, Welcome, icons, favicon, and a 済 stamp. Designer agent, branch `worktree-agent-a77ca9ac54c00de37`.
2. **Anim v2 for v1.2 content:** rotation and anti-rotation (14 clips, generic, can ship first), then dand, baithak and horse stance, then Morning Taisō, Tai Chi and Baduanjin. Animator agent, branch `worktree-agent-a9739dc712fdd0781`.
   - After that, batches 3–5 for the remaining 45 v1 exercises: core/skill, conditioning (needs an airborne mode), and mobility.
3. **v1.2 world movement:** plan in `docs/v1.2-plan.md`.
   - Data, planner and UI are done on branch `worktree-agent-af2910817cf165163` (115,203 tests).
   - **All 5 traditions are verified** (Morning Taisō, Tai Chi, Baduanjin, Pehlwani, Horse stance).
   - Still hidden, because an animation gate means nothing unanimated is planned. It ships when the clips land and the founder has reviewed it.
3. **Known gaps:**
   - A reactive deload isn't done.
   - Deleting a log doesn't roll back level changes.
   - Offline mode on a real phone hasn't been confirmed.
   - Weaker v1 animations: inchworm, bear crawl, front-view arm circles.

## Working rules
- Don't run Claude sessions on **both** PCs at the same time in this folder. OneDrive syncing `.git` mid-write can corrupt the repo.
- Commit or deploy only when the founder asks, or as part of an agreed deploy.
