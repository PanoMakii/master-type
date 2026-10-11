const Results = (() => {
  const BESTS_KEY = 'mt_bests';
  const AVERAGE_WPM = 40;
  const RATINGS = [
    [110, 'Elite'], [90, 'Expert'], [70, 'Fast'], [50, 'Proficient'], [35, 'Average'], [20, 'Learner'], [0, 'Beginner']
  ];

  // 1 word = 5 characters. Accuracy counts every keystroke, so fixed mistakes still count against it.
  function calculate(snapshot, seconds) {
    const { typed, target, keys, wrongKeys } = snapshot;
    let correct = 0;
    for (let i = 0; i < typed.length; i++) {
      if (typed[i] === target[i]) correct++;
    }
    const minutes = Math.max(seconds, 1) / 60;
    return {
      wpm: Math.round(correct / 5 / minutes),
      rawWpm: Math.round(typed.length / 5 / minutes),
      accuracy: keys ? Math.round((keys - wrongKeys) / keys * 1000) / 10 : 0,
      correct,
      incorrect: typed.length - correct,
      total: typed.length,
      errors: wrongKeys,
      keys
    };
  }

  function rating(wpm) {
    return RATINGS.find(item => wpm >= item[0])[1];
  }

  function build(snapshot, test, seconds, samples) {
    const stats = calculate(snapshot, seconds);
    return {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      date: new Date().toISOString(),
      mode: test.mode,
      level: test.level,
      label: test.label,
      key: test.key,
      topic: test.mode === 'tenkey' ? null : test.topic,
      seconds,
      samples,
      ...stats
    };
  }

  // ---------- personal bests (kept on this device) ----------

  function recordBest(result) {
    const bests = Util.readJson(BESTS_KEY, {});
    const previous = bests[result.key] === undefined ? null : bests[result.key];
    const isBest = previous === null || result.wpm > previous;
    if (isBest) {
      bests[result.key] = result.wpm;
      Util.writeJson(BESTS_KEY, bests);
    }
    return { isBest, previous };
  }

  // ---------- saved results (per account) ----------

  function storeKey() {
    const user = Auth.current();
    return user ? 'mt_results_' + user.id : null;
  }

  function list() {
    const key = storeKey();
    return key ? Util.readJson(key, []) : [];
  }

  function save(result) {
    const key = storeKey();
    if (!key) return false;
    const { samples, ...saved } = result;
    const all = list().filter(item => item.id !== saved.id);
    all.unshift(saved);
    Util.writeJson(key, all.slice(0, 300));
    return true;
  }

  function clearAll() {
    const key = storeKey();
    if (key) Util.writeJson(key, []);
  }

  function summary(items) {
    if (items.length === 0) return { count: 0, best: 0, avgWpm: 0, avgAccuracy: 0 };
    const total = field => items.reduce((sum, item) => sum + item[field], 0);
    return {
      count: items.length,
      best: Math.max(...items.map(item => item.wpm)),
      avgWpm: Math.round(total('wpm') / items.length),
      avgAccuracy: Math.round(total('accuracy') / items.length * 10) / 10
    };
  }

  // ---------- chart ----------

  function chart(values, label) {
    if (values.length < 2) return '';
    const max = Math.max(...values, 1);
    const points = values
      .map((value, i) => `${(i / (values.length - 1) * 600).toFixed(1)},${(116 - value / max * 108).toFixed(1)}`)
      .join(' ');
    return `<div class="chart">
      <svg viewBox="0 0 600 120" preserveAspectRatio="none" role="img" aria-label="${label}">
        <line x1="0" y1="118" x2="600" y2="118" stroke="var(--line-strong)" stroke-width="1" vector-effect="non-scaling-stroke"/>
        <polyline fill="none" stroke="currentColor" stroke-width="2" vector-effect="non-scaling-stroke" points="${points}"/>
      </svg>
      <span class="chart-note">Peak ${max} WPM</span>
    </div>`;
  }

  // ---------- results screen ----------

  function bestText(best, wpm) {
    if (best.previous === null) return 'First result for this test';
    if (best.isBest) return `New personal best. Previous: ${best.previous} WPM`;
    return `Personal best: ${best.previous} WPM`;
  }

  function render(container, result, best, actions) {
    const diff = result.wpm - AVERAGE_WPM;
    const facts = [
      ['Correct characters', result.correct],
      ['Incorrect characters', result.incorrect],
      ['Total characters', result.total],
      ['Errors made', result.errors],
      ['Duration', Util.formatTime(result.seconds)],
      ['Test', result.label]
    ];

    container.innerHTML = `
      <p class="eyebrow">Test complete</p>
      <div class="results-main">
        <div class="big-stat"><span class="live-label">WPM</span><span class="big-value" id="res-wpm">${result.wpm}</span></div>
        <div class="big-stat"><span class="live-label">Accuracy</span><span class="big-value">${result.accuracy}%</span></div>
        <div class="rating">
          <strong>${rating(result.wpm)}</strong>
          <span>${diff >= 0 ? '+' : ''}${diff} WPM against the ${AVERAGE_WPM} WPM average</span>
          <span class="${best.isBest && best.previous !== null ? 'good' : ''}">${bestText(best)}</span>
        </div>
      </div>
      ${chart(result.samples, 'Words per minute over time')}
      <dl class="facts">
        ${facts.map(([name, value]) => `<div><dt>${name}</dt><dd>${Util.esc(value)}</dd></div>`).join('')}
      </dl>
      <p class="note">Accuracy counts every key you pressed, including mistakes you corrected afterwards.</p>
      <div class="actions">
        <button type="button" class="btn primary" data-action="retry">Try again</button>
        <button type="button" class="btn" data-action="new">New test</button>
        <button type="button" class="btn" data-action="save">Save result</button>
      </div>`;

    const saveButton = container.querySelector('[data-action="save"]');

    function commit() {
      save(result);
      saveButton.textContent = 'Saved';
      saveButton.disabled = true;
      App.toast('Result saved to your history');
    }

    container.querySelector('[data-action="retry"]').addEventListener('click', actions.onRetry);
    container.querySelector('[data-action="new"]').addEventListener('click', actions.onNew);
    saveButton.addEventListener('click', () => {
      if (Auth.current()) commit();
      else Auth.open({ reason: 'Log in or create an account to save this result.', tab: 'signup', onSuccess: commit });
    });
    container.querySelector('[data-action="retry"]').focus();
  }

  // ---------- history screen ----------

  function renderHistory(container) {
    if (!Auth.current()) {
      container.innerHTML = `<div class="empty">
        <p>Log in to save your results and see them here.</p>
        <button type="button" class="btn primary" id="history-login">Log in or sign up</button>
      </div>`;
      document.getElementById('history-login').addEventListener('click', () => Auth.open({ tab: 'login' }));
      return;
    }

    const items = list();
    if (items.length === 0) {
      container.innerHTML = `<div class="empty">
        <p>No saved results yet. Finish a test and press Save result.</p>
        <a class="btn primary" href="#test">Take a test</a>
      </div>`;
      return;
    }

    const stats = summary(items);
    const trend = items.slice(0, 30).reverse().map(item => item.wpm);
    const rows = items.map(item => `<tr>
        <td>${Util.formatDate(item.date)}</td>
        <td>${Util.esc(item.label)}</td>
        <td class="num">${item.wpm}</td>
        <td class="num">${item.accuracy}%</td>
        <td class="num">${Util.formatTime(item.seconds)}</td>
      </tr>`).join('');

    container.innerHTML = `
      <dl class="facts">
        <div><dt>Tests saved</dt><dd>${stats.count}</dd></div>
        <div><dt>Best WPM</dt><dd>${stats.best}</dd></div>
        <div><dt>Average WPM</dt><dd>${stats.avgWpm}</dd></div>
        <div><dt>Average accuracy</dt><dd>${stats.avgAccuracy}%</dd></div>
      </dl>
      ${chart(trend, 'WPM across your saved tests')}
      <div class="table-wrap">
        <table class="table">
          <thead><tr><th>Date</th><th>Test</th><th class="num">WPM</th><th class="num">Accuracy</th><th class="num">Time</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <p><button type="button" class="btn" id="history-clear">Clear history</button></p>`;

    document.getElementById('history-clear').addEventListener('click', () => {
      if (confirm('Delete all saved results for this account?')) {
        clearAll();
        renderHistory(container);
      }
    });
  }

  return { calculate, build, recordBest, render, renderHistory, list, save, summary };
})();
