const Sound = (() => {
  let context = null;

  function getContext() {
    if (!context) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return null;
      context = new AudioContextClass();
    }
    if (context.state === 'suspended') context.resume();
    return context;
  }

  function beep(frequency, milliseconds, wave, loudness) {
    const volume = Settings.get('volume') / 100;
    if (volume === 0) return;
    const audio = getContext();
    if (!audio) return;

    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    const now = audio.currentTime;
    oscillator.type = wave;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(loudness * volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + milliseconds / 1000);
    oscillator.connect(gain);
    gain.connect(audio.destination);
    oscillator.start(now);
    oscillator.stop(now + milliseconds / 1000);
  }

  return {
    key() {
      if (Settings.get('typingSound')) beep(700 + Math.random() * 120, 35, 'triangle', 0.25);
    },
    error() {
      if (Settings.get('errorSound')) beep(150, 110, 'sawtooth', 0.15);
    },
    count(isLast) {
      if (Settings.get('countdownSound')) beep(isLast ? 880 : 520, isLast ? 280 : 120, 'sine', 0.3);
    },
    done() {
      beep(660, 120, 'sine', 0.3);
      setTimeout(() => beep(880, 200, 'sine', 0.3), 130);
    },
    preview() {
      beep(660, 120, 'sine', 0.3);
    }
  };
})();
