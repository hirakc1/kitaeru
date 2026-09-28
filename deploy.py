"""Publish Kitaeru: bump the service-worker cache version, commit, push.

Usage:  python deploy.py "What changed"

GitHub Pages republishes automatically after the push. Bumping the version in
sw.js is what makes installed phones drop their cached copy and fetch the new build.
"""
import re
import subprocess
import sys
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SW = ROOT / "sw.js"


def git(*args):
    return subprocess.run(["git", *args], cwd=ROOT, check=True, text=True, capture_output=True).stdout.strip()


def main():
    message = " ".join(sys.argv[1:]).strip() or "Update Kitaeru"

    if not git("status", "--porcelain"):
        ahead = git("rev-list", "--count", "@{u}..HEAD") if git("remote") else "0"
        if ahead == "0":
            print("Nothing to deploy: OneDrive copy already matches GitHub.")
            return

    version = datetime.now().strftime("v%Y.%m.%d-%H%M")
    src = SW.read_text(encoding="utf-8")
    new_src, n = re.subn(r"const VERSION = '[^']*';", f"const VERSION = '{version}';", src, count=1)
    if n != 1:
        sys.exit("Could not find `const VERSION = '...'` in sw.js")
    SW.write_text(new_src, encoding="utf-8")

    git("add", "-A")
    git("commit", "-m", f"{message} ({version})")
    print(git("push"))
    print(f"Deployed {version}. Live in ~1-2 min at https://hirakc1.github.io/kitaeru/")


if __name__ == "__main__":
    main()
