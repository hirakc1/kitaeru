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

## v1.3 founder feedback (deployed as v2026.09.29-1147)
- Quick, moments and Library "Make a workout": **Kit today** chips (profile kit by default, changed for the day only, never written to the profile) and a **Level** −2…+2 control; the preview says what the level changed.
- **Shuffle** gives a different workout each press while the pool allows (`request.shuffle`, logged with the request); a small pool says so.
- Warm-up, mobility and cardio moves get **Swap** (same region and purpose) instead of Easier / Harder; the Library detail lists "Similar moves".
- Library "not for you now" is now the reason ("not with your knee", "needs a pull-up bar", "high impact (you chose low impact)"…).
- The player shows the motion trail (fainter) and the breath ring on holds, breathing and flows, following Me → Animation extras. Flow copy: "Follow the count on screen. There's no music to keep time with."
- Tests: 141,938 passed. Screenshots in `docs/v1.3-ui/`.

## Shipped 2026-09-29
- **v1.2** (v2026.09.29-1055):
  - All 132 exercises are on anim v2. v1 is only a fallback.
  - 5 fact-checked traditions (Morning Taisō, Tai Chi, Baduanjin, Pehlwani, Horse stance) with culture cards.
  - Rotation and anti-rotation families.
  - The 7 Quick goals give distinct content.
  - Library "Make a workout" from any discipline or category.
  - 9 moments (朝 伸 活 食 備 整 静 旅 息); research in `docs/moments.md`.
  - A Balance goal.
  - Japanese label fixes (耐, 軽・中・重, 自分).
  - New Welcome copy. No tilt anywhere.
- **App name** is now "Kitaeru 鍛える".
- **Updates auto-apply:** the app reloads when a new version activates, never mid-workout, and checks for updates when it comes back to the foreground. Users never need to reinstall, except to refresh the home-screen icon or name.
- **v1.3** (v2026.09.29-1147): see the section above.
- **Founder animation fixes:** marching arm swing, side-bend and trunk-circle arm path, diamond push-up hands plus a generic `detail` inset, and baithak on the balls of the feet.
- **Animation review page:** `anim-review.html`, live at https://hirakc1.github.io/kitaeru/anim-review.html. The founder marks each clip Good or Needs work with a comment and exports the notes.

## Shipped 2026-09-29 (afternoon)
- **v2026.09.29-1249, faster first load:** screens load on demand (`app.js` ROUTES are dynamic imports). The light helpers live in `js/ui/base.js`, which must stay free of data and planner imports. Welcome needs 27 KB of JS instead of 225 KB; Today needs 178 KB, since the planner and exercise data are genuinely needed there. The other screens are prefetched when the browser is idle.
- **v2026.09.29-1447, v1.3a:**
  - The 13 Morning Taisō and Baduanjin steps are promoted to standalone moves (verified, with a new `dose` field and planner rules).
  - The Library shows a "Sources" line.
  - The standalone arm circles are renamed "Taisō arm circles".
  - The research is in `docs/flow-and-breath.md` and the fact-check in `docs/flow-and-breath-factcheck.md`.
- **v2026.09.29-1525:**
  - Timed holds on one-sided moves run once per side, with a 5 s "switch sides" countdown between.
  - Morning Taisō clips are corrected against the Kampo and NHK figures: stance per step, a deeper knee bend, straight arms crossing overhead, the hops, and the diagonal bend with the arms opening down. A foot steps rather than slides when the stance changes (`blendPose`).
  - New page `taiso-check.html` for checking the steps one by one against a video.
  - `sw.js` no longer serves the app shell for other `.html` pages.

## Flow and breath (v1.3b), decided 2026-09-29 ("go with recommendations")
- **Next build:** the 9 new moves, about 31 clips.
  - Standing post (toes slightly in) and bow stance.
  - Sun Salutation (the Sivananda 12-position version, with a disclosed normal breath in the plank).
  - Tree (goes in a new `balance_hold` family).
  - Warrior II (re-based on the sources we read; the hold is Kitaeru's own).
  - Triangle.
  - Makkō-hō (one flow; step 4 adapted).
  - Breath-paced walk (generic, no Systema).
  - Cards for yoga, Makkō-hō and standing post; no Systema card.
  - The Sun Salutation is excluded for wrist and lower-back users, with the reason shown.
- **Seated Taisō is on hold:** it needs one official NHK seated video check by the founder (`docs/founder-tasks.md`, local only, excluded from git). The KeikoFlex video the founder used is unofficial and doesn't count as a source.
- The Makkō-hō courtesy email is dropped. The trademark checks (真向法, ラジオ体操, Systema) are still needed before any marketing use.

## In progress / next
1. **Founder animation review:** the founder is reviewing all 132 clips on `anim-review.html` and will send the exported notes. Route each note to the animator (anim branch `worktree-agent-a9739dc712fdd0781`, which is merged into main). The generic `detail` inset exists for hand and foot close-ups.
2. **Founder is still reviewing v1.2/v1.3** in depth. Expect more feedback.
3. **Follow-ups worth doing:**
   - Measure phone performance on the founder's Android. Final QA saw 29 ms median frames at 4× CPU throttle; the player drops to half rate above 8 ms.
   - Lazy-load the v1.2 data and planner: the first load grew to about 230 KB gzip, +72 KB.
   - Check the Radio Taisō trademark (J-PlatPat or Japan Post Insurance) before using the name anywhere beyond the credit line.
   - "Suggest a correction" is parked: it needs a way to filter bad information.
   - B-direction 3D view later.
   - v1.3+ traditions from `docs/world-movement.md` §7.
3. **Known gaps:**
   - A reactive deload isn't done.
   - Deleting a log doesn't roll back level changes.
   - Offline mode on a real phone hasn't been confirmed.
   - Weaker v1 animations: inchworm, bear crawl, front-view arm circles.

## Working rules
- Don't run Claude sessions on **both** PCs at the same time in this folder. OneDrive syncing `.git` mid-write can corrupt the repo.
- Commit or deploy only when the founder asks, or as part of an agreed deploy.
