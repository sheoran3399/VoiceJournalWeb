const InsightsService = {
  STORAGE_KEY: 'insights_entries',

  REWRITE_STYLES: [
    { key: 'satire', icon: '😈', label: 'Satire' },
    { key: 'hero', icon: '🦸', label: "Hero's arc" },
    { key: 'surprise', icon: '🎲', label: 'Surprise me' },
  ],

  loadEntries() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error('[Insights] Error loading entries:', e);
      return [];
    }
  },

  saveEntry(text) {
    const cleanText = (text || '').trim();
    if (!cleanText) return null;
    try {
      const entries = this.loadEntries();
      const entry = {
        id: `insight_${Date.now()}`,
        text: cleanText,
        created_at: new Date().toISOString(),
      };
      entries.push(entry);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(entries));
      return entry;
    } catch (e) {
      console.error('[Insights] Error saving entry:', e);
      return null;
    }
  },

  // Attaches an AI rewrite to an existing entry. Returns the updated entry, or null if not found.
  attachRewrite(id, style, rewriteText) {
    try {
      const entries = this.loadEntries();
      const entry = entries.find((e) => e.id === id);
      if (!entry) return null;
      entry.rewriteStyle = style;
      entry.rewriteText = rewriteText;
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(entries));
      return entry;
    } catch (e) {
      console.error('[Insights] Error attaching rewrite:', e);
      return null;
    }
  },

  deleteEntry(id) {
    try {
      const entries = this.loadEntries().filter((e) => e.id !== id);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(entries));
      return true;
    } catch (e) {
      console.error('[Insights] Error deleting entry:', e);
      return false;
    }
  },

  getAllEntries() {
    return this.loadEntries();
  },

  // Renders the saved entries, newest first.
  // callbacks: { onDelete(id), onRewrite(id, styleKey) }
  // pendingRewriteIds: Set of entry ids currently awaiting an AI rewrite response.
  renderList(container, callbacks, pendingRewriteIds) {
    const pending = pendingRewriteIds || new Set();
    const entries = this.loadEntries().slice().reverse();
    container.replaceChildren();

    if (entries.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'insights-empty';
      empty.textContent = 'Your entries will collect here as you log them.';
      container.appendChild(empty);
      return;
    }

    entries.forEach((entry) => {
      const card = document.createElement('div');
      card.className = 'insight-entry';

      const date = document.createElement('div');
      date.className = 'insight-entry-date';
      date.textContent = new Date(entry.created_at).toLocaleString(undefined, {
        month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
      });

      const text = document.createElement('p');
      text.className = 'insight-entry-text';
      text.textContent = entry.text;

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'insight-entry-delete';
      deleteBtn.setAttribute('aria-label', 'Delete entry');
      deleteBtn.textContent = '✕';
      deleteBtn.addEventListener('click', () => callbacks.onDelete(entry.id));

      card.appendChild(date);
      card.appendChild(text);
      card.appendChild(deleteBtn);
      card.appendChild(this._renderRewriteBox(entry, callbacks, pending.has(entry.id)));
      container.appendChild(card);
    });
  },

  _renderRewriteBox(entry, callbacks, isPending) {
    const box = document.createElement('div');
    box.className = 'insight-rewrite';

    const label = document.createElement('div');
    label.className = 'insight-rewrite-label';

    if (isPending) {
      label.textContent = 'AI rewrite — writing…';
      box.appendChild(label);
      return box;
    }

    if (entry.rewriteText) {
      const style = this.REWRITE_STYLES.find((s) => s.key === entry.rewriteStyle);
      label.textContent = `AI rewrite — ${style ? style.label : entry.rewriteStyle}`;
      const rewriteText = document.createElement('p');
      rewriteText.className = 'insight-rewrite-text';
      rewriteText.textContent = entry.rewriteText;
      box.appendChild(label);
      box.appendChild(rewriteText);
      return box;
    }

    label.textContent = 'AI rewrite';
    box.appendChild(label);
    const picks = document.createElement('div');
    picks.className = 'insight-rewrite-picks';
    this.REWRITE_STYLES.forEach((style) => {
      const btn = document.createElement('button');
      btn.className = 'insight-rewrite-pick-btn';
      btn.textContent = `${style.icon} ${style.label}`;
      btn.addEventListener('click', () => callbacks.onRewrite(entry.id, style.key));
      picks.appendChild(btn);
    });
    box.appendChild(picks);
    return box;
  },
};
