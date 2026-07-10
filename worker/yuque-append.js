// Cloudflare Worker route: mirrors a journal entry into a Yuque doc.
//
// This is NOT deployed automatically — voicejournal-api is managed directly
// in the Cloudflare dashboard (no source file tracked in this repo). Merge
// this route into that Worker's existing fetch handler, alongside whatever
// routing already exists for /api/patterns, /api/coach, etc.
//
// Requires these Worker environment variables (Settings → Variables):
//   YUQUE_TOKEN      (encrypted secret) — personal token from
//                     https://www.yuque.com/settings/tokens/
//   YUQUE_NAMESPACE  e.g. "your-yuque-username/journal-share"
//   YUQUE_DOC_SLUG   the doc's slug within that repo, e.g. "journal"
//
// The target doc must already exist — create it once by hand in the Yuque
// UI (so you control its sharing/visibility settings yourself), then copy
// the namespace/slug out of its URL:
//   https://www.yuque.com/<namespace>/<doc-slug>

const YUQUE_API_BASE = 'https://www.yuque.com/api/v2';

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function formatEntryMarkdown(text, dateISO) {
  const formatted = new Intl.DateTimeFormat('en-US', {
    dateStyle: 'full',
    timeStyle: 'medium',
  }).format(new Date(dateISO));
  return `### ${formatted}\n\n${text}\n\n---\n\n`;
}

async function handleYuqueAppend(request, env) {
  const origin = request.headers.get('Origin');

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders(origin) });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
    });
  }

  try {
    const { text, date } = await request.json();
    if (!text || !date) {
      throw new Error('Missing text or date.');
    }

    const yuqueHeaders = {
      'X-Auth-Token': env.YUQUE_TOKEN,
      'Content-Type': 'application/json',
      'User-Agent': 'VoiceJournalWeb',
    };

    // 1. Fetch the current doc to get its id + existing body.
    const getRes = await fetch(
      `${YUQUE_API_BASE}/repos/${env.YUQUE_NAMESPACE}/docs/${env.YUQUE_DOC_SLUG}`,
      { headers: yuqueHeaders }
    );
    if (!getRes.ok) {
      const body = await getRes.json().catch(() => ({}));
      throw new Error(`Failed to fetch Yuque doc (${getRes.status}). ${body?.message ?? 'Check namespace/slug/token.'}`);
    }
    const getJson = await getRes.json();
    const doc = getJson.data;

    // 2. Prepend the new entry (newest first, matching the Google Doc format).
    const newBody = formatEntryMarkdown(text, date) + (doc.body || '');

    // 3. Write the full body back.
    const putRes = await fetch(`${YUQUE_API_BASE}/repos/${env.YUQUE_NAMESPACE}/docs/${doc.id}`, {
      method: 'PUT',
      headers: yuqueHeaders,
      body: JSON.stringify({ title: doc.title, body: newBody }),
    });
    if (!putRes.ok) {
      const body = await putRes.json().catch(() => ({}));
      throw new Error(`Failed to update Yuque doc (${putRes.status}). ${body?.message ?? ''}`);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
    });
  }
}

// Example of wiring this into an existing router — adapt to match however
// voicejournal-api currently dispatches on url.pathname:
//
// export default {
//   async fetch(request, env) {
//     const url = new URL(request.url);
//     if (url.pathname === '/api/yuque-append') {
//       return handleYuqueAppend(request, env);
//     }
//     // ...existing routes (/api/patterns, /api/coach, etc.)
//   },
// };
