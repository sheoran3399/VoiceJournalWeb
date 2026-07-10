// Cloudflare Worker route: mirrors a journal entry into a Kingsoft Docs
// (金山文档 / WPS 开放平台) file.
//
// This is NOT deployed automatically — voicejournal-api is managed directly
// in the Cloudflare dashboard (no source file tracked in this repo). Merge
// this route into that Worker's existing fetch handler, alongside
// /api/yuque-append and whatever else already exists.
//
// UNLIKE Yuque, Kingsoft's open platform doesn't hand out a simple personal
// API token. It's full OAuth2: you register an app at
// https://developer.kdocs.cn, do a one-time browser authorization as the
// account that owns the target doc, and get back a refresh_token (90-day)
// that this Worker exchanges for short-lived access_tokens (24h) on every
// call. See JINSHAN_SETUP.md for the one-time authorization walkthrough.
//
// ⚠️ The exact OAuth token-exchange path and the exact multipart shape of
// the content-update call are gated behind an approved app on the Kingsoft
// developer console (https://developer.kdocs.cn/server/guide/api-overview.html,
// https://developer.kdocs.cn/server/guide/api.html) — they're not fully
// public without registering. The constants below are best-effort from
// public docs; VERIFY both against your own app's console page before
// relying on this, and adjust as needed.
//
// Requires these Worker environment variables (Settings → Variables):
//   JINSHAN_APP_ID        from your app's page on developer.kdocs.cn
//   JINSHAN_APP_SECRET     (encrypted secret) — same page
//   JINSHAN_REFRESH_TOKEN  (encrypted secret) — from the one-time OAuth
//                           authorization in JINSHAN_SETUP.md step 2
//   JINSHAN_FILE_TOKEN     the target doc's file_token (from its share
//                           link / app-space file listing)

const JINSHAN_OAUTH_TOKEN_URL = 'https://openapi.wps.cn/oauthapi/v2/token'; // VERIFY
const JINSHAN_API_BASE = 'https://openapi.wps.cn/api/v1/openapi'; // VERIFY

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function formatEntryPlain(text, dateISO) {
  const formatted = new Intl.DateTimeFormat('en-US', {
    dateStyle: 'full',
    timeStyle: 'medium',
  }).format(new Date(dateISO));
  return `【${formatted}】\n${text}\n\n`;
}

// Exchanges the long-lived refresh_token for a short-lived access_token.
// Kingsoft access_tokens last 24h and refresh_tokens last 90 days — unlike
// Google, there's no rolling refresh built into this call, so
// JINSHAN_REFRESH_TOKEN needs to be re-minted (JINSHAN_SETUP.md step 2)
// before it expires.
async function getAccessToken(env) {
  const res = await fetch(JINSHAN_OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      app_id: env.JINSHAN_APP_ID,
      app_secret: env.JINSHAN_APP_SECRET,
      refresh_token: env.JINSHAN_REFRESH_TOKEN,
    }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(`Failed to refresh Jinshan access token (${res.status}). ${body?.message ?? ''}`);
  }
  const json = await res.json();
  return json.access_token;
}

async function handleJinshanAppend(request, env) {
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

    const accessToken = await getAccessToken(env);
    const authHeaders = {
      Authorization: `Bearer ${accessToken}`,
    };

    // 1. Fetch the current file content so we can prepend (newest first,
    //    matching the Google Doc / Yuque format).
    const getRes = await fetch(
      `${JINSHAN_API_BASE}/appspace/files/${env.JINSHAN_FILE_TOKEN}/download`,
      { headers: authHeaders }
    );
    if (!getRes.ok) {
      const body = await getRes.json().catch(() => ({}));
      throw new Error(`Failed to fetch Jinshan doc (${getRes.status}). ${body?.message ?? 'Check file_token/token.'}`);
    }
    const existingText = await getRes.text();

    // 2. Prepend the new entry.
    const newContent = formatEntryPlain(text, date) + existingText;

    // 3. Write the full content back. The docs describe this as needing
    //    "the file entity" (i.e. the new file bytes), so this sends it as
    //    a multipart body rather than JSON.
    const form = new FormData();
    form.append('file', new Blob([newContent], { type: 'text/plain' }), 'journal.txt');
    const putRes = await fetch(`${JINSHAN_API_BASE}/appspace/files/${env.JINSHAN_FILE_TOKEN}/content`, {
      method: 'PUT',
      headers: authHeaders,
      body: form,
    });
    if (!putRes.ok) {
      const body = await putRes.json().catch(() => ({}));
      throw new Error(`Failed to update Jinshan doc (${putRes.status}). ${body?.message ?? ''}`);
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
//     if (url.pathname === '/api/jinshan-append') {
//       return handleJinshanAppend(request, env);
//     }
//     // ...existing routes (/api/yuque-append, /api/patterns, etc.)
//   },
// };
