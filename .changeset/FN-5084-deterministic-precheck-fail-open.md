---
"@runfusion/fusion": patch
---

Make the FN-4918 deterministic duplicate pre-check fail open: transient store query errors, mutex bookkeeping failures, and leader-lock rejections no longer 500 the `POST /tasks` endpoint. Legitimate 409 `duplicate_candidates` responses are unchanged.
