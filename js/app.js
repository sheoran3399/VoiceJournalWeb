let speech;
try {
  speech = new SpeechRecognizer();
} catch (err) {
  console.warn('[Journal] Speech recognition unavailable:', err.message);
  speech = null;
}
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
  const graphBackfillBtn    = document.getElementById('graphBackfillBtn');
  const graphBackfillStatus = document.getElementById('graphBackfillStatus');
  const graphBackfillDefaultStatus = graphBackfillStatus.textContent;
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

  // Cognee graph refs (Voice tab: "Ask your journal")
  const graphRecallInput = document.getElementById('graphRecallInput');
  const graphRecallBtn   = document.getElementById('graphRecallBtn');
  const graphRecallCard  = document.getElementById('graphRecallCard');
  const graphRecallBody  = document.getElementById('graphRecallBody');

  // CBT refs — merged into the Voice tab as a collapsible accordion section
  const voicePanel = document.getElementById('voicePanel');
  const cbtAccordionToggle = document.getElementById('cbtAccordionToggle');
  const cbtAccordionBody = document.getElementById('cbtAccordionBody');
  const cbtForm = document.getElementById('cbtForm');
  const saveCBTBtn = document.getElementById('saveCBTBtn');
  const analyzeBtn = document.getElementById('analyzeBtn');
  const cbtAnalysisCard = document.getElementById('cbtAnalysisCard');
  const cbtAnalysisBody = document.getElementById('cbtAnalysisBody');
  // Cognee graph refs (CBT section: "Recurring patterns")
  const graphPatternsBtn  = document.getElementById('graphPatternsBtn');
  const graphPatternsCard = document.getElementById('graphPatternsCard');
  const graphPatternsBody = document.getElementById('graphPatternsBody');
  // "Suggest from my journal" — AI/heuristic personalization from recent entries
  const suggestCBTBtn      = document.getElementById('suggestCBTBtn');
  const cbtSuggestCard     = document.getElementById('cbtSuggestCard');
  const cbtSuggestBody     = document.getElementById('cbtSuggestBody');
  const cbtSuggestStatus   = document.getElementById('cbtSuggestStatus');
  const suggestManifestBtn   = document.getElementById('suggestManifestBtn');
  const manifestSuggestCard  = document.getElementById('manifestSuggestCard');
  const manifestSuggestBody  = document.getElementById('manifestSuggestBody');
  const manifestSuggestStatus = document.getElementById('manifestSuggestStatus');
  const tabButtons = document.querySelectorAll('.tab-btn');

  // Manifestation refs — merged into the Voice tab as a collapsible accordion section
  const manifestationAccordionToggle = document.getElementById('manifestationAccordionToggle');
  const manifestationAccordionBody = document.getElementById('manifestationAccordionBody');
  const manifestationForm = document.getElementById('manifestationForm');
  const saveManifestationBtn = document.getElementById('saveManifestationBtn');
  const editPicksBtn = document.getElementById('editPicksBtn');
  const manifestPicksModal = document.getElementById('manifestPicksModal');
  const manifestPicksFields = document.getElementById('manifestPicksFields');
  const cancelManifestPicksBtn = document.getElementById('cancelManifestPicks');
  const saveManifestPicksBtn = document.getElementById('saveManifestPicks');
  const resetManifestPicksBtn = document.getElementById('resetManifestPicks');

  // Insights refs
  const insightsPanel = document.getElementById('insightsPanel');
  const insightsInput = document.getElementById('insightsInput');
  const addInsightBtn = document.getElementById('addInsightBtn');
  const insightsList = document.getElementById('insightsList');

  // Habits refs
  const habitsPanel = document.getElementById('habitsPanel');
  const habitMonthLabel = document.getElementById('habitMonthLabel');
  const habitPrevMonthBtn = document.getElementById('habitPrevMonthBtn');
  const habitNextMonthBtn = document.getElementById('habitNextMonthBtn');
  const habitRewardCard = document.getElementById('habitRewardCard');
  const habitCalendar = document.getElementById('habitCalendar');
  const refreshJournalDaysBtn = document.getElementById('refreshJournalDaysBtn');

  // Decade patterns refs (Cognee graph: book v0/v1 vs. current entry)
  const decadePanel = document.getElementById('decadePanel');
  const decadeIngestBtn = document.getElementById('decadeIngestBtn');
  const decadeIngestStatus = document.getElementById('decadeIngestStatus');
  const decadeIngestDefaultStatus = decadeIngestStatus.textContent;
  const decadeAnalyzeBtn = document.getElementById('decadeAnalyzeBtn');
  const decadePatternsCard = document.getElementById('decadePatternsCard');
  const decadePatternsBody = document.getElementById('decadePatternsBody');
  const decadeRecommendationsBody = document.getElementById('decadeRecommendationsBody');
  const BOOK_TAB_TITLES = ['book v0', 'book v1'];

  const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const today = new Date();
  let habitViewYear = today.getFullYear();
  let habitViewMonth = today.getMonth();
  let habitEditingReward = false;
  let habitDateSets = { journal: new Set(), manifestation: new Set(), cbt: new Set() };

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
      if (speech?.isRecording || !transcriptUserEdited) {
        transcriptEl.textContent = text;
      }
      transcriptEl.contentEditable = speech?.isRecording ? 'false' : 'true';
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
    // Fire the sister-email mirror immediately off "Add entry" — do not wait
    // for the gratitude prompts or the "reflect" step that follows. (Bug fix
    // 2026-07-13: this used to be nested inside finalizeReflection()/save(),
    // so it silently never sent until the user finished the CBT/gratitude
    // flow.) Best-effort — never blocks staging or surfaces its own errors.
    sendSisterEmailNow(pendingEntry.text, pendingEntry.date);
    // Render AI-personalised prompts (falls back to smart client-side selection)
    GratitudePrompts.renderDynamic(gratitudeList, cleanText).catch(() => {
      GratitudePrompts.render(gratitudeList);
    });
    gratitudeCard.classList.remove('hidden');
    gratitudeCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return true;
  }

  // --- Sister-email mirror, decoupled from gratitude/reflection/save ---
  // Uses the same OAuth token as the Docs save (gmail.send scope); silently
  // no-ops if not signed in yet rather than forcing a sign-in prompt from
  // what the user experiences as just tapping "Add entry".
  async function sendSisterEmailNow(text, date) {
    if (!auth.isSignedIn) return;
    try {
      const token = await auth.freshAccessToken();
      if (!token) return;
      await GmailExportService.sendEntry(CONFIG.sisterEmail, text, date, token);
    } catch (err) {
      console.error('[Journal] Gmail send failed:', err);
    }
  }

  // --- Speech ---
  if (speech) {
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
  }

  // --- Record button ---
  recordBtn.addEventListener('click', () => {
    if (!speech) {
      setSaveState('error', "Voice recording needs Chrome or Edge — this browser doesn't support it.");
      return;
    }
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
    const recording = speech?.isRecording;
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
    if (speech?.isRecording) {
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
      // Note: the sister-email mirror is no longer sent from here — it now
      // fires directly off "Add entry" (see sendSisterEmailNow(), called
      // from stageEntry()) so it doesn't wait on gratitude/reflection/save.
      // Best-effort: feed this entry into the Cognee knowledge graph. Never
      // blocks or fails the primary save — same pattern as Gmail above.
      GraphService.ingest('Voice Journal', text, date, token).catch((err) => {
        console.error('[Journal] Graph ingest failed:', err);
      });
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

  // Shared loading/result/error rendering for the two Cognee-backed cards
  // (graphRecallCard, graphPatternsCard) — both reuse the .patterns-card /
  // .patterns-body CSS treatment, so they share this state machine too.
  function setGraphCardState(card, body, state, text = '') {
    card.classList.remove('hidden');
    body.className = 'patterns-body';
    if (state === 'loading') {
      body.classList.add('loading');
      body.textContent = text;
    } else if (state === 'error') {
      body.classList.add('patterns-error');
      body.textContent = '⚠ ' + text;
    } else {
      body.textContent = text;
    }
  }

  graphRecallBtn.addEventListener('click', async () => {
    const question = graphRecallInput.value.trim();
    if (!question) {
      setGraphCardState(graphRecallCard, graphRecallBody, 'error', 'Ask a question first.');
      return;
    }
    setGraphCardState(graphRecallCard, graphRecallBody, 'loading', 'Searching your journal…');
    try {
      const token = await auth.freshAccessToken();
      if (!token) throw new Error('Sign in to Google first.');
      const { answer } = await GraphService.recall(question, token);
      setGraphCardState(graphRecallCard, graphRecallBody, 'result', answer);
    } catch (err) {
      console.error('[Graph] recall error:', err);
      setGraphCardState(graphRecallCard, graphRecallBody, 'error', err.message);
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
    insightsPanel.classList.toggle('active', tabName === 'insights');
    insightsPanel.classList.toggle('hidden', tabName !== 'insights');
    habitsPanel.classList.toggle('active', tabName === 'habits');
    habitsPanel.classList.toggle('hidden', tabName !== 'habits');
    decadePanel.classList.toggle('active', tabName === 'decade');
    decadePanel.classList.toggle('hidden', tabName !== 'decade');

    if (tabName === 'insights') {
      renderInsightsList();
    }
    if (tabName === 'habits') {
      habitEditingReward = false;
      renderHabitsTab();
    }
    if (tabName === 'decade' && !decadeIngestBtn.disabled) {
      decadeIngestStatus.textContent = decadeIngestDefaultStatus;
    }
  }

  // --- CBT / Manifestation accordion sections (merged into the Voice tab) ---
  function toggleAccordion(toggleBtn, body, renderOnce) {
    const expanded = toggleBtn.getAttribute('aria-expanded') === 'true';
    toggleBtn.setAttribute('aria-expanded', String(!expanded));
    body.classList.toggle('hidden', expanded);
    if (!expanded) renderOnce();
  }

  cbtAccordionToggle.addEventListener('click', () => {
    toggleAccordion(cbtAccordionToggle, cbtAccordionBody, () => {
      if (!cbtForm.querySelector('.cbt-section')) CBTService.renderForm(cbtForm);
    });
  });

  manifestationAccordionToggle.addEventListener('click', () => {
    toggleAccordion(manifestationAccordionToggle, manifestationAccordionBody, () => {
      if (!manifestationForm.querySelector('.cbt-section')) ManifestationService.renderForm(manifestationForm);
    });
  });

  // --- Habit tracking ---
  function renderHabitsTab() {
    habitMonthLabel.textContent = `${MONTH_NAMES[habitViewMonth]} ${habitViewYear}`;
    HabitService.renderCalendar(habitCalendar, habitViewYear, habitViewMonth, habitDateSets);
    HabitService.renderReward(habitRewardCard, habitViewYear, habitViewMonth, habitDateSets, {
      onSave: () => {
        habitEditingReward = false;
        renderHabitsTab();
      },
      onEdit: () => {
        habitEditingReward = true;
        renderHabitsTab();
      },
      onCancelEdit: () => {
        habitEditingReward = false;
        renderHabitsTab();
      },
    }, habitEditingReward);
  }

  // Journal, CBT, and Manifestation entries all live in Doc tabs now, so a
  // single sign-in-gated fetch pulls check-in dates for all three at once.
  async function refreshCheckIns() {
    if (!auth.isSignedIn) {
      setSaveState('error', 'Sign in to Google to load check-ins.');
      return;
    }
    if (!docID) {
      setSaveState('error', 'Set a Google Doc ID in Settings first.');
      return;
    }
    try {
      const token = await auth.freshAccessToken();
      if (!token) throw new Error('Could not refresh Google token.');
      const [journal, cbt, manifestation] = await Promise.all([
        HabitService.fetchJournalDateSet(docID, token, { force: true }),
        HabitService.fetchTabDateSet(docID, token, CBTService.TAB_TITLE, { force: true }),
        HabitService.fetchTabDateSet(docID, token, ManifestationService.TAB_TITLE, { force: true }),
      ]);
      habitDateSets = { journal, cbt, manifestation };
      renderHabitsTab();
      setSaveState('saved');
      setTimeout(() => setSaveState('idle'), 2000);
    } catch (err) {
      console.error('[Habit] check-in fetch error:', err);
      setSaveState('error', err.message);
    }
  }

  habitPrevMonthBtn.addEventListener('click', () => {
    habitViewMonth -= 1;
    if (habitViewMonth < 0) {
      habitViewMonth = 11;
      habitViewYear -= 1;
    }
    habitEditingReward = false;
    renderHabitsTab();
  });

  habitNextMonthBtn.addEventListener('click', () => {
    habitViewMonth += 1;
    if (habitViewMonth > 11) {
      habitViewMonth = 0;
      habitViewYear += 1;
    }
    habitEditingReward = false;
    renderHabitsTab();
  });

  refreshJournalDaysBtn.addEventListener('click', refreshCheckIns);

  // Entry ids currently awaiting an AI rewrite response, so the list can show a loading state.
  const pendingRewriteIds = new Set();

  function renderInsightsList() {
    InsightsService.renderList(insightsList, {
      onDelete: (id) => {
        InsightsService.deleteEntry(id);
        renderInsightsList();
      },
      onRewrite: handleInsightRewrite,
    }, pendingRewriteIds);
  }

  async function syncInsightsToDrive() {
    if (!auth.isSignedIn) {
      setSaveState('error', 'Sign in to Google to back up Insights entries to Drive.');
      return;
    }
    const token = await auth.freshAccessToken();
    if (!token) {
      setSaveState('error', 'Could not refresh Google token. Please sign in again.');
      return;
    }
    try {
      await InsightsExportService.syncToGoogleDrive(InsightsService.getAllEntries(), token);
      setSaveState('saved');
      setTimeout(() => setSaveState('idle'), 2000);
    } catch (err) {
      console.error('[Insights] Drive sync error:', err);
      setSaveState('error', 'Saved locally, but Drive backup failed: ' + err.message);
    }
  }

  async function handleInsightRewrite(id, styleKey) {
    pendingRewriteIds.add(id);
    renderInsightsList();
    const entry = InsightsService.getAllEntries().find((e) => e.id === id);
    try {
      const rewriteText = await InsightsRewriteService.rewrite(entry.text, styleKey);
      InsightsService.attachRewrite(id, styleKey, rewriteText);
    } catch (err) {
      console.error('[Insights] rewrite error:', err);
      setSaveState('error', 'AI rewrite failed: ' + err.message);
    } finally {
      pendingRewriteIds.delete(id);
      renderInsightsList();
    }
    await syncInsightsToDrive();
  }

  addInsightBtn.addEventListener('click', async () => {
    const text = insightsInput.value.trim();
    if (!text) {
      setSaveState('error', 'Write something first.');
      return;
    }
    if (!InsightsService.saveEntry(text)) {
      setSaveState('error', 'Failed to save entry. Check localStorage availability.');
      return;
    }
    insightsInput.value = '';
    renderInsightsList();
    await syncInsightsToDrive();
  });

  tabButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      switchTab(btn.dataset.tab);
    });
  });

  // --- Save a structured entry (CBT or Manifestation) to its own Doc tab ---
  async function saveToTab(service, hasContentCheck) {
    const entry = service.readFormData();
    if (!hasContentCheck(entry)) {
      setSaveState('error', 'Add at least one field to save the entry.');
      return;
    }
    if (!auth.isSignedIn) {
      setSaveState('error', 'Sign in to Google first.');
      return;
    }
    if (!docID) {
      setSaveState('error', 'No Google Doc ID set. Click ⚙ to add one.');
      return;
    }
    setSaveState('saving');
    try {
      const token = await auth.freshAccessToken();
      if (!token) throw new Error('Could not refresh Google token.');
      const block = service.formatEntryBlock(entry);
      await GoogleDocsService.appendToTab(docID, token, service.TAB_TITLE, block);
      setSaveState('saved');
      // Best-effort: feed this entry into the Cognee knowledge graph, tagged
      // with its source tab so cross-tab links (Voice <-> CBT <-> Manifestation)
      // can form. Never blocks or fails the primary save.
      GraphService.ingest(service.TAB_TITLE, block, new Date(), token).catch((err) => {
        console.error(`[${service.TAB_TITLE}] Graph ingest failed:`, err);
      });
      service.clearForm();
      setTimeout(() => setSaveState('idle'), 2000);
    } catch (err) {
      console.error(`[${service.TAB_TITLE}] save error:`, err);
      setSaveState('error', err.message);
    }
  }

  saveCBTBtn.addEventListener('click', () => saveToTab(
    CBTService,
    (entry) => entry.scenario || entry.somatic_before || entry.emotion || entry.thought || entry.action || entry.reframe || entry.somatic_after
  ));

  saveManifestationBtn.addEventListener('click', () => saveToTab(
    ManifestationService,
    (entry) => ManifestationService.sections.some((s) => entry[s.key])
  ));

  // --- Manifestation quick-picks editor ---
  editPicksBtn.addEventListener('click', () => {
    ManifestationService.renderPicksEditor(manifestPicksFields);
    manifestPicksModal.classList.remove('hidden');
  });

  cancelManifestPicksBtn.addEventListener('click', () => manifestPicksModal.classList.add('hidden'));

  saveManifestPicksBtn.addEventListener('click', () => {
    ManifestationService.savePicksEditor(manifestPicksFields);
    ManifestationService.refreshDropdowns(manifestationForm);
    manifestPicksModal.classList.add('hidden');
  });

  resetManifestPicksBtn.addEventListener('click', () => {
    ManifestationService.resetAllPicks();
    ManifestationService.renderPicksEditor(manifestPicksFields);
    ManifestationService.refreshDropdowns(manifestationForm);
  });

  analyzeBtn.addEventListener('click', async () => {
    if (!auth.isSignedIn) {
      setSaveState('error', 'Sign in to Google first to run analysis.');
      return;
    }
    if (!docID) {
      setSaveState('error', 'No Google Doc ID set. Click ⚙ to add one.');
      return;
    }
    let entries;
    try {
      const token = await auth.freshAccessToken();
      if (!token) throw new Error('Could not refresh Google token.');
      const tabText = await GoogleDocsService.readTabText(docID, token, CBTService.TAB_TITLE);
      entries = PatternService.parseEntries(tabText)
        .filter((e) => e.parsedDate)
        .map((e) => CBTService.parseEntryBlock(e.text, e.parsedDate.toISOString()));
    } catch (err) {
      console.error('[CBT] analysis fetch error:', err);
      setSaveState('error', err.message);
      return;
    }
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

  graphPatternsBtn.addEventListener('click', async () => {
    setGraphCardState(graphPatternsCard, graphPatternsBody, 'loading', 'Looking for recurring patterns across your journal…');
    try {
      const token = await auth.freshAccessToken();
      if (!token) throw new Error('Sign in to Google first.');
      const { answer } = await GraphService.cbtPatterns(token);
      setGraphCardState(graphPatternsCard, graphPatternsBody, 'result', answer);
    } catch (err) {
      console.error('[Graph] patterns error:', err);
      setGraphCardState(graphPatternsCard, graphPatternsBody, 'error', err.message);
    }
  });

  // --- "Suggest from my journal": tailor CBT / Manifestation picks to the
  // user's own recent entries. Reads recent journal text, derives suggestions
  // client-side instantly (PersonalizeService), shows them as click-to-fill
  // chips, then silently upgrades to an AI-generated set if the proxy has an
  // /api/personalize route. Shared runner for both sections.
  async function runPersonalize(opts) {
    const { card, body, statusEl, kind, buildSuggestions, form, sectionLabels } = opts;
    if (!auth.isSignedIn) {
      card.classList.remove('hidden');
      body.replaceChildren();
      statusEl.textContent = '';
      const msg = document.createElement('div');
      msg.className = 'personalize-empty';
      msg.textContent = '⚠ Sign in to Google first so I can read your recent entries.';
      body.appendChild(msg);
      return;
    }
    if (!docID) {
      card.classList.remove('hidden');
      body.replaceChildren();
      statusEl.textContent = '';
      const msg = document.createElement('div');
      msg.className = 'personalize-empty';
      msg.textContent = '⚠ No Google Doc ID set. Click ⚙ to add one.';
      body.appendChild(msg);
      return;
    }
    card.classList.remove('hidden');
    body.replaceChildren();
    statusEl.textContent = 'Reading your recent journal…';
    try {
      const token = await auth.freshAccessToken();
      if (!token) throw new Error('Could not refresh Google token.');
      const entries = await PersonalizeService.fetchRecentEntries(docID, token, 90);
      if (!entries.length) {
        statusEl.textContent = '';
        PersonalizeService.render(body, {}, form, sectionLabels);
        return;
      }
      const analysis = PersonalizeService.analyze(entries);
      const suggestions = buildSuggestions(analysis);
      statusEl.textContent = `from ${entries.length} recent ${entries.length === 1 ? 'entry' : 'entries'}`;
      PersonalizeService.render(body, suggestions, form, sectionLabels);

      // Silent AI upgrade (no-op if /api/personalize isn't deployed).
      const upgraded = await PersonalizeService.aiUpgrade(kind, entries);
      if (upgraded && Object.keys(upgraded).length) {
        statusEl.textContent = `✨ AI-tailored from ${entries.length} recent ${entries.length === 1 ? 'entry' : 'entries'}`;
        PersonalizeService.render(body, upgraded, form, sectionLabels);
      }
    } catch (err) {
      console.error(`[Personalize:${kind}] error:`, err);
      statusEl.textContent = '';
      body.replaceChildren();
      const msg = document.createElement('div');
      msg.className = 'personalize-empty';
      msg.textContent = '⚠ ' + err.message;
      body.appendChild(msg);
    }
  }

  const CBT_SECTION_LABELS = {
    scenario: 'Scenario — situations that recur for you',
    emotion: 'Emotions you name most',
    thought: 'Automatic thoughts pulled from your entries',
    reframe: 'Balanced reframes to try',
  };
  const MANIFEST_SECTION_LABELS = {
    desired_outcome: 'Desired outcomes drawn from your themes',
    gratitude: 'Gratitude rooted in your life',
    limiting_belief: 'Limiting beliefs surfaced from your words',
    aligned_action: 'Aligned actions for your themes',
  };

  suggestCBTBtn.addEventListener('click', () => {
    // Make sure the CBT form exists (accordion may not have rendered it yet).
    if (!cbtForm.querySelector('.cbt-section')) CBTService.renderForm(cbtForm);
    runPersonalize({
      card: cbtSuggestCard, body: cbtSuggestBody, statusEl: cbtSuggestStatus,
      kind: 'cbt', buildSuggestions: (a) => PersonalizeService.cbtSuggestions(a),
      form: cbtForm, sectionLabels: CBT_SECTION_LABELS,
    });
  });

  suggestManifestBtn.addEventListener('click', () => {
    if (!manifestationForm.querySelector('.cbt-section')) ManifestationService.renderForm(manifestationForm);
    runPersonalize({
      card: manifestSuggestCard, body: manifestSuggestBody, statusEl: manifestSuggestStatus,
      kind: 'manifestation', buildSuggestions: (a) => PersonalizeService.manifestSuggestions(a),
      form: manifestationForm, sectionLabels: MANIFEST_SECTION_LABELS,
    });
  });

  // --- Decade patterns: ingest book v0/v1, then compare the current
  // (possibly unsaved) Voice entry against them + the rest of the graph ---

  // Reads whatever the user currently has in the Voice journal entry box —
  // typed text takes priority, then a staged-but-not-yet-saved voice entry,
  // then the live/in-progress voice transcript. Never a saved Doc entry.
  function getCurrentVoiceEntryText() {
    const typed = manualInput.value.trim();
    if (typed) return typed;
    if (pendingEntry && pendingEntry.text) return pendingEntry.text;
    return getVisibleTranscript();
  }

  function setDecadeCardState(state, patternsText = '', recommendationsText = '') {
    decadePatternsCard.classList.remove('hidden');
    decadePatternsBody.className = 'patterns-body';
    decadeRecommendationsBody.className = 'decade-recommendations-body';
    if (state === 'loading') {
      decadePatternsBody.classList.add('loading');
      decadePatternsBody.textContent = patternsText;
      decadeRecommendationsBody.classList.add('loading');
      decadeRecommendationsBody.textContent = '';
    } else if (state === 'error') {
      decadePatternsBody.classList.add('patterns-error');
      decadePatternsBody.textContent = '⚠ ' + patternsText;
      decadeRecommendationsBody.textContent = '';
    } else {
      decadePatternsBody.textContent = patternsText;
      decadeRecommendationsBody.textContent = recommendationsText;
    }
  }

  // One-time/on-demand ingest of the two book tabs — not tied to the save
  // flow, so it never re-runs on every keystroke (same reasoning as the
  // full-history graph backfill in Settings).
  decadeIngestBtn.addEventListener('click', async () => {
    if (!auth.isSignedIn) {
      decadeIngestStatus.textContent = '⚠ Sign in to Google first.';
      return;
    }
    if (!docID) {
      decadeIngestStatus.textContent = '⚠ No Google Doc ID set. Click ⚙ to add one.';
      return;
    }
    decadeIngestBtn.disabled = true;
    try {
      const token = await auth.freshAccessToken();
      if (!token) throw new Error('Could not refresh Google token.');
      let done = 0;
      const problems = []; // per-tab failure/skip reasons, so the final
      // summary line doesn't swallow *why* a tab wasn't ingested.
      for (const tab of BOOK_TAB_TITLES) {
        decadeIngestStatus.textContent = `Reading "${tab}"…`;
        let text;
        try {
          text = await GoogleDocsService.readTabText(docID, token, tab);
        } catch (err) {
          console.error(`[Decade] could not read "${tab}":`, err);
          problems.push(`"${tab}": ${err.message}`);
          continue;
        }
        if (!text.trim()) {
          console.warn(`[Decade] "${tab}" is empty — nothing to ingest.`);
          problems.push(`"${tab}": empty, nothing to ingest`);
          continue;
        }
        decadeIngestStatus.textContent = `Ingesting "${tab}" into the graph…`;
        try {
          await GraphService.ingest(tab, text, new Date(), token, { sync: true });
          done += 1;
        } catch (err) {
          console.error(`[Decade] could not ingest "${tab}":`, err);
          problems.push(`"${tab}": ${err.message}`);
        }
      }
      const summary = `Ingested ${done}/${BOOK_TAB_TITLES.length} book tab(s) into the graph.`;
      decadeIngestStatus.textContent = problems.length ? `⚠ ${summary} ${problems.join(' ')}` : summary;
      if (problems.length) console.error('[Decade] book ingest problems:', problems);
    } catch (err) {
      console.error('[Decade] book ingest error:', err);
      decadeIngestStatus.textContent = `⚠ ${err.message}`;
    } finally {
      decadeIngestBtn.disabled = false;
    }
  });

  decadeAnalyzeBtn.addEventListener('click', async () => {
    const currentEntryText = getCurrentVoiceEntryText();
    if (!currentEntryText) {
      setDecadeCardState('error', 'Write or record something in the Voice journal tab first — this compares your current entry, not a saved one.');
      return;
    }
    setDecadeCardState('loading', 'Comparing your current entry against the last 10 years…');
    try {
      const token = await auth.freshAccessToken();
      if (!token) throw new Error('Sign in to Google first.');
      const { patterns, my_own_recommendations } = await GraphService.decadePatterns(token, currentEntryText);
      setDecadeCardState('result', patterns, my_own_recommendations);
    } catch (err) {
      console.error('[Graph] decade patterns error:', err);
      setDecadeCardState('error', err.message);
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
    graphBackfillStatus.textContent = graphBackfillDefaultStatus;
    modal.classList.remove('hidden');
  });

  cancelBtn.addEventListener('click', () => modal.classList.add('hidden'));

  saveBtn.addEventListener('click', () => {
    docID = docIDInput.value.trim();
    localStorage.setItem('docID', docID);
    modal.classList.add('hidden');
  });

  // --- Graph backfill: reuses the same GoogleDocsService reads + PatternService
  // parsing as "Find patterns"/"Run pattern analysis" (just across all three
  // tabs instead of one), then sync-ingests each dated entry into the graph
  // one at a time so a bad entry doesn't abort the whole run.
  async function runGraphBackfill() {
    if (!auth.isSignedIn) {
      graphBackfillStatus.textContent = '⚠ Sign in to Google first.';
      return;
    }
    if (!docID) {
      graphBackfillStatus.textContent = '⚠ No Google Doc ID set — add one above first.';
      return;
    }
    graphBackfillBtn.disabled = true;
    graphBackfillStatus.textContent = 'Reading your full journal history…';
    try {
      const token = await auth.freshAccessToken();
      if (!token) throw new Error('Could not refresh Google token. Please sign in again.');

      await GraphService.reset(token);

      const sources = [
        { tab: 'Voice Journal', read: () => GoogleDocsService.readEntriesText(docID, token) },
        { tab: CBTService.TAB_TITLE, read: () => GoogleDocsService.readTabText(docID, token, CBTService.TAB_TITLE) },
        { tab: ManifestationService.TAB_TITLE, read: () => GoogleDocsService.readTabText(docID, token, ManifestationService.TAB_TITLE) },
      ];

      const entries = [];
      let skippedUndated = 0;
      for (const { tab, read } of sources) {
        let text;
        try {
          text = await read();
        } catch (err) {
          console.error(`[Graph] backfill: could not read ${tab}:`, err);
          continue;
        }
        for (const e of PatternService.parseEntries(text)) {
          if (e.parsedDate) entries.push({ tab, text: e.text, date: e.parsedDate });
          else skippedUndated += 1;
        }
      }

      let done = 0;
      let failed = 0;
      for (const entry of entries) {
        graphBackfillStatus.textContent = `Backfilling… ${done + failed}/${entries.length} entries`;
        try {
          await GraphService.ingest(entry.tab, entry.text, entry.date, token, { sync: true });
          done += 1;
        } catch (err) {
          console.error('[Graph] backfill entry failed:', err);
          failed += 1;
        }
      }

      const parts = [`Backfilled ${done}/${entries.length} entries into the graph.`];
      if (failed) parts.push(`${failed} failed.`);
      if (skippedUndated) parts.push(`${skippedUndated} skipped (no parseable date).`);
      graphBackfillStatus.textContent = parts.join(' ');
    } catch (err) {
      console.error('[Graph] backfill error:', err);
      graphBackfillStatus.textContent = `⚠ ${err.message}`;
    } finally {
      graphBackfillBtn.disabled = false;
    }
  }

  graphBackfillBtn.addEventListener('click', runGraphBackfill);

  signOutBtn.addEventListener('click', () => {
    auth.signOut();
    modal.classList.add('hidden');
  });
});
