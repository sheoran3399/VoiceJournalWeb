// Recommends a resonant poem line based on the journal entry's mood.
// Tries POST /api/poem first (expects { line, attribution }).
// Falls back to a curated, mood-matched library using keyword scoring.
const PoemService = {
  MOOD_MAP: {
    // positive / energetic
    happy: 'joy', excited: 'joy', joyful: 'joy', great: 'joy', wonderful: 'joy', amazing: 'joy',
    grateful: 'joy', thankful: 'joy', proud: 'joy', love: 'love', loved: 'love',
    // reflective / existential
    thinking: 'reflection', wondering: 'reflection', asking: 'reflection', meaning: 'reflection',
    purpose: 'reflection', questioning: 'reflection', contemplating: 'reflection',
    // sadness / grief
    sad: 'sadness', cry: 'sadness', crying: 'sadness', loss: 'sadness', grief: 'sadness',
    heartbreak: 'sadness', missing: 'sadness', lonely: 'sadness', alone: 'sadness',
    // resilience / strength
    hard: 'resilience', difficult: 'resilience', struggle: 'resilience', tough: 'resilience',
    keep: 'resilience', trying: 'resilience', fight: 'resilience',
    strength: 'resilience', persevere: 'resilience', survive: 'resilience',
    // stress / work
    work: 'work', busy: 'work', deadline: 'work', overwhelmed: 'work',
    stress: 'work', anxious: 'work', pressure: 'work', tired: 'work', exhausted: 'work',
    // healing / self-compassion
    heal: 'healing', healing: 'healing', rest: 'healing', gentle: 'healing', kind: 'healing',
    forgive: 'healing', forgiveness: 'healing', peace: 'healing', calm: 'healing',
    // wonder / nature
    nature: 'wonder', beautiful: 'wonder', light: 'wonder', sky: 'wonder', moon: 'wonder',
    stars: 'wonder', ocean: 'wonder', tree: 'wonder', forest: 'wonder', sun: 'wonder',
    // connection / people
    friend: 'connection', family: 'connection', together: 'connection', hug: 'connection',
    conversation: 'connection', listen: 'connection', share: 'connection',
  },

  POEMS: [
    // joy
    { line: 'Tell me, what is it you plan to do\nwith your one wild and precious life?', attribution: '— Mary Oliver, The Summer Day', mood: ['joy', 'reflection', 'wonder'] },
    { line: 'I sing the body electric.', attribution: '— Walt Whitman, Leaves of Grass', mood: ['joy'] },
    { line: 'Let the soft animal of your body\nlove what it loves.', attribution: '— Mary Oliver, Wild Geese', mood: ['joy', 'healing'] },
    // love
    { line: 'I carry your heart with me\n(I carry it in my heart).', attribution: '— e.e. cummings, [i carry your heart with me]', mood: ['love', 'connection'] },
    { line: 'How do I love thee?\nLet me count the ways.', attribution: '— Elizabeth Barrett Browning, Sonnet 43', mood: ['love'] },
    { line: 'Love is not love\nwhich alters when it alteration finds.', attribution: '— William Shakespeare, Sonnet 116', mood: ['love', 'resilience'] },
    // sadness / grief
    { line: 'After great pain, a formal feeling comes.', attribution: '— Emily Dickinson', mood: ['sadness'] },
    { line: 'Do not stand at my grave and weep —\nI am not there; I do not sleep.', attribution: '— Mary Elizabeth Frye', mood: ['sadness', 'healing'] },
    { line: 'I have wasted my life.', attribution: '— James Wright, Lying in a Hammock at William Duffy\'s Farm', mood: ['sadness', 'reflection'] },
    // resilience
    { line: 'Out of the night that covers me,\nblack as the pit from pole to pole,\nI thank whatever gods may be\nfor my unconquerable soul.', attribution: '— William Ernest Henley, Invictus', mood: ['resilience'] },
    { line: 'Still I rise.', attribution: '— Maya Angelou, Still I Rise', mood: ['resilience', 'joy'] },
    { line: 'Hold fast to dreams,\nfor if dreams die,\nlife is a broken-winged bird\nthat cannot fly.', attribution: '— Langston Hughes, Dreams', mood: ['resilience', 'reflection'] },
    { line: 'Out of the ash\nI rise with my red hair\nand I eat men like air.', attribution: '— Sylvia Plath, Lady Lazarus', mood: ['resilience'] },
    // work / purpose
    { line: 'The woods are lovely, dark and deep,\nbut I have promises to keep,\nand miles to go before I sleep.', attribution: '— Robert Frost, Stopping by Woods on a Snowy Evening', mood: ['work', 'resilience'] },
    { line: 'What is this life if, full of care,\nwe have no time to stand and stare?', attribution: '— W.H. Davies, Leisure', mood: ['work', 'reflection'] },
    // healing / self-compassion
    { line: 'The wound is the place\nwhere the Light enters you.', attribution: '— Rumi', mood: ['healing', 'resilience'] },
    { line: 'You do not have to be good.\nYou do not have to walk on your knees\nfor a hundred miles through the desert, repenting.', attribution: '— Mary Oliver, Wild Geese', mood: ['healing', 'joy'] },
    { line: 'Hope is the thing with feathers\nthat perches in the soul.', attribution: '— Emily Dickinson', mood: ['healing', 'resilience', 'joy'] },
    // reflection / identity
    { line: 'Two roads diverged in a wood, and I—\nI took the one less traveled by,\nand that has made all the difference.', attribution: '— Robert Frost, The Road Not Taken', mood: ['reflection'] },
    { line: 'I am large, I contain multitudes.', attribution: '— Walt Whitman, Song of Myself', mood: ['reflection'] },
    { line: 'We shall not cease from exploration,\nand the end of all our exploring\nwill be to arrive where we started\nand know the place for the first time.', attribution: '— T.S. Eliot, Little Gidding', mood: ['reflection', 'wonder'] },
    // wonder / nature
    { line: 'The world is charged with the grandeur of God.', attribution: '— Gerard Manley Hopkins, God\'s Grandeur', mood: ['wonder'] },
    { line: 'I wandered lonely as a cloud\nthat floats on high o\'er vales and hills,\nwhen all at once I saw a crowd,\na host, of golden daffodils.', attribution: '— William Wordsworth, Daffodils', mood: ['wonder', 'joy'] },
    // connection / peace
    { line: 'Out beyond ideas of wrongdoing and rightdoing,\nthere is a field. I\'ll meet you there.', attribution: '— Rumi', mood: ['connection', 'healing', 'reflection'] },
    { line: 'Do not be afraid. Do not be afraid.', attribution: '— Wendell Berry, The Peace of Wild Things', mood: ['connection', 'healing'] },
  ],

  async recommend(entryText) {
    try {
      const base = (window.CONFIG && CONFIG.apiBase) || '';
      const res = await fetch(`${base}/api/poem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: entryText }),
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.line && data.attribution) return data;
      }
    } catch (_) {}
    return this._fallback(entryText);
  },

  _fallback(text) {
    const lower = text.toLowerCase();
    const scores = {};
    for (const [keyword, mood] of Object.entries(this.MOOD_MAP)) {
      if (lower.includes(keyword)) {
        scores[mood] = (scores[mood] || 0) + 1;
      }
    }
    const topMood = Object.entries(scores).sort((a, b) => b[1] - a[1])[0]?.[0];
    const candidates = topMood
      ? this.POEMS.filter(p => p.mood.includes(topMood))
      : this.POEMS;
    const pool = candidates.length ? candidates : this.POEMS;
    return pool[Math.floor(Math.random() * pool.length)];
  },
};
