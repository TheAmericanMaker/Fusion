---
"@runfusion/fusion": patch
---

Add an optimistic submit lock to QuickEntryBox so Save/Enter cannot trigger duplicate task creation while duplicate checks or create requests are in flight.
