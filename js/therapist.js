// Calls the Claude proxy (/api/reflect). In local dev this is server.py on the
// same origin; in production set CONFIG.apiBase to your Worker URL (see config.js).
const TherapistService = {
  async reflect(text) {
    const base = (window.CONFIG && CONFIG.apiBase) || '';
    const res = await fetch(`${base}/api/reflect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || `Reflection failed (${res.status}).`);
    }
    return data.reflection;
  },
};
