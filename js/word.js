// Vocabulary upgrade engine: finds a simple word in the journal entry and
// suggests a more precise, sophisticated replacement with context.
// On page load shows a daily word; after an entry shows an entry-specific upgrade.
const WordService = {

  // Ordered by how commonly these appear in journal/reflective writing.
  // First match in the entry wins, so higher-priority words go first.
  UPGRADE_MAP: [
    { simple: 'stressed',      suggestion: 'beleaguered',    type: 'adj.',  definition: 'Beset from all sides by pressures and demands; harassed and overwhelmed.',                        example: 'I felt beleaguered by the relentless demands of the week — every direction I turned, something needed me.',           tip: '"Beleaguered" captures the feeling of being surrounded — more vivid and dramatic than "stressed".' },
    { simple: 'overwhelmed',   suggestion: 'inundated',      type: 'verb',  definition: 'Flooded or submerged by something in great quantities.',                                           example: 'I was completely inundated with requests, and by noon I could barely process one before the next arrived.',           tip: '"Inundated" uses the image of being submerged — much more evocative when responsibilities pile up.' },
    { simple: 'exhausted',     suggestion: 'enervated',      type: 'adj.',  definition: 'Drained of energy or vitality at a deep, sustained level.',                                       example: 'By evening I felt enervated — not just sleepy, but hollowed out, as if something essential had been used up.',       tip: '"Enervated" goes beyond "exhausted" — it suggests the very source of energy has been depleted.' },
    { simple: 'tired',         suggestion: 'languorous',     type: 'adj.',  definition: 'Pleasantly or painfully relaxed and without energy; slow and heavy.',                             example: 'A languorous heaviness settled over me, making even the smallest decision feel monumental.',                         tip: '"Languorous" carries a sensory weight "tired" lacks — useful when the tiredness feels physical and lingering.' },
    { simple: 'anxious',       suggestion: 'apprehensive',   type: 'adj.',  definition: 'Uneasy and worried about a possible future event or outcome.',                                    example: 'I was apprehensive about the meeting — not sure what would be said, but certain it mattered.',                      tip: '"Apprehensive" is more precise — it points to anticipation of something specific, not general anxiety.' },
    { simple: 'nervous',       suggestion: 'disquieted',     type: 'adj.',  definition: 'Unsettled and uneasy in mind; disturbed in spirit.',                                              example: 'Something disquieted me all afternoon — a low hum of unease I couldn\'t quite name.',                               tip: '"Disquieted" is quieter and more literary — it conveys a restless, searching inner unease.' },
    { simple: 'worried',       suggestion: 'consternated',   type: 'adj.',  definition: 'Filled with sudden dismay and anxiety; thrown off-balance by concern.',                           example: 'The news left me consternated — I\'d expected something, but not this.',                                            tip: '"Consternated" suggests surprise plus worry — good when something unexpected troubled you.' },
    { simple: 'scared',        suggestion: 'trepidatious',   type: 'adj.',  definition: 'Feeling anxiety or apprehension in the face of something uncertain.',                             example: 'I stepped into the room trepidatious, unsure what waited on the other side of the conversation.',                   tip: '"Trepidatious" sounds more thoughtful than "scared" — ideal for facing a challenge with mixed dread and readiness.' },
    { simple: 'angry',         suggestion: 'incensed',       type: 'adj.',  definition: 'Extremely angered; feeling intense indignation or righteous rage.',                               example: 'I was incensed — not just annoyed, but genuinely offended that it had come to this.',                               tip: '"Incensed" is stronger and more dramatic — use it when the anger feels justified or visceral.' },
    { simple: 'frustrated',    suggestion: 'exasperated',    type: 'adj.',  definition: 'Intensely irritated by repeated provocation; at the end of patience.',                            example: 'I was exasperated — I\'d explained it three times and still felt like I wasn\'t being heard.',                      tip: '"Exasperated" captures the cumulative exhaustion of repeated frustration that "frustrated" understates.' },
    { simple: 'confused',      suggestion: 'perplexed',      type: 'adj.',  definition: 'Unable to understand something; deeply puzzled and searching for answers.',                       example: 'I left the conversation perplexed, turning the words over and over, unable to land on a clear meaning.',             tip: '"Perplexed" suggests an active search for understanding — not just lost, but genuinely searching.' },
    { simple: 'disappointed',  suggestion: 'crestfallen',    type: 'adj.',  definition: 'Sad and deflated; visibly dispirited by a sudden dashing of hope.',                              example: 'I was crestfallen when I heard the news — I had let myself believe it would go differently.',                       tip: '"Crestfallen" is vivid and immediate — it paints a picture of hope collapsing all at once.' },
    { simple: 'lonely',        suggestion: 'desolate',       type: 'adj.',  definition: 'Feeling the pain of utter isolation; bleak and abandoned.',                                      example: 'Even in a full room, I felt desolate — surrounded by people but utterly unreached by any of them.',                 tip: '"Desolate" conveys physical and emotional emptiness — "lonely" doesn\'t go deep enough for this feeling.' },
    { simple: 'sad',           suggestion: 'melancholy',     type: 'adj.',  definition: 'A feeling of pensive sadness, often without a clearly definable cause.',                         example: 'A gentle melancholy settled over the afternoon, the kind that doesn\'t demand tears — just quiet.',                  tip: '"Melancholy" has literary depth — it implies you\'re sitting with the feeling, not just experiencing it.' },
    { simple: 'happy',         suggestion: 'elated',         type: 'adj.',  definition: 'Ecstatically happy; filled with high spirits and a sense of uplift.',                            example: 'I was elated — lighter than I\'d felt in weeks, as if something that had been pressing down had finally lifted.',    tip: '"Elated" conveys a higher, lighter degree of joy — it suggests being lifted rather than just feeling good.' },
    { simple: 'excited',       suggestion: 'exhilarated',    type: 'adj.',  definition: 'Made intensely happy and invigorated; feeling a thrilling surge of energy.',                     example: 'I walked out of the room exhilarated, ideas crackling, barely able to contain the momentum building inside me.',    tip: '"Exhilarated" captures the full-body, energizing quality of excitement that "excited" only hints at.' },
    { simple: 'grateful',      suggestion: 'beholden',       type: 'adj.',  definition: 'Feeling a deep sense of obligation and gratitude; indebted at a personal level.',                example: 'I felt deeply beholden to her — not in a way that weighed on me, but in a way that made me want to be better.',    tip: '"Beholden" implies a debt of the heart — powerful when expressing deep, specific gratitude to a person.' },
    { simple: 'proud',         suggestion: 'exultant',       type: 'adj.',  definition: 'Triumphantly joyful; filled with a sense of great pride after achievement.',                     example: 'For a moment I felt exultant — all the doubt had been worth it, and this was the proof.',                          tip: '"Exultant" adds a triumphant dimension — ideal after overcoming something difficult.' },
    { simple: 'calm',          suggestion: 'equanimous',     type: 'adj.',  definition: 'Maintaining inner calmness and composure, especially in difficult circumstances.',               example: 'I tried to remain equanimous, reminding myself that this too would pass and clarity would return.',                  tip: '"Equanimous" suggests earned, practiced peace — not just the absence of stress, but its mastery.' },
    { simple: 'difficult',     suggestion: 'arduous',        type: 'adj.',  definition: 'Requiring great effort and exertion sustained over time.',                                       example: 'It was an arduous process — not one dramatic obstacle, but an endless series of small ones.',                       tip: '"Arduous" implies a long, grinding challenge — better than "difficult" for multi-day struggles.' },
    { simple: 'hard',          suggestion: 'formidable',     type: 'adj.',  definition: 'Inspiring fear or respect through being impressively difficult.',                                example: 'The task ahead was formidable, but that was exactly why it mattered.',                                              tip: '"Formidable" frames the challenge as worthy of respect — it dignifies the struggle.' },
    { simple: 'important',     suggestion: 'consequential',  type: 'adj.',  definition: 'Of great importance; having significant and far-reaching effects.',                              example: 'It was a consequential conversation — one of those that you know, even as it happens, will change things.',         tip: '"Consequential" emphasizes ripple effects — use it when something will shape what comes next.' },
    { simple: 'interesting',   suggestion: 'riveting',       type: 'adj.',  definition: 'So compelling that it holds attention absolutely; utterly engrossing.',                          example: 'The conversation was riveting — I completely forgot to check the time.',                                             tip: '"Riveting" implies you couldn\'t look away — far more expressive than "interesting".' },
    { simple: 'beautiful',     suggestion: 'resplendent',    type: 'adj.',  definition: 'Shining brilliantly; adorned with impressive, radiant beauty.',                                  example: 'The evening sky was resplendent — the kind of sight that stops you and insists you pay attention.',                  tip: '"Resplendent" adds a light-filled, sensory quality to beauty that "beautiful" alone can\'t match.' },
    { simple: 'think',         suggestion: 'ruminate',       type: 'verb',  definition: 'To think deeply and at length; to turn thoughts over and over in the mind.',                    example: 'I found myself ruminating on the conversation for hours — circling the same moments, looking for what I missed.',   tip: '"Ruminate" is perfect for journaling — it captures the circular, reflective quality of deep thought.' },
    { simple: 'feel',          suggestion: 'perceive',       type: 'verb',  definition: 'To become aware of something through instinct or emotional sensation.',                          example: 'I began to perceive a shift — subtle at first, the way light changes before a storm.',                              tip: '"Perceive" is more precise — useful when describing a moment of emotional realization or clarity.' },
    { simple: 'understand',    suggestion: 'fathom',         type: 'verb',  definition: 'To understand something deeply after sustained and effortful thought.',                          example: 'I still can\'t fully fathom why it affected me so deeply — but I know it did.',                                    tip: '"Fathom" conveys the effort of comprehension — as if plumbing emotional or intellectual depths.' },
    { simple: 'try',           suggestion: 'endeavor',       type: 'verb',  definition: 'To make a serious, sustained effort to achieve something of importance.',                        example: 'Each day I endeavor to show up fully — not perfectly, but honestly.',                                               tip: '"Endeavor" is more intentional and deliberate than "try" — it honors the stakes of the attempt.' },
    { simple: 'tried',         suggestion: 'endeavored',     type: 'verb',  definition: 'Made a serious and sustained effort toward something that mattered.',                            example: 'I endeavored to stay composed, though every part of me wanted to fall apart.',                                      tip: '"Endeavored" is more deliberate and formal — it acknowledges the real effort you put in.' },
    { simple: 'started',       suggestion: 'embarked',       type: 'verb',  definition: 'Set out on a journey or venture, especially one that is significant.',                           example: 'I have finally embarked on the thing I have been putting off for months — and it already feels different.',          tip: '"Embarked" frames beginnings as journeys — full of possibility, commitment, and forward motion.' },
    { simple: 'helped',        suggestion: 'ameliorated',    type: 'verb',  definition: 'Made something bad or unsatisfactory better; improved a difficult situation.',                   example: 'The conversation ameliorated some of the tension, though not all of it — progress, at least.',                      tip: '"Ameliorated" is ideal for partial, meaningful progress — not a full solution, but a real improvement.' },
    { simple: 'changed',       suggestion: 'transformed',    type: 'verb',  definition: 'Underwent a dramatic, fundamental shift in character or form.',                                 example: 'Something transformed in me during those months — not loudly, but completely.',                                     tip: '"Transformed" signals deep, irreversible change — not just surface adjustment.' },
    { simple: 'talked',        suggestion: 'deliberated',    type: 'verb',  definition: 'Engaged in careful, considered discussion or reflection.',                                       example: 'We deliberated for a long time, weighing each option honestly before reaching any kind of clarity.',                 tip: '"Deliberated" is perfect for serious conversations — it implies weight, intention, and mutual care.' },
    { simple: 'looked',        suggestion: 'contemplated',   type: 'verb',  definition: 'Thought about something for a long time; observed with deep reflection.',                       example: 'I stood there and contemplated the path ahead — not moving, just letting myself really see it.',                    tip: '"Contemplated" turns a glance into an act of thought — the looking becomes an act of reflection.' },
    { simple: 'problem',       suggestion: 'quandary',       type: 'noun',  definition: 'A state of perplexity or uncertainty, especially about what to do next.',                       example: 'I found myself in a genuine quandary — both options felt right, and both felt costly.',                             tip: '"Quandary" highlights the indecision aspect of a problem — ideal for genuine dilemmas.' },
    { simple: 'situation',     suggestion: 'predicament',    type: 'noun',  definition: 'A difficult, unpleasant, or embarrassing situation with no easy way out.',                      example: 'I am in a predicament of my own making, which somehow makes it harder, not easier, to navigate.',                  tip: '"Predicament" is more evocative — it conveys entrapment, not just circumstances.' },
    { simple: 'moment',        suggestion: 'juncture',       type: 'noun',  definition: 'A point in time, especially one made critical by circumstance.',                                example: 'At this juncture, I have to choose — and I am aware that not choosing is also a choice.',                          tip: '"Juncture" implies significance — use it when a moment feels like a turning point.' },
    { simple: 'feeling',       suggestion: 'sentiment',      type: 'noun',  definition: 'A view or opinion held as an emotional response to something.',                                 example: 'The prevailing sentiment was one of cautious hope — not certainty, but a genuine opening.',                         tip: '"Sentiment" gives more shape to a feeling — it implies something you can name and examine.' },
    { simple: 'thought',       suggestion: 'contemplation',  type: 'noun',  definition: 'Deep reflective thinking; careful and sustained mental consideration.',                         example: 'After much contemplation, I am beginning to understand what I actually want from this.',                            tip: '"Contemplation" honors the depth of your inner life — more meaningful than a passing "thought".' },
  ],

  _dailyPick() {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const dayOfYear = Math.floor((now - start) / 864e5);
    return this.UPGRADE_MAP[dayOfYear % this.UPGRADE_MAP.length];
  },

  _findInEntry(text) {
    for (const entry of this.UPGRADE_MAP) {
      const regex = new RegExp(`\\b${entry.simple}\\b`, 'i');
      const match = text.match(regex);
      if (match) return { ...entry, foundAs: match[0] };
    }
    return null;
  },

  async suggest(entryText) {
    try {
      const base = (window.CONFIG && CONFIG.apiBase) || '';
      const res = await fetch(`${base}/api/word`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: entryText }),
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.suggestion && data.simple) return { ...data, foundAs: data.simple };
      }
    } catch (_) {}
    return this._findInEntry(entryText) || this._dailyPick();
  },

  renderFresh(container) {
    this._render(container, this._dailyPick(), false);
    document.querySelector('.word-title').textContent = '📖 Word of the Day';
  },

  async renderFromEntry(container, entryText) {
    const result = await this.suggest(entryText);
    this._render(container, result, !!result.foundAs);
    document.querySelector('.word-title').textContent = result.foundAs
      ? '📖 Upgrade Your Words'
      : '📖 Word of the Day';
  },

  _render(container, item, fromEntry) {
    container.replaceChildren();

    if (fromEntry && item.foundAs) {
      const foundEl = document.createElement('p');
      foundEl.className = 'word-found';
      foundEl.appendChild(document.createTextNode('You wrote '));
      const em = document.createElement('em');
      em.textContent = `"${item.foundAs}"`;
      foundEl.appendChild(em);
      foundEl.appendChild(document.createTextNode(' — try this instead:'));
      container.appendChild(foundEl);
    }

    const wordEl = document.createElement('div');
    wordEl.className = 'word-word';
    wordEl.textContent = item.suggestion;
    container.appendChild(wordEl);

    const metaEl = document.createElement('div');
    metaEl.className = 'word-meta';
    const typeSpan = document.createElement('span');
    typeSpan.className = 'word-type';
    typeSpan.textContent = item.type;
    metaEl.appendChild(typeSpan);
    container.appendChild(metaEl);

    const defEl = document.createElement('p');
    defEl.className = 'word-definition';
    defEl.textContent = item.definition;
    container.appendChild(defEl);

    if (item.example) {
      const exEl = document.createElement('p');
      exEl.className = 'word-example-sentence';
      exEl.textContent = `"${item.example}"`;
      container.appendChild(exEl);
    }

    const tipEl = document.createElement('p');
    tipEl.className = 'word-tip';
    tipEl.textContent = item.tip;
    container.appendChild(tipEl);
  },
};
