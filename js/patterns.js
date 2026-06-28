// Parses past journal entries from Google Doc text and sends them to /api/patterns.
const PatternService = {
  _parseDateHeader(header) {
    // Stored format is produced by Intl.DateTimeFormat, e.g.:
    // "Wednesday, June 24, 2026 at 5:12:10 PM"
    const normalized = header.replace(' at ', ' ');
    const date = new Date(normalized);
    return Number.isNaN(date.getTime()) ? null : date;
  },

  // Split raw doc text into individual entries.
  // Entries are prepended newest-first; each block starts with "[<timestamp>]".
  parseEntries(docText) {
    const entries = [];
    const blockRegex = /^\[([^\]]+)\]\n([\s\S]*?)(?=^\[[^\]]+\]\n|\s*$)/gm;
    let match;
    while ((match = blockRegex.exec(docText)) !== null) {
      const date = match[1].trim();
      let body = match[2] || '';
      // Strip optional sections we don't want to send to Claude.
      const gratIdx = body.indexOf('\nGratitude:');
      if (gratIdx !== -1) body = body.slice(0, gratIdx);
      const reflIdx = body.indexOf("\nTherapist's Reflection:");
      if (reflIdx !== -1) body = body.slice(0, reflIdx);
      const text = body.trim();
      if (!text) continue;
      entries.push({ date, text, parsedDate: this._parseDateHeader(date) });
    }
    return entries;
  },

  filterEntriesByDays(entries, days) {
    const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
    return entries.filter((e) => e.parsedDate && e.parsedDate.getTime() >= cutoff);
  },

  async analyze(entries, maxChars = 60000) {
    const base = (window.CONFIG && CONFIG.apiBase) || '';
    // Build combined text, capped to avoid oversized requests.
    let combined = '';
    for (const e of entries) {
      const chunk = `[${e.date}]\n${e.text}\n\n`;
      if (combined.length + chunk.length > maxChars) break;
      combined += chunk;
    }
    const res = await fetch(`${base}/api/patterns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: combined.trim() }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Pattern analysis failed (${res.status}).`);
    return data.patterns;
  },
};
