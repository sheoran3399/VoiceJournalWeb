// Go to console.cloud.google.com → APIs & Services → Credentials
// Create an OAuth 2.0 Client ID → type: "Web application"
// Add http://localhost:8000 as an Authorized JavaScript Origin
// Paste the resulting client ID here (NOT the iOS one — web needs its own)
var CONFIG = {
  googleClientID: '876134232420-cns6bq26872hf4q49ds2ft4270hpfimj.apps.googleusercontent.com',
  // Single journal document — hard-coded since only one doc is used.
  docID: '1xrqq8NPJdeINP2N8bWoMdpo3mwmOR9TPLzRsDsdDaiY',
  // Base URL for the AI proxy (reflection + English coach).
  // Production: the deployed Cloudflare Worker (key stays server-side as a secret).
  // For purely-local dev with server.py you can set this to '' to use same-origin.
  apiBase: 'https://voicejournal-api.sheoran3399.workers.dev',
};
