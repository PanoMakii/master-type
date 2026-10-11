const Leaderboard = (() => {
  let filter = 'all';
  let body, buttons;

  function init() {
    body = document.getElementById('leaderboard-body');
    buttons = document.querySelectorAll('#leaderboard-filters button');
    buttons.forEach(button => {
      button.addEventListener('click', () => {
        filter = button.dataset.filter;
        show();
      });
    });
  }

  // Your best saved result for each kind of test, added to the list as "You"
  function yourEntries() {
    const user = Auth.current();
    if (!user) return [];
    const bestByTest = {};
    Results.list().forEach(item => {
      if (!bestByTest[item.key] || item.wpm > bestByTest[item.key].wpm) bestByTest[item.key] = item;
    });
    return Object.values(bestByTest)
      .filter(item => Api.matchesFilter(item, filter))
      .map(item => ({ user: user.name, wpm: item.wpm, accuracy: item.accuracy, label: item.label, you: true }));
  }

  function renderTable(rows) {
    if (rows.length === 0) {
      body.innerHTML = '<div class="empty"><p>No results for this filter yet.</p></div>';
      return;
    }
    const lines = rows.map((row, index) => `<tr class="${row.you ? 'you' : ''}">
        <td class="rank">${index + 1}</td>
        <td>${Util.esc(row.user)}${row.you ? ' <span class="tag">You</span>' : ''}<span class="sub">${Util.esc(row.label)}</span></td>
        <td class="num">${row.wpm}</td>
        <td class="num">${row.accuracy}%</td>
        <td class="col-test">${Util.esc(row.label)}</td>
      </tr>`).join('');
    body.innerHTML = `<table class="table">
      <thead><tr><th>Rank</th><th>User</th><th class="num">WPM</th><th class="num">Accuracy</th><th class="col-test">Test</th></tr></thead>
      <tbody>${lines}</tbody>
    </table>`;
  }

  async function show() {
    buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === filter)));
    const requested = filter;
    body.innerHTML = '<p class="status">Loading rankings...</p>';

    try {
      const rows = await Api.getLeaderboard(filter);
      if (requested !== filter) return;
      const all = [...rows, ...yourEntries()].sort((a, b) => b.wpm - a.wpm || b.accuracy - a.accuracy);
      renderTable(all);
    } catch (error) {
      body.innerHTML = `<div class="empty">
        <p>The leaderboard could not be loaded.</p>
        <button type="button" class="btn" id="leaderboard-retry">Try again</button>
      </div>`;
      document.getElementById('leaderboard-retry').addEventListener('click', show);
    }
  }

  return { init, show };
})();
