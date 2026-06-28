const GoogleDocsService = {
  BASE_URL: 'https://docs.googleapis.com/v1/documents',

  async appendEntry(text, date, documentID, accessToken) {
    return this.saveSession({ text, date, documentID, accessToken });
  },

  // Saves the journal entry plus optional gratitude answers and therapist reflection
  // as a single, correctly ordered block (one insert at the top of the doc).
  async saveSession({ text, date, documentID, accessToken, gratitude = '', reflection = '' }) {
    const { tabId } = await this._fetchEndIndex(documentID, accessToken);
    const block = this._formatEntry(text, date, gratitude, reflection);
    await this._insertText(block, 1, tabId, documentID, accessToken);
  },

  _formatEntry(text, date, gratitude = '', reflection = '') {
    const formatted = new Intl.DateTimeFormat('en-US', {
      dateStyle: 'full',
      timeStyle: 'medium',
    }).format(date);
    let block = `[${formatted}]\n${text}\n`;
    if (gratitude) block += `\nGratitude:\n${gratitude}\n`;
    if (reflection) block += `\nTherapist's Reflection:\n${reflection}\n`;
    block += '\n';
    return block;
  },

  // Returns the full document as a plain text string for pattern analysis.
  async readEntriesText(documentID, accessToken) {
    const res = await fetch(`${this.BASE_URL}/${documentID}?includeTabsContent=true`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(`Failed to read document (${res.status}). ${body?.error?.message ?? 'Check the Doc ID and permissions.'}`);
    }
    const json = await res.json();
    let content;
    if (json.tabs?.length > 0) {
      content = json.tabs[0].documentTab?.body?.content ?? [];
    } else {
      content = json.body?.content ?? [];
    }
    return content
      .flatMap(el => el.paragraph?.elements ?? [])
      .map(el => el.textRun?.content ?? '')
      .join('');
  },

  async _fetchEndIndex(documentID, accessToken) {
    const res = await fetch(`${this.BASE_URL}/${documentID}?includeTabsContent=true`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      console.error('[Docs] fetchEndIndex failed', res.status, body);
      throw new Error(`Failed to fetch document (${res.status}). Check the Doc ID and permissions.`);
    }
    const json = await res.json();

    let content, tabId;
    if (json.tabs?.length > 0) {
      const firstTab = json.tabs[0];
      tabId = firstTab.tabProperties?.tabId;
      content = firstTab.documentTab?.body?.content ?? [];
    } else {
      content = json.body?.content ?? [];
      tabId = null;
    }

    const rawEnd = content.at(-1)?.endIndex ?? 1;
    const endIndex = Math.max(1, rawEnd - 1);
    console.log('[Docs] tabId:', tabId, '| endIndex:', endIndex);
    return { endIndex, tabId };
  },

  async _insertText(text, index, tabId, documentID, accessToken) {
    const location = tabId ? { index, tabId } : { index };
    const res = await fetch(`${this.BASE_URL}/${documentID}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [{ insertText: { location, text } }],
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      console.error('[Docs] batchUpdate failed', res.status, body);
      throw new Error(`Failed to save to Google Docs (${res.status}). ${body?.error?.message ?? 'Check your connection.'}`);
    }
  },
};
