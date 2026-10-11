const Settings = (() => {
  const KEY = 'mt_settings';

  const defaults = {
    theme: 'dark',
    accent: 'blue',
    fontSize: 'medium',
    volume: 60,
    typingSound: false,
    errorSound: true,
    countdownSound: true,
    language: 'en',
    topic: 'mixed',
    punctuation: true,
    caret: 'highlight',
    errorMode: 'continue',
    backspace: true,
    hints: true,
    name: '',
    // last used test setup
    mode: 'time',
    timeLimit: 60,
    pages: 1,
    tenkeyLevel: 'basic',
    tenkeyTime: 60
  };

  let values = { ...defaults };
  const listeners = [];

  function get(key) {
    return values[key];
  }

  function set(key, value) {
    values[key] = value;
    Util.writeJson(KEY, values);
    apply();
    sync();
    listeners.forEach(listener => listener(key, value));
  }

  function onChange(listener) {
    listeners.push(listener);
  }

  function reset() {
    const keep = { mode: values.mode, timeLimit: values.timeLimit, pages: values.pages, tenkeyLevel: values.tenkeyLevel, tenkeyTime: values.tenkeyTime };
    values = { ...defaults, ...keep };
    Util.writeJson(KEY, values);
    apply();
    sync();
    listeners.forEach(listener => listener('reset'));
  }

  function apply() {
    const root = document.documentElement;
    const light = matchMedia('(prefers-color-scheme: light)').matches;
    root.dataset.theme = values.theme === 'system' ? (light ? 'light' : 'dark') : values.theme;
    root.dataset.accent = values.accent;
    root.dataset.caret = values.caret;
    root.dataset.size = values.fontSize;
    root.dataset.hints = String(values.hints);
  }

  // Push the current values into every control on the page
  function sync() {
    document.querySelectorAll('[data-setting]').forEach(control => {
      const value = values[control.dataset.setting];
      if (control.type === 'checkbox') control.checked = value;
      else control.value = value;
    });
    document.querySelectorAll('[data-group]').forEach(group => {
      group.querySelectorAll('button').forEach(button => {
        button.setAttribute('aria-pressed', String(button.dataset.value === String(values[group.dataset.group])));
      });
    });
    document.querySelectorAll('[data-output]').forEach(output => {
      output.textContent = values[output.dataset.output] + '%';
    });
  }

  function fillTopics() {
    document.querySelectorAll('[data-options="topics"]').forEach(select => {
      select.innerHTML = Content.topics.map(t => `<option value="${t.id}">${t.label}</option>`).join('');
    });
  }

  function bind() {
    document.querySelectorAll('[data-setting]').forEach(control => {
      const key = control.dataset.setting;
      if (control.type === 'checkbox') {
        control.addEventListener('change', () => set(key, control.checked));
      } else if (control.type === 'range') {
        control.addEventListener('input', () => set(key, Number(control.value)));
        control.addEventListener('change', () => Sound.preview());
      } else if (control.type === 'text') {
        control.addEventListener('change', () => set(key, control.value.trim()));
      } else {
        control.addEventListener('change', () => set(key, control.value));
      }
    });

    document.querySelectorAll('[data-group]').forEach(group => {
      group.addEventListener('click', event => {
        const button = event.target.closest('button');
        if (button) set(group.dataset.group, button.dataset.value);
      });
    });

    document.getElementById('reset-settings').addEventListener('click', () => {
      reset();
      App.toast('Settings reset to defaults');
    });
  }

  function init() {
    Object.assign(values, Util.readJson(KEY, {}));
    fillTopics();
    bind();
    apply();
    sync();
    matchMedia('(prefers-color-scheme: light)').addEventListener('change', apply);
  }

  return { init, get, set, onChange };
})();
