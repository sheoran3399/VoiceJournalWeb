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

  // By default, fire-and-forget: feeds one entry into the shared graph.
  // Callers should .catch() this themselves (same "best-effort mirror"
  // pattern as WeChatPushService/GmailExportService) so a graph outage never
  // blocks or fails the primary Google Docs save.
  // Pass { sync: true } (used by the one-time full-history backfill) to
  // await actual completion instead of just the 202 accept — lets a bulk
  // import process entries one at a time instead of firing dozens of
  // concurrent LLM extraction calls at once.
  // `token` is the caller's live Google OAuth access token (same one used
  // for Docs/Drive saves) — the graph backend verifies it against Google
  // instead of a static shared secret.
  async ingest(tab, text, date, token, { sync = false } = {}) {
    const res = await fetch(`${this._base()}/api/graph/ingest`, {
      method: 'POST',
      headers: this._headers(token),
      body: JSON.stringify({ tab, text, date: date.toISOString(), sync }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.detail || `Graph ingest failed (${res.status}).`);
    }
  },

  // Wipes the entire graph. Used before a full-history backfill so re-running
  // it doesn't duplicate every entry.
  async reset(token) {
    const res = await fetch(`${this._base()}/api/graph/reset`, {
      method: 'POST',
      headers: this._headers(token),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.detail || `Graph reset failed (${res.status}).`);
    }
  },

  // "Smarter recall" — natural-language query across the whole graph.
  async recall(question, token) {
    const res = await fetch(`${this._base()}/api/graph/query`, {
      method: 'POST',
      headers: this._headers(token),
      body: JSON.stringify({ question }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.detail || `Graph query failed (${res.status}).`);
    }
    return data;
  },

  // CBT tab's "Recurring patterns" — fixed, CBT-tuned graph query.
  async cbtPatterns(token) {
    const res = await fetch(`${this._base()}/api/graph/patterns`, {
      headers: this._headers(token),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.detail || `Pattern lookup failed (${res.status}).`);
    }
    return data;
  },
};
