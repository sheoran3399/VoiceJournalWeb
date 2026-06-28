// Calls the Claude proxy (/api/coach). Always passes detailed: true and minTips: 2
// so the Worker returns at least 2 constructive feedback items per entry.
// Returns an array of tip strings (handles both old {tip} and new {tips} formats).
const CoachService = {
  async tips(text) {
    const base = (window.CONFIG && CONFIG.apiBase) || '';
    const res = await fetch(`${base}/api/coach`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, detailed: true, minTips: 2 }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || `Coaching failed (${res.status}).`);
    }
    // New format: { tips: string[] }
    if (Array.isArray(data.tips) && data.tips.length > 0) return data.tips;
    // Old format: { tip: string }
    if (data.tip) return [data.tip];
    return ['No feedback available.'];
  },
};
