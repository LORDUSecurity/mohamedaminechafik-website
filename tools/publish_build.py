"""Rebuilds `main`, the branch GitHub Pages deploys.

The working checkout stays on `dev` in the dev layout -- museum app at the root,
portfolio under site/ -- while Pages serves one folder tree, so the published
tree is flattened: the portfolio takes the root and the museum moves under
museum/, which works because every asset path in both apps is relative.

Usage: python tools/publish_build.py [-m "message"]
"""
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WT = ROOT / ".publish-tmp"
BRANCH = "main"
DEV = "dev"
MUSEUM = ["index.html", "js", "lib", "images", "icons"]


def git(*args, cwd=ROOT):
    return subprocess.run(["git", *args], cwd=str(cwd), check=True,
                          capture_output=True, text=True).stdout.strip()


IDENTITY = ["-c", "user.name=amine2004tech",
            "-c", "user.email=m.amine.chafik.2004@gmail.com"]


def skip(name):
    return ".bak-" in name or name in (".git", ".publish-tmp", "node_modules")


def clean(target):
    for entry in target.iterdir():
        if entry.name == ".git":
            continue
        shutil.rmtree(entry) if entry.is_dir() else entry.unlink()


def copy_into(src, dest):
    if src.is_dir():
        out = dest / src.name
        out.mkdir(parents=True, exist_ok=True)
        for entry in src.iterdir():
            if not skip(entry.name):
                copy_into(entry, out)
    else:
        shutil.copy2(src, dest / src.name)


def main():
    msg = sys.argv[sys.argv.index("-m") + 1] if "-m" in sys.argv else None

    here = git("rev-parse", "--abbrev-ref", "HEAD")
    if here == BRANCH:
        raise SystemExit(f"refusing to rebuild {BRANCH} from a {BRANCH} checkout "
                         f"-- that would delete the dev layout. Check out {DEV} first.")

    git("worktree", "prune")
    if not WT.exists():
        git("worktree", "add", str(WT), BRANCH)

    clean(WT)
    for entry in (ROOT / "site").iterdir():
        if not skip(entry.name):
            copy_into(entry, WT)
    for name in MUSEUM:
        copy_into(ROOT / name, WT / "museum")
    # Without this Pages runs the tree through Jekyll, which drops
    # underscore-prefixed assets instead of serving them.
    (WT / ".nojekyll").write_text("")

    git("add", "-A", cwd=WT)
    changed = git("status", "--porcelain", cwd=WT)
    if changed:
        git(*IDENTITY, "commit", "-q",
            "-m", msg or "Rebuild the published site from dev", cwd=WT)
    git("worktree", "remove", "--force", str(WT))
    print(("published " if changed else "unchanged ") +
          git("rev-parse", "--short", BRANCH))


main()
