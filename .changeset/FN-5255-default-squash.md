---
"@runfusion/fusion": patch
---

New projects now default `directMergeCommitStrategy` to `"always-squash"` for direct merges.
Existing projects keep their persisted setting value.
Per-project Settings UI controls and per-task `**Direct Merge Commit Strategy:** ...` PROMPT overrides are unchanged.
