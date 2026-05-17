---
"@runfusion/fusion": patch
---

Fix `pi.promptWithFallback` recursion by removing standalone re-dispatch through `session.promptWithFallback`.
