// Calls the Cognee knowledge-graph backend (VoiceJournalGraph, deployed
// separately on Fly.io — see CONFIG.graphApiBase in config.js). Ingest calls
// are fire-and-forget: never block the Google Docs save flow on graph writes.
const GraphService = {
  _base() {
    return (window.CONFIG && CONFIG.graphApiBase) || '';
  },

  _headers(token) {
    if (!token) throw new Error('Sign in to Google first.');
    return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
  },

  // Shared request wrapper for every graph endpoint.
  //
  // Why this exists: `fetch()` REJECTS with a bare TypeError ("Load failed" in
  // Safari, "Failed to fetch" in Chrome) when the request never reaches the
  // server at all — the host is unreachable, the device is offline, or the
  // browser blocked the response because the backend's CORS allowlist doesn't
  // include this exact origin. That cryptic message previously bubbled straight
  // to the UI, so a user querying their journal just saw "Load failed" with no
  // clue why. A non-2xx HTTP response does NOT reject — it resolves with
  // res.ok === false — so we can cleanly separate "couldn't reach the service"
  // from "the service answered with an error" and give a useful message for
  // each.
  //
  // `label` is the human-facing action (e.g. "Journal query") used to prefix
  // HTTP-level errors. Returns parsed JSON (or {} for empty bodies).
  async _request(path, { method = 'GET', token, body } = {}) {
    const base = this._base();
    if (!base) {
      throw new Error('The journal knowledge-graph service is not configured (CONFIG.graphApiBase is empty). Set it in js/config.js to a running backend.');
    }

    let res;
    try {
      res = await fetch(`${base}${path}`, {
        method,
        headers: this._headers(token),
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch (err) {
      // Network-level failure: the fetch never got a response back.
      console.error(`[Graph] network error calling ${path}:`, err);
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        throw new Error("You appear to be offline — can't reach the journal graph service. Reconnect and try again.");
      }
      throw new Error(
        `Couldn't reach the journal graph service at ${base}. It may be starting up, offline, or blocking this page's origin (CORS). ` +
        `Open the browser console for the exact network error, and confirm the backend allows this origin (${typeof location !== 'undefined' ? location.origin : 'this site'}).`
      );
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      // The server responded, just not with success. Prefer its own detail
      // message; fall back to a status-coded label. Special-case the auth
      // codes since "401/403" on this endpoint almost always means the Google
      // token wasn't accepted, not a server bug.
      if (res.status === 401 || res.status === 403) {
        throw new Error(data.detail || 'The journal graph service rejected your Google sign-in (token expired or missing the right scope). Sign out and back in, then retry.');
      }
      throw new Error(data.detail || `Journal graph request failed (${res.status}).`);
    }
    return data;
  },

  // By default, fire-and-forget: feeds one entry into the shared graph.
  // Callers should .catch() this themselves (same "best-effort mirror"
  // pattern as GmailExportService) so a graph outage never blocks or fails
  // the primary Google Docs save.
  // Pass { sync: true } (used by the one-time full-history backfill) to
  // await actual completion instead of just the 202 accept — lets a bulk
  // import process entries one at a time instead of firing dozens of
  // concurrent LLM extraction calls at once.
  // `token` is the caller's live Google OAuth access token (same one used
  // for Docs/Drive saves) — the graph backend verifies it against Google
  // instead of a static shared secret.
  async ingest(tab, text, date, token, { sync = false } = {}) {
    await this._request('/api/graph/ingest', {
      method: 'POST',
      token,
      body: { tab, text, date: date.toISOString(), sync },
    });
  },

  // Wipes the entire graph. Used before a full-history backfill so re-running
  // it doesn't duplicate every entry.
  async reset(token) {
    await this._request('/api/graph/reset', { method: 'POST', token });
  },

  // "Smarter recall" — natural-language query across the whole graph.
  async recall(question, token) {
    return this._request('/api/graph/query', {
      method: 'POST',
      token,
      body: { question },
    });
  },

  // CBT tab's "Recurring patterns" — fixed, CBT-tuned graph query.
  async cbtPatterns(token) {
    return this._request('/api/graph/patterns', { token });
  },

  // Decade patterns tab's "Analyze across 10 years" — posts the user's
  // *current*, possibly-unsaved Voice journal entry text (never a saved tab)
  // so the backend can compare it against book v0/v1 (ingested separately —
  // see the decade tab's "Ingest book v0 & v1" button in app.js) plus the
  // rest of the shared graph. Returns { patterns, my_own_recommendations,
  // related } — two distinct fields so the frontend renders them as two
  // clearly separated sections instead of one blob of text.
  async decadePatterns(token, currentEntryText) {
    return this._request('/api/graph/decade-patterns', {
      method: 'POST',
      token,
      body: { current_entry: currentEntryText },
    });
  },

  // On-demand connectivity self-test. Run `await GraphService.diagnose()` from
  // the browser console to get a structured report of *why* the graph features
  // ("Ask your journal", "Recurring patterns", decade analysis) might be
  // failing — without needing to read a stack trace. Reports config, origin,
  // online status, whether the host is reachable at all, and the HTTP status
  // it answers with. Never throws; always resolves with a report object.
  async diagnose(token) {
    const report = {
      configured: false,
      base: this._base(),
      origin: (typeof location !== 'undefined') ? location.origin : null,
      online: (typeof navigator !== 'undefined') ? navigator.onLine : null,
      reachable: null,
      httpStatus: null,
      corsBlocked: null,
      likelyCause: null,
    };
    if (!report.base) {
      report.likelyCause = 'CONFIG.graphApiBase is empty — the graph backend URL is not set in js/config.js.';
      return report;
    }
    report.configured = true;
    try {
      // Unauthenticated ping: a reachable, CORS-friendly backend will answer
      // (typically 401/404/200). A network/CORS failure rejects instead.
      const res = await fetch(`${report.base}/api/graph/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ question: '__diagnostic_ping__' }),
      });
      report.reachable = true;
      report.corsBlocked = false;
      report.httpStatus = res.status;
      if (res.status === 401 || res.status === 403) {
        report.likelyCause = token
          ? 'Backend reachable, but rejected the Google token (expired or wrong scope). Sign out and back in.'
          : 'Backend reachable. Pass a Google token to diagnose(token) to test authentication; the endpoint requires sign-in.';
      } else if (res.ok) {
        report.likelyCause = 'Backend reachable and accepting requests — graph features should work.';
      } else {
        report.likelyCause = `Backend reachable but returned HTTP ${res.status}. Check the backend logs.`;
      }
    } catch (err) {
      report.reachable = false;
      report.corsBlocked = true; // a rejected fetch to a live host is almost always CORS/origin or offline
      report.error = String(err && err.message || err);
      report.likelyCause = report.online === false
        ? 'Device is offline.'
        : `Could not reach ${report.base} from origin ${report.origin}. Either the backend is down, or its CORS allowlist does not include this exact origin.`;
    }
    console.table ? console.table(report) : console.log('[Graph] diagnose:', report);
    return report;
  },
};
