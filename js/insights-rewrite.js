// Calls the Claude proxy (/api/rewrite) with a chosen style: satire, hero, or surprise.
const InsightsRewriteService = {
  async rewrite(text, style) {
    const base = (window.CONFIG && CONFIG.apiBase) || '';
    const res = await fetch(`${base}/api/rewrite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, style }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || `Rewrite failed (${res.status}).`);
    }
    return data.rewrite;
  },
};
