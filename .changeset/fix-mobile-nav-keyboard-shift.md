---
"@runfusion/fusion": patch
---

Mobile (iOS): the bottom navigation bar no longer slides up when the on-screen keyboard appears. The viewport-compensation offset that pulls fixed elements back into the visible area (intended for Android ICB quirks / pinch-zoom) was also being driven by the keyboard's shrunken `visualViewport.height` on iOS, pushing the nav bar above the keyboard. The nav now ignores that offset while `keyboardOpen` is true and stays pinned at the page bottom — the keyboard simply covers it.
