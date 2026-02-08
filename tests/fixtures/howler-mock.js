// Minimal Howler.js mock for integration tests.
// Provides just enough API surface for logic.js to function without real audio.
// Uses Promise.resolve().then() (microtasks) instead of setTimeout (macrotasks)
// so that events fire even when Playwright's page.clock has frozen timers.

window.Howl = class Howl {
  constructor(options) {
    this._callbacks = {};
    // Fire "load" event on next microtask (after caller attaches .once("load", ...))
    Promise.resolve().then(() => this._fire("load"));
  }

  play(sprite) {
    // Fire "end" event on next microtask
    Promise.resolve().then(() => this._fire("end"));
    return 1;
  }

  once(event, fn) {
    if (!this._callbacks[event]) this._callbacks[event] = [];
    this._callbacks[event].push({ fn, once: true });
  }

  on(event, fn) {
    if (!this._callbacks[event]) this._callbacks[event] = [];
    this._callbacks[event].push({ fn, once: false });
  }

  volume() {}
  mute() {}

  _fire(event) {
    const cbs = this._callbacks[event] || [];
    this._callbacks[event] = cbs.filter(cb => {
      cb.fn();
      return !cb.once;
    });
  }
};

window.Howler = {
  volume() {}
};
