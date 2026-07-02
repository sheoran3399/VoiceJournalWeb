const CBTService = {
  STORAGE_KEY: 'cbt_entries',

  // Section definitions in causal CBT order
  sections: [
    {
      key: 'scenario',
      number: 1,
      label: 'Scenario',
      hint: 'What triggered this?',
      picks: ['Work conflict', 'Difficult conversation', 'Deadline pressure', 'Social situation', 'Unexpected news', 'Feedback received'],
      hasSlider: false,
      hasDistortion: false,
    },
    {
      key: 'somatic_before',
      number: 2,
      label: 'Somatic (before)',
      hint: 'Body sensations you noticed',
      picks: ['Tight chest', 'Clenched jaw', 'Racing heart', 'Shallow breath', 'Stomach knot', 'Tense shoulders', 'Flushed/hot'],
      hasSlider: false,
      hasDistortion: false,
    },
    {
      key: 'emotion',
      number: 3,
      label: 'Emotions',
      hint: 'Rate your emotional intensity (0–100)',
      picks: ['Anxious', 'Angry', 'Frustrated', 'Sad', 'Ashamed', 'Overwhelmed', 'Hurt', 'Fearful'],
      hasSlider: true,
      sliderLabel: 'Intensity (0–100)',
      hasDistortion: false,
    },
    {
      key: 'thought',
      number: 4,
      label: 'Automatic thought',
      hint: 'What did you think in that moment?',
      picks: [],
      hasSlider: false,
      hasDistortion: true,
      distortionOptions: ['Catastrophizing', 'All-or-nothing', 'Mind-reading', 'Overgeneralization', 'Emotional reasoning', 'Should statements', 'Personalization', 'Discounting positives', 'Labeling', 'Fortune-telling'],
    },
    {
      key: 'action',
      number: 5,
      label: 'Action',
      hint: 'How did you respond?',
      picks: ['Withdrew', 'Lashed out', 'Avoided', 'Ruminated', 'Sought reassurance', 'Overworked', 'Shut down'],
      hasSlider: false,
      hasDistortion: false,
    },
    {
      key: 'reframe',
      number: 6,
      label: 'Reframe',
      hint: 'A more balanced perspective',
      picks: [],
      hasSlider: false,
      hasDistortion: false,
    },
    {
      key: 'somatic_after',
      number: 7,
      label: 'Somatic (after)',
      hint: 'Check in with your body now (optional intensity slider)',
      picks: ['Calmer', 'Loosened', 'Slower breath', 'Still tense', 'Neutral', 'Lighter'],
      hasSlider: true,
      sliderLabel: 'Intensity drop (0–100)',
      hasDistortion: false,
    },
  ],

  renderForm(container) {
    const form = document.createElement('div');
    form.className = 'cbt-form';

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
      placeholder.textContent = `Quick pick…`;
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

    // Controls (slider, distortion tag, etc.)
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
        slider.dataset.type = 'intensity-slider';
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
        const distortionGroup = document.createElement('div');
        distortionGroup.className = 'cbt-slider-group';
        const distortionLabel = document.createElement('label');
        distortionLabel.className = 'cbt-slider-label';
        distortionLabel.textContent = 'Cognitive distortion';
        const distortionSelect = document.createElement('select');
        distortionSelect.className = 'cbt-dropdown';
        distortionSelect.dataset.sectionKey = section.key;
        distortionSelect.dataset.type = 'distortion-tag';
        const distortionPlaceholder = document.createElement('option');
        distortionPlaceholder.value = '';
        distortionPlaceholder.textContent = 'Identify a distortion...';
        distortionSelect.appendChild(distortionPlaceholder);
        section.distortionOptions?.forEach((distortion) => {
          const option = document.createElement('option');
          option.value = distortion;
          option.textContent = distortion;
          distortionSelect.appendChild(option);
        });
        distortionGroup.appendChild(distortionLabel);
        distortionGroup.appendChild(distortionSelect);
        controls.appendChild(distortionGroup);
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
    const form = document.querySelector('.cbt-form');
    const data = {
      id: `cbt_${Date.now()}`,
      type: 'cbt',
      created_at: new Date().toISOString(),
    };

    this.sections.forEach((section) => {
      const sectionEl = form.querySelector(`[data-key="${section.key}"]`);
      const textarea = sectionEl.querySelector('.cbt-textarea');
      data[section.key] = textarea.value.trim();

      if (section.hasSlider) {
        const slider = sectionEl.querySelector('[data-type="intensity-slider"]');
        const sliderKey = section.key === 'emotion' ? 'emotion_intensity' : `${section.key}_intensity`;
        data[sliderKey] = parseInt(slider.value, 10);
      }

      if (section.hasDistortion) {
        const distortion = sectionEl.querySelector('[data-type="distortion-tag"]');
        data['distortion'] = distortion.value;
      }
    });

    return data;
  },

  clearForm() {
    const form = document.querySelector('.cbt-form');
    form.querySelectorAll('.cbt-textarea').forEach((textarea) => {
      textarea.value = '';
    });
    form.querySelectorAll('[data-type="intensity-slider"]').forEach((slider) => {
      slider.value = '50';
      const valueDisplay = slider.parentElement.querySelector('.cbt-slider-value');
      if (valueDisplay) valueDisplay.textContent = '50';
    });
    form.querySelectorAll('[data-type="distortion-tag"]').forEach((select) => {
      select.value = '';
    });
  },

  // localStorage management
  loadEntries() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error('[CBT] Error loading entries:', e);
      return [];
    }
  },

  saveEntry(entry) {
    try {
      const entries = this.loadEntries();
      entries.push(entry);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(entries));
      return true;
    } catch (e) {
      console.error('[CBT] Error saving entry:', e);
      return false;
    }
  },

  getAllEntries() {
    return this.loadEntries();
  },
};

