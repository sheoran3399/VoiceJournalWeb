# Overnight work — VoiceJournalWeb

Two local branches, both verified in a real browser. **Nothing pushed to GitHub** — your review/merge call.

---

## Branch 1: `perf-audit` (done earlier this evening)

Efficiency pass. Commit `200d614`. +89 / −75 lines across `app.js`, `docs.js`, `habit.js`.

1. **Habits refresh: 3 doc downloads → 1.** Loading check-ins fired three parallel
   full-document downloads of the *same* Google Doc. Now one batched fetch
   (`GoogleDocsService.readManyTexts`) + local parsing. ~66% fewer API calls.
2. **Save no longer downloads the whole doc for nothing.** `_fetchEndIndex`
   pulled the full body to compute an `endIndex` that was never used (inserts
   always go at index 1). Trimmed to fetch only the `tabId`.
3. **De-duplicated Docs read logic** into `_fetchDoc` + `_extractText` helpers.
4. **Cached `Intl.DateTimeFormat`** (was rebuilt every save) + removed a
   **duplicate `setPatternsState()`** in app.js.

Verified: all 20 JS files pass `node --check`; app loads with 0 console errors;
Habits calendar renders correctly.

---

## Branch 2: `fix-load-failed` (done overnight)

Attacks your actual "load failed" bug. Commit `9e85f3c`. `js/graph.js` only.

**Root of the bad UX:** the graph features ("Ask your journal", "Recurring
patterns", decade analysis) let a raw `fetch` rejection bubble to the UI. When a
request never reaches the server — host down, offline, or the backend's CORS
allowlist doesn't match your page's origin — the browser throws `TypeError:
"Load failed"` (Safari) / `"Failed to fetch"` (Chrome). That's the exact error
you saw.

**What I changed:**
- New shared `GraphService._request()` separates **network failures** (fetch
  rejects) from **HTTP errors** (`res.ok === false`) and translates each into a
  clear message: offline / unreachable-or-CORS (names the host + your origin) /
  auth-rejected (401/403 → "sign in again"). All five endpoints route through
  it. Happy path and call signatures unchanged.
- New `GraphService.diagnose([token])` — a console self-test.

**To pinpoint your bug in the morning, from the page where it failed:**
1. Open that page, DevTools → Console.
2. Run:  `await GraphService.diagnose()`
3. Read `likelyCause` in the printed table. It will say one of:
   - *"CONFIG.graphApiBase is empty…"* → config not set
   - *"Could not reach … from origin …"* → **CORS/origin mismatch** (my top
     theory — you were likely on `127.0.0.1`, Live Server `:5500`, or a
     `file://` path instead of the allowlisted `http://localhost:8000` or the
     github.io site)
   - *"Backend reachable … rejected the Google token"* → sign out/in
   - *"Backend reachable and accepting requests"* → it's working now

**Verified in-browser tonight:** from `localhost:8000` (allowlisted) `diagnose()`
reports `reachable:true, corsBlocked:false, HTTP 401`. Pointed at an unreachable
host, `recall()` now throws the friendly message naming the host + origin
instead of "Load failed". Zero uncaught JS errors.

**The backend allowlist** (`/Users/shanren/VoiceJournal/VoiceJournalGraph`,
`fly.toml`) currently permits exactly: `http://localhost:8000` and
`https://sheoran3399.github.io`. If `diagnose()` fingers CORS, the real fix is
either (a) open the app at one of those exact origins, or (b) add your dev
origin to `ALLOWED_ORIGINS` and redeploy — say the word and I'll do it.

---

## What I still need from you (for the original bug)
1. The **URL in your address bar** when "load failed" happened.
2. The `diagnose()` `likelyCause` (or the red console line).

## Open offer
- Push either/both branches + open PRs (needs your GitHub push auth).
- Merge `fix-load-failed` once we confirm the diagnosis.
