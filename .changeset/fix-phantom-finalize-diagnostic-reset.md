---
"@runfusion/fusion": patch
---

Engine reliability: better diagnostics + clean-baseline reset on phantom finalize.

- `commitOrAmendMergeWithFixes` previously swallowed all unexpected errors as `reason: "unknown-phantom"` and the two callers re-threw a `verification fix finalize failed (unknown phantom)` error with no surface area beyond the SHAs. FN-5422-class tasks wedged in review with no actionable signal in the failure message.
- The catch now captures the original error message and runs an `isBranchAuthoritativeForTask` probe (existing branch ref carries this task's `Fusion-Task-Id` trailer + foreign-contamination check against base). When the branch ref is authoritative — meaning the AI's work is safely stored on `fusion/<id>` and only the in-merge attempt's integration worktree drifted — the catch resets rootDir to `preAttemptHeadSha` and returns `reason: "branch-ref-ahead-reset"`. The next merge attempt then starts from a known-good baseline instead of inheriting half-built squash state.
- Verification-fix and build-verification-fix callers now include the original error and the branch-authority probe outcome in the thrown error, so operators see the actual failure cause (e.g. diff-volume regression, file-scope violation, transient git error) rather than `unknown phantom`.
