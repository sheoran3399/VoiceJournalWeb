// Mirrors every journal entry to a WeChat message via PushPlus
// (https://www.pushplus.plus), so it's readable from mainland China with no
// doc or account of ours to share. PushPlus's API sends CORS headers for any
// origin, so this calls it directly from the browser — no backend proxy or
// secret needed (unlike Google Docs/Drive, the token here belongs to the
// recipient, not to a service that could act on our behalf).
const WeChatPushService = {
  API_URL: 'https://www.pushplus.plus/send',

  async pushEntry(recipientToken, text, date) {
    if (!recipientToken) return;
    const formatted = new Intl.DateTimeFormat('en-US', {
      dateStyle: 'full',
      timeStyle: 'short',
    }).format(date);
    const res = await fetch(this.API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: recipientToken,
        title: `Journal — ${formatted}`,
        content: text,
        template: 'txt',
        channel: 'wechat',
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || body.code !== 200) {
      throw new Error(body.msg || `WeChat push failed (${res.status}).`);
    }
  },
};
