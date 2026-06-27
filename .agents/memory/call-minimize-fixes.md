---
name: Call minimize/media fixes
description: Patterns for call minimization, getUserMedia fallback, and background audio resume
---

## Call minimize state
- `isCallMinimized`, `minimizeCall`, `expandCall` added to AppState interface and AppContext provider
- `setIsCallMinimized(false)` called in `cleanupCall` so it resets on hang-up
- Minimized pill renders as a floating bar at top (z-[99999]), keeps audio element mounted

## getUserMedia — 3-tier fallback
1. Try with ideal constraints `{width:{ideal:1280},height:{ideal:720},facingMode:"user"}`
2. If fails, try bare `{video:true}`
3. If still fails, fall back to audio-only and dispatch `pulse:call-error`
**Why:** Default `{video:true}` fails silently on some browsers/devices; ideal constraints don't throw on mismatch — they just pick the closest available.

## Video track detection
Changed `t.enabled && t.readyState !== "ended"` → just `t.readyState !== "ended"`.
**Why:** `enabled` is true by default; checking it caused false negatives when camera first opened.

## Background audio (mobile)
`document.addEventListener("visibilitychange", ...)` in ActiveCall retries `audio.play()` when tab becomes visible.
**Why:** Mobile browsers pause HTMLAudioElement when tab goes to background; this resumes it on return.

## Screen sharing
Changed `getDisplayMedia({video:{displaySurface:"monitor"},audio:true})` → `{video:true,audio:true}`.
**Why:** `displaySurface` constraint not supported in all browsers and caused the call to fail entirely.
