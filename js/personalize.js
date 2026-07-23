// PersonalizeService — turns the user's own recent journal entries into
// tailored suggestions for the CBT and Manifestation forms.
//
// Design mirrors GratitudePrompts.renderDynamic(): produce useful, specific
// suggestions CLIENT-SIDE immediately (no server key needed), then silently
// upgrade to a Claude-generated set if an AI proxy endpoint is reachable.
// The Cloudflare Worker (CONFIG.apiBase) holds the Claude key server-side; if
// /api/personalize isn't deployed, the client-side heuristics still stand on
// their own, so the feature never hard-depends on a backend that may not exist.
const PersonalizeService = {
  // Emotion vocabulary, ordered by rough salience — first/most-frequent wins.
  EMOTION_WORDS: [
    'overwhelmed', 'anxious', 'stressed', 'exhausted', 'frustrated', 'angry',
    'scared', 'afraid', 'nervous', 'worried', 'sad', 'lonely', 'ashamed',
    'guilty', 'hurt', 'disappointed', 'confused', 'stuck', 'tired', 'insecure',
    'hopeful', 'grateful', 'excited', 'proud', 'peaceful', 'calm', 'happy', 'confident',
  ],

  // Theme lexicon: maps keywords found in entries to a canonical life theme.
  // Tuned to the topics this journal actually revolves around (see the
  // Manifestation desired-outcome defaults) plus common universals.
  THEME_LEXICON: [
    { theme: 'coding', label: 'Coding & building', keys: ['code', 'coding', 'build', 'app', 'bug', 'claude code', 'programming', 'debug', 'ship', 'deploy', 'project'] },
    { theme: 'music', label: 'Music & DJing', keys: ['dj', 'djing', 'set', 'mix', 'music', 'guzheng', 'track', 'melodic', 'techno', 'house', 'sound', 'produce'] },
    { theme: 'body', label: 'Body & health', keys: ['body', 'health', 'pain', 'workout', 'exercise', 'gym', 'sleep', 'diet', 'eating', 'labs', 'energy', 'strength', 'skin'] },
    { theme: 'ai-safety', label: 'AI safety work', keys: ['ai safety', 'governance', 'policy', 'research', 'writing', 'paper', 'alignment', 'program'] },
    { theme: 'work', label: 'Work & career', keys: ['work', 'job', 'boss', 'manager', 'meeting', 'deadline', 'career', 'colleague', 'office', 'shuttle', 'cafeteria'] },
    { theme: 'family', label: 'Family & relationships', keys: ['family', 'sister', 'mom', 'dad', 'mother', 'father', 'parent', 'friend', 'partner', 'brother'] },
    { theme: 'self-worth', label: 'Self-worth & confidence', keys: ['confidence', 'worth', 'enough', 'deserve', 'imposter', 'compare', 'comparison', 'judge', 'self-love', 'charisma'] },
    { theme: 'money', label: 'Money & stability', keys: ['money', 'finance', 'bill', 'cost', 'budget', 'afford', 'rent', 'salary', 'savings'] },
    { theme: 'creativity', label: 'Creativity', keys: ['creative', 'art', 'write', 'design', 'make', 'create', 'idea', 'craft'] },
  ],

  // Regexes that flag a sentence as a likely "automatic thought" — the raw,
  // unexamined self-talk CBT asks you to surface and reframe.
  _THOUGHT_PATTERNS: [
    /\bi\s+(?:can'?t|cannot|couldn'?t)\b[^.!?\n]*/gi,
    /\bi'?m\s+not\s+[^.!?\n]*/gi,
    /\bi\s+(?:am\s+not|feel\s+like|feel\s+so)\s+[^.!?\n]*/gi,
    /\bi\s+(?:should|shouldn'?t|have\s+to|must|need\s+to)\b[^.!?\n]*/gi,
    /\bi\s+(?:always|never)\b[^.!?\n]*/gi,
    /\b(?:no\s+one|nobody|everyone)\s+[^.!?\n]*/gi,
    /\bi\s+(?:failed|messed\s+up|screwed\s+up|ruined)\b[^.!?\n]*/gi,
  ],

  _base() {
    return (window.CONFIG && CONFIG.apiBase) || '';
  },

  // --- Fetch recent entries as an array of {date, text} ------------------
  // Reuses the same read + parse path as "Find patterns". `days` limits the
  // window (default 90) so suggestions reflect what's current, not ancient.
  async fetchRecentEntries(docID, token, days = 90) {
    const docText = await GoogleDocsService.readEntriesText(docID, token);
    const entries = PatternService.parseEntries(docText);
    const recent = PatternService.filterEntriesByDays(entries, days);
    // Fall back to the whole journal if nothing is dated within the window.
    return (recent.length ? recent : entries);
  },

  // --- Client-side analysis ---------------------------------------------
  analyze(entries) {
    const texts = entries.map((e) => e.text || '');
    const combined = texts.join('\n');
    const lower = combined.toLowerCase();

    // Emotion frequency
    const emotionCounts = {};
    for (const w of this.EMOTION_WORDS) {
      const n = (lower.match(new RegExp(`\\b${w}\\b`, 'g')) || []).length;
      if (n) emotionCounts[w] = n;
    }
    const emotions = Object.entries(emotionCounts)
      .sort(([, a], [, b]) => b - a)
      .map(([w]) => w);

    // Theme frequency
    const themeCounts = {};
    for (const { theme, label, keys } of this.THEME_LEXICON) {
      let n = 0;
      for (const k of keys) n += (lower.match(new RegExp(k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
      if (n) themeCounts[theme] = { count: n, label };
    }
    const themes = Object.entries(themeCounts)
      .sort(([, a], [, b]) => b.count - a.count)
      .map(([theme, v]) => ({ theme, label: v.label, count: v.count }));

    // People
    const people = [];
    for (const rel of ['sister', 'mom', 'dad', 'friend', 'partner', 'boss', 'manager', 'brother', 'mother', 'father']) {
      if (lower.includes(`my ${rel}`)) people.push(`my ${rel}`);
    }

    // Automatic thoughts — dedupe, trim, cap length, keep the most recent-ish.
    const thoughtSet = new Set();
    for (const pat of this._THOUGHT_PATTERNS) {
      const matches = combined.match(pat) || [];
      for (let m of matches) {
        m = m.trim().replace(/\s+/g, ' ');
        if (m.length >= 8 && m.length <= 120) thoughtSet.add(this._sentenceCase(m));
      }
    }
    const thoughts = [...thoughtSet].slice(0, 6);

    return { emotions, themes, people, thoughts, entryCount: entries.length };
  },

  // --- CBT suggestions ---------------------------------------------------
  cbtSuggestions(analysis) {
    const out = {};

    // Scenario ← recurring themes, phrased as situations.
    if (analysis.themes.length) {
      out.scenario = analysis.themes.slice(0, 5).map((t) => this._themeToScenario(t.theme, t.label));
    }
    // Emotions ← the words actually appearing in the journal.
    if (analysis.emotions.length) {
      out.emotion = analysis.emotions.slice(0, 6).map((w) => this._cap(w));
    }
    // Automatic thoughts ← extracted self-talk.
    if (analysis.thoughts.length) {
      out.thought = analysis.thoughts.slice(0, 5);
    }
    // Reframes ← a balanced counter for each extracted thought.
    if (analysis.thoughts.length) {
      out.reframe = analysis.thoughts.slice(0, 5).map((t) => this._reframe(t));
    }
    return out;
  },

  // --- Manifestation suggestions ----------------------------------------
  manifestSuggestions(analysis) {
    const out = {};

    // Desired outcomes ← turn recurring themes/concerns into present-tense
    // "I am / I have" affirmations.
    const outcomes = [];
    for (const t of analysis.themes.slice(0, 5)) outcomes.push(this._themeToAffirmation(t.theme));
    // Also convert a couple of limiting thoughts into their empowered inverse.
    for (const th of analysis.thoughts.slice(0, 3)) {
      const aff = this._thoughtToAffirmation(th);
      if (aff) outcomes.push(aff);
    }
    if (outcomes.length) out.desired_outcome = [...new Set(outcomes)].slice(0, 6);

    // Gratitude ← positively-toned themes + people mentioned.
    const grat = [];
    for (const p of analysis.people.slice(0, 2)) grat.push(`${this._cap(p)} being in my life`);
    for (const t of analysis.themes.slice(0, 3)) grat.push(this._themeToGratitude(t.theme));
    if (grat.length) out.gratitude = [...new Set(grat)].slice(0, 5);

    // Limiting beliefs ← the raw self-doubt sentences, lightly normalized.
    if (analysis.thoughts.length) {
      out.limiting_belief = analysis.thoughts
        .filter((t) => /can'?t|not|never|no one|nobody|failed/i.test(t))
        .slice(0, 4);
    }

    // Aligned actions ← one concrete step per top theme.
    if (analysis.themes.length) {
      out.aligned_action = analysis.themes.slice(0, 5).map((t) => this._themeToAction(t.theme));
    }
    return out;
  },

  // --- Optional AI upgrade ----------------------------------------------
  // Tries the proxy; resolves to a suggestions object shaped like the
  // client-side ones, or null if unreachable / not deployed. Never throws.
  async aiUpgrade(kind, entries) {
    const base = this._base();
    if (!base) return null;
    try {
      const res = await fetch(`${base}/api/personalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, entries: entries.map((e) => e.text).slice(0, 40) }),
      });
      if (!res.ok) return null;
      const data = await res.json().catch(() => ({}));
      return (data && typeof data.suggestions === 'object') ? data.suggestions : null;
    } catch (_) {
      return null; // client-side suggestions already shown; silent.
    }
  },

  // --- Text transforms (heuristic, deterministic) -----------------------
  _cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; },
  _sentenceCase(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; },

  _themeToScenario(theme, label) {
    const map = {
      coding: 'Working on a coding project / debugging',
      music: 'Making music or preparing a DJ set',
      body: 'Something about my body or health came up',
      'ai-safety': 'My AI-safety work or writing',
      work: 'A moment at work',
      family: 'An interaction with family',
      'self-worth': 'A moment I doubted my own worth',
      money: 'Money or financial pressure',
      creativity: 'A creative project',
    };
    return map[theme] || label;
  },

  _themeToAffirmation(theme) {
    const map = {
      coding: 'I build with ease and flow — ideas move from thought to working app, and I trust myself to learn what I don\'t yet know.',
      music: 'My sound has an identity of its own — the blend of guzheng and electronic soul — and it moves every room I play.',
      body: 'I am at peace with my body. It is strong, light, and full of energy, and I move with confidence.',
      'ai-safety': 'My voice in AI safety is trusted and sought after; my distinct lens is seen as valuable, and my writing reaches who it needs to.',
      work: 'I bring calm, focused energy to my work, and I protect my time without guilt.',
      family: 'My relationships are warm and mutually supportive; I show up fully and I am met in return.',
      'self-worth': 'My confidence is magnetic. I know my worth without needing anyone\'s permission.',
      money: 'I am financially steady and secure; resources flow to me with ease.',
      creativity: 'My creativity flows freely, and what I make carries something only I can offer.',
    };
    return map[theme] || 'I am grounded, capable, and moving toward what I want with ease.';
  },

  _themeToGratitude(theme) {
    const map = {
      coding: 'The ability to build things I imagine',
      music: 'Music and the sound that is mine',
      body: 'A body that carries me every day',
      'ai-safety': 'Work that matters to me',
      work: 'Having work to do',
      family: 'The people who love me',
      'self-worth': 'How far I have already come',
      money: 'Having what I need right now',
      creativity: 'A mind that keeps creating',
    };
    return map[theme] || 'This moment, exactly as it is';
  },

  _themeToAction(theme) {
    const map = {
      coding: 'Spend 20 focused minutes on the project',
      music: 'Work on one track or practice a transition',
      body: 'Move my body kindly for 15 minutes',
      'ai-safety': 'Write one paragraph and share it',
      work: 'Say no to one misaligned thing today',
      family: 'Reach out to someone I care about',
      'self-worth': 'Name one thing I did well today',
      money: 'Take one small practical money step',
      creativity: 'Make something small just for me',
    };
    return map[theme] || 'Take one small aligned step today';
  },

  // Turn "I can't X" / "I'm not X" into a balanced CBT reframe.
  _reframe(thought) {
    const t = thought.toLowerCase();
    if (/can'?t|cannot|couldn'?t/.test(t)) return 'I haven\'t figured this out yet — "yet" is the key word. What is one next step?';
    if (/not\s+good\s+enough|not\s+enough/.test(t)) return 'I am enough as I am, and I am still growing. Enough-ness isn\'t earned by output.';
    if (/'?m\s+not|am\s+not/.test(t)) return 'This is a feeling, not a fact. What evidence would a fair observer see?';
    if (/should|have\s+to|must|need\s+to/.test(t)) return 'Says who? I can choose what actually matters here instead of the "should".';
    if (/always|never/.test(t)) return 'Always and never are rarely true. When has the opposite been the case?';
    if (/no\s+one|nobody/.test(t)) return 'At least one person would understand. Who could I actually reach out to?';
    if (/failed|messed\s+up|screwed\s+up|ruined/.test(t)) return 'A setback is data, not a verdict. What can I learn and adjust?';
    return 'What would I say to a good friend who thought this about themselves?';
  },

  _thoughtToAffirmation(thought) {
    const t = thought.toLowerCase();
    if (/not\s+good\s+enough|not\s+enough/.test(t)) return 'I am already enough, and I grow more capable every day.';
    if (/can'?t|cannot/.test(t)) return 'I am fully capable of learning and doing what I set my mind to.';
    if (/failed|messed\s+up/.test(t)) return 'Every step, including the missteps, is moving me forward.';
    if (/alone|lonely|no\s+one/.test(t)) return 'I am surrounded and supported by people who value me.';
    return null;
  },

  // --- Rendering ---------------------------------------------------------
  // Renders a suggestions card into `container`. `suggestions` is the object
  // returned by cbtSuggestions()/manifestSuggestions() (keys are section keys,
  // values are arrays of strings). Clicking a chip appends its text to the
  // matching form textarea (same behavior as the existing quick-pick dropdown).
  // `form` is the .cbt-form / .manifestation-form element to fill.
  // `sectionLabels` maps section key -> human label for the group heading.
  render(container, suggestions, form, sectionLabels) {
    container.replaceChildren();
    const keys = Object.keys(suggestions || {}).filter((k) => (suggestions[k] || []).length);
    if (!keys.length) {
      const empty = document.createElement('div');
      empty.className = 'personalize-empty';
      empty.textContent = 'Not enough journal history yet to tailor suggestions. Keep journaling and try again.';
      container.appendChild(empty);
      return;
    }

    for (const key of keys) {
      const group = document.createElement('div');
      group.className = 'personalize-group';

      const heading = document.createElement('div');
      heading.className = 'personalize-group-label';
      heading.textContent = (sectionLabels && sectionLabels[key]) || key;
      group.appendChild(heading);

      const chips = document.createElement('div');
      chips.className = 'personalize-chips';
      for (const text of suggestions[key]) {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'personalize-chip';
        chip.textContent = text;
        chip.title = 'Click to add to the form';
        chip.addEventListener('click', () => {
          this._fillField(form, key, text);
          chip.classList.add('used');
        });
        chips.appendChild(chip);
      }
      group.appendChild(chips);
      container.appendChild(group);
    }
  },

  // Append `text` into the textarea for `sectionKey`, matching the quick-pick
  // dropdown's newline-append convention so it composes with typed content.
  _fillField(form, sectionKey, text) {
    if (!form) return;
    const sectionEl = form.querySelector(`[data-key="${sectionKey}"]`);
    const textarea = (sectionEl || form).querySelector(`.cbt-textarea[data-section-key="${sectionKey}"]`)
      || form.querySelector(`.cbt-textarea[data-section-key="${sectionKey}"]`);
    if (!textarea) return;
    const current = textarea.value.trim();
    textarea.value = current ? `${current}\n${text}` : text;
    textarea.focus();
  },
};
