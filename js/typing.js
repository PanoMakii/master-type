const Typing = (() => {
  let box, wordsEl, input;
  let target = '';
  let typed = '';
  let chars = [];
  let keys = 0;
  let wrongKeys = 0;
  let active = false;
  let lineIndex = -1;
  let onChange = () => {};

  const BLOCKED_KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'Enter', 'Tab', 'Delete'];

  function init(elements, callback) {
    box = elements.box;
    wordsEl = elements.words;
    input = elements.input;
    onChange = callback;

    input.addEventListener('input', handleInput);
    input.addEventListener('keydown', handleKeydown);
    input.addEventListener('paste', event => event.preventDefault());
    input.addEventListener('drop', event => event.preventDefault());
    input.addEventListener('focus', () => box.classList.remove('unfocused'));
    input.addEventListener('blur', () => box.classList.toggle('unfocused', active));
    box.addEventListener('mousedown', event => {
      event.preventDefault();
      focus();
    });
    window.addEventListener('resize', refresh);
  }

  function handleKeydown(event) {
    const selectAll = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'a';
    if (BLOCKED_KEYS.includes(event.key) || selectAll) event.preventDefault();
  }

  function handleInput() {
    if (!active) {
      input.value = typed;
      return;
    }

    const before = typed;
    let value = input.value.slice(0, target.length);
    let hadError = false;

    if (value.length < before.length && !Settings.get('backspace')) {
      value = before;
    }

    if (value.length > before.length && value.startsWith(before)) {
      for (let pos = before.length; pos < value.length; pos++) {
        keys++;
        if (value[pos] !== target[pos]) {
          wrongKeys++;
          hadError = true;
          if (Settings.get('errorMode') === 'stop') {
            value = value.slice(0, pos);
            flash(pos);
            break;
          }
        }
      }
    }

    typed = value;
    input.value = value;
    repaint(before, typed);
    scrollToCaret();

    if (hadError) Sound.error();
    else if (typed.length > before.length) Sound.key();

    onChange();
  }

  function flash(index) {
    const element = chars[index];
    if (!element) return;
    element.classList.add('flash');
    setTimeout(() => element.classList.remove('flash'), 180);
  }

  function classFor(index) {
    let name = target[index] === ' ' ? 'c sp' : 'c';
    if (index < typed.length) name += typed[index] === target[index] ? ' ok' : ' bad';
    else if (index === typed.length) name += ' cur';
    return name;
  }

  function repaint(before, after) {
    let from = 0;
    while (from < before.length && from < after.length && before[from] === after[from]) from++;
    const to = Math.min(Math.max(before.length, after.length), chars.length - 1);
    for (let i = from; i <= to; i++) chars[i].className = classFor(i);
  }

  function appendWords(text) {
    const fragment = document.createDocumentFragment();
    (text.match(/\S+ ?/g) || []).forEach(word => {
      const wordEl = document.createElement('span');
      wordEl.className = 'w';
      word.split('').forEach(letter => {
        const charEl = document.createElement('span');
        charEl.textContent = letter;
        charEl.className = letter === ' ' ? 'c sp' : 'c';
        wordEl.appendChild(charEl);
        chars.push(charEl);
      });
      fragment.appendChild(wordEl);
    });
    wordsEl.appendChild(fragment);
  }

  function load(text) {
    target = text;
    typed = '';
    keys = 0;
    wrongKeys = 0;
    chars = [];
    lineIndex = -1;
    input.value = '';
    wordsEl.textContent = '';
    wordsEl.style.transform = '';
    appendWords(text);
    if (chars[0]) chars[0].className = classFor(0);
  }

  function extend(text) {
    const start = chars.length;
    target += text;
    appendWords(text);
    if (typed.length >= start && chars[typed.length]) chars[typed.length].className = classFor(typed.length);
  }

  function clear() {
    target = '';
    typed = '';
    chars = [];
    input.value = '';
    wordsEl.textContent = '';
    wordsEl.style.transform = '';
  }

  // Keeps the current line as the second visible line
  function scrollToCaret() {
    const element = chars[Math.min(typed.length, chars.length - 1)];
    if (!element) return;
    const lineHeight = parseFloat(getComputedStyle(wordsEl).lineHeight);
    const line = Math.round(element.parentElement.offsetTop / lineHeight);
    if (line === lineIndex) return;
    lineIndex = line;
    wordsEl.style.transform = `translateY(${-Math.max(0, line - 1) * lineHeight}px)`;
  }

  function refresh() {
    lineIndex = -1;
    scrollToCaret();
  }

  function focus() {
    input.focus({ preventScroll: true });
  }

  function start() {
    active = true;
    focus();
  }

  function stop() {
    active = false;
    input.blur();
    box.classList.remove('unfocused');
  }

  function snapshot() {
    return { typed, target, keys, wrongKeys };
  }

  function remaining() {
    return target.length - typed.length;
  }

  return { init, load, extend, clear, start, stop, focus, refresh, snapshot, remaining };
})();
