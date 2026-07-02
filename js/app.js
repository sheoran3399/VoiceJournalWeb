const speech = new SpeechRecognizer();
const auth = new GoogleAuthManager(CONFIG.googleClientID);

// Initialize Google Identity Services after all scripts (including GIS) have loaded
window.addEventListener('load', () => auth.init());

document.addEventListener('DOMContentLoaded', () => {
  // Hard-coded single journal document; localStorage can still override via Settings.
  let docID = localStorage.getItem('docID') || CONFIG.docID || '';

  // DOM refs
  const authBanner   = document.getElementById('authBanner');
  const recordBtn    = document.getElementById('recordBtn');
  const micIcon      = document.getElementById('micIcon');
  const transcriptEl = document.getElementById('transcript');
  const placeholder  = document.getElementById('placeholder');
  const addVoiceEntryBtn = document.getElementById('addVoiceEntryBtn');
  const statusEl     = document.getElementById('status');
  const settingsBtn  = document.getElementById('settingsBtn');
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const modal        = document.getElementById('settingsModal');
  const docIDInput   = document.getElementById('docIDInput');
  const cancelBtn    = document.getElementById('cancelSettings');
  const saveBtn      = document.getElementById('saveSettings');
  const signOutBtn   = document.getElementById('signOutBtn');
  const reflectionCard = document.getElementById('reflectionCard');
  const reflectionBody = document.getElementById('reflectionBody');
  const coachCard      = document.getElementById('coachCard');
  const coachBody      = document.getElementById('coachBody');
  const manualInput  = document.getElementById('manualInput');
  const addEntryBtn  = document.getElementById('addEntryBtn');
  const gratitudeCard = document.getElementById('gratitudeCard');
  const gratitudeList = document.getElementById('gratitudeList');
  const reflectBtn      = document.getElementById('reflectBtn');
  const findPatternsBtn = document.getElementById('findPatternsBtn');
  const patternsCard    = document.getElementById('patternsCard');
  const patternsBody    = document.getElementById('patternsBody');
  const poemCard  = document.getElementById('poemCard');
  const poemBody  = document.getElementById('poemBody');
  const wordBody  = document.getElementById('wordBody');
  const PATTERNS_FULL_SCAN_PREFIX = 'patterns.fullScanDone.';

  // CBT refs
  const voicePanel = document.getElementById('voicePanel');
  const cbtPanel = document.getElementById('cbtPanel');
  const cbtForm = document.getElementById('cbtForm');
  const saveCBTBtn = document.getElementById('saveCBTBtn');
  const exportCBTBtn = document.getElementById('exportCBTBtn');
  const analyzeBtn = document.getElementById('analyzeBtn');
  const cbtAnalysisCard = document.getElementById('cbtAnalysisCard');
  const cbtAnalysisBody = document.getElementById('cbtAnalysisBody');
  const tabButtons = document.querySelectorAll('.tab-btn');

  // Holds the entry awaiting reflection/save. Null when nothing is pending.
  let pendingEntry = null;
  let draftTranscript = '';
  let liveTranscript = '';
  let finalizeAfterStop = false;
  // True when the user has directly edited the transcript div (so we don't overwrite their edits)
  let transcriptUserEdited = false;

  // Render today's word on load; updates to entry-specific after reflection.
  WordService.renderFresh(wordBody);

  // --- Auth ---
  auth.onStateChange = (isSignedIn) => renderAuthBanner(isSignedIn);
  renderAuthBanner(false);

  function renderAuthBanner(isSignedIn) {
    authBanner.replaceChildren();
    if (isSignedIn) {
      const span = document.createElement('span');
      span.className = 'connected';
      span.textContent = '✓ Connected to Google';
      authBanner.appendChild(span);
    } else {
      const btn = document.createElement('button');
      btn.className = 'signin-btn';
      btn.textContent = 'Sign in with Google to enable saving';
      btn.addEventListener('click', () => auth.signIn());
      authBanner.appendChild(btn);
    }
    signOutBtn.classList.toggle('hidden', !isSignedIn);
  }

  function appendTranscript(base, addition) {
    const next = (addition || '').trim();
    if (!next) return base;
    if (!base) return next;
    return `${base.replace(/\s+$/, '')} ${next}`;
  }

  function getVisibleTranscript() {
    return appendTranscript(draftTranscript, liveTranscript);
  }

  function renderTranscript() {
    const text = getVisibleTranscript();
    if (text) {
      placeholder.classList.add('hidden');
      transcriptEl.classList.remove('hidden');
      addVoiceEntryBtn.classList.remove('hidden');
      addVoiceEntryBtn.disabled = false;
      // During recording: always overwrite with live text (user can't type)
      // After recording: only set content if the user hasn't manually edited it
      if (speech.isRecording || !transcriptUserEdited) {
        transcriptEl.textContent = text;
      }
      transcriptEl.contentEditable = speech.isRecording ? 'false' : 'true';
    } else {
      transcriptEl.textContent = '';
      transcriptEl.classList.add('hidden');
      placeholder.classList.remove('hidden');
      addVoiceEntryBtn.classList.add('hidden');
      addVoiceEntryBtn.disabled = true;
      transcriptEl.contentEditable = 'false';
    }
  }

  function clearDraft() {
    transcriptUserEdited = false;
    draftTranscript = '';
    liveTranscript = '';
    renderTranscript();
  }

  // Allow user to edit the voice transcript before staging
  transcriptEl.addEventListener('input', () => {
    transcriptUserEdited = true;
    const content = (transcriptEl.innerText || transcriptEl.textContent || '').trim();
    if (!content) {
      // User cleared all text — treat as resetting the draft
      draftTranscript = '';
      liveTranscript = '';
      transcriptUserEdited = false;
      renderTranscript();
    } else {
      addVoiceEntryBtn.disabled = false;
      addVoiceEntryBtn.classList.remove('hidden');
    }
  });

  function stageEntry(text) {
    const cleanText = (text || '').trim();
    if (!cleanText) {
      setSaveState('error', 'Type or record something first.');
      return false;
    }
    pendingEntry = { text: cleanText, date: new Date() };
    setSaveState('idle');
    // Render AI-personalised prompts (falls back to smart client-side selection)
    GratitudePrompts.renderDynamic(gratitudeList, cleanText).catch(() => {
      GratitudePrompts.render(gratitudeList);
    });
    gratitudeCard.classList.remove('hidden');
    gratitudeCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return true;
  }

  // --- Speech ---
  speech.onTranscriptChange = (text) => {
    liveTranscript = text || '';
    renderTranscript();
  };

  speech.onTranscriptFinalized = async (text) => {
    console.log('[Journal] transcript finalized (' + text.length + ' chars)');
    draftTranscript = appendTranscript(draftTranscript, text);
    liveTranscript = '';
    renderTranscript();
    updateRecordBtn();
    if (finalizeAfterStop) {
      finalizeAfterStop = false;
      if (stageEntry(draftTranscript)) {
        // Keep the draft visible until the user explicitly reflects or saves it.
      }
    }
  };

  speech.onNoSpeech = () => {
    setSaveState('error', "Can't hear you — speak louder or check mic in Chrome settings (⋮ → Settings → Privacy → Microphone).");
  };

  speech.onStop = () => {
    setSaveState('idle');
    updateRecordBtn();
  };

  speech.onError = (error) => {
    const messages = {
      'not-allowed': 'Microphone access denied. Check Chrome site permissions for localhost:8000.',
      'network':     navigator.onLine
        ? 'Network error — try on-device speech if your browser supports it.'
        : (speech.offlineCapable
          ? 'Offline speech recognition is unavailable in this browser. Try Chrome with on-device speech enabled.'
          : 'You are offline, and this browser does not support on-device speech recognition.'),
      'audio-capture': 'No microphone found. Check your input device.',
      'service-not-allowed': 'Speech service blocked. Try reloading the page.',
    };
    setSaveState('error', messages[error] || `Speech error: ${error}`);
    updateRecordBtn();
  };

  // --- Record button ---
  recordBtn.addEventListener('click', () => {
    if (speech.isRecording) {
      setSaveState('idle');
      speech.stop();
    } else {
      // Sync any user edits into draftTranscript before appending new recording
      if (transcriptUserEdited) {
        draftTranscript = (transcriptEl.innerText || transcriptEl.textContent || '').trim();
      }
      transcriptUserEdited = false;
      pendingEntry = null;
      setSaveState('idle');
      reflectionCard.classList.add('hidden');
      coachCard.classList.add('hidden');
      poemCard.classList.add('hidden');
      hideGratitude();
      liveTranscript = '';
      renderTranscript();
      if (!navigator.onLine && !speech.offlineCapable) {
        setSaveState('error', 'You are offline, and this browser cannot recognize speech without internet.');
        return;
      }
      speech.start();
    }
    updateRecordBtn();
  });

  // --- Voice transcript entry staging ---
  // Reads from the DOM so user edits (Enhancement 1) are captured.
  addVoiceEntryBtn.addEventListener('click', () => {
    reflectionCard.classList.add('hidden');
    coachCard.classList.add('hidden');
    poemCard.classList.add('hidden');
    const editedText = (transcriptEl.innerText || transcriptEl.textContent || '').trim()
      || getVisibleTranscript();
    if (!stageEntry(editedText)) return;
  });

  function updateRecordBtn() {
    const recording = speech.isRecording;
    recordBtn.classList.toggle('recording', recording);
    micIcon.textContent = recording ? '⏹' : '🎤';
  }

  // --- Manual text entry ---
  // Enhancement 2: stage the entry directly — do NOT copy text into the voice transcript box.
  addEntryBtn.addEventListener('click', () => {
    const text = manualInput.value.trim();
    if (!text) {
      setSaveState('error', 'Type something first.');
      return;
    }
    reflectionCard.classList.add('hidden');
    coachCard.classList.add('hidden');
    poemCard.classList.add('hidden');
    manualInput.value = '';
    stageEntry(text);
  });

  // Reflection happens only when the user finishes the prompt and taps Reflect.
  reflectBtn.addEventListener('click', () => {
    if (speech.isRecording) {
     finalizeAfterStop = true;
     speech.stop();
     return;
    }
    if (!pendingEntry) {
     setSaveState('error', 'Tap "Add entry from voice" first to open prompts.');
     return;
    }
    finalizeReflection();
  });

  function hideGratitude() {
    gratitudeCard.classList.add('hidden');
  }

  // --- Build reflection from (journal + gratitude), then save the combined block ---
  async function finalizeReflection() {
    if (!pendingEntry) return;
    const entry = pendingEntry;
    // Enhancement 2: use the stored entry text, not the (now empty for manual entries) transcript
    const entryText = entry.text;

    const gratitude = GratitudePrompts.collect();
    hideGratitude();

    const therapistInput = gratitude
      ? `${entryText}\n\nGratitude reflections:\n${gratitude}`
      : entryText;

    const reflection = await showReflection(therapistInput);
    // Coach, poem, and vocabulary upgrade are based on the user's words — show regardless of save.
    showCoach(entryText);
    showPoem(entryText);
    WordService.renderFromEntry(wordBody, entryText);
    const saved = await save(entryText, entry.date, gratitude, reflection);
    if (saved) {
      pendingEntry = null;
      clearDraft();
    }
  }

  // --- Save combined block to Google Docs ---
  async function save(text, date, gratitude, reflection) {
    console.log('[Journal] save — isSignedIn:', auth.isSignedIn, '| docID:', docID || '(none)');
    if (!auth.isSignedIn) {
      console.warn('[Journal] save aborted: not signed in');
      setSaveState('error', 'Sign in to Google first.');
      return false;
    }
    if (!docID) {
      console.warn('[Journal] save aborted: no Doc ID configured');
      setSaveState('error', 'No Google Doc ID set. Click ⚙ to add one.');
      return false;
    }
    const token = await auth.freshAccessToken();
    if (!token) {
      console.warn('[Journal] save aborted: could not obtain access token');
      setSaveState('error', 'Could not refresh Google token. Please sign in again.');
      return false;
    }
    setSaveState('saving');
    try {
      await GoogleDocsService.saveSession({
        text, date, documentID: docID, accessToken: token, gratitude, reflection,
      });
      console.log('[Journal] saved successfully');
      setSaveState('saved');
      return true;
    } catch (err) {
      console.error('[Journal] save error:', err);
      setSaveState('error', err.message);
      return false;
    }
  }

  // --- Therapist reflection (returns reflection text, or '' on failure) ---
  async function showReflection(text) {
    reflectionCard.classList.remove('hidden');
    reflectionBody.className = 'reflection-body loading';
    reflectionBody.textContent = 'Reflecting on your entry…';
    try {
      const reflection = await TherapistService.reflect(text);
      reflectionBody.className = 'reflection-body';
      reflectionBody.textContent = reflection;
      return reflection;
    } catch (err) {
      console.error('[Journal] reflection error:', err);
      reflectionBody.className = 'reflection-body reflection-error';
      reflectionBody.textContent = '⚠ ' + err.message;
      return '';
    }
  }

  // --- Poem: contextual line of poetry matched to the entry's mood ---
  async function showPoem(text) {
    poemCard.classList.remove('hidden');
    poemBody.className = 'poem-body loading';
    poemBody.textContent = 'Finding a line for you…';
    try {
      const poem = await PoemService.recommend(text);
      poemBody.className = 'poem-body';
      poemBody.replaceChildren();
      const lineEl = document.createElement('p');
      lineEl.className = 'poem-line';
      lineEl.textContent = poem.line;
      const attrEl = document.createElement('p');
      attrEl.className = 'poem-attribution';
      attrEl.textContent = poem.attribution;
      poemBody.appendChild(lineEl);
      poemBody.appendChild(attrEl);
    } catch (err) {
      console.error('[Journal] poem error:', err);
      poemBody.className = 'poem-body poem-error';
      poemBody.textContent = '⚠ ' + err.message;
    }
  }

  // --- English coach: 2-3 structured tips for entries ≥10 sentences ---
  async function showCoach(text) {
    coachCard.classList.remove('hidden');
    coachBody.className = 'coach-body loading';
    coachBody.textContent = 'Analysing your writing…';
    try {
      const tips = await CoachService.tips(text);
      coachBody.className = 'coach-body';
      coachBody.replaceChildren();
      const list = document.createElement('div');
      list.className = 'coach-tips';
      tips.forEach((tipText, idx) => {
        const item = document.createElement('div');
        item.className = 'coach-tip';
        const num = document.createElement('span');
        num.className = 'coach-tip-num';
        num.textContent = String(idx + 1);
        const p = document.createElement('p');
        p.className = 'coach-tip-text';
        p.textContent = tipText;
        item.appendChild(num);
        item.appendChild(p);
        list.appendChild(item);
      });
      coachBody.appendChild(list);
    } catch (err) {
      console.error('[Journal] coach error:', err);
      coachBody.className = 'coach-body coach-error';
      coachBody.textContent = '⚠ ' + err.message;
    }
  }

  // --- Find Patterns ---
  findPatternsBtn.addEventListener('click', async () => {
    if (!auth.isSignedIn) {
      setPatternsState('error', 'Sign in to Google first to analyze your journals.');
      return;
    }
    if (!docID) {
      setPatternsState('error', 'No Google Doc ID set. Click ⚙ to add one.');
      return;
    }
    setPatternsState('loading', 'Reading your past journals…');
    try {
      const token = await auth.freshAccessToken();
      if (!token) throw new Error('Could not refresh Google token. Please sign in again.');
      const docText = await GoogleDocsService.readEntriesText(docID, token);
      const entries = PatternService.parseEntries(docText);
      if (entries.length < 2) {
        setPatternsState('result', 'You need at least a couple of saved entries before patterns can emerge. Keep journaling!');
        return;
      }
      const fullScanKey = `${PATTERNS_FULL_SCAN_PREFIX}${docID}`;
      const hasCompletedFullScan = localStorage.getItem(fullScanKey) === 'true';
      let entriesToAnalyze = entries;
      let modeLabel = 'entire journal';
      if (hasCompletedFullScan) {
        entriesToAnalyze = PatternService.filterEntriesByDays(entries, 30);
        modeLabel = 'past 30 days';
        if (entriesToAnalyze.length < 2) {
          setPatternsState('result', 'I checked the past 30 days and found fewer than two timestamped entries. Add more recent entries or run a fresh full scan.');
          return;
        }
      }
      setPatternsState('loading', `Analyzing ${modeLabel}…`);
      const analysis = await PatternService.analyze(entriesToAnalyze);
      if (!hasCompletedFullScan) {
        localStorage.setItem(fullScanKey, 'true');
      }
      setPatternsState('result', analysis);
    } catch (err) {
      console.error('[Journal] patterns error:', err);
      setPatternsState('error', err.message);
    }
  });

  function setPatternsState(state, text = '') {
    patternsCard.classList.remove('hidden');
    patternsBody.className = 'patterns-body';
    if (state === 'loading') {
      patternsBody.classList.add('loading');
      patternsBody.textContent = text;
    } else if (state === 'error') {
      patternsBody.classList.add('patterns-error');
      patternsBody.textContent = '⚠ ' + text;
    } else {
      patternsBody.textContent = text;
    }
  }

  // --- Tab switching ---
  function switchTab(tabName) {
    tabButtons.forEach((btn) => btn.classList.toggle('active', btn.dataset.tab === tabName));
    voicePanel.classList.toggle('active', tabName === 'voice');
    voicePanel.classList.toggle('hidden', tabName !== 'voice');
    cbtPanel.classList.toggle('active', tabName === 'cbt');
    cbtPanel.classList.toggle('hidden', tabName !== 'cbt');
    
    if (tabName === 'cbt') {
      // Initialize CBT form on first switch
      if (!cbtForm.querySelector('.cbt-section')) {
        CBTService.renderForm(cbtForm);
      }
    }
  }

  tabButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      switchTab(btn.dataset.tab);
    });
  });

  // --- CBT save, export, and analyze ---
  saveCBTBtn.addEventListener('click', async () => {
    const entry = CBTService.readFormData();
    if (!entry.scenario && !entry.somatic_before && !entry.emotion && !entry.thought && !entry.action && !entry.reframe && !entry.somatic_after) {
      setSaveState('error', 'Add at least one field to save the entry.');
      return;
    }
    
    const saved = CBTService.saveEntry(entry);
    if (saved) {
      setSaveState('saved');
      CBTService.clearForm();
      setTimeout(() => setSaveState('idle'), 2000);
    } else {
      setSaveState('error', 'Failed to save entry. Check localStorage availability.');
    }
  });

  exportCBTBtn.addEventListener('click', async () => {
    if (!auth.isSignedIn) {
      setSaveState('error', 'Sign in to Google first to export.');
      return;
    }
    
    setSaveState('saving');
    try {
      const token = await auth.freshAccessToken();
      if (!token) throw new Error('Could not refresh Google token.');
      
      const entries = CBTService.getAllEntries();
      await CBTExportService.exportToGoogleDrive(entries, token);
      
      setSaveState('saved');
      setTimeout(() => setSaveState('idle'), 2000);
    } catch (err) {
      console.error('[CBT] export error:', err);
      setSaveState('error', err.message);
    }
  });

  analyzeBtn.addEventListener('click', () => {
    const entries = CBTService.getAllEntries();
    const analysis = CBTAnalyzer.analyze(entries);
    
    cbtAnalysisCard.classList.remove('hidden');
    cbtAnalysisBody.replaceChildren();
    
    if (analysis.isEmpty) {
      cbtAnalysisBody.innerHTML = '<div class="cbt-status">Start by saving your first CBT reflection entry to see patterns emerge.</div>';
      return;
    }
    
    // Tier 1 — Metrics
    const metricsContainer = document.createElement('div');
    metricsContainer.className = 'cbt-analysis-metrics';
    
    const totalCard = document.createElement('div');
    totalCard.className = 'cbt-metric-card';
    totalCard.innerHTML = `<div class="cbt-metric-label">Total Entries</div><div class="cbt-metric-value">${analysis.totalEntries}</div>`;
    metricsContainer.appendChild(totalCard);
    
    const intensityDropCard = document.createElement('div');
    intensityDropCard.className = 'cbt-metric-card';
    const intensityValue = analysis.intensityDrop !== null ? analysis.intensityDrop : '—';
    intensityDropCard.innerHTML = `<div class="cbt-metric-label">Avg Intensity Drop</div><div class="cbt-metric-value">${intensityValue}</div>`;
    metricsContainer.appendChild(intensityDropCard);
    
    cbtAnalysisBody.appendChild(metricsContainer);
    
    // Top emotions
    if (analysis.topEmotions.length > 0) {
      const emotionsHeading = document.createElement('div');
      emotionsHeading.className = 'cbt-insight';
      const emotionsLabel = document.createElement('strong');
      emotionsLabel.textContent = 'Top emotions: ';
      emotionsHeading.appendChild(emotionsLabel);
      emotionsHeading.appendChild(document.createTextNode(
        analysis.topEmotions.map((e) => `${e.emotion} (${e.count})`).join(', ')
      ));
      cbtAnalysisBody.appendChild(emotionsHeading);
    }

    // Top distortions
    if (analysis.topDistortions.length > 0) {
      const distortionsHeading = document.createElement('div');
      distortionsHeading.className = 'cbt-insight';
      const distortionsLabel = document.createElement('strong');
      distortionsLabel.textContent = 'Most common distortions: ';
      distortionsHeading.appendChild(distortionsLabel);
      distortionsHeading.appendChild(document.createTextNode(
        analysis.topDistortions.map((d) => `${d.distortion} (${d.count})`).join(', ')
      ));
      cbtAnalysisBody.appendChild(distortionsHeading);
    }
    
    // Insights
    if (analysis.insights.length > 0) {
      analysis.insights.forEach((insight) => {
        const insightEl = document.createElement('div');
        insightEl.className = 'cbt-insight';
        insightEl.textContent = insight;
        cbtAnalysisBody.appendChild(insightEl);
      });
    }
  });

  function setPatternsState(state, text = '') {
    patternsCard.classList.remove('hidden');
    patternsBody.className = 'patterns-body';
    if (state === 'loading') {
      patternsBody.classList.add('loading');
      patternsBody.textContent = text;
    } else if (state === 'error') {
      patternsBody.classList.add('patterns-error');
      patternsBody.textContent = '⚠ ' + text;
    } else {
      patternsBody.textContent = text;
    }
  }

  function setSaveState(state, msg = '') {
    statusEl.className = 'status';
    switch (state) {
      case 'idle':   statusEl.textContent = ''; break;
      case 'saving': statusEl.textContent = 'Saving to Google Docs…'; statusEl.classList.add('saving'); break;
      case 'saved':  statusEl.textContent = '✓ Saved!'; statusEl.classList.add('saved'); break;
      case 'error':  statusEl.textContent = '⚠ ' + msg; statusEl.classList.add('error'); break;
    }
    recordBtn.disabled = state === 'saving';
    addVoiceEntryBtn.disabled = state === 'saving' || !(
      (transcriptEl.innerText || transcriptEl.textContent || '').trim() || getVisibleTranscript().trim()
    );
  }

  // --- Theme toggle ---
  themeToggleBtn.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    localStorage.setItem('theme', next);
  });

  // --- Settings modal ---
  settingsBtn.addEventListener('click', () => {
    docIDInput.value = docID;
    signOutBtn.classList.toggle('hidden', !auth.isSignedIn);
    modal.classList.remove('hidden');
  });

  cancelBtn.addEventListener('click', () => modal.classList.add('hidden'));

  saveBtn.addEventListener('click', () => {
    docID = docIDInput.value.trim();
    localStorage.setItem('docID', docID);
    modal.classList.add('hidden');
  });

  signOutBtn.addEventListener('click', () => {
    auth.signOut();
    modal.classList.add('hidden');
  });
});
