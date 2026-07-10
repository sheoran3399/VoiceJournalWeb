const speech = new SpeechRecognizer();
const auth = new GoogleAuthManager(CONFIG.googleClientID);

// Initialize Google Identity Services after all scripts (including GIS) have loaded
window.addEventListener('load', () => auth.init());

document.addEventListener('DOMContentLoaded', () => {
  // Hard-coded single journal document; localStorage can still override via Settings.
  let docID = localStorage.getItem('docID') || CONFIG.docID || '';
  let wechatToken = localStorage.getItem('wechatToken') || '';
  let wechatTopic = localStorage.getItem('wechatTopic') || '';

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
  const wechatTokenInput = document.getElementById('wechatTokenInput');
  const wechatTopicInput = document.getElementById('wechatTopicInput');
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

  // CBT refs
  const voicePanel = document.getElementById('voicePanel');
  const cbtPanel = document.getElementById('cbtPanel');
  const cbtForm = document.getElementById('cbtForm');
  const saveCBTBtn = document.getElementById('saveCBTBtn');
  const analyzeBtn = document.getElementById('analyzeBtn');
  const cbtAnalysisCard = document.getElementById('cbtAnalysisCard');
  const cbtAnalysisBody = document.getElementById('cbtAnalysisBody');
  // Cognee graph refs (CBT tab: "Recurring patterns")
  const graphPatternsBtn  = document.getElementById('graphPatternsBtn');
  const graphPatternsCard = document.getElementById('graphPatternsCard');
  const graphPatternsBody = document.getElementById('graphPatternsBody');
  const tabButtons = document.querySelectorAll('.tab-btn');

  // Manifestation refs
  const manifestationPanel = document.getElementById('manifestationPanel');
  const manifestationForm = document.getElementById('manifestationForm');
  const saveManifestationBtn = document.getElementById('saveManifestationBtn');

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
      // Best-effort mirror to WeChat via PushPlus (readable from mainland
      // China with no doc/account to share). Never block or fail the
      // primary Google Docs save on this, and it's a no-op until a
      // recipient token is set in Settings.
      WeChatPushService.pushEntry(wechatToken, text, date, wechatTopic).catch((err) => {
        console.error('[Journal] WeChat push failed:', err);
      });
      // Best-effort email mirror via Gmail API (readable from mainland
      // China via 163.com, unlike Google Docs itself). Same token as the
      // Docs save above — requires the gmail.send scope to be granted.
      GmailExportService.sendEntry(CONFIG.sisterEmail, text, date, token).catch((err) => {
        console.error('[Journal] Gmail send failed:', err);
      });
      // Best-effort: feed this entry into the Cognee knowledge graph. Never
      // blocks or fails the primary save — same pattern as WeChat/Gmail above.
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
    cbtPanel.classList.toggle('active', tabName === 'cbt');
    cbtPanel.classList.toggle('hidden', tabName !== 'cbt');
    manifestationPanel.classList.toggle('active', tabName === 'manifestation');
    manifestationPanel.classList.toggle('hidden', tabName !== 'manifestation');
    insightsPanel.classList.toggle('active', tabName === 'insights');
    insightsPanel.classList.toggle('hidden', tabName !== 'insights');
    habitsPanel.classList.toggle('active', tabName === 'habits');
    habitsPanel.classList.toggle('hidden', tabName !== 'habits');

    if (tabName === 'cbt') {
      // Initialize CBT form on first switch
      if (!cbtForm.querySelector('.cbt-section')) {
        CBTService.renderForm(cbtForm);
      }
    }
    if (tabName === 'manifestation') {
      // Initialize manifestation form on first switch
      if (!manifestationForm.querySelector('.cbt-section')) {
        ManifestationService.renderForm(manifestationForm);
      }
    }
    if (tabName === 'insights') {
      renderInsightsList();
    }
    if (tabName === 'habits') {
      habitEditingReward = false;
      renderHabitsTab();
    }
  }

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
    wechatTokenInput.value = wechatToken;
    wechatTopicInput.value = wechatTopic;
    signOutBtn.classList.toggle('hidden', !auth.isSignedIn);
    graphBackfillStatus.textContent = graphBackfillDefaultStatus;
    modal.classList.remove('hidden');
  });

  cancelBtn.addEventListener('click', () => modal.classList.add('hidden'));

  saveBtn.addEventListener('click', () => {
    docID = docIDInput.value.trim();
    localStorage.setItem('docID', docID);
    wechatToken = wechatTokenInput.value.trim();
    localStorage.setItem('wechatToken', wechatToken);
    wechatTopic = wechatTopicInput.value.trim();
    localStorage.setItem('wechatTopic', wechatTopic);
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
