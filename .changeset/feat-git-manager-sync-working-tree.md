---
"@fusion/dashboard": minor
---

feat(dashboard): explain "Recent integration-branch advances" and add a one-click "Sync working tree" fix

Two additions to Git Manager → Status:

**Info disclosure** — an `[i]` button next to the "Recent integration-branch advances (N need action)" header toggles an inline explainer. Covers what an "advance" is, what each `autoSyncOutcome` value means (`clean-sync`, `synced-with-edits-restored`, `off / not run`, `stash-failed`, `would-conflict`, …), and where to enable `mergeAdvanceAutoSync` for the permanent fix.

**Sync working tree button** — when ≥1 advance shows `needsAction`, a button surfaces in the same header that calls the existing `POST /api/git/pull` (FN-5358 Smart Pull machinery: auto-stash dirty edits, fast-forward pull, restore stash, surface conflicts). On success the extended git status auto-refetches and the "need action" count drops; on conflict, the existing error toast fires.

No new state machine — `handlePull`/`remoteLoading === "pull"` is the same plumbing the existing Pull button uses.
