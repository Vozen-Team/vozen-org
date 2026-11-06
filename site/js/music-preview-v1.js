(() => {
  const get = id => document.getElementById(`music-${id}`);
  const audio = get('audio');
  const play = get('play');
  const deck = audio.closest('.music-deck');
  const hero = deck.closest('.music-hero');
  let heroVisible = true;
  const updateHeroMotion = () => hero.classList.toggle('is-motion-paused', !heroVisible || document.hidden);
  new IntersectionObserver(([entry]) => { heroVisible = entry.isIntersecting; updateHeroMotion(); }).observe(hero);
  document.addEventListener('visibilitychange', updateHeroMotion);
  const progress = get('progress');
  const clock = get('time');
  const error = get('error');
  const feedback = get('feedback');
  const stations = [...document.querySelectorAll('[data-station]')];
  const stationTrack = get('stations-track');
  const stationPrevious = get('stations-previous');
  const stationNext = get('stations-next');
  const stationPadding = 5;
  stationTrack.prepend(...stations.slice(-stationPadding));
  const stationStep = () => stationTrack.children[1].offsetLeft - stationTrack.children[0].offsetLeft;
  const updateStationNavigation = () => {
    const slides = [...stationTrack.children];
    const step = stationStep();
    const gap = step - stations[0].offsetWidth;
    const first = Math.round(stationTrack.scrollLeft / step);
    const visible = Math.max(1, Math.floor((stationTrack.clientWidth + gap + 2) / step));
    const start = stations.indexOf(slides[first]);
    const end = (start + visible - 1) % stations.length + 1;
    const range = visible > 1 ? `${start + 1}–${end}` : `${start + 1}`;
    get('stations-position').textContent = `${range} / ${stations.length}`;
    const center = stationTrack.scrollLeft + stationTrack.clientWidth / 2;
    const cardWidth = stations[0].offsetWidth;
    slides.forEach((station, index) => {
      const distance = Math.min(1, Math.abs(index * step + cardWidth / 2 - center) / (stationTrack.clientWidth / 2));
      station.style.setProperty('--station-scale', (1 - .2 * distance).toFixed(3));
    });
  };
  for (const [button, direction] of [[stationPrevious, -1], [stationNext, 1]]) {
    button.addEventListener('click', () => {
      const step = stationStep();
      stationTrack.scrollTo({ left: (Math.round(stationTrack.scrollLeft / step) + direction) * step });
    });
  }
  stationTrack.addEventListener('scroll', updateStationNavigation, { passive: true });
  stationTrack.addEventListener('scrollend', () => {
    const step = stationStep();
    const shift = Math.round(stationTrack.scrollLeft / step) - stationPadding;
    if (!shift) return;
    const left = stationTrack.scrollLeft - shift * step;
    const slides = [...stationTrack.children];
    if (shift > 0) stationTrack.append(...slides.slice(0, shift));
    else stationTrack.prepend(...slides.slice(shift));
    stationTrack.scrollTo({ left, behavior: 'instant' });
    updateStationNavigation();
  });
  let stationTrackReady = false;
  new ResizeObserver(() => {
    const step = stationStep();
    const index = stationTrackReady ? Math.round(stationTrack.scrollLeft / step) : stationPadding;
    stationTrack.scrollTo({ left: index * step, behavior: 'instant' });
    stationTrackReady = true;
    updateStationNavigation();
  }).observe(stationTrack);
  const stationSection = document.getElementById('stations');
  const rotation = get('stations-rotation');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let rotating = !reducedMotion.matches;
  let rotationTimer;
  const advanceRotation = () => {
    if (!document.hidden && !stationSection.matches(':hover') && !stationSection.contains(document.activeElement) && audio.paused) {
      stationTrack.scrollBy({ left: stationStep() });
    }
    rotationTimer = setTimeout(advanceRotation, 4000);
  };
  const updateRotation = (fromNavigation = false) => {
    clearTimeout(rotationTimer);
    rotation.setAttribute('aria-label', `${rotating ? 'Pause' : 'Start'} automatic station browsing`);
    rotation.firstElementChild.textContent = rotating ? 'Ⅱ' : '▶';
    get('stations-position').setAttribute('aria-live', rotating ? 'off' : 'polite');
    if (rotating) rotationTimer = setTimeout(advanceRotation, fromNavigation ? Math.max(0, 4000 - performance.now()) : 4000);
  };
  rotation.addEventListener('click', () => { rotating = !rotating; updateRotation(); });
  reducedMotion.addEventListener('change', () => { rotating = !reducedMotion.matches; updateRotation(); });
  updateRotation(true);
  const likes = new Set();
  let stationIndex = 0;
  let stopped = false;
  let request = 0;
  audio.volume = .5;

  const formatTime = (seconds) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
  const update = () => {
    const playing = !audio.paused && !audio.ended;
    const duration = Number.isFinite(audio.duration) ? audio.duration : 18;
    deck.classList.toggle('is-playing', playing);
    stations.forEach((button, index) => button.classList.toggle('is-playing', playing && index === stationIndex));
    play.setAttribute('aria-label', playing ? 'Pause preview' : 'Play preview');
    progress.value = duration ? audio.currentTime / duration : 0;
    clock.textContent = `${formatTime(audio.currentTime)} / ${formatTime(duration)}`;
    get('state').textContent = playing ? 'Playing' : stopped ? 'Stopped' : audio.ended ? 'Ended' : audio.currentTime ? 'Paused' : 'Ready';
    get('volume').textContent = `${Math.round(audio.volume * 100)}%`;
    get('quieter').disabled = audio.volume === 0;
    get('louder').disabled = audio.volume === 1;
  };
  const start = async () => {
    const attempt = ++request;
    stopped = false;
    feedback.textContent = '';
    error.textContent = '';
    if (audio.error) audio.load();
    try {
      await audio.play();
    } catch (cause) {
      if (attempt === request && cause.name !== 'AbortError') error.textContent = 'Preview unavailable. Press play to try again.';
    }
    update();
  };
  play.addEventListener('click', () => {
    if (audio.paused) void start();
    else {
      ++request;
      audio.pause();
    }
  });
  for (const event of ['play', 'pause', 'ended', 'timeupdate', 'loadedmetadata', 'emptied', 'volumechange']) audio.addEventListener(event, update);

  const selectStation = (index, autoplay) => {
    if (index === stationIndex) {
      if (autoplay && audio.paused) void start();
      return;
    }
    stationIndex = index;
    const button = stations[index];
    ++request;
    const { station, title, artist, source } = button.dataset;
    for (const option of stations) option.setAttribute('aria-pressed', String(option === button));
    get('art').src = `/assets/music/${station}-cover.webp`;
    get('station').textContent = `Vozen ${button.textContent.trim()}`;
    get('track').textContent = title;
    get('artist').textContent = artist;
    get('artist').href = source;
    error.textContent = '';
    feedback.textContent = '';
    stopped = false;
    audio.src = `/assets/music/${station}.mp3`;
    update();
    if (autoplay) void start();
  };
  stations.forEach((button, index) => button.addEventListener('click', () => {
    if (index === stationIndex && !audio.paused) {
      ++request;
      audio.pause();
    } else selectStation(index, true);
  }));
  for (const [id, offset] of [['previous', -1], ['next', 1]]) {
    get(id).addEventListener('click', () => selectStation((stationIndex + offset + stations.length) % stations.length, !audio.paused && !audio.ended));
  }
  for (const [id, step] of [['quieter', -10], ['louder', 10]]) {
    get(id).addEventListener('click', () => {
      audio.volume = Math.min(100, Math.max(0, Math.round(audio.volume * 100) + step)) / 100;
    });
  }
  get('loop').addEventListener('click', (event) => {
    audio.loop = !audio.loop;
    event.currentTarget.setAttribute('aria-pressed', String(audio.loop));
  });
  get('like').addEventListener('click', () => {
    error.textContent = '';
    if (likes.delete(stationIndex)) feedback.textContent = 'Like removed from this preview.';
    else {
      likes.add(stationIndex);
      feedback.textContent = 'Liked in this preview.';
    }
  });
  get('leave').addEventListener('click', () => {
    ++request;
    stopped = true;
    feedback.textContent = '';
    error.textContent = '';
    audio.pause();
    audio.currentTime = 0;
    update();
  });
  update();

  const plans = document.getElementById('plans');
  for (const [attribute, target, state, selected] of [
    ['bill', plans.querySelector('.pricing'), 'is-annual', 'year'],
    ['seats', plans.querySelector('.price-card--pro'), 'is-5', '5'],
  ]) {
    const buttons = plans.querySelectorAll(`button[data-${attribute}]`);
    for (const button of buttons) button.addEventListener('click', () => {
      target.classList.toggle(state, button.dataset[attribute] === selected);
      for (const option of buttons) {
        option.classList.toggle('is-active', option === button);
        option.setAttribute('aria-pressed', String(option === button));
      }
    });
  }
})();
