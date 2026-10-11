// Demo accounts live in localStorage. To use a real backend, replace signUp, logIn and
// logOut with fetch calls to your server and keep the rest of the UI as it is.
const Auth = (() => {
  const USERS_KEY = 'mt_users';
  const SESSION_KEY = 'mt_session';

  let user = null;
  let tab = 'login';
  let afterAuth = null;
  const listeners = [];
  let dialog, form, errorEl;

  function readUsers() {
    return Util.readJson(USERS_KEY, {});
  }

  function publicUser(record) {
    return { id: record.id, name: record.name, email: record.email, created: record.created };
  }

  async function hash(password, salt) {
    const text = salt + password;
    if (window.crypto && crypto.subtle) {
      const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
      return Array.from(new Uint8Array(bytes)).map(b => b.toString(16).padStart(2, '0')).join('');
    }
    let value = 0;
    for (const letter of text) value = (value * 31 + letter.charCodeAt(0)) >>> 0;
    return String(value);
  }

  function checkEmail(email) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Enter a valid email address.');
  }

  async function signUp({ name, email, password }) {
    name = name.trim();
    email = email.trim().toLowerCase();
    if (name.length < 2) throw new Error('Enter your name (at least 2 characters).');
    checkEmail(email);
    if (password.length < 8) throw new Error('Password must be at least 8 characters.');

    const users = readUsers();
    if (users[email]) throw new Error('An account with this email already exists.');

    const salt = Math.random().toString(36).slice(2);
    users[email] = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name,
      email,
      salt,
      hash: await hash(password, salt),
      created: new Date().toISOString()
    };
    Util.writeJson(USERS_KEY, users);
    return startSession(users[email]);
  }

  async function logIn({ email, password }) {
    email = email.trim().toLowerCase();
    checkEmail(email);
    const record = readUsers()[email];
    if (!record || record.hash !== await hash(password, record.salt)) {
      throw new Error('Incorrect email or password.');
    }
    return startSession(record);
  }

  function startSession(record) {
    Util.writeJson(SESSION_KEY, record.email);
    user = publicUser(record);
    return user;
  }

  function logOut() {
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch (error) {
      // ignore
    }
    user = null;
    notify();
  }

  function rename(name) {
    if (!user || !name) return;
    const users = readUsers();
    if (!users[user.email]) return;
    users[user.email].name = name;
    Util.writeJson(USERS_KEY, users);
    user = publicUser(users[user.email]);
    notify();
  }

  function current() {
    return user;
  }

  function onChange(listener) {
    listeners.push(listener);
  }

  function notify() {
    listeners.forEach(listener => listener(user));
  }

  // ---------- dialog ----------

  function setTab(name) {
    tab = name;
    const signup = name === 'signup';
    dialog.querySelectorAll('[data-tab]').forEach(button => {
      button.setAttribute('aria-selected', String(button.dataset.tab === name));
    });
    document.getElementById('auth-title').textContent = signup ? 'Create account' : 'Log in';
    document.getElementById('auth-submit').textContent = signup ? 'Create account' : 'Log in';
    document.getElementById('name-field').hidden = !signup;
    form.elements.password.autocomplete = signup ? 'new-password' : 'current-password';
    errorEl.textContent = '';
  }

  function open(options = {}) {
    afterAuth = options.onSuccess || null;
    document.getElementById('auth-reason').textContent = options.reason || '';
    setTab(options.tab || 'login');
    form.reset();
    dialog.showModal();
    form.elements[tab === 'signup' ? 'name' : 'email'].focus();
  }

  function close() {
    if (dialog.open) dialog.close();
  }

  async function submit(event) {
    event.preventDefault();
    const button = document.getElementById('auth-submit');
    const data = Object.fromEntries(new FormData(form));
    errorEl.textContent = '';
    button.disabled = true;
    try {
      if (tab === 'signup') await signUp(data);
      else await logIn(data);
      close();
      notify();
      App.toast(tab === 'signup' ? 'Account created' : 'Logged in as ' + user.name);
      if (afterAuth) {
        const callback = afterAuth;
        afterAuth = null;
        callback();
      }
    } catch (error) {
      errorEl.textContent = error.message;
    } finally {
      button.disabled = false;
    }
  }

  // ---------- profile screen ----------

  function renderProfile(container) {
    if (!user) {
      container.innerHTML = `<div class="empty">
        <p>You are not logged in. Create an account to save results and track your progress.</p>
        <p class="actions">
          <button type="button" class="btn primary" id="profile-signup">Sign up</button>
          <button type="button" class="btn" id="profile-login">Log in</button>
        </p>
      </div>`;
      document.getElementById('profile-signup').addEventListener('click', () => open({ tab: 'signup' }));
      document.getElementById('profile-login').addEventListener('click', () => open({ tab: 'login' }));
      return;
    }

    const stats = Results.summary(Results.list());
    container.innerHTML = `
      <dl class="facts">
        <div><dt>Name</dt><dd>${Util.esc(user.name)}</dd></div>
        <div><dt>Email</dt><dd>${Util.esc(user.email)}</dd></div>
        <div><dt>Member since</dt><dd>${new Date(user.created).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</dd></div>
      </dl>
      <dl class="facts">
        <div><dt>Tests saved</dt><dd>${stats.count}</dd></div>
        <div><dt>Best WPM</dt><dd>${stats.best}</dd></div>
        <div><dt>Average WPM</dt><dd>${stats.avgWpm}</dd></div>
        <div><dt>Average accuracy</dt><dd>${stats.avgAccuracy}%</dd></div>
      </dl>
      <p class="actions">
        <a class="btn" href="#settings">Edit display name</a>
        <button type="button" class="btn" id="profile-logout">Log out</button>
      </p>`;
    document.getElementById('profile-logout').addEventListener('click', logOut);
  }

  function init() {
    dialog = document.getElementById('auth-dialog');
    form = document.getElementById('auth-form');
    errorEl = document.getElementById('auth-error');

    const email = Util.readJson(SESSION_KEY, null);
    const record = email ? readUsers()[email] : null;
    if (record) user = publicUser(record);

    form.addEventListener('submit', submit);
    document.getElementById('auth-close').addEventListener('click', close);
    dialog.addEventListener('click', event => {
      if (event.target === dialog) close();
    });
    dialog.querySelectorAll('[data-tab]').forEach(button => {
      button.addEventListener('click', () => setTab(button.dataset.tab));
    });
  }

  return { init, current, open, onChange, rename, renderProfile };
})();
