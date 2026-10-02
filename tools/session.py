"""Working on Kitaeru from two computers (see docs/TWO_MACHINES.md). Run through the .bat files in the project folder.

    python tools/session.py setup    once per computer
    python tools/session.py start    before working: the latest from GitHub, plus any unfinished work from the other computer
    python tools/session.py end      after working: unfinished work saved to GitHub for the other computer

GitHub's `main` branch IS the live app (GitHub Pages publishes it), so unfinished work never goes to main. `end` saves it
to a separate branch, `wip` (one commit on top of main), and `start` on the other computer brings it back as ordinary
uncommitted changes and deletes the branch. Publishing stays a deliberate step: `python deploy.py "message"`.
"""
import os
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MACHINE = os.environ.get("COMPUTERNAME", "this computer")
WIP = "wip"
TOOLS = Path(os.environ.get("USERPROFILE", str(Path.home()))) / "KitaeruTools"


def run(*args, check=True):
    r = subprocess.run(["git", *args], cwd=ROOT, text=True, capture_output=True)
    if check and r.returncode:
        raise RuntimeError(f"git {' '.join(args)} failed:\n{r.stderr.strip() or r.stdout.strip()}")
    return r.stdout.strip()


def ok(*args):
    return subprocess.run(["git", *args], cwd=ROOT, capture_output=True).returncode == 0


def dirty():
    return bool(run("status", "--porcelain"))


def wip_info():
    """(sha, machine) of origin/wip, or None."""
    if not ok("rev-parse", "--verify", "-q", f"origin/{WIP}"):
        return None
    msg = run("log", "-1", "--format=%s", f"origin/{WIP}")
    return run("rev-parse", f"origin/{WIP}"), msg.rsplit("from ", 1)[-1] if "from " in msg else "the other computer"


def ask_claude(what):
    print(f"\nThis needs a hand. Open Claude in C:\\Dev\\Kitaeru and say:\n  \"{what}\"\nNothing has been lost.")
    return 1


def setup():
    print("=== Kitaeru: setting up this computer ===")
    run("config", "user.name", "hirakc1")
    run("config", "user.email", "hirakc1@users.noreply.github.com")
    print("Git name set (hirakc1, GitHub's private no-reply email).")
    launch = ROOT / ".claude" / "launch.json"
    if not launch.exists():
        launch.parent.mkdir(exist_ok=True)
        shutil.copy(ROOT / "tools" / "launch.json", launch)
        print("Local preview settings created (.claude/launch.json).")
    print("Installing the Python libraries for the animation tools (a minute or two the first time)...")
    r = subprocess.run([sys.executable, "-m", "pip", "install", "--user", "--quiet", "--disable-pip-version-check",
                        "numpy", "scipy", "matplotlib", "pillow", "websockets"])
    print("Libraries installed." if r.returncode == 0 else
          "The libraries did not install. The app and deploying don't need them, only rebuilding bodies or motion clips.")
    if not TOOLS.exists():
        print(f"\nNote: {TOOLS} is not on this computer. It is only needed to rebuild the 3D bodies or motion clips;")
        print("Claude can download what it needs again if that ever comes up (docs/TWO_MACHINES.md, Part 4).")
    print("\n=== Done. This computer is ready. ===")
    return 0


def start():
    print("=== Getting the latest Kitaeru from GitHub ===")
    run("fetch", "--prune", "--quiet")
    w = wip_info()
    if w and dirty():
        return ask_claude(f"Start session found unfinished work from {w[1]} on GitHub, but this computer also has "
                          "unsaved changes in C:\\Dev\\Kitaeru. Please combine them.")
    if not ok("pull", "--ff-only", "--quiet"):
        return ask_claude("git pull failed in C:\\Dev\\Kitaeru, please sort it out.")
    print("Up to date with the live version.")
    if w:
        sha, machine = w
        if not ok("merge-base", "--is-ancestor", "HEAD", sha):
            return ask_claude(f"Start session: the unfinished work from {machine} (branch wip) is based on an older "
                              "version of main. Please bring it over.")
        # bring the work over as ordinary uncommitted changes: move to the wip commit, then back to main keeping the files
        main = run("rev-parse", "HEAD")
        run("merge", "--ff-only", "--quiet", sha)
        run("reset", "--quiet", "--mixed", main)
        run("push", "--quiet", "origin", "--delete", WIP)
        print(f"Brought over the unfinished work from {machine}. It is on this computer now (not published).")
    print("\nYou can start working.")
    print(run("status", "-sb"))
    return 0


def end():
    print("=== Saving your work to GitHub ===")
    run("fetch", "--prune", "--quiet")
    ahead = run("rev-list", "--count", "@{u}..HEAD")
    w = wip_info()
    if not dirty() and ahead == "0":
        if w and w[1] == MACHINE:
            run("push", "--quiet", "origin", "--delete", WIP)   # an old save from here, already published since
        print("Nothing new to save. Safe to switch computers.")
        return 0
    if w and w[1] != MACHINE:
        return ask_claude(f"End session: GitHub still holds unfinished work from {w[1]} that this computer never "
                          "brought over. Please combine it with the changes here.")
    if dirty():
        run("add", "-A")
        run("commit", "--quiet", "--no-verify", "-m", f"Unfinished work from {MACHINE}")
        made = True
    else:
        made = False
    pushed = ok("push", "--quiet", "--force", "origin", f"HEAD:refs/heads/{WIP}")
    if made:
        run("reset", "--quiet", "--mixed", "HEAD~1")   # keep working here exactly as before: nothing committed to main
    if not pushed:
        print("\nPush failed: usually no internet, or GitHub wants you to sign in again. Reconnect and run End session again.")
        print("If it still fails, ask Claude. Your work is still on this computer.")
        return 1
    print("\nSaved to GitHub as unfinished work (NOT published to the live app). Safe to switch computers.")
    print("On the other computer, run Start session to pick it up.")
    return 0


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else ""
    try:
        sys.exit({"setup": setup, "start": start, "end": end}[cmd]())
    except KeyError:
        print(__doc__)
        sys.exit(2)
    except RuntimeError as e:
        print(e)
        sys.exit(ask_claude(f"The Kitaeru {cmd} session script failed in C:\\Dev\\Kitaeru, please look at it."))
