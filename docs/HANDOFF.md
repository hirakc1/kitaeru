# Kitaeru — PM handoff

This is the current state for a new Claude session picking up the project. Claude acts as **project manager**: it researches, plans, "hires" agents, oversees the build, tests, gathers the founder's feedback and iterates. **Marketing and launch planning start only once the founder says they're happy with the product.**

## Where things are
- **Code:** `C:\Dev\Kitaeru` (moved out of OneDrive on 2026-10-02 to stop OneDrive and git clashing). It's a git repo; **GitHub is the only sync** between the founder's two PCs, and each PC has its own clone at `C:\Dev\Kitaeru`.
  - Setting up the other PC (once): `git clone https://github.com/hirakc1/kitaeru.git C:\Dev\Kitaeru`, then in it `git config user.name hirakc1` and `git config user.email hirakc1@users.noreply.github.com`. Local-only files don't come with a clone: copy `docs/founder-tasks.md`, `.claude/launch.json` and the `.git/info/exclude` lines over if wanted.
  - The old OneDrive folder (`OneDrive - Eka Finance\Claude\Projects\Kitaeru`) is retired: don't work in it. The founder can delete it once happy.
- **Tools outside the repo:** `C:\Users\hirak\KitaeruTools\` (MPFB2/MakeHuman data for `build_body.py`, motion-capture downloads in `mocap\`). Not synced; the other PC needs its own copy to rebuild bodies or clips.
- **Live site:** https://hirakc1.github.io/kitaeru/ (GitHub Pages, main branch, served from the repo root). The repo is github.com/hirakc1/kitaeru.
- **Git identity** (repo-local): `hirakc1` / `hirakc1@users.noreply.github.com`. Keep using the noreply address.
- **Deploy:** `python deploy.py "message"`. It refuses to run if this copy is behind GitHub (pull first), bumps the `VERSION` in `sw.js` so phones update, then commits and pushes. Note that it runs `git add -A`, so work-in-progress files must be committed or excluded first.
- **Run locally:** `python -m http.server 8770` (or the `kitaeru` entry in `.claude/launch.json`, which sends no-cache headers), then open `/?nosw`. There is no Node on the machine; Python 3 is used for everything.
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

## Shipped 2026-09-30
- **v1.3b (08:20):** 8 Flow and breath moves plus the yoga, Makkō-hō and standing-post cards. Warrior II and योग were verified by a separate check (flow-and-breath-factcheck.md §9).
- **Taisō pace (09:12):** timed from Kampo's official video, 180 s in total; the deep breath uses the official pace (founder); no muscle highlight (`showMuscles: false`).
- **Terms gate and human body (this deploy):**
  - `#/terms` must be accepted (`settings.terms.v === TERMS_VERSION` in store.js) before anything past Welcome. The terms name **Levin Chakravorty** (founder's decision; change it when a company exists and bump TERMS_VERSION).
  - UK law can't exclude liability for death or personal injury caused by negligence, so the terms say so. The founder has been advised to get a solicitor's review before promoting the app.
  - **Anim v3:** an everyday MakeHuman CC0 body (female and male) driven live from the v2 motion (`js/anim/v3/retarget.js`). The Taisō uses the solid look (`bodyLook: 'solid'`); everything else is see-through with muscles. The Me → Animation setting can switch back to the classic skeleton.
  - three.js and the bodies sit in a long-lived `kitaeru-assets-<hash>` cache; `deploy.py` writes the hash.
  - Pilot-only files (Quaternius bodies, CMU clip, the pilot player) are kept out of git via `.git/info/exclude`.
