---
"@runfusion/fusion": patch
---

Engine reliability: prevent the FN-5345 in-review wedge class.

- Fusion task worktrees now install a `prepare-commit-msg` empty-commit guard that refuses `git commit --allow-empty` and other zero-staged-diff commits, while still allowing legitimate amend / merge / squash / cherry-pick / revert / rebase paths.
- Merger gains an early empty-own-diff fast-path in `reuse-task-worktree` integration mode: branches with own commits but zero net tree change vs merge-base now auto-finalize as no-op BEFORE any reuse-handoff acquisition runs, preventing `registered-branch-mismatch` + `merge-deadlock-detected: verified content not on main` wedges.
- `classifyOwnedLandedEvidence` also detects the empty-own-diff case and returns `proven-no-op` so downstream self-healing and post-handoff finalize paths benefit too.
- Merger's reuse-fallback path now consults `git worktree list --porcelain` before creating a new worktree, reusing extant usable registrations of `fusion/<id>` and pruning stale ones, eliminating FN-5083-class branch-registration double-registration.
