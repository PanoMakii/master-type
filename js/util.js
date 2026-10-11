const Util = {
  esc(text) {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return String(text).replace(/[&<>"']/g, c => map[c]);
  },

  rand(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },

  pick(list) {
    return list[Util.rand(0, list.length - 1)];
  },

  shuffle(list) {
    const copy = [...list];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Util.rand(0, i);
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  },

  formatTime(seconds) {
    const total = Math.max(0, Math.round(seconds));
    const minutes = Math.floor(total / 60);
    return minutes + ':' + String(total % 60).padStart(2, '0');
  },

  formatDate(iso) {
    const date = new Date(iso);
    return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
      + ' ' + date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  },

  readJson(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      return value === null ? fallback : value;
    } catch (error) {
      return fallback;
    }
  },

  writeJson(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      // storage full or blocked: the app still works without saving
    }
  }
};
