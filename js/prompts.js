// Dynamic mental wellness prompts shown after each staged entry.
// renderDynamic() immediately shows personalized client-side prompts (via
// entity extraction + question interpolation), then silently upgrades to
// Claude Sonnet-generated prompts from /api/prompts when they arrive.
const GratitudePrompts = {
  PROMPT_DB: {
    gratitude: [
      { id: 'gratitude-1', question: 'What is one thing you feel grateful for right now?', options: ['A supportive person', 'My body carrying me', 'A small comfort', 'A lesson from today'] },
      { id: 'gratitude-2', question: 'What helped you feel a little safer or steadier today?', options: ['A routine', 'Fresh air', 'A warm meal', 'A kind message'] },
      { id: 'gratitude-3', question: 'What simple pleasure did you experience today, even briefly?', options: ['Warmth', 'A taste or smell', 'A moment of quiet', 'Something beautiful'] },
    ],
    joy: [
      { id: 'joy-1', question: 'What brought you a small spark of joy today?', options: ['A laugh', 'Music', 'Movement', 'A peaceful moment'] },
      { id: 'joy-2', question: 'What moment made you feel most alive or present?', options: ['Connection', 'Creativity', 'Nature', 'Playfulness'] },
      { id: 'joy-3', question: 'What are you quietly looking forward to this week?', options: ['Rest', 'A good conversation', 'A project', 'Something just for me'] },
    ],
    'letting-go': [
      { id: 'letting-go-1', question: 'What are you ready to release, even a little?', options: ['Perfection pressure', 'Old guilt', 'Comparison', 'Need to control everything'] },
      { id: 'letting-go-2', question: 'What thought has been heavy that you can loosen your grip on?', options: ['I am behind', 'I must do more', 'I am not enough', 'This has to be perfect'] },
      { id: 'letting-go-3', question: 'What would you tell a close friend carrying this same weight?', options: ['You have done enough', 'It is okay to rest', 'This will pass', 'You are not alone in this'] },
    ],
    'self-compassion': [
      { id: 'self-compassion-1', question: 'What would a kinder part of you say to you right now?', options: ['You are trying', 'You are not alone', 'Rest is allowed', 'One step at a time'] },
      { id: 'self-compassion-2', question: 'How can you care for yourself gently today?', options: ['Take a short break', 'Breathe slowly', 'Ask for support', 'Speak kindly to myself'] },
      { id: 'self-compassion-3', question: 'What is one thing you did well today, even if it felt small?', options: ['I showed up', 'I kept trying', 'I was honest', 'I cared for someone'] },
    ],
    grounding: [
      { id: 'grounding-1', question: 'What helps your body feel grounded when emotions run high?', options: ['Deep breaths', 'Feet on the floor', 'A hand on my heart', 'Stepping outside'] },
      { id: 'grounding-2', question: 'What is one simple thing you can do in the next 10 minutes to feel steadier?', options: ['Drink water', 'Stretch', 'Tidy one small area', 'Step away from screens'] },
      { id: 'grounding-3', question: 'Name something around you right now that feels safe or calming.', options: ['Familiar sounds', 'Something soft', 'Natural light', 'A comfortable space'] },
    ],
  },

  CATEGORY_LABELS: {
    gratitude: 'Gratitude',
    joy: 'Joy',
    'letting-go': 'Letting go',
    'self-compassion': 'Self compassion',
    grounding: 'Grounding',
  },

  MOOD_MAP: {
    stressed: ['grounding', 'letting-go'],
    stress: ['grounding', 'letting-go'],
    anxious: ['grounding', 'self-compassion'],
    anxiety: ['grounding', 'self-compassion'],
    worried: ['grounding', 'self-compassion'],
    nervous: ['grounding', 'self-compassion'],
    overwhelmed: ['letting-go', 'grounding'],
    tired: ['self-compassion', 'grounding'],
    exhausted: ['self-compassion', 'grounding'],
    frustrated: ['letting-go', 'self-compassion'],
    angry: ['letting-go', 'grounding'],
    sad: ['self-compassion', 'gratitude'],
    lonely: ['self-compassion', 'gratitude'],
    upset: ['self-compassion', 'grounding'],
    disappointed: ['self-compassion', 'letting-go'],
    confused: ['self-compassion', 'grounding'],
    lost: ['self-compassion', 'grounding'],
    failed: ['self-compassion', 'letting-go'],
    failure: ['self-compassion', 'letting-go'],
    mistake: ['self-compassion', 'letting-go'],
    happy: ['joy', 'gratitude'],
    excited: ['joy', 'gratitude'],
    grateful: ['gratitude', 'joy'],
    proud: ['joy', 'gratitude'],
    peaceful: ['gratitude', 'self-compassion'],
    hopeful: ['joy', 'gratitude'],
    calm: ['gratitude', 'joy'],
    achieved: ['gratitude', 'joy'],
    success: ['gratitude', 'joy'],
  },

  // Ordered list of emotion words to scan for — first match wins.
  EMOTION_WORDS: [
    'overwhelmed', 'stressed', 'exhausted', 'frustrated', 'anxious',
    'nervous', 'worried', 'scared', 'angry', 'sad', 'lonely',
    'disappointed', 'confused', 'tired', 'happy', 'excited',
    'grateful', 'proud', 'peaceful', 'calm',
  ],

  // Relationship nouns that pair with "my" in journal writing.
  RELATIONSHIP_WORDS: [
    'boss', 'manager', 'colleague', 'coworker', 'team',
    'friend', 'mom', 'dad', 'mother', 'father', 'parent',
    'sister', 'brother', 'sibling', 'partner', 'husband', 'wife',
    'boyfriend', 'girlfriend', 'child', 'kid', 'son', 'daughter',
    'therapist', 'mentor', 'coach', 'teacher', 'professor',
  ],

  // Specific event nouns that anchor a journal entry to a concrete moment.
  EVENT_WORDS: [
    'meeting', 'presentation', 'interview', 'call', 'conversation',
    'project', 'deadline', 'exam', 'test', 'appointment',
    'class', 'session', 'review', 'date', 'trip', 'event',
  ],

  CONTEXTUAL_TEMPLATES: [
    {
      triggers: ['work', 'job', 'boss', 'meeting', 'deadline', 'colleague', 'office', 'project', 'client', 'career', 'presentation', 'interview'],
      id: 'ctx-work',
      question: 'What is one boundary you could set at work this week to protect your energy?',
      category: 'letting-go',
      categoryLabel: 'Work Balance',
      options: ['Say no to one thing', 'Log off on time', 'Ask for help', 'Pause before reacting'],
    },
    {
      triggers: ['family', 'parent', 'mom', 'dad', 'child', 'kid', 'sibling', 'partner', 'husband', 'wife', 'friend', 'relationship'],
      id: 'ctx-connection',
      question: 'What is one small way you can show up more fully for the people who matter to you?',
      category: 'joy',
      categoryLabel: 'Connection',
      options: ['A heartfelt message', 'Undivided attention', 'Sharing how I feel', 'Quality time'],
    },
    {
      triggers: ['health', 'pain', 'sick', 'doctor', 'exercise', 'body', 'sleep', 'eating', 'diet', 'workout'],
      id: 'ctx-body',
      question: 'What is your body asking for right now — and can you give it that without guilt?',
      category: 'self-compassion',
      categoryLabel: 'Body Wisdom',
      options: ['Rest without guilt', 'Gentle movement', 'Better nourishment', 'Medical attention'],
    },
    {
      triggers: ['learn', 'study', 'school', 'read', 'book', 'course', 'skill', 'practice', 'grow', 'growth'],
      id: 'ctx-growth',
      question: 'How does today\'s learning connect to who you are becoming?',
      category: 'joy',
      categoryLabel: 'Growth',
      options: ['It stretches me', 'It aligns with my values', 'It opens new doors', 'It builds confidence'],
    },
    {
      triggers: ['money', 'finance', 'bill', 'cost', 'debt', 'budget', 'afford', 'rent', 'salary'],
      id: 'ctx-stability',
      question: 'What is one practical step — however small — that could ease the pressure right now?',
      category: 'grounding',
      categoryLabel: 'Stability',
      options: ['Write out a plan', 'Talk to someone I trust', 'Focus on what I control', 'Be kind to myself about it'],
    },
    {
      triggers: ['creative', 'art', 'write', 'music', 'design', 'make', 'build', 'create', 'paint', 'draw', 'craft'],
      id: 'ctx-creativity',
      question: 'What does your creative energy want to explore next?',
      category: 'joy',
      categoryLabel: 'Creativity',
      options: ['Something playful', 'Something meaningful', 'Something I have never tried', 'Something I abandoned'],
    },
  ],

  _container: null,
  _activePrompts: [],

  _pickRandom(list) {
    if (!Array.isArray(list) || list.length === 0) return null;
    return list[Math.floor(Math.random() * list.length)];
  },

  // Pull the most salient person, event, and emotion from the entry text.
  // Returns nulls for anything not found — callers must handle gracefully.
  _extractContext(text) {
    const lower = text.toLowerCase();

    // Person: "my boss", "my friend", etc. — first relationship word found wins.
    let person = null;
    for (const rel of this.RELATIONSHIP_WORDS) {
      if (lower.includes(`my ${rel}`)) { person = `my ${rel}`; break; }
    }
    // Fallback: a proper name after a relational verb ("talked to Sarah", "called James").
    if (!person) {
      const nameMatch = text.match(
        /\b(?:with|told|asked|called|texted|messaged|emailed|talked to|spoke with|heard from)\s+([A-Z][a-z]{2,})\b/
      );
      if (nameMatch) person = nameMatch[1];
    }

    // Event: first event noun found in the entry.
    let event = null;
    for (const e of this.EVENT_WORDS) {
      if (lower.includes(e)) { event = e; break; }
    }

    // Emotion: first recognized emotion word in the entry (ordered by impact).
    let emotion = null;
    for (const ew of this.EMOTION_WORDS) {
      if (lower.includes(ew)) { emotion = ew; break; }
    }

    return { person, event, emotion };
  },

  // Rewrite a prompt's question to reference the extracted context.
  // Falls back to the original question if no natural substitution fits.
  _personalizePrompt(prompt, ctx) {
    if (!ctx.person && !ctx.event && !ctx.emotion) return prompt;

    // Contextual prompts: rewrite the question directly with the specific detail.
    const rewrites = {
      'ctx-work': () => {
        if (ctx.person) return `You mentioned ${ctx.person} — what's one boundary you could set with them to protect your energy this week?`;
        if (ctx.event) return `Thinking about the ${ctx.event} — what's one thing you could change or release to protect your energy?`;
        return null;
      },
      'ctx-connection': () => ctx.person
        ? `You wrote about ${ctx.person} — what's one small way you could show up more fully for them?`
        : null,
      'ctx-body': () => ctx.event
        ? `After the ${ctx.event}, what is your body asking for — and can you give it that without guilt?`
        : null,
      'ctx-growth': () => ctx.event
        ? `How does what happened around the ${ctx.event} connect to who you are becoming?`
        : null,
      'ctx-stability': () => ctx.event
        ? `The pressure around the ${ctx.event} sounds real — what's one small step that could ease it?`
        : null,
    };

    if (rewrites[prompt.id]) {
      const rewritten = rewrites[prompt.id]();
      if (rewritten) return { ...prompt, question: rewritten };
    }

    // Mood prompts: add a preamble line that grounds the question in context.
    // The question itself stays intact; preamble is rendered above it.
    let preamble = null;
    if (ctx.emotion && (prompt.category === 'self-compassion' || prompt.category === 'letting-go')) {
      preamble = `You wrote about feeling ${ctx.emotion}.`;
    } else if (ctx.event && prompt.category === 'grounding') {
      preamble = `After the ${ctx.event} you described…`;
    } else if (ctx.person && prompt.category === 'gratitude') {
      preamble = `With ${ctx.person} in mind…`;
    }

    return preamble ? { ...prompt, preamble } : prompt;
  },

  _analyzeEntry(text) {
    const lower = text.toLowerCase();
    const scores = {};

    for (const [keyword, categories] of Object.entries(this.MOOD_MAP)) {
      if (lower.includes(keyword)) {
        for (const cat of categories) {
          scores[cat] = (scores[cat] || 0) + 1;
        }
      }
    }

    let contextualPrompt = null;
    for (const tmpl of this.CONTEXTUAL_TEMPLATES) {
      if (tmpl.triggers.some(t => lower.includes(t))) {
        contextualPrompt = {
          id: tmpl.id,
          question: tmpl.question,
          options: tmpl.options,
          category: tmpl.category,
          categoryLabel: tmpl.categoryLabel,
        };
        break;
      }
    }

    return { scores, contextualPrompt };
  },

  _buildSmartPromptSet(text) {
    const { scores, contextualPrompt } = this._analyzeEntry(text);
    const ctx = this._extractContext(text);

    const primary = ['gratitude', 'joy', 'letting-go', 'self-compassion'];
    const ranked = [...primary].sort((a, b) => (scores[b] || 0) - (scores[a] || 0));

    const picks = [];
    for (const cat of ranked.slice(0, 3)) {
      const prompt = this._pickRandom(this.PROMPT_DB[cat]);
      if (prompt) picks.push({ ...prompt, category: cat, categoryLabel: this.CATEGORY_LABELS[cat] });
    }

    if (contextualPrompt) {
      picks.push(contextualPrompt);
    } else {
      const grounding = this._pickRandom(this.PROMPT_DB.grounding);
      if (grounding) picks.push({ ...grounding, category: 'grounding', categoryLabel: this.CATEGORY_LABELS.grounding });
    }

    return picks.map(p => this._personalizePrompt(p, ctx));
  },

  _buildPromptSet() {
    const primaryCategories = ['gratitude', 'joy', 'letting-go', 'self-compassion'];
    const picks = [];
    for (const category of primaryCategories) {
      const prompt = this._pickRandom(this.PROMPT_DB[category]);
      if (prompt) picks.push({ ...prompt, category, categoryLabel: this.CATEGORY_LABELS[category] || category });
    }
    const bonus = this._pickRandom(this.PROMPT_DB.grounding);
    if (bonus) picks.push({ ...bonus, category: 'grounding', categoryLabel: this.CATEGORY_LABELS.grounding });
    return picks;
  },

  _renderPromptItem(container, prompt) {
    const item = document.createElement('div');
    item.className = 'gratitude-item';
    item.dataset.promptId = prompt.id;
    item.dataset.category = prompt.category;

    // Preamble: a context-setting line that personalizes the prompt.
    if (prompt.preamble) {
      const pre = document.createElement('p');
      pre.className = 'gratitude-preamble';
      pre.textContent = prompt.preamble;
      item.appendChild(pre);
    }

    const q = document.createElement('p');
    q.className = 'gratitude-question';
    q.textContent = `${prompt.categoryLabel}: ${prompt.question}`;
    item.appendChild(q);

    const chips = document.createElement('div');
    chips.className = 'gratitude-chips';
    for (const option of (prompt.options || [])) {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'gratitude-chip';
      chip.textContent = option;
      chip.addEventListener('click', () => {
        const wasSelected = chip.classList.contains('selected');
        chips.querySelectorAll('.gratitude-chip').forEach((c) => c.classList.remove('selected'));
        if (!wasSelected) chip.classList.add('selected');
      });
      chips.appendChild(chip);
    }
    item.appendChild(chips);

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'gratitude-text';
    input.placeholder = 'Or write your own (optional)…';
    input.autocomplete = 'off';
    item.appendChild(input);

    container.appendChild(item);
  },

  render(container) {
    this._container = container;
    this._activePrompts = this._buildPromptSet();
    container.replaceChildren();
    for (const prompt of this._activePrompts) {
      this._renderPromptItem(container, prompt);
    }
  },

  // Show personalized client-side prompts immediately, then silently upgrade
  // to Claude Sonnet-generated prompts when /api/prompts responds.
  async renderDynamic(container, entryText) {
    this._container = container;

    this._activePrompts = this._buildSmartPromptSet(entryText || '');
    container.replaceChildren();
    for (const prompt of this._activePrompts) {
      this._renderPromptItem(container, prompt);
    }

    try {
      const base = (window.CONFIG && CONFIG.apiBase) || '';
      const res = await fetch(`${base}/api/prompts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: entryText }),
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        if (Array.isArray(data.prompts) && data.prompts.length >= 3) {
          this._activePrompts = data.prompts.map((p, i) => ({
            id: p.id || `api-${i}`,
            question: p.question || '',
            options: Array.isArray(p.options) ? p.options : [],
            category: p.category || 'reflection',
            categoryLabel: p.categoryLabel || 'Reflection',
          }));
          container.replaceChildren();
          for (const prompt of this._activePrompts) {
            this._renderPromptItem(container, prompt);
          }
        }
      }
    } catch (_) {
      // Client-side prompts already showing — nothing to do.
    }
  },

  collect() {
    if (!this._container) return '';
    const lines = [];
    for (const item of this._container.querySelectorAll('.gratitude-item')) {
      const question = item.querySelector('.gratitude-question')?.textContent?.trim() || '';
      const typed = item.querySelector('.gratitude-text')?.value.trim() || '';
      const chosen = item.querySelector('.gratitude-chip.selected')?.textContent?.trim() || '';
      const answer = typed || chosen;
      if (answer) lines.push(`${question} ${answer}`);
    }
    return lines.join('\n');
  },

  reset() {
    if (!this._container) return;
    this._container.querySelectorAll('.gratitude-chip.selected').forEach((c) => c.classList.remove('selected'));
    this._container.querySelectorAll('.gratitude-text').forEach((i) => { i.value = ''; });
  },
};
