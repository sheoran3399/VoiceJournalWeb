// Mirrors every Google Doc journal entry to a Yuque doc so it's readable from
// mainland China (Yuque has no CORS support, so this goes through the
// Cloudflare Worker proxy — see worker/yuque-append.js — never call Yuque
// directly from the browser or the personal token would have to live client-side).
const YuqueExportService = {
  async appendEntry(text, date) {
    const base = (window.CONFIG && CONFIG.apiBase) || '';
    const res = await fetch(`${base}/api/yuque-append`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, date: date.toISOString() }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `Yuque sync failed (${res.status}).`);
    }
  },
};
