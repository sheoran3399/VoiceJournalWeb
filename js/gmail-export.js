// Emails every journal entry via the Gmail API, using the same OAuth token
// already granted for Docs/Drive (requires the gmail.send scope — see
// auth.js — and the Gmail API enabled on the same Google Cloud project).
// No new backend needed: Gmail API calls are authorized bearer requests,
// same as the existing Docs/Drive calls.
const GmailExportService = {
  API_URL: 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',

  _utf8ToBase64(str) {
    const bytes = new TextEncoder().encode(str);
    let binary = '';
    bytes.forEach((b) => { binary += String.fromCharCode(b); });
    return btoa(binary);
  },

  _toBase64Url(base64) {
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  },

  _buildRawMessage(to, subject, body) {
    const encodedSubject = `=?UTF-8?B?${this._utf8ToBase64(subject)}?=`;
    const message = [
      `To: ${to}`,
      `Subject: ${encodedSubject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset="UTF-8"',
      'Content-Transfer-Encoding: 8bit',
      '',
      body,
    ].join('\r\n');
    return this._toBase64Url(this._utf8ToBase64(message));
  },

  async sendEntry(recipientEmail, text, date, accessToken) {
    if (!recipientEmail) return;
    const formatted = new Intl.DateTimeFormat('en-US', {
      dateStyle: 'full',
      timeStyle: 'short',
    }).format(date);
    const raw = this._buildRawMessage(recipientEmail, `Journal — ${formatted}`, text);

    const res = await fetch(this.API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body?.error?.message || `Gmail send failed (${res.status}).`);
    }
  },
};
