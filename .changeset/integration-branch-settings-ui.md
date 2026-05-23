---
"@fusion/dashboard": patch
---

feat(dashboard): expose `integrationBranch` setting in the project settings modal

Adds a text input for the canonical integration branch (the branch Fusion merges tasks into, and the reference for all ahead/behind / overlap / pre-rebase computations). Lives directly under the Auto-completion mode select inside the merge-strategy panel — visible regardless of direct vs PR mode, since the setting applies to both.

Blank value (the default) preserves the existing auto-resolution cascade: `integrationBranch` → legacy `baseBranch` → `origin/HEAD` symbolic ref → fallback `main`. Setting it to `master` / `trunk` / `develop` / etc. pins the resolution explicitly without changing other settings.

Field trims whitespace and stores `undefined` (not empty string) when cleared so the auto-resolution remains active.
