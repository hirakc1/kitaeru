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
APP_VERSION = ROOT / "js" / "version.js"


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
    # The long-lived asset cache is named by a hash of those files, so phones re-download them only when they change.
    import hashlib
    files = re.search(r"const ASSET_FILES = \[([^\]]*)\]", new_src).group(1)
    h = hashlib.sha1()
    for rel in re.findall(r"'\./([^']+)'", files):
        h.update((ROOT / rel).read_bytes())
    new_src, n = re.subn(r"const ASSETS_ID = '[^']*';", f"const ASSETS_ID = '{h.hexdigest()[:10]}';", new_src, count=1)
    if n != 1:
        sys.exit("Could not find `const ASSETS_ID = '...'` in sw.js")
    # The real-motion clips' cache is named by a hash of every clip (names and bytes): unchanged clips stay cached.
    hm = hashlib.sha1()
    for f in sorted((ROOT / "assets" / "v3" / "mocap").glob("*.kclip.json")):
        hm.update(f.name.encode())
        hm.update(f.read_bytes())
    new_src, n = re.subn(r"const MOCAP_ID = '[^']*';", f"const MOCAP_ID = '{hm.hexdigest()[:10]}';", new_src, count=1)
    if n != 1:
        sys.exit("Could not find `const MOCAP_ID = '...'` in sw.js")
    SW.write_text(new_src, encoding="utf-8")
    # The app shows the same version on Me -> About (js/version.js).
    app_src = APP_VERSION.read_text(encoding="utf-8")
    app_src, n = re.subn(r"export const VERSION = '[^']*';", f"export const VERSION = '{version}';", app_src, count=1)
    if n != 1:
        sys.exit("Could not find `export const VERSION = '...'` in js/version.js")
    APP_VERSION.write_text(app_src, encoding="utf-8")

    git("add", "-A")
    git("commit", "-m", f"{message} ({version})")
    print(git("push"))
    print(f"Deployed {version}. Live in ~1-2 min at https://hirakc1.github.io/kitaeru/")


if __name__ == "__main__":
    main()
