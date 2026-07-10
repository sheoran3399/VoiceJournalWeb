// Go to console.cloud.google.com → APIs & Services → Credentials
// Create an OAuth 2.0 Client ID → type: "Web application"
// Add http://localhost:8000 as an Authorized JavaScript Origin
// Paste the resulting client ID here (NOT the iOS one — web needs its own)
var CONFIG = {
  googleClientID: '876134232420-cns6bq26872hf4q49ds2ft4270hpfimj.apps.googleusercontent.com',
  // Single journal document — hard-coded since only one doc is used.
  docID: '1xrqq8NPJdeINP2N8bWoMdpo3mwmOR9TPLzRsDsdDaiY',
  // Every journal entry gets emailed here too (QQ Mail is reachable from
  // mainland China, unlike Google Docs).
  sisterEmail: '317885013@qq.com',
  // Base URL for the Cloudflare Worker proxy — AI features (reflection,
  // English coach, etc.) plus the Yuque mirror route (/api/yuque-append, see
  // YUQUE_SETUP.md), since both need a server-side secret and CORS relay.
  // Production: the deployed Worker (secrets stay server-side).
  // For purely-local dev with server.py you can set this to '' to use same-origin.
  apiBase: 'https://voicejournal-api.sheoran3399.workers.dev',
  // Base URL for the Cognee knowledge-graph backend (separate Python service,
  // see /Users/shanren/VoiceJournal/VoiceJournalGraph). Not deployed yet —
  // "Ask your journal" and "Recurring patterns" will fail until this points
  // at a real, running instance. For local dev, point this at
  // 'http://localhost:8001' (do not commit that value).
  graphApiBase: 'https://voicejournal-graph.fly.dev',
};
