# Working on Kitaeru from two computers

GitHub holds the master copy of Kitaeru. Each computer keeps its own copy in `C:\Dev\Kitaeru` and swaps changes with GitHub. If you follow the routine in Part 3, the two computers stay in step.

- **Machine 1:** this PC (`HIRAKOFFICE`). It's already set up, so you don't need to do Parts 1 and 2 here.
- **Machine 2:** the other computer. Do Part 1 once, then Part 2 once.

**One thing that's different from Aporia:** GitHub's `main` branch *is* the live app. Whatever is on it is published at https://hirakc1.github.io/kitaeru/. So **End session never publishes**. It saves unfinished work to a separate holding place on GitHub (a branch called `wip`), and Start session on the other computer brings that work back. Publishing stays a deliberate step: you ask Claude to deploy.

---

## Part 1: Install the tools on machine 2 (once, about 10 minutes)

1. **Git**
   - Go to https://git-scm.com/download/win and download "64-bit Git for Windows Setup".
   - Run it and keep clicking **Next**. All the defaults are fine.
2. **Python**
   - Go to https://www.python.org/downloads/ and click the yellow **Download Python 3.x** button.
   - Run it. **On the first screen, tick "Add python.exe to PATH"** at the bottom, then click **Install Now**.
3. **Claude** (so you can work with me there)
   - Install the Claude desktop app from https://claude.ai/download and sign in with your usual account.
4. **Restart the computer** so Windows picks up the new tools.

Kitaeru needs nothing else: no Node.js and no Java.

## Part 2: Download Kitaeru onto machine 2 (once, about 5 minutes)

1. Open **PowerShell**: press the Windows key, type `PowerShell`, and press Enter.
2. Paste these three lines, pressing Enter after each:
   ```powershell
   mkdir C:\Dev
   cd C:\Dev
   git clone https://github.com/hirakc1/kitaeru.git Kitaeru
   ```
   - If `C:\Dev` already exists, the first line shows an error. Ignore it.
   - The repo is public, so the download doesn't ask you to sign in.
3. Open `C:\Dev\Kitaeru` in File Explorer and double-click **`Set up this machine.bat`**.
   - It sets your Git name, creates the local preview settings and installs the Python libraries for the animation tools.
   - Wait for **"Done. This computer is ready."**, then press any key.

The first time End session (or a deploy) saves to GitHub from machine 2, a browser window asks you to **sign in to GitHub**. Sign in as **hirakc1** and click **Authorize**. This is asked once only.

Don't use GitHub's green "Code → Download ZIP" button: a ZIP copy can't sync with GitHub.

## Part 3: The routine, on either computer, every time

| When | Do this |
|---|---|
| **Before you start working** | Double-click **`Start session.bat`** in `C:\Dev\Kitaeru`. It downloads the latest version from GitHub, plus any unfinished work you saved on the other computer. Wait for "You can start working." |
| **While working with Claude** | Open the Claude session **in `C:\Dev\Kitaeru`**. On machine 2, tell Claude first: *"Read docs/HANDOFF.md, then let's continue with Kitaeru."* |
| **To publish** | Ask Claude to deploy. That runs `python deploy.py "…"`, which updates the live app and phones. |
| **When you finish** | Double-click **`End session.bat`**. It saves unfinished work to GitHub **without publishing it**. Wait for "Safe to switch computers." |

**The one rule:** work on one computer at a time. Always run **End session** on the computer you're leaving, then **Start session** on the one you're moving to.

## If something goes wrong

Each message tells you exactly what to say to Claude. Nothing is ever lost.

- **Start session says "This needs a hand".** It's usually one of two things:
  - this computer has changes that weren't saved, usually because End session was skipped here last time;
  - the work saved on the other computer is based on an older version (something was deployed in between).

  Paste the quoted sentence to Claude in `C:\Dev\Kitaeru`.
- **End session says "Push failed".** It's usually no internet, or GitHub asking you to sign in again. Reconnect and run it again. If it still fails, ask Claude.
- **End session says GitHub holds unfinished work from the other computer.** You skipped Start session here. Paste the quoted sentence to Claude; it will combine both.
- **You forgot End session and you're now on the other computer.** Don't make big changes. Go back, run End session there first, then run Start session here.
- **Deploy says "This copy is … behind GitHub".** Run Start session first, then deploy again.

## What does NOT travel between the computers (and why that's fine)

| Item | Why that's fine |
|---|---|
| `docs/founder-tasks.md` (your to-do notes) | Kept off GitHub on purpose, because the repo is public. Copy it across yourself (USB or email) if you want it on both computers. |
| `.claude/launch.json` (local preview settings) | Created by `Set up this machine.bat` from `tools/launch.json`. |
| `C:\Users\hirak\KitaeruTools\` (about 790 MB: MakeHuman data and motion-capture downloads) | Only needed to rebuild the 3D bodies or the real-motion clips. The built results are in the repo. If that work happens on machine 2, Claude can download the sources again (the URLs are in `assets/v3/LICENSES.md`), or you can copy the folder across. |
| **Claude's memory** | It's kept per computer. On machine 2, Claude learns everything from `docs/HANDOFF.md`, which does travel with GitHub. Keep that file up to date by asking Claude to "update the handoff" at the end of a session. |
| Your workout data in the app | It lives in each browser or phone (Me → Export / Import moves it). It isn't part of the project. |
