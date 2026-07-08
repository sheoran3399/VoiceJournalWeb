// Tracks which days had a Journal, Manifestation, or CBT entry, and manages
// the per-month reward goal (default: 21 out of 28 days checked in).
const HabitService = {
  REWARD_STORAGE_KEY: 'habit_rewards',
  DEFAULT_TARGET: 21,

  _journalCache: { docID: null, fetchedAt: 0, dates: new Set() },

  monthKey(year, month) {
    return `${year}-${String(month + 1).padStart(2, '0')}`;
  },

  _loadRewards() {
    try {
      return JSON.parse(localStorage.getItem(this.REWARD_STORAGE_KEY)) || {};
    } catch (e) {
      console.error('[Habit] Error loading rewards:', e);
      return {};
    }
  },

  getReward(monthKey) {
    return this._loadRewards()[monthKey] || null;
  },

  setReward(monthKey, reward, target) {
    try {
      const all = this._loadRewards();
      all[monthKey] = { reward, target };
      localStorage.setItem(this.REWARD_STORAGE_KEY, JSON.stringify(all));
      return true;
    } catch (e) {
      console.error('[Habit] Error saving reward:', e);
      return false;
    }
  },

  _toDateKey(dateInput) {
    const d = new Date(dateInput);
    if (Number.isNaN(d.getTime())) return null;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  },

  // Converts an entries array (CBT/Manifestation — each has created_at) into
  // a Set of 'YYYY-MM-DD' local-date keys.
  entryDateSet(entries) {
    const set = new Set();
    entries.forEach((e) => {
      const key = this._toDateKey(e.created_at);
      if (key) set.add(key);
    });
    return set;
  },

  // Journal entries only live in the Google Doc, so this fetches + parses it.
  // Cached in memory for 5 minutes per docID; pass force:true to bypass.
  async fetchJournalDateSet(docID, accessToken, { force = false } = {}) {
    const now = Date.now();
    const cache = this._journalCache;
    if (!force && cache.docID === docID && now - cache.fetchedAt < 5 * 60 * 1000) {
      return cache.dates;
    }
    const docText = await GoogleDocsService.readEntriesText(docID, accessToken);
    const parsed = PatternService.parseEntries(docText);
    const dates = new Set();
    parsed.forEach((e) => {
      if (e.parsedDate) dates.add(this._toDateKey(e.parsedDate));
    });
    this._journalCache = { docID, fetchedAt: now, dates };
    return dates;
  },

  daysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
  },

  // A day counts toward the reward if at least one of the three practices
  // has an entry that day.
  countCheckedDays(year, month, dateSets) {
    const total = this.daysInMonth(year, month);
    let checked = 0;
    for (let d = 1; d <= total; d++) {
      const key = this._toDateKey(new Date(year, month, d));
      if (dateSets.journal.has(key) || dateSets.manifestation.has(key) || dateSets.cbt.has(key)) {
        checked++;
      }
    }
    return { checked, total };
  },

  renderCalendar(container, year, month, dateSets) {
    const grid = document.createElement('div');
    grid.className = 'habit-calendar-grid';

    ['S', 'M', 'T', 'W', 'T', 'F', 'S'].forEach((label) => {
      const cell = document.createElement('div');
      cell.className = 'habit-weekday';
      cell.textContent = label;
      grid.appendChild(cell);
    });

    const firstWeekday = new Date(year, month, 1).getDay();
    const total = this.daysInMonth(year, month);
    const todayKey = this._toDateKey(new Date());

    for (let i = 0; i < firstWeekday; i++) {
      const filler = document.createElement('div');
      filler.className = 'habit-day habit-day-empty';
      grid.appendChild(filler);
    }

    for (let d = 1; d <= total; d++) {
      const date = new Date(year, month, d);
      const key = this._toDateKey(date);
      const dayEl = document.createElement('div');
      dayEl.className = 'habit-day';
      if (key === todayKey) dayEl.classList.add('is-today');

      const numberEl = document.createElement('div');
      numberEl.className = 'habit-day-number';
      numberEl.textContent = d;
      dayEl.appendChild(numberEl);

      const dots = document.createElement('div');
      dots.className = 'habit-day-dots';
      [
        { cls: 'journal', icon: '🎤', done: dateSets.journal.has(key) },
        { cls: 'manifestation', icon: '✨', done: dateSets.manifestation.has(key) },
        { cls: 'cbt', icon: '🧠', done: dateSets.cbt.has(key) },
      ].forEach(({ cls, icon, done }) => {
        const dot = document.createElement('span');
        dot.className = `habit-dot habit-dot-${cls}${done ? ' done' : ''}`;
        dot.textContent = icon;
        dots.appendChild(dot);
      });
      dayEl.appendChild(dots);

      grid.appendChild(dayEl);
    }

    while (grid.children.length % 7 !== 1) {
      const filler = document.createElement('div');
      filler.className = 'habit-day habit-day-empty';
      grid.appendChild(filler);
    }

    container.replaceChildren(grid);
  },

  renderReward(container, year, month, dateSets, callbacks, editing = false) {
    const key = this.monthKey(year, month);
    const existing = this.getReward(key);
    const { checked, total } = this.countCheckedDays(year, month, dateSets);

    const card = document.createElement('div');
    card.className = 'habit-reward-card';

    if (!existing || editing) {
      const prompt = document.createElement('div');
      prompt.className = 'habit-reward-prompt';
      prompt.textContent = existing ? 'Edit this month\'s reward' : "Set this month's reward";
      card.appendChild(prompt);

      const rewardInput = document.createElement('input');
      rewardInput.type = 'text';
      rewardInput.className = 'habit-reward-input';
      rewardInput.placeholder = 'What are you working toward? (e.g. a new book)';
      rewardInput.value = existing?.reward ?? '';
      card.appendChild(rewardInput);

      const targetRow = document.createElement('div');
      targetRow.className = 'habit-target-row';
      const targetLabel = document.createElement('label');
      targetLabel.className = 'habit-target-label';
      targetLabel.textContent = 'Days to earn it';
      const targetInput = document.createElement('input');
      targetInput.type = 'number';
      targetInput.className = 'habit-target-input';
      targetInput.min = '1';
      targetInput.max = String(total);
      targetInput.value = String(existing?.target ?? this.DEFAULT_TARGET);
      targetRow.appendChild(targetLabel);
      targetRow.appendChild(targetInput);
      card.appendChild(targetRow);

      const actionsRow = document.createElement('div');
      actionsRow.className = 'habit-reward-actions';

      const saveBtn = document.createElement('button');
      saveBtn.className = 'add-entry-btn';
      saveBtn.textContent = 'Save';
      saveBtn.addEventListener('click', () => {
        const rewardText = rewardInput.value.trim();
        const target = parseInt(targetInput.value, 10) || this.DEFAULT_TARGET;
        if (!rewardText) return;
        this.setReward(key, rewardText, target);
        callbacks.onSave?.();
      });
      actionsRow.appendChild(saveBtn);

      if (existing) {
        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'add-entry-btn secondary';
        cancelBtn.textContent = 'Cancel';
        cancelBtn.addEventListener('click', () => callbacks.onCancelEdit?.());
        actionsRow.appendChild(cancelBtn);
      }

      card.appendChild(actionsRow);
    } else {
      const rewardLine = document.createElement('div');
      rewardLine.className = 'habit-reward-title';
      rewardLine.textContent = `🎁 ${existing.reward}`;
      card.appendChild(rewardLine);

      const progressLabel = document.createElement('div');
      progressLabel.className = 'habit-progress-label';
      progressLabel.textContent = `${checked} / ${existing.target} days checked in`;
      card.appendChild(progressLabel);

      const track = document.createElement('div');
      track.className = 'habit-progress-track';
      const fill = document.createElement('div');
      fill.className = 'habit-progress-fill';
      if (checked >= existing.target) fill.classList.add('earned');
      fill.style.width = `${Math.min(100, (checked / existing.target) * 100)}%`;
      track.appendChild(fill);
      card.appendChild(track);

      if (checked >= existing.target) {
        const earned = document.createElement('div');
        earned.className = 'habit-reward-earned';
        earned.textContent = 'Earned it! 🎉';
        card.appendChild(earned);
      }

      const editBtn = document.createElement('button');
      editBtn.className = 'add-entry-btn secondary habit-edit-btn';
      editBtn.textContent = 'Edit';
      editBtn.addEventListener('click', () => {
        callbacks.onEdit?.(key);
      });
      card.appendChild(editBtn);
    }

    container.replaceChildren(card);
  },
};
