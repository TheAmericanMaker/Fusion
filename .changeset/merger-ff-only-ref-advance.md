---
"@fusion/engine": patch
---

fix(merger): require fast-forward ref advances and read integration tip from refs/heads/&lt;branch&gt;

Closes a class of "orphaned merge" bug where a subsequent merger could overwrite the integration branch tip with a sibling commit, leaving the previous squash reachable only from a feature branch.

Two coupled fixes:

1. `advanceIntegrationBranchRef` now refuses non-fast-forward advances. The CAS check still guards against concurrent ref movement, but the new `merge-base --is-ancestor` check additionally requires the new sha to descend from the expected current sha. Non-FF attempts return `reason: "non-fast-forward-advance"` instead of silently orphaning the prior tip.

2. `runMerge` resolves the integration-branch tip via `git rev-parse --verify refs/heads/<integrationBranch>` instead of `git rev-parse HEAD` in `rootDir`. In reuse-task-worktree mode, `rootDir`'s HEAD can lag behind the shared ref after a sibling merger advanced it via `update-ref` without re-checking-out — using HEAD there caused the eventual squash commit to parent off an earlier sha and orphan the previously-merged tip.

Together these uphold the invariant: local `<integrationBranch>` only advances via fast-forward, and the merger never builds a squash off a stale base sha.