- **Next for animation:** real motion without a performer (CMU, Mixamo via the founder's own account, and so on). The founder has no performer and said the Taisō could be dropped if it costs too much.

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

## 2026-10-01 (not yet deployed)
- **Human body everywhere, fixed:** one lost WebGL context (normal on Android when the app goes to the background) used to switch every animation to the classic skeleton for the rest of the session. That's why the founder saw only a few human bodies. Now the player rebuilds the body when the page is visible again, and thumbnails move to a fresh shared renderer. Only more than 4 losses in a minute fall back (`skeleton.js` LOSS_*).
- **Athletic body** (founder): `build_body.py` SHAPES `athletic` (the default) uses MakeHuman muscle/weight/proportion sliders plus CC0 detail targets. `everyday` rebuilds the old bodies byte for byte.
- **anim-review.html:** a Figure menu (Human body / Skeleton / Both side by side) and a Female/Male menu.
- **Real motion:** a research agent is surveying free mocap licences and coverage, writing `docs/anim-v3-mocap-sources.md`. The Taisō is out of scope for real motion if it's costly (founder); it keeps its current animation.
- Tests: 149,492 passed.
- **Deployed** as v2026.10.01-0939 (body fix, athletic body), 1154 (real-motion pilot on anim-review.html, see `docs/anim-v3-mocap-pilot.md`; sources in `docs/anim-v3-mocap-sources.md`) and 1156.
- **Review pages and the offline cache:** `sw.js` used to serve a review page's scripts from the app's cached version while the page itself came fresh, so a deploy could leave the page blank (a missing export). Requests from any non-index `.html` page now go to the network (revalidated). The review page also shows the skeleton with a note (reason, and Chrome's hardware-acceleration setting) when the 3D body can't run, instead of a zero-height box.
- **Real motion in the app** (v2026.10.01-1433, founder: "Real motion much better"): 13 ids play motion capture when the figure is the human body: bodyweight_squat, jumping_jack, marching_in_place, breath_paced_walk, vrikshasana, sn_prayer, sn_raised_arms, sn_forward_fold, sn_dog, sn_lunge_in_r/l, sn_rise, sn_stand. Everything else stays hand-keyed (most free takes are the wrong variant; list and reasons in `docs/anim-v3-mocap.md`). Clips load lazily into the `kitaeru-mocap-<MOCAP_ID>` cache (deploy.py hashes them). Credits in Me → About. Also fixed: the hand-keyed sn_lunge_r/l standing foot popping ~25 cm (yoga.js `legMax`).
- **Next for real motion:** more coverage needs new sources (e.g. CC BY video through `mediapipe_to_landmarks.py`, or our own performer); see the sources doc §7.
- (Earlier) **Waiting on the founder:** the pilot verdicts (Better / Same / Worse per clip) via Export notes. HDM05 CC BY-SA accepted for the pilot; no Mixamo; Taisō out of real-motion scope.

## In progress / next (as of 2026-10-01, end of session)
**Start here next time:** run `git pull` in `C:\Dev\Kitaeru` (the project moved there from OneDrive on 2026-10-02). The founder is using the app (v2026.10.01-1433) and will come back with feedback: ask for it first.

1. **Founder feedback from using the app.** Expect notes on real motion, the athletic body and anything else. Check first whether the human body now shows reliably on the founder's desktop Chrome. If it doesn't, the review page's red note gives the reason (likely Chrome → Settings → System → "Use graphics acceleration when available").
2. **Founder still to do:** the seated Taisō check on NHK (`docs/founder-tasks.md`, local only); phone feel of the 3D body on Android; the per-clip review on `anim-review.html` (Figure menu: Human / Skeleton / Both / Real motion vs current) with Export notes.
3. **Real motion: more coverage (founder: "keep this in mind for later").** Only 13 clips have it, because the free takes are mostly the wrong variant. The two routes to more: (a) openly licensed exercise video through `assets/v3/pipeline/mediapipe_to_landmarks.py` (licence and consent checked per video; e.g. the CC BY 4.0 Mendeley fitness set in `docs/anim-v3-mocap-sources.md` §7); (b) film our own performer (`docs/anim-v3-pilot.md` §9). Rules agreed: no Mixamo without Adobe's written OK; HDM05 CC BY-SA is accepted; the Taisō stays hand-keyed.
4. **Follow-ups worth doing:**
   - Measure phone performance on the founder's Android. Final QA saw 29 ms median frames at 4× CPU throttle; the player drops to half rate above 8 ms.
   - Lazy-load the v1.2 data and planner: the first load grew to about 230 KB gzip, +72 KB.
   - Check the Radio Taisō trademark (J-PlatPat or Japan Post Insurance) before using the name anywhere beyond the credit line.
   - "Suggest a correction" is parked: it needs a way to filter bad information.
   - v1.3+ traditions from `docs/world-movement.md` §7.
   - A solicitor's review of the terms before promoting the app.
5. **Known gaps:**
   - A reactive deload isn't done.
   - Deleting a log doesn't roll back level changes.
   - Offline mode on a real phone hasn't been confirmed.
   - Weaker v1 animations: inchworm, bear crawl, front-view arm circles.
   - Tests that drive animation can stall in a hidden browser tab. Run `tests/planner.test.html` in headless Chrome (CDP helpers in `assets/v3/pipeline/bench_cdp.py` / `shots.py`). Last run: 149,513 passed.
   - Visual QA: `anim-v3.html?phases=<ids>&n=8&body=f|m&look=solid` is a contact sheet; `shots.py` captures it at full size.

## Working rules
- **Start of every session: `git pull`. End: commit and push** (or deploy). That's how the other PC sees the work. Avoid working on both PCs at once; if it happens, pull before pushing.
- Commit or deploy only when the founder asks, or as part of an agreed deploy.
