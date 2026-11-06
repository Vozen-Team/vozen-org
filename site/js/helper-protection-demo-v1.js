/* Local simulation only: no messages are sent to Discord. */
(() => {
  document.querySelectorAll('[data-protection-demo]').forEach((demo) => {
    const button = demo.querySelector('button');
    const label = button.querySelector('[data-i18n]');
    const status = demo.querySelector('[role="status"]');
    const count = demo.querySelector('.helper-protection-demo__count');
    const burst = demo.querySelectorAll('[data-packet]').length;
    const copy = (key, fallback) => {
      const locale = document.documentElement.dataset.vozenLocale || document.documentElement.lang.split('-')[0];
      return window.VOZEN_I18N?.[locale]?.[`helper.landing.${key}`] || fallback;
    };
    const render = () => {
      const state = demo.dataset.state;
      const busy = state !== 'ready' && state !== 'blocked';
      button.disabled = busy;
      const key = busy ? 'demoSending' : state === 'blocked' ? 'demoAgain' : 'demoSend';
      label.dataset.i18n = `helper.landing.${key}`;
      label.textContent = copy(key, busy ? 'Sending…' : state === 'blocked' ? 'Send again' : 'Send spam');
      count.textContent = state === 'blocked' ? burst : 0;
      status.textContent = busy ? copy('demoChecking', 'Checking messages…') : state === 'blocked' ? `${copy('demoBlocked', 'Spam blocked')}: ${burst}` : '';
    };
    button.addEventListener('click', () => {
      if (button.disabled) return;
      demo.dataset.state = 'passing-first';
      render();
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.setTimeout(() => { demo.dataset.state = 'passing-second'; }, reduced ? 450 : 700);
      window.setTimeout(() => { demo.dataset.state = 'sending'; }, reduced ? 900 : 1350);
      // Wait for the final packet's flight and fragments before showing the score.
      window.setTimeout(() => { demo.dataset.state = 'blocked'; render(); }, reduced ? 1300 : 2760);
    });
    window.addEventListener('vozen:languagechange', render);
    window.addEventListener('vozen:i18nready', render);
    render();
  });
})();
