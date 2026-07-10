// Mirrors every journal entry to a WeChat message via PushPlus
// (https://www.pushplus.plus), so it's readable from mainland China with no
// doc or account of ours to share. PushPlus's API sends CORS headers for any
// origin, so this calls it directly from the browser — no backend proxy or
// secret needed (unlike Google Docs/Drive, the token here belongs to the
// recipient, not to a service that could act on our behalf).
const WeChatPushService = {
  API_URL: 'https://www.pushplus.plus/send',

  // `topic` (optional) is a PushPlus group code: when set, PushPlus fans the
  // message out to everyone who scanned that group's QR code to join, not
  // just the token's own owner. The `token` here is still always the
  // journal owner's personal token — group members never need their own
  // token, only a one-time QR scan to join the group.
  async pushEntry(recipientToken, text, date, topic = '') {
    if (!recipientToken) return;
    const formatted = new Intl.DateTimeFormat('en-US', {
      dateStyle: 'full',
      timeStyle: 'short',
    }).format(date);
    const payload = {
      token: recipientToken,
      title: `Journal — ${formatted}`,
      content: text,
      template: 'txt',
      channel: 'wechat',
    };
    if (topic) payload.topic = topic;
    const res = await fetch(this.API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || body.code !== 200) {
      throw new Error(body.msg || `WeChat push failed (${res.status}).`);
    }
  },
};
