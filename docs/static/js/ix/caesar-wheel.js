/* caesar-wheel.js — component 3: a Caesar cipher wheel.
   Outer ring = plain letters A–Z, inner ring = cipher letters. Turn the inner ring to choose the shift.
   Encode/decode a message; brute-force challenge: try all 25 shifts and pick the readable one.
   Config: shift (default 3), message (default "ENIGMA"), challenge (ciphertext, default "WKLV LV QRW HQLJPD").
   Contract: SITE_SPEC.md. */
(function () {
  'use strict';
  if (!window.ICT) return;

  var ABC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  // English letter frequencies (%), used to guess which brute-force line is readable.
  var FREQ = [8.2, 1.5, 2.8, 4.3, 12.7, 2.2, 2.0, 6.1, 7.0, 0.15, 0.77, 4.0, 2.4, 6.7, 7.5, 1.9, 0.095, 6.0, 6.3, 9.1, 2.8, 0.98, 2.4, 0.15, 2.0, 0.074];
  var COMMON = ['THE', 'IS', 'NOT', 'AND', 'TO', 'OF', 'A', 'IN', 'IT', 'YOU', 'THIS', 'WE', 'ARE', 'ATTACK', 'AT', 'DAWN'];

  function mod(n, m) { return ((n % m) + m) % m; }
  function shiftText(text, s) {
    return String(text).toUpperCase().replace(/[A-Z]/g, function (c) { return ABC[mod(c.charCodeAt(0) - 65 + s, 26)]; });
  }
  function englishScore(text) {  // lower = more like English
    var counts = new Array(26).fill(0), n = 0;
    text.replace(/[A-Z]/g, function (c) { counts[c.charCodeAt(0) - 65]++; n++; return c; });
    if (!n) return 1e9;
    var chi = 0;
    for (var i = 0; i < 26; i++) { var e = FREQ[i] * n / 100; chi += (counts[i] - e) * (counts[i] - e) / e; }
    text.split(/[^A-Z]+/).forEach(function (w) { if (COMMON.indexOf(w) >= 0) chi -= 40; });
    return chi;
  }

  ICT.register('caesar-wheel', function (root, config, api) {
    config = config || {};
    var el = api.el, svg = api.svg;
    var startShift = parseInt(config.shift, 10); startShift = isNaN(startShift) ? 3 : mod(startShift, 26);
    var startMsg = typeof config.message === 'string' && config.message ? config.message : 'ENIGMA';
    var challenge = (typeof config.challenge === 'string' && /[A-Za-z]/.test(config.challenge) ? config.challenge : 'WKLV LV QRW HQLJPD').toUpperCase();
    var shift = startShift, turn = startShift;   // turn = unbounded, so the ring never spins the long way round
    var step = 360 / 26, C = 150;

    var wrap = el('div', { 'class': 'ix-caesar-wheel' });
    root.appendChild(wrap);
    wrap.appendChild(el('p', { 'class': 'ixa-instr', text: 'Turn the inner ring. Each outer letter becomes the inner letter below it.' }));

    // ---- the wheel (SVG) ----
    function ring(r1, r2, cls) {
      return [svg('circle', { cx: C, cy: C, r: r1, 'class': cls }), svg('circle', { cx: C, cy: C, r: r2, 'class': 'ixa-hole' })];
    }
    var outer = svg('g', {}, ring(146, 112, 'ixa-ring-out'));
    var inner = svg('g', { 'class': 'ixa-inner' }, ring(110, 76, 'ixa-ring-in'));
    for (var i = 0; i < 26; i++) {
      var a = i * step;
      outer.appendChild(svg('text', { x: C, y: C - 129, transform: 'rotate(' + a + ' ' + C + ' ' + C + ')', 'class': 'ixa-l-out', text: ABC[i] }));
      outer.appendChild(svg('line', { x1: C, y1: C - 146, x2: C, y2: C - 112, transform: 'rotate(' + (a + step / 2) + ' ' + C + ' ' + C + ')', 'class': 'ixa-tick' }));
      inner.appendChild(svg('text', { x: C, y: C - 93, transform: 'rotate(' + a + ' ' + C + ' ' + C + ')', 'class': 'ixa-l-in', text: ABC[i] }));
      inner.appendChild(svg('line', { x1: C, y1: C - 110, x2: C, y2: C - 76, transform: 'rotate(' + (a + step / 2) + ' ' + C + ' ' + C + ')', 'class': 'ixa-tick' }));
    }
    // yellow window at the top: shows the pair A -> ?
    var win = svg('path', { d: 'M' + (C - 15) + ' 3 L' + (C + 15) + ' 3 L' + (C + 11) + ' 75 L' + (C - 11) + ' 75 Z', 'class': 'ixa-window' });
    var centre = svg('text', { x: C, y: C + 6, 'class': 'ixa-centre' });
    var centre2 = svg('text', { x: C, y: C + 28, 'class': 'ixa-centre-s', text: 'shift' });
    var wheel = svg('svg', { viewBox: '0 0 300 300', 'class': 'ixa-wheel', tabindex: '0', role: 'slider',
      'aria-label': 'Inner ring. Use the arrow keys to turn it.', 'aria-valuemin': '0', 'aria-valuemax': '25' }, [outer, inner, win, centre, centre2]);
    wheel.addEventListener('keydown', function (e) {
      var k = e.key;
      if (k === 'ArrowRight' || k === 'ArrowUp') { e.preventDefault(); turnBy(1); }
      else if (k === 'ArrowLeft' || k === 'ArrowDown') { e.preventDefault(); turnBy(-1); }
    });

    var shiftOut = el('p', { 'class': 'ixa-shift ixa-mono' });
    var controls = el('div', { 'class': 'ixa-bar ixa-center' }, [
      el('button', { type: 'button', 'class': 'ixa-btn', 'aria-label': 'Turn left (shift minus 1)', text: '◀︎', onclick: function () { turnBy(-1); } }),
      shiftOut,
      el('button', { type: 'button', 'class': 'ixa-btn', 'aria-label': 'Turn right (shift plus 1)', text: '▶︎', onclick: function () { turnBy(1); } })
    ]);
    wrap.appendChild(el('div', { 'class': 'ixa-wheel-box' }, [wheel, controls]));

    // ---- encode / decode ----
    var uid = 'ixa-cw-' + Math.random().toString(36).slice(2, 8);
    var msg = el('input', { id: uid, type: 'text', 'class': 'ixa-input ixa-mono', maxlength: '60', autocomplete: 'off', spellcheck: 'false' });
    var out = el('p', { 'class': 'ixa-result ixa-mono' });
    wrap.appendChild(el('div', { 'class': 'ixa-field' }, [el('label', { 'for': uid, 'class': 'ixa-label', text: 'Message' }), msg]));
    wrap.appendChild(el('div', { 'class': 'ixa-bar' }, [
      el('button', { type: 'button', 'class': 'ixa-btn ixa-primary', text: 'Encode', onclick: function () { encode(); } }),
      el('button', { type: 'button', 'class': 'ixa-btn', text: 'Decode', onclick: function () { decode(); } })
    ]));
    wrap.appendChild(out);

    // ---- brute force ----
    var list = el('ol', { 'class': 'ixa-brute', hidden: true });
    wrap.appendChild(el('div', { 'class': 'ixa-panel' }, [
      el('p', { 'class': 'ixa-sub', text: 'Challenge: crack this secret message.' }),
      el('p', { 'class': 'ixa-mono ixa-cipher', text: challenge }),
      el('p', { 'class': 'ixa-note', text: 'There are only 25 possible shifts. A computer can try them all at once. Can you find the readable one?' }),
      el('button', { type: 'button', 'class': 'ixa-btn ixa-primary', text: 'Try all 25 shifts', onclick: function () { brute(); } }),
      list
    ]));
    var say = api.live(wrap);

    // best guess of the right key (the readable line), from letter frequencies and common words
    var bestKey = 1, bestScore = 1e12;
    for (var s = 1; s < 26; s++) { var sc = englishScore(shiftText(challenge, -s)); if (sc < bestScore) { bestScore = sc; bestKey = s; } }

    function render() {
      inner.style.transform = 'rotate(' + (-turn * step) + 'deg)';
      centre.textContent = String(shift);
      shiftOut.textContent = 'Shift ' + shift + ': A → ' + ABC[shift];
      wheel.setAttribute('aria-valuenow', String(shift));
      wheel.setAttribute('aria-valuetext', 'Shift ' + shift + ': A becomes ' + ABC[shift]);
    }
    function setShift(s) { turn += mod(s - shift + 13, 26) - 13; shift = mod(s, 26); render(); }
    function turnBy(d) { turn += d; shift = mod(shift + d, 26); render(); say('Shift ' + shift + '. A becomes ' + ABC[shift] + ', B becomes ' + ABC[(shift + 1) % 26] + '.'); }

    function encode() {
      var r = shiftText(msg.value, shift);
      out.textContent = 'Secret: ' + r;
      say('Encoded with shift ' + shift + ': ' + r);
      return r;
    }
    function decode() {
      var r = shiftText(msg.value, -shift);
      out.textContent = 'Plain: ' + r;
      say('Decoded with shift ' + shift + ': ' + r);
      return r;
    }

    function brute() {
      list.textContent = '';
      list.hidden = false;
      for (var s = 1; s < 26; s++) {
        (function (s) {
          var plain = shiftText(challenge, -s);
          var b = el('button', { type: 'button', 'class': 'ixa-pick', 'aria-pressed': 'false',
            onclick: function () { pick(s, b); } }, [el('span', { 'class': 'ixa-k', text: 'shift ' + s }), el('span', { 'class': 'ixa-mono', text: plain })]);
          list.appendChild(el('li', {}, [b]));
        })(s);
      }
      say('Here are all 25 shifts. Click the line you can read.');
    }

    function pick(s, b) {
      var btns = list.querySelectorAll('.ixa-pick');
      for (var i = 0; i < btns.length; i++) { btns[i].setAttribute('aria-pressed', 'false'); btns[i].classList.remove('is-ok', 'is-bad'); }
      b.setAttribute('aria-pressed', 'true');
      if (s === bestKey) {
        b.classList.add('is-ok');
        setShift(s);
        say('Correct! The key is shift ' + s + ': "' + shiftText(challenge, -s) + '". Brute force works because there are so few keys.', 'ok');
        return true;
      }
      b.classList.add('is-bad');
      say('Not quite: shift ' + s + ' gives nonsense. Look for real English words.', 'bad');
      return false;
    }

    function reset() {
      setShift(startShift);
      msg.value = startMsg.toUpperCase();
      out.textContent = '';
      list.textContent = ''; list.hidden = true;
      say('Shift ' + shift + '. Type a message and press Encode.');
    }
    reset();

    return {
      presets: [
        { name: 'shift 3 encode ENIGMA', run: function () { setShift(3); msg.value = 'ENIGMA'; encode(); } },
        { name: 'brute force', run: function () { brute(); var b = list.querySelectorAll('.ixa-pick')[bestKey - 1]; if (b) pick(bestKey, b); } },
        { name: 'decode WKLV', run: function () { setShift(3); msg.value = 'WKLV LV QRW HQLJPD'; decode(); } }
      ],
      reset: reset
    };
  });
})();
