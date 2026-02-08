// Loads logic.js into a sandboxed vm context with minimal browser stubs.
// Returns the context object with all the global functions/variables exposed.
import { readFileSync } from 'fs';
import { createContext, runInContext } from 'vm';

function makeElement() {
  const el = {
    style: { overflow: '', cssText: '', webkitAnimationPlayState: '', animationPlayState: '' },
    appendChild: () => el,
    removeChild: () => el,
    parentNode: null,
    childNodes: [],
    cloneNode: () => makeElement(),
    setAttribute: () => {},
    getAttribute: () => null,
    getElementsByTagName: () => [],
    offsetTop: 0,
    offsetHeight: 0,
    id: '',
    fake: false,
    textContent: '',
    addEventListener: () => {},
    replaceChild: () => {},
    insertBefore: () => {},
  };
  el.parentNode = el;
  return el;
}

export function loadLogic() {
  const code = readFileSync('app/js/logic.js', 'utf-8');

  const docElement = makeElement();
  docElement.nodeName = 'HTML';

  const ctx = createContext({
    // Standard builtins
    console,
    Math,
    Date,
    JSON,
    parseInt,
    Set,
    setTimeout: () => 0,
    setInterval: () => 0,
    clearInterval: () => {},
    encodeURIComponent,
    Promise,
    Boolean,
    Object,

    // Howler stubs
    Howl: class {
      constructor() {}
      play() { return 1; }
      once() {}
      on() {}
      volume() {}
    },
    Howler: { volume() {} },

    // Minimal DOM stubs — just enough for Modernizr and the module-level code
    navigator: {},
    localStorage: { getItem: () => null, setItem: () => {} },
    window: null, // set below
    document: {
      createElement: () => makeElement(),
      createElementNS: () => makeElement(),
      createTextNode: () => ({}),
      documentElement: docElement,
      getElementsByTagName: () => [makeElement()],
      body: null,
      getElementById: () => {
        const el = makeElement();
        el.contentWindow = {
          location: { href: '', replace: () => {} },
          document: {
            readyState: 'complete',
            getElementById: () => makeElement(),
            getElementsByClassName: () => [],
          },
          addEventListener: () => {},
        };
        el.onload = null;
        return el;
      },
    },
  });

  // window must reference the context itself so that `window.X = ...` works
  ctx.window = ctx;
  // logic.js calls window.addEventListener("load", ...) and window.onpopstate = ...
  ctx.addEventListener = () => {};
  ctx.history = { pushState: () => {}, replaceState: () => {} };

  runInContext(code, ctx);
  return ctx;
}