// Pattern analysis
const CBTAnalyzer = {
  analyze(entries) {
    if (!entries || entries.length === 0) {
      return { isEmpty: true };
    }

    return {
      isEmpty: false,
      totalEntries: entries.length,
      dateRange: this._getDateRange(entries),
      topEmotions: this._getTopEmotions(entries),
      topDistortions: this._getTopDistortions(entries),
      intensityDrop: this._calculateIntensityDrop(entries),
      emotionScenarioCo: this._getEmotionScenarioCo(entries),
      insights: this._generateInsights(entries),
    };
  },

  _getDateRange(entries) {
    if (entries.length === 0) return null;
    const dates = entries.map((e) => new Date(e.created_at));
    const first = new Date(Math.min(...dates));
    const last = new Date(Math.max(...dates));
    return { first, last };
  },

  _getTopEmotions(entries) {
    const emotionCounts = {};
    entries.forEach((entry) => {
      if (entry.emotion) {
        const emotions = entry.emotion.split('\n').map((e) => e.trim()).filter(Boolean);
        emotions.forEach((emotion) => {
          emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
        });
      }
    });
    return Object.entries(emotionCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([emotion, count]) => ({ emotion, count }));
  },

  _getTopDistortions(entries) {
    const distortionCounts = {};
    entries.forEach((entry) => {
      if (entry.distortion) {
        distortionCounts[entry.distortion] = (distortionCounts[entry.distortion] || 0) + 1;
      }
    });
    return Object.entries(distortionCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([distortion, count]) => ({ distortion, count }));
  },

  _calculateIntensityDrop(entries) {
    const validEntries = entries.filter(
      (e) => e.emotion_intensity !== undefined && e.somatic_after_intensity !== undefined
    );
    if (validEntries.length === 0) return null;
    const drops = validEntries.map((e) => e.emotion_intensity - e.somatic_after_intensity);
    const average = drops.reduce((a, b) => a + b, 0) / drops.length;
    return Math.round(average);
  },

  _getEmotionScenarioCo(entries) {
    const coMap = {};
    entries.forEach((entry) => {
      if (entry.scenario && entry.emotion) {
        const scenario = entry.scenario.split('\n')[0].trim();
        const emotions = entry.emotion.split('\n').map((e) => e.trim()).filter(Boolean);
        emotions.forEach((emotion) => {
          const key = `${scenario}|${emotion}`;
          coMap[key] = (coMap[key] || 0) + 1;
        });
      }
    });
    return Object.entries(coMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([key, count]) => {
        const [scenario, emotion] = key.split('|');
        return { scenario, emotion, count };
      });
  },

  _generateInsights(entries) {
    const insights = [];

    // Insight 1: Intensity drop
    const intensityDrop = this._calculateIntensityDrop(entries);
    if (intensityDrop !== null) {
      if (intensityDrop > 20) {
        insights.push(`You're seeing a meaningful shift: average intensity drop of ${intensityDrop} points. Journaling is helping you regulate.`);
      } else if (intensityDrop > 0) {
        insights.push(`Your average intensity drop is ${intensityDrop} points — small but consistent progress.`);
      } else if (intensityDrop === 0) {
        insights.push(`Your somatic intensity is stabilizing around the same level. Try exploring new reframes.`);
      } else {
        insights.push(`Your intensity is rising post-reflection (${Math.abs(intensityDrop)} points). This might signal unprocessed feelings — consider diving deeper.`);
      }
    }

    // Insight 2: Most frequent scenario or emotion
    const topEmotions = this._getTopEmotions(entries);
    if (topEmotions.length > 0) {
      const top = topEmotions[0];
      insights.push(`${top.emotion} shows up in ${top.count} entries — a key emotion to track and understand.`);
    }

    // Insight 3: Distortion patterns
    const topDistortions = this._getTopDistortions(entries);
    if (topDistortions.length > 0) {
      const top = topDistortions[0];
      insights.push(`Your most common cognitive distortion is "${top.distortion}" (${top.count} times). Notice this pattern and practice the reframe.`);
    }

    return insights;
  },
};
