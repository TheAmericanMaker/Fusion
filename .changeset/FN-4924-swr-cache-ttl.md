---
"@runfusion/fusion": patch
---

Dashboard reload no longer shows multi-day-old cached boards. The local stale-while-revalidate cache now respects a 10-minute freshness window for list payloads (tasks, projects, agents, documents, etc.); older entries are skipped and the normal fetch path runs, surfacing the existing top progress indicator. Failed background refreshes keep the indicator visible so the user knows the data hasn't been confirmed fresh.
