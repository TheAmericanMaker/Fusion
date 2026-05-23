---
"@runfusion/fusion": patch
---

Fix Windows worktree creation and cleanup by replacing POSIX shell `mkdir -p` / `rm -rf` calls in worktree setup paths with cross-platform Node.js filesystem APIs.