const App = (() => {
  const PAGE_CHARS = 1500;
  const FIRST_CHUNK = 900;
  const MORE_CHUNK = 800;
  const views = ['test', 'leaderboard', 'history', 'settings', 'profile'];

  const modes = {
    time: {
      groups: [
        { name: 'Duration', key: 'timeLimit', items: [[60, '1 min'], [180, '3 min'], [300, '5 min'], [900, '15 min']] }
      ]
    },
    pages: {
      groups: [
        { name: 'Pages', key: 'pages', items: [[1, '1 page'], [2, '2 pages'], [3, '3 pages']] }
      ]
    },
    tenkey: {
      groups: [
        { name: 'Level', key: 'tenkeyLevel', items: [['basic', 'Basic'], ['advanced', 'Advanced']] },
        { name: 'Duration', key: 'tenkeyTime', items: [[60, '1 min'], [180, '3 min'], [300, '5 min']] }
      ]
    }
  };

  const el = {};
  let phase = 'idle';
  let runId = 0;
  let test = null;
  let clock = null;
  let countdown = null;
  let extending = false;
  let samples = [];
  let lastSecond = 0;
  let toastTimer = null;

  function byId(id) {
    return document.getElementById(id);
  }

  // ---------- test setup ----------

  function currentTest() {
    const mode = Settings.get('mode');
    const level = mode === 'tenkey' ? Settings.get('tenkeyLevel') : null;
    const seconds = mode === 'time' ? Settings.get('timeLimit') : mode === 'tenkey' ? Settings.get('tenkeyTime') : 0;
    const pages = mode === 'pages' ? Settings.get('pages') : 0;
    const minutes = seconds / 60 + ' min';

    let label = 'Time · ' + minutes;
    if (mode === 'pages') label = 'Pages · ' + pages + (pages === 1 ? ' page' : ' pages');
    if (mode === 'tenkey') label = '10-Key · ' + (level === 'advanced' ? 'Advanced' : 'Basic') + ' · ' + minutes;

    return {
      mode,
      level,
      seconds,
      pages,
      label,
      key: [mode, level || '', seconds || pages].join(':'),
      topic: Settings.get('topic')
    };
  }

  function renderConfig() {
    const mode = Settings.get('mode');
    byId('mode-group').querySelectorAll('button').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.mode === mode));
    });

    el.options.innerHTML = modes[mode].groups.map(group => {
      const buttons = group.items.map(([value, label]) => {
        const pressed = String(Settings.get(group.key)) === String(value);
        return `<button type="button" data-key="${group.key}" data-value="${value}" aria-pressed="${pressed}">${label}</button>`;
      }).join('');
      return `<div class="seg" role="group" aria-label="${group.name}">${buttons}</div>`;
    }).join('');

    byId('topic-wrap').hidden = mode === 'tenkey';
    if (phase === 'idle') showIdleStats();
  }

  function showIdleStats() {
    const setup = currentTest();
    el.clockLabel.textContent = setup.seconds ? 'Time left' : 'Time';
    el.clock.textContent = Util.formatTime(setup.seconds);
    el.wpm.textContent = '--';
    el.accuracy.textContent = '--';
    el.errors.textContent = '0';
    el.progressItem.hidden = setup.mode !== 'pages';
    el.progressText.textContent = '0%';
    el.barFill.style.width = '0%';
  }

  // ---------- overlay and phase ----------

  function showOverlay(kind, html) {
    el.overlay.className = 'overlay ' + kind;
    el.overlay.innerHTML = html;
    el.overlay.hidden = false;
  }

  function hideOverlay() {
    el.overlay.hidden = true;
    el.overlay.innerHTML = '';
  }

  function setPhase(next) {
    phase = next;
    document.body.dataset.phase = next;
    el.config.inert = next !== 'idle';
    el.startBtn.textContent = next === 'idle' ? 'Start' : 'Cancel';
    el.startBtn.classList.toggle('primary', next === 'idle');
    el.typingBox.classList.toggle('is-waiting', next === 'loading' || next === 'countdown');
  }

  function showIdle() {
    runId++;
    el.results.hidden = true;
    el.config.hidden = false;
    el.stage.hidden = false;
    el.source.textContent = '';
    Typing.clear();
    setPhase('idle');
    showIdleStats();
    showOverlay('idle', 'Choose a test, then press Start');
  }

  // ---------- running a test ----------

  async function fetchText(chars) {
    if (test.mode === 'tenkey') {
      return { text: Content.tenKey(test.level, chars), source: 'Generated 10-key data', note: '' };
    }
    return Api.getText({
      topic: test.topic,
      language: Settings.get('language'),
      chars,
      punctuation: Settings.get('punctuation')
    });
  }

  function sourceText(result) {
    const topic = test.mode === 'tenkey' ? '' : ' · ' + Content.topics.find(t => t.id === test.topic).label;
    return 'Source: ' + result.source + topic;
  }

  function fallbackMessage(note) {
    if (note === 'timeout') return 'Wikipedia took too long to answer. Using offline text.';
    if (note === 'network') return 'Could not reach Wikipedia. Using offline text.';
    if (note === 'empty') return 'Wikipedia returned no text. Using offline text.';
    return 'Not enough text came back. Added offline text.';
  }

  async function startTest() {
    if (phase !== 'idle') return;
    test = currentTest();
    const id = ++runId;
    samples = [];
    lastSecond = 0;

    showIdleStats();
    Typing.clear();
    setPhase('loading');
    showOverlay('loading', '<span class="loader" aria-hidden="true"></span>Preparing your text');
    Typing.focus();

    const chars = test.mode === 'pages' ? PAGE_CHARS * test.pages : FIRST_CHUNK;
    const result = await fetchText(chars);
    if (id !== runId) return;

    if (result.note) toast(fallbackMessage(result.note));
    el.source.textContent = sourceText(result);
    Typing.load(test.mode === 'pages' ? result.text : result.text + ' ');
    setPhase('countdown');

    countdown = Timer.countdown({
      onStep(label, index) {
        showOverlay('count', `<span class="count-number ${index === 3 ? 'go' : ''}">${label}</span>`);
        Sound.count(index === 3);
      },
      onDone: beginRun
    });
  }

  function beginRun() {
    hideOverlay();
    setPhase('running');
    Typing.start();
    clock = Timer.createClock({ duration: test.seconds, onTick, onEnd: () => finish('time') });
    clock.start();
  }

  function onTick(seconds) {
    if (test.seconds) el.clock.textContent = Util.formatTime(Math.ceil(test.seconds - seconds));
    else el.clock.textContent = Util.formatTime(seconds);

    updateLive(seconds);

    const whole = Math.floor(seconds);
    if (whole > lastSecond) {
      lastSecond = whole;
      samples.push(Results.calculate(Typing.snapshot(), seconds).wpm);
    }
  }

  function updateLive(seconds) {
    const snapshot = Typing.snapshot();
    const stats = Results.calculate(snapshot, seconds);
    el.wpm.textContent = snapshot.keys ? stats.wpm : '--';
    el.accuracy.textContent = snapshot.keys ? stats.accuracy + '%' : '--';
    el.errors.textContent = stats.errors;

    const typedShare = snapshot.target.length ? snapshot.typed.length / snapshot.target.length : 0;
    el.progressText.textContent = Math.round(typedShare * 100) + '%';
    const share = test.seconds ? seconds / test.seconds : typedShare;
    el.barFill.style.width = Math.min(100, share * 100) + '%';
  }

  // Runs after every change to the typed text
  function onTyped() {
    if (phase !== 'running') return;
    updateLive(clock.elapsed());

    if (test.mode === 'pages') {
      if (Typing.remaining() <= 0) finish('done');
      return;
    }
    if (Typing.remaining() < 400 && !extending) addMoreText();
  }

  async function addMoreText() {
    extending = true;
    const id = runId;
    const result = await fetchText(MORE_CHUNK);
    extending = false;
    if (id === runId && phase === 'running') Typing.extend(result.text + ' ');
  }

  function finish(reason) {
    if (phase !== 'running') return;
    clock.stop();
    Typing.stop();

    const seconds = reason === 'time' ? test.seconds : clock.elapsed();
    samples.push(Results.calculate(Typing.snapshot(), seconds).wpm);
    const result = Results.build(Typing.snapshot(), test, seconds, samples);
    const best = Results.recordBest(result);

    Sound.done();
    setPhase('finished');
    el.config.hidden = true;
    el.stage.hidden = true;
    el.results.hidden = false;
    Results.render(el.results, result, best, {
      onRetry() {
        showIdle();
        startTest();
      },
      onNew: showIdle
    });
  }

  function cancelTest() {
    if (countdown) countdown.cancel();
    if (clock) clock.stop();
    Typing.stop();
    extending = false;
    showIdle();
  }

  // ---------- views ----------

  function currentView() {
    const name = location.hash.slice(1);
    return views.includes(name) ? name : 'test';
  }

  function refreshView() {
    const name = currentView();
    if (name === 'leaderboard') Leaderboard.show();
    if (name === 'history') Results.renderHistory(byId('history-body'));
    if (name === 'profile') Auth.renderProfile(byId('profile-body'));
  }

  function route() {
    const name = currentView();
    if (name !== 'test' && (phase === 'loading' || phase === 'countdown' || phase === 'running')) cancelTest();

    views.forEach(view => {
      byId('view-' + view).hidden = view !== name;
    });
    document.querySelectorAll('.nav a').forEach(link => {
      if (link.dataset.view === name) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    document.title = name === 'test' ? 'Master Type' : name[0].toUpperCase() + name.slice(1) + ' · Master Type';
    refreshView();
    window.scrollTo(0, 0);
  }

  function updateAccountButton() {
    const user = Auth.current();
    el.account.textContent = user ? user.name : 'Log in';
  }

  function toast(message) {
    el.toast.textContent = message;
    el.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.toast.classList.remove('show'), 3500);
  }

  // ---------- events ----------

  function bindEvents() {
    byId('mode-group').addEventListener('click', event => {
      const button = event.target.closest('button');
      if (button) Settings.set('mode', button.dataset.mode);
    });

    el.options.addEventListener('click', event => {
      const button = event.target.closest('button');
      if (!button) return;
      const value = Number.isNaN(Number(button.dataset.value)) ? button.dataset.value : Number(button.dataset.value);
      Settings.set(button.dataset.key, value);
    });

    el.startBtn.addEventListener('click', () => {
      if (phase === 'idle') startTest();
      else cancelTest();
    });

    el.account.addEventListener('click', () => {
      if (Auth.current()) location.hash = '#profile';
      else Auth.open({ tab: 'login' });
    });

    window.addEventListener('hashchange', route);

    document.addEventListener('keydown', event => {
      if (document.querySelector('dialog[open]')) return;

      if (event.key === 'Escape') {
        if (phase === 'loading' || phase === 'countdown' || phase === 'running') cancelTest();
        else if (phase === 'finished') showIdle();
        return;
      }

      const typingTags = ['BUTTON', 'SELECT', 'INPUT', 'TEXTAREA', 'A'];
      if (event.key === 'Enter' && phase === 'idle' && currentView() === 'test' && !typingTags.includes(event.target.tagName)) {
        startTest();
        return;
      }

      // Keep typing even if focus was lost
      if (phase === 'running' && document.activeElement !== el.input) {
        Typing.focus();
        if (event.key === ' ') event.preventDefault();
      }
    });

    Settings.onChange(key => {
      if (key === 'name') Auth.rename(Settings.get('name'));
      if (key === 'fontSize') requestAnimationFrame(Typing.refresh);
      renderConfig();
    });

    Auth.onChange(() => {
      updateAccountButton();
      refreshView();
    });
  }

  function init() {
    ['config', 'options', 'stage', 'clock', 'wpm', 'accuracy', 'errors', 'results', 'overlay', 'source', 'toast']
      .forEach(id => { el[id] = byId(id); });
    el.clockLabel = byId('clock-label');
    el.progressItem = byId('progress-item');
    el.progressText = byId('progress-text');
    el.barFill = byId('bar-fill');
    el.typingBox = byId('typing-box');
    el.input = byId('typing-input');
    el.startBtn = byId('start-btn');
    el.account = byId('account-btn');

    Settings.init();
    Auth.init();
    Leaderboard.init();
    Typing.init({ box: el.typingBox, words: byId('words'), input: el.input }, onTyped);

    bindEvents();
    renderConfig();
    updateAccountButton();
    showIdle();
    route();
  }

  return { init, toast };
})();

App.init();
