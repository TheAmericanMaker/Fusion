---
"@runfusion/fusion": patch
---

Add create-time duplicate detection to dashboard task creation. The dashboard now exposes `POST /api/tasks/duplicate-check`, returns `409 duplicate_candidates` for conflicting `POST /api/tasks` requests unless callers acknowledge matches, and supports `bypassDuplicateCheck` for opt-out callers.
