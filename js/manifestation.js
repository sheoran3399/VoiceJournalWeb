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
      picks: ['I am thriving in my career', 'I am financially free', 'I am deeply loved and in a healthy relationship', 'I am at peace with my body', 'I am living somewhere that feels like home', 'I am surrounded by aligned, supportive people', 'I am creating work that matters'],
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
    if (section.picks && section.picks.length > 0) {
      const dropdown = document.createElement('select');
      dropdown.className = 'cbt-dropdown';
      dropdown.dataset.sectionKey = section.key;
      dropdown.dataset.type = 'quick-pick';
      const placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = 'Quick pick…';
      dropdown.appendChild(placeholder);
      section.picks.forEach((pick) => {
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
        section.distortionOptions?.forEach((pattern) => {
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
    if (section.picks && section.picks.length > 0) {
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
