const ManifestationService = {
  TAB_TITLE: 'Manifestation',

  // Section definitions in causal manifestation-practice order
  sections: [
    {
      key: 'gratitude',
      number: 1,
      label: 'Gratitude',
      hint: 'What already feels abundant right now?',
      picks: ['My health', 'People who love me', 'A roof over my head', 'Work I get to do', 'A body that carries me', 'Small daily comforts', 'This moment of quiet'],
      hasSlider: false,
      hasDistortion: false,
    },
    {
      key: 'desired_outcome',
      number: 2,
      label: 'Desired outcome',
      hint: 'Write it as already true — present tense, "I am / I have"',
      picks: [
        'Smiles are my natural state. I feel abundance and joy from the bottom of my heart, every single day.',
        'Within 6 months, I am DJing a set for 300+ people at a major event, my sound (organic house, melodic techno, my signature blend with guzheng) moving the whole room.',
        'I am at peace with my body. It feels 30 years old, strong and light. I jump and dance freely, like a child, with no pain and no self-judgment holding me back.',
        'My charisma and confidence are magnetic. People feel it the moment I walk into a room, and I attract high-frequency energy everywhere I go.',
        'I am surrounded and supported by people who share my values, who lift me up, and who I lift up in return.',
        'My voice in AI safety is trusted and sought after. My governance and program background is seen as a distinct, valuable lens, not a lesser one next to PhDs. My writing reaches the people who need it most.',
        "I build with ease and flow. My ideas move from thought to working app without friction. I trust myself to learn what I don't yet know, and Claude Code becomes a true creative partner in bringing bigger, more complex projects to life.",
        "My music carries something no one else can offer, the blend of guzheng and electronic soul. My sound has an identity of its own, and it's shared and celebrated.",
        "My sister's business grows and thrives, and I'm proud of the part I played in helping her reach the people who need her.",
        'My body responds to my care. My labs, my energy, my strength all reflect the discipline and love I put in. I feel powerful in my own skin.',
        'I look young, my skin glowing with health and vitality. My body is toned and strong, shaped by the discipline I bring to it every day. I move with confidence, every step and gesture radiating energy. People notice the light in me before I even speak. I feel powerful, alive, and fully at home in my own skin.',
        'I give myself unconditional love, the same love I so freely give to others. I am gentle with myself, patient with my own growth, and generous with my own heart. I celebrate my wins without waiting for permission. I extend that same generosity to the people I care about, my time, my energy, my presence, freely and without keeping score. Love flows through me and out into the world, and it comes back to me, again and again.',
      ],
      hasSlider: false,
      hasDistortion: false,
    },
    {
      key: 'feeling',
      number: 3,
      label: 'Feeling it now',
      hint: 'What emotion comes with already having this?',
      picks: ['Calm certainty', 'Excited relief', 'Grounded confidence', 'Quiet joy', 'Ease', 'Gratitude', 'Pride'],
      hasSlider: true,
      sliderLabel: 'Belief it\'s possible (0–100)',
      hasDistortion: false,
    },
    {
      key: 'limiting_belief',
      number: 4,
      label: 'Limiting belief',
      hint: 'What doubt or fear shows up when you read that back?',
      picks: [],
      hasSlider: false,
      hasDistortion: true,
      distortionOptions: ['Not enough time', 'Not enough money', "Not my turn yet", 'Past failures repeating', 'Fear of being seen', 'Comparison to others', "Fear of losing what I have", 'Deserving-ness doubt'],
    },
    {
      key: 'releasing',
      number: 5,
      label: 'Releasing it',
      hint: 'Speak to that doubt — how do you let it go, just for today?',
      picks: ['I release the need to know how', 'This doubt is old, not true', 'I trust the timing of my life', 'I choose to act anyway', 'I am allowed to receive this'],
      hasSlider: false,
      hasDistortion: false,
    },
    {
      key: 'aligned_action',
      number: 6,
      label: 'Aligned action',
      hint: 'One small, concrete step you can take today toward this',
      picks: ['Send that email', 'Have the honest conversation', 'Spend 20 minutes on the project', 'Take care of my body today', 'Say no to something misaligned', 'Reach out to someone who can help'],
      hasSlider: false,
      hasDistortion: false,
    },
    {
      key: 'evidence',
      number: 7,
      label: 'Evidence & signs',
      hint: 'What small sign, coincidence, or shift did you notice today? (optional)',
      picks: ['A conversation that felt like confirmation', 'An unexpected opportunity', 'A moment of ease where there used to be friction', "Nothing yet — and that's okay"],
      hasSlider: false,
      hasDistortion: false,
    },
  ],

  // --- Quick-pick customization: overrides live in localStorage so the
  // affirmation bank can be edited from Settings instead of requiring a
  // code change + redeploy each time. `section.picks`/`distortionOptions`
  // above remain the shipped defaults and the "reset" target.
  _picksStorageKey(sectionKey) {
    return `manifestPicks:${sectionKey}`;
  },

  _defaultPicks(section) {
    return section.hasDistortion ? section.distortionOptions : section.picks;
  },

  getPicks(section) {
    const raw = localStorage.getItem(this._picksStorageKey(section.key));
    if (!raw) return this._defaultPicks(section);
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : this._defaultPicks(section);
    } catch {
      return this._defaultPicks(section);
    }
  },

  setPicks(sectionKey, items) {
    localStorage.setItem(this._picksStorageKey(sectionKey), JSON.stringify(items));
  },

  resetAllPicks() {
    this.sections.forEach((section) => localStorage.removeItem(this._picksStorageKey(section.key)));
  },

  // Builds the "Edit quick picks" modal body: one labeled textarea per
  // section, one item per line, prefilled with the current effective list.
  renderPicksEditor(container) {
    const fields = this.sections.map((section) => {
      const picks = this.getPicks(section);
      const label = document.createElement('label');
      label.className = 'field-label';
      const span = document.createElement('span');
      span.textContent = section.label;
      const textarea = document.createElement('textarea');
      textarea.className = 'picks-textarea';
      textarea.dataset.sectionKey = section.key;
      textarea.rows = Math.min(8, Math.max(3, picks.length));
      textarea.value = picks.join('\n');
      textarea.setAttribute('aria-label', `${section.label} quick picks`);
      const small = document.createElement('small');
      small.textContent = 'One item per line.';
      label.appendChild(span);
      label.appendChild(textarea);
      label.appendChild(small);
      return label;
    });
    container.replaceChildren(...fields);
  },

  // Reads the editor's textareas back out and persists them.
  savePicksEditor(container) {
    container.querySelectorAll('textarea[data-section-key]').forEach((textarea) => {
      const items = textarea.value.split('\n').map((s) => s.trim()).filter(Boolean);
      this.setPicks(textarea.dataset.sectionKey, items);
    });
  },

  // Repopulates the <option> lists of an already-rendered manifestation
  // form in place, so editing quick picks doesn't wipe an in-progress
  // draft the way a full renderForm() re-render would.
  refreshDropdowns(form) {
    this.sections.forEach((section) => {
      const picks = this.getPicks(section);
      const sectionEl = form.querySelector(`[data-key="${section.key}"]`);
      if (!sectionEl) return;
      const selector = section.hasDistortion ? '[data-type="belief-tag"]' : '[data-type="quick-pick"]';
      const select = sectionEl.querySelector(selector);
      if (!select) return;
      const current = select.value;
      select.querySelectorAll('option:not(:first-child)').forEach((o) => o.remove());
      picks.forEach((item) => {
        const option = document.createElement('option');
        option.value = item;
        option.textContent = item;
        select.appendChild(option);
      });
      select.value = current;
    });
  },

  renderForm(container) {
    const form = document.createElement('div');
    form.className = 'manifestation-form';

    this.sections.forEach((section) => {
      const sectionEl = this._renderSection(section);
      form.appendChild(sectionEl);
    });

    container.replaceChildren(form);
  },

  _renderSection(section) {
    const picks = this.getPicks(section);
    const sectionEl = document.createElement('div');
    sectionEl.className = 'cbt-section';
    sectionEl.dataset.key = section.key;

    // Header
    const header = document.createElement('div');
    header.className = 'cbt-section-header';
    const numBadge = document.createElement('div');
    numBadge.className = 'cbt-section-number';
    numBadge.textContent = section.number;
    const label = document.createElement('div');
    label.className = 'cbt-section-label';
    label.textContent = section.label;
    header.appendChild(numBadge);
    header.appendChild(label);
    sectionEl.appendChild(header);

    // Hint
    const hint = document.createElement('div');
    hint.className = 'cbt-section-hint';
    hint.textContent = section.hint;
    sectionEl.appendChild(hint);

    // Dropdown (if applicable)
    if (!section.hasDistortion && picks && picks.length > 0) {
      const dropdown = document.createElement('select');
      dropdown.className = 'cbt-dropdown';
      dropdown.dataset.sectionKey = section.key;
      dropdown.dataset.type = 'quick-pick';
      const placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = 'Quick pick…';
      dropdown.appendChild(placeholder);
      picks.forEach((pick) => {
        const option = document.createElement('option');
        option.value = pick;
        option.textContent = pick;
        dropdown.appendChild(option);
      });
      sectionEl.appendChild(dropdown);
    }

    // Textarea
    const textarea = document.createElement('textarea');
    textarea.className = 'cbt-textarea';
    textarea.dataset.sectionKey = section.key;
    textarea.placeholder = section.label;
    textarea.setAttribute('aria-label', section.label);
    sectionEl.appendChild(textarea);

    // Controls (slider, belief-pattern tag, etc.)
    if (section.hasSlider || section.hasDistortion) {
      const controls = document.createElement('div');
      controls.className = 'cbt-controls';

      if (section.hasSlider) {
        const sliderGroup = document.createElement('div');
        sliderGroup.className = 'cbt-slider-group';
        const sliderLabel = document.createElement('label');
        sliderLabel.className = 'cbt-slider-label';
        sliderLabel.textContent = section.sliderLabel || 'Intensity (0–100)';
        const slider = document.createElement('input');
        slider.type = 'range';
        slider.className = 'cbt-slider';
        slider.min = '0';
        slider.max = '100';
        slider.value = '50';
        slider.dataset.sectionKey = section.key;
        slider.dataset.type = 'belief-slider';
        const valueDisplay = document.createElement('div');
        valueDisplay.className = 'cbt-slider-value';
        valueDisplay.textContent = '50';
        slider.addEventListener('input', () => {
          valueDisplay.textContent = slider.value;
        });
        sliderGroup.appendChild(sliderLabel);
        sliderGroup.appendChild(slider);
        sliderGroup.appendChild(valueDisplay);
        controls.appendChild(sliderGroup);
      }

      if (section.hasDistortion) {
        const beliefGroup = document.createElement('div');
        beliefGroup.className = 'cbt-slider-group';
        const beliefLabel = document.createElement('label');
        beliefLabel.className = 'cbt-slider-label';
        beliefLabel.textContent = 'Belief pattern';
        const beliefSelect = document.createElement('select');
        beliefSelect.className = 'cbt-dropdown';
        beliefSelect.dataset.sectionKey = section.key;
        beliefSelect.dataset.type = 'belief-tag';
        const beliefPlaceholder = document.createElement('option');
        beliefPlaceholder.value = '';
        beliefPlaceholder.textContent = 'Name the pattern...';
        beliefSelect.appendChild(beliefPlaceholder);
        picks?.forEach((pattern) => {
          const option = document.createElement('option');
          option.value = pattern;
          option.textContent = pattern;
          beliefSelect.appendChild(option);
        });
        beliefGroup.appendChild(beliefLabel);
        beliefGroup.appendChild(beliefSelect);
        controls.appendChild(beliefGroup);
      }

      sectionEl.appendChild(controls);
    }

    // Attach event listener to dropdown for quick-pick append behavior
    if (!section.hasDistortion && picks && picks.length > 0) {
      const dropdown = sectionEl.querySelector('[data-type="quick-pick"]');
      const textarea = sectionEl.querySelector('.cbt-textarea');
      if (dropdown && textarea) {
        dropdown.addEventListener('change', () => {
          if (dropdown.value) {
            const currentText = textarea.value.trim();
            const newText = currentText ? `${currentText}\n${dropdown.value}` : dropdown.value;
            textarea.value = newText;
            textarea.focus();
            dropdown.value = '';
          }
        });
      }
    }

    return sectionEl;
  },

  readFormData() {
    const form = document.querySelector('.manifestation-form');
    const data = {
      id: `manifestation_${Date.now()}`,
      type: 'manifestation',
      created_at: new Date().toISOString(),
    };

    this.sections.forEach((section) => {
      const sectionEl = form.querySelector(`[data-key="${section.key}"]`);
      const textarea = sectionEl.querySelector('.cbt-textarea');
      data[section.key] = textarea.value.trim();

      if (section.hasSlider) {
        const slider = sectionEl.querySelector('[data-type="belief-slider"]');
        data[`${section.key}_belief`] = parseInt(slider.value, 10);
      }

      if (section.hasDistortion) {
        const belief = sectionEl.querySelector('[data-type="belief-tag"]');
        data['belief_pattern'] = belief.value;
      }
    });

    return data;
  },

  clearForm() {
    const form = document.querySelector('.manifestation-form');
    form.querySelectorAll('.cbt-textarea').forEach((textarea) => {
      textarea.value = '';
    });
    form.querySelectorAll('[data-type="belief-slider"]').forEach((slider) => {
      slider.value = '50';
      const valueDisplay = slider.parentElement.querySelector('.cbt-slider-value');
      if (valueDisplay) valueDisplay.textContent = '50';
    });
    form.querySelectorAll('[data-type="belief-tag"]').forEach((select) => {
      select.value = '';
    });
  },

  // Renders an entry as a "[timestamp]\nLabel: value\n..." block, matching
  // the journal tab's own format so PatternService.parseEntries can read
  // either one back.
  formatEntryBlock(entry) {
    const formatted = new Intl.DateTimeFormat('en-US', {
      dateStyle: 'full',
      timeStyle: 'medium',
    }).format(new Date(entry.created_at));
    const lines = [`[${formatted}]`];

    this.sections.forEach((section) => {
      const value = entry[section.key] || '';
      let annotation = '';
      if (section.hasSlider && entry[`${section.key}_belief`] !== undefined) {
        annotation += ` (Belief: ${entry[`${section.key}_belief`]})`;
      }
      if (section.hasDistortion && entry.belief_pattern) {
        annotation += ` (Pattern: ${entry.belief_pattern})`;
      }
      // A belief-pattern tag can exist even when the textarea is empty —
      // still write the line so the tag survives the round trip.
      if (!value && !annotation) return;
      lines.push(`${section.label}: ${value}${annotation}`);
    });

    lines.push('');
    return lines.join('\n') + '\n';
  },

  // Reverses formatEntryBlock: given one parsed block's body text (as
  // returned by PatternService.parseEntries) and its date, reconstructs the
  // same shaped object readFormData() produces.
  parseEntryBlock(text, dateISO) {
    const data = {
      id: `manifestation_${new Date(dateISO).getTime()}`,
      type: 'manifestation',
      created_at: dateISO,
    };
    const lines = text.split('\n');

    this.sections.forEach((section) => {
      const line = lines.find((l) => l.startsWith(`${section.label}: `));
      if (!line) return;
      let rest = line.slice(section.label.length + 2);

      if (section.hasSlider) {
        const match = rest.match(/^(.*) \(Belief: (\d+)\)$/);
        if (match) {
          rest = match[1];
          data[`${section.key}_belief`] = parseInt(match[2], 10);
        }
      }

      if (section.hasDistortion) {
        const match = rest.match(/^(.*) \(Pattern: (.*)\)$/);
        if (match) {
          rest = match[1];
          data.belief_pattern = match[2];
        }
      }

      data[section.key] = rest;
    });

    return data;
  },
};
