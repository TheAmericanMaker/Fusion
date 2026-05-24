---
"@fusion/dashboard": patch
---

fix(dashboard): close 7 review findings on the extended-status hardening pass

Follow-up to the prior fix commit; closes 7 more issues that an independent code review surfaced.

**Settings inheritance regression (high)** — `SettingsModal.handleSave`'s non-model project branch lost the "only write if changed" gate when the prior commit added null-as-delete support. Result: every effective/inherited project key was being persisted as an explicit project override on every save, silently breaking inheritance across ~30+ keys. Restored the `value !== initialProjectValue` gate, matched against the model-lane branch's existing pattern.

**Git Manager `Local <branch> vs origin` card showed misleading "Synced" in remote-only mode** — when `integrationTipSource === "remote-only"`, both `aheadOfOriginIntegration` / `behindOriginIntegration` are deliberately undefined (there's no local branch to compare), but the card's render fell through to `(ahead ?? 0) === 0 && (behind ?? 0) === 0 → "Synced"`. Now renders an explicit "no local tracking" sub-text in that case, with a separate `HEAD vs origin/<branch>` card surfacing a meaningful distance.

**`isIndexStale` extended to multi-hop and gated to integration-branch worktrees** —
- Walks up to 16 `refs/heads/<integration>` reflog entries so an A→B→C burst whose middle sync also missed is detected (the prior check only consulted `@{1}`).
- Only fires when `isOnIntegrationBranch === true`. Previously, a feature-branch worktree whose HEAD happened to descend from `<integration>@{1}` (e.g. `git switch -c hotfix main@{N}`) would trip the stale-index warning despite being perfectly healthy.

**`enumeration-failed` auto-sync events no longer dropped** — the new `(taskId, newSha)` join filter required both `worktreePath` and `newSha` on every auto-sync event, which discarded the merger's early-failure events that emit neither. Now: events with both fields use the per-advance pair-key (with macOS realpath canonicalization on both sides); events with neither use a task-id fallback so the diagnostic outcome still surfaces on the matching advance.

**`aheadOfIntegration` no longer silently shifts semantics** — split into three distinct distance fields so consumers don't have to read `integrationTipSource` to know which comparison they got:
- `aheadOfIntegration` / `behindIntegration` — HEAD vs **local** integration tip; undefined when only the remote tip exists.
- `aheadOfIntegrationRemote` / `behindIntegrationRemote` — HEAD vs `origin/<integrationBranch>`; defined whenever the remote tracking ref exists.
- `aheadOfOriginIntegration` / `behindOriginIntegration` — local integration tip vs `origin/<integrationBranch>`; defined only when both refs exist.

**`currentBranch` failure no longer masks wrong-branch state** — `git branch --show-current` returns empty on detached HEAD (success) and throws on transient git errors (lock contention, timeout). The prior catch collapsed both into `currentBranch = ""` so the UI couldn't distinguish them. New `currentBranchDetectionFailed?: boolean` field on `GitStatus` lets the UI surface "branch detection unavailable" on a real failure rather than silently hiding the wrong-branch warning.
