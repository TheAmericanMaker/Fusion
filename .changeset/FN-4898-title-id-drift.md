---
"@runfusion/fusion": patch
---

Normalize task titles to strip foreign embedded `FN-<id>` tokens during create/update/duplicate/refine flows while preserving duplicate/refine provenance metadata. Also adds schema version 84 migration coverage to clean existing active/archived title-ID drift rows idempotently.
