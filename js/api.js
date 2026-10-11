const Api = (() => {
  const TIMEOUT = 6000;

  async function getJson(url) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT);
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return await response.json();
    } finally {
      clearTimeout(timer);
    }
  }

  function wikiUrl(language, titles) {
    const base = `https://${language}.wikipedia.org/w/api.php?action=query&format=json&formatversion=2&origin=*`
      + '&prop=extracts&exintro=1&explaintext=1&exlimit=max&redirects=1';
    if (titles) return base + '&titles=' + encodeURIComponent(titles.join('|'));
    return base + '&generator=random&grnnamespace=0&grnlimit=10';
  }

  function cleanExtract(text) {
    return text
      .replace(/\([^)]*\)/g, '')
      .replace(/\[[^\]]*\]/g, '')
      .replace(/\s+/g, ' ')
      .replace(/\s+([,.;:!?])/g, '$1')
      .trim();
  }

  // Returns a list of cleaned article intros
  async function fetchArticles(topic, language) {
    let titles = null;
    if (language === 'en') {
      const pool = Content.titles[topic] || Object.values(Content.titles).flat();
      titles = Util.shuffle(pool).slice(0, 8);
    }
    const data = await getJson(wikiUrl(language, titles));
    const pages = (data.query && data.query.pages) || [];
    return pages
      .filter(page => page.extract)
      .map(page => cleanExtract(page.extract))
      .filter(text => text.length > 150);
  }

  // Joins whole sentences from the articles until there are enough characters
  function buildText(articles, chars) {
    let text = '';
    for (const article of articles) {
      const sentences = article.match(/[^.!?]+[.!?]+(\s|$)/g) || [];
      for (const sentence of sentences) {
        if (text.length >= chars) return text;
        text += sentence.trim() + ' ';
      }
    }
    return text;
  }

  async function getText({ topic, language, chars, punctuation }) {
    let text = '';
    let note = '';

    try {
      for (let round = 0; round < 3 && text.length < chars; round++) {
        const articles = await fetchArticles(topic, language);
        if (articles.length === 0) {
          note = 'empty';
          continue;
        }
        const formatted = Content.format(buildText(articles, chars - text.length), punctuation, language);
        text += (text ? ' ' : '') + formatted;
      }
    } catch (error) {
      note = error.name === 'AbortError' ? 'timeout' : 'network';
    }

    if (text.length >= chars * 0.8) {
      return { text, source: 'Wikipedia', note: '' };
    }

    const fallback = Content.offlineText(topic, chars - text.length, punctuation);
    return {
      text: text ? text + ' ' + fallback : fallback,
      source: text ? 'Wikipedia and offline library' : 'Offline library',
      note: note || 'short'
    };
  }

  // ---------- Leaderboard (mock data, replace with a real endpoint later) ----------

  function entry(user, wpm, accuracy, mode, label, level) {
    return { user, wpm, accuracy, mode, label, level: level || null };
  }

  const MOCK_LEADERBOARD = [
    entry('typefox', 142, 99.1, 'time', 'Time · 1 min'),
    entry('n0va', 131, 98.4, 'time', 'Time · 3 min'),
    entry('lena.k', 127, 97.9, 'time', 'Time · 1 min'),
    entry('kelechi', 121, 98.8, 'pages', 'Pages · 1 page'),
    entry('numpad_nick', 118, 99.0, 'tenkey', '10-Key · Basic · 1 min', 'basic'),
    entry('ramzi', 118, 96.5, 'time', 'Time · 5 min'),
    entry('priya.s', 114, 99.3, 'time', 'Time · 3 min'),
    entry('jonas', 109, 97.2, 'pages', 'Pages · 2 pages'),
    entry('ledger.lee', 104, 98.5, 'tenkey', '10-Key · Advanced · 3 min', 'advanced'),
    entry('amara_o', 104, 98.0, 'time', 'Time · 1 min'),
    entry('tolu', 101, 96.1, 'time', 'Time · 15 min'),
    entry('yuki', 98, 97.7, 'pages', 'Pages · 1 page'),
    entry('acct_amina', 96, 97.8, 'tenkey', '10-Key · Advanced · 1 min', 'advanced'),
    entry('marcus_b', 96, 95.8, 'time', 'Time · 5 min'),
    entry('ngozi', 92, 98.2, 'pages', 'Pages · 3 pages'),
    entry('dmitri', 90, 96.9, 'time', 'Time · 3 min'),
    entry('clerk_omar', 88, 98.9, 'tenkey', '10-Key · Basic · 5 min', 'basic'),
    entry('sofia_r', 88, 97.4, 'time', 'Time · 1 min'),
    entry('hassan', 85, 94.9, 'pages', 'Pages · 2 pages'),
    entry('emeka', 83, 97.6, 'time', 'Time · 5 min'),
    entry('fin_grace', 82, 96.4, 'tenkey', '10-Key · Advanced · 5 min', 'advanced'),
    entry('chloe', 80, 96.3, 'time', 'Time · 3 min'),
    entry('ana_p', 78, 95.5, 'pages', 'Pages · 1 page'),
    entry('oluwaseun', 74, 97.1, 'time', 'Time · 15 min'),
    entry('ibrahim_a', 71, 96.8, 'pages', 'Pages · 3 pages')
  ];

  function matchesFilter(item, filter) {
    if (filter === 'all') return true;
    if (filter === 'advanced') return item.mode === 'tenkey' && item.level === 'advanced';
    return item.mode === filter;
  }

  // To use a real backend, replace the body with: return (await fetch('/api/leaderboard?filter=' + filter)).json();
  async function getLeaderboard(filter) {
    await new Promise(resolve => setTimeout(resolve, 300));
    return MOCK_LEADERBOARD.filter(item => matchesFilter(item, filter));
  }

  return { getText, getLeaderboard, matchesFilter };
})();
