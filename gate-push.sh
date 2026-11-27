#!/usr/bin/env bash
# Gate and push (D-1373, the founder's D-1371 Q7: "Gates must pass before ANY push, merges included"; D-1381, the
# founder's D-1380 Q9: infra and the marketing site too, the mirror inside infra's gate).
#
#   ./gate-push.sh app    --owner D-NNNN [--dry-run]     intelcost-app-react
#   ./gate-push.sh api    --owner D-NNNN [--dry-run]     intelcost-app-fastapi
#   ./gate-push.sh infra  --owner D-NNNN [--dry-run]     intelcost-infra (the workspace mirror is in it)
#   ./gate-push.sh market --owner D-NNNN [--dry-run]     intelcost-market-next
#
# Pushes the repo's umer-dev to origin umer-dev, and only when every gate exited 0 on exactly the tree it sends.
# A merge, cherry-pick, revert or rebase makes commits no gate read; this is where they are caught.
#
#   1. Refuses unless: the repo is on umer-dev; nothing is staged, unstaged or untracked (not ignored); no merge,
#      rebase, cherry-pick, revert or am is in progress; no quantity table is running. So the working tree is
#      exactly HEAD's tree.
#   2. A gate pass stamp E:\Intelcost\.private\gate-pass\<kind>-<HEAD's tree> at most 24 h old (gate-commit.sh
#      writes it, for a commit or --verify-head) is used as it is. Without one, it runs
#      `gate-commit.sh <kind> --owner D-NNNN --verify-head`: every gate on HEAD, every exit code read; any non-zero
#      stops here, nothing is pushed. The gates per repo are listed in gate-commit.sh (infra: shell, node and python
#      syntax, the names scan, no private file, a QT pass when the range touches its inputs; market: lint, build).
#   3. Checks HEAD and the stamp again, then `git push [--dry-run] origin umer-dev`. Never a force, never another
#      branch: a remote that moved on (non fast-forward) is refused by git itself; merge it in and run this again.
#
# The founder gate hook refuses a plain `git push` in any of the four repos without that stamp, and any other form.

set -u
set -o pipefail
here="$(cd "$(dirname "$0")" && pwd)"
root="$(cd "$here/.." && pwd)"
PASS_DIR="${INTELCOST_GATE_PASS:-$root/.private/gate-pass}"

die() { echo "gate-push: REFUSED: $*" >&2; exit 1; }

kind="${1:-}"
shift || true
case "$kind" in
  app) repo="$root/intelcost-app-react" ;;
  api) repo="$root/intelcost-app-fastapi" ;;
  infra) repo="$here" ;;
  market) repo="$root/intelcost-market-next" ;;
  *) echo "usage: gate-push.sh app|api|infra|market --owner D-NNNN [--dry-run]" >&2; exit 2 ;;
esac
owner=''
dry=()
while [ $# -gt 0 ]; do
  case "$1" in
    --owner) owner="${2:-}"; shift 2 ;;
    --dry-run) dry=(--dry-run); shift ;;
    *) die "unknown argument '$1' (only --owner, --dry-run)" ;;
  esac
done
[ -n "$owner" ] || die "--owner D-NNNN is required"

cd "$repo" || die "no repo at $repo"
[ "$(git branch --show-current)" = "umer-dev" ] || die "$kind is not on umer-dev"
git diff --cached --quiet || die "changes are staged in $kind"
[ -z "$(git diff --name-only)" ] || die "unstaged changes in $kind"
[ -z "$(git ls-files --others --exclude-standard)" ] || die "untracked files in $kind (not ignored)"
gd="$(git rev-parse --git-dir)"
for op in MERGE_HEAD CHERRY_PICK_HEAD REVERT_HEAD rebase-merge rebase-apply; do
  [ -e "$gd/$op" ] && die "a merge, cherry-pick, revert, rebase or am is in progress in $kind ($op)"
done
head="$(git rev-parse HEAD)"
tree="$(git rev-parse 'HEAD^{tree}')"

fresh() { # <file>: exists and at most 24 h old (the hook's own test)
  [ -f "$1" ] || return 1
  local t
  t=$(date -r "$1" +%s 2>/dev/null) || return 1
  [ $(($(date -u +%s) - t)) -le 86400 ]
}

if fresh "$PASS_DIR/$kind-$tree"; then
  echo "gate-push: a gate pass exists for HEAD's tree ${tree:0:12}: $(cat "$PASS_DIR/$kind-$tree")"
else
  echo "gate-push: no gate pass for HEAD's tree ${tree:0:12}; running every gate on HEAD"
  bash "$here/gate-commit.sh" "$kind" --owner "$owner" --verify-head || die "a gate failed on HEAD ${head:0:12}: nothing pushed"
fi

[ "$(git rev-parse HEAD)" = "$head" ] || die "HEAD moved during the gates"
[ "$(git rev-parse 'umer-dev^{tree}')" = "$tree" ] || die "umer-dev's tree is not the gated tree"
fresh "$PASS_DIR/$kind-$tree" || die "no gate pass for ${tree:0:12} after the gates"

echo "gate-push: git push ${dry[*]} origin umer-dev ($kind, HEAD ${head:0:12}, tree ${tree:0:12})"
git push "${dry[@]}" origin umer-dev
