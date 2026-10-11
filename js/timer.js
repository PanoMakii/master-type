const Timer = (() => {
  const STEPS = ['3', '2', '1', 'START'];

  // Shows 3, 2, 1, START. Returns an object with cancel().
  function countdown({ onStep, onDone }) {
    let index = 0;
    let id = null;

    function next() {
      onStep(STEPS[index], index);
      if (index === STEPS.length - 1) {
        id = setTimeout(onDone, 600);
      } else {
        index++;
        id = setTimeout(next, 800);
      }
    }

    next();
    return { cancel: () => clearTimeout(id) };
  }

  // duration of 0 means no limit (counts up only)
  function createClock({ duration, onTick, onEnd }) {
    let startedAt = 0;
    let endedAt = 0;
    let id = null;

    function elapsed() {
      if (!startedAt) return 0;
      return ((endedAt || performance.now()) - startedAt) / 1000;
    }

    function stop() {
      clearInterval(id);
      id = null;
      if (!endedAt) endedAt = performance.now();
    }

    function tick() {
      const seconds = elapsed();
      if (duration && seconds >= duration) {
        stop();
        endedAt = startedAt + duration * 1000;
        onTick(duration);
        onEnd();
        return;
      }
      onTick(seconds);
    }

    function start() {
      startedAt = performance.now();
      id = setInterval(tick, 100);
    }

    return { start, stop, elapsed };
  }

  return { countdown, createClock };
})();
