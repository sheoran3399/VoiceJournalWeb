// Mirrors every Google Doc journal entry to a Kingsoft Docs (金山文档) file so
// it's readable from mainland China without a Google account. Like Yuque,
// this goes through the Cloudflare Worker proxy — see
// worker/jinshan-append.js — because the write requires an OAuth
// access/refresh token pair that must never live client-side.
const JinshanExportService = {
  async appendEntry(text, date) {
    const base = (window.CONFIG && CONFIG.apiBase) || '';
    const res = await fetch(`${base}/api/jinshan-append`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, date: date.toISOString() }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `Jinshan sync failed (${res.status}).`);
    }
  },
};
