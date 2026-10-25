/* Local visual enhancement; the existing player still owns playback and errors. */
(() => {
  const audio = document.querySelector('#hearAudio');
  const canvas = document.querySelector('#hearWave');
  if (!audio || !canvas) return;
  const paint = canvas.getContext('2d');
  if (!paint) return;
  const elapsed = document.querySelector('#hearElapsed');
  const duration = document.querySelector('#hearDuration');
  const controls = document.querySelector('#hear');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let context, analyser, samples, frame;
  let visible = true;

  const clock = seconds => Number.isFinite(seconds)
    ? Math.floor(seconds / 60) + ':' + String(Math.floor(seconds % 60)).padStart(2, '0')
    : '—';
  const updateTime = () => {
    elapsed.textContent = clock(audio.currentTime);
    duration.textContent = clock(audio.duration);
  };
  const draw = (live = true) => {
    paint.clearRect(0, 0, canvas.width, canvas.height);
    const active = live && analyser && !audio.paused && !audio.ended && !audio.error && visible && !document.hidden && !reduced.matches;
    if (active) analyser.getByteTimeDomainData(samples);
    for (let bar = 0; bar < 40; bar++) {
      let peak = 0;
      if (active) {
        for (let index = bar * 12; index < (bar + 1) * 12; index++) {
          peak = Math.max(peak, Math.abs(samples[index] - 128) / 128);
        }
      }
      const height = 4 + Math.min(1, peak * 2.5) * 76;
      paint.fillStyle = active ? (bar % 3 ? '#55ebd1' : '#a8aeff') : '#7588b0';
      paint.fillRect(bar * 16 + 3, (96 - height) / 2, 6, height);
    }
    if (active) frame = requestAnimationFrame(() => draw());
  };
  const stop = () => {
    cancelAnimationFrame(frame);
    frame = undefined;
    draw(false);
    updateTime();
  };
  const start = async () => {
    if (reduced.matches || !window.AudioContext) return;
    try {
      if (!context) context = new window.AudioContext();
      await context.resume();
      if (context.state !== 'running') return;
      if (!analyser) {
        // Keep the audible path direct; analysis is a separate, silent branch.
        const probe = context.createAnalyser();
        probe.fftSize = 512;
        const source = context.createMediaElementSource(audio);
        source.connect(context.destination);
        source.connect(probe);
        analyser = probe;
        samples = new Uint8Array(analyser.fftSize);
      }
      cancelAnimationFrame(frame);
      draw();
    } catch {
      // Optional analysis must not replace the player's normal failure/retry UI.
    }
  };
  controls.addEventListener('click', event => {
    if (event.target.closest('#hearBtn,.hear__eng,.hear__chip')) void start();
  }, true);
  audio.addEventListener('playing', start);
  for (const event of ['pause', 'ended', 'error', 'emptied']) audio.addEventListener(event, stop);
  for (const event of ['timeupdate', 'loadedmetadata', 'durationchange']) audio.addEventListener(event, updateTime);
  document.addEventListener('visibilitychange', () => document.hidden || audio.paused ? stop() : void start());
  reduced.addEventListener('change', () => reduced.matches || audio.paused ? stop() : void start());
  if (typeof IntersectionObserver !== 'undefined') {
    new IntersectionObserver(entries => {
      visible = entries.some(entry => entry.isIntersecting);
      if (visible && !audio.paused) void start();
      else stop();
    }).observe(canvas);
  }
  draw();
  updateTime();
})();
