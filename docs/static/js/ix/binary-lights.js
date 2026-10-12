/* binary-lights.js — component 1: eight bulbs 128 … 1. Click a bulb to switch it on or off.
   Shows the binary string, the sum ("64 + 1 = 65") and the ASCII character (32–126).
   Config: challenge (int 0–255), bits (1–8, default 8). Contract: SITE_SPEC.md. */
(function () {
  'use strict';
  if (!window.ICT) return;

  ICT.register('binary-lights', function (root, config, api) {
    config = config || {};
    var el = api.el, svg = api.svg;
    var bits = parseInt(config.bits, 10);
    if (!(bits >= 1 && bits <= 8)) bits = 8;
    var max = Math.pow(2, bits) - 1;
    var startTarget = parseInt(config.challenge, 10);
    var hasStartTarget = startTarget >= 0 && startTarget <= max;

    var on = [];          // on[i] = true when bulb i is lit (i = 0 is the left bulb, biggest value)
    var target = null;    // current challenge target, or null
    var solved = false;
    var bulbs = [];

    function valueOf(i) { return Math.pow(2, bits - 1 - i); }

    var wrap = el('div', { 'class': 'ix-binary-lights' });
    root.appendChild(wrap);
    wrap.appendChild(el('p', { 'class': 'ixa-instr', text: 'Click a bulb to switch it on or off. Each lit bulb adds its number.' }));

    var targetLine = el('p', { 'class': 'ixa-target', hidden: true });
    wrap.appendChild(targetLine);

    // The bulbs: real buttons with aria-pressed; the drawing is an SVG inside.
    var row = el('div', { 'class': 'ixa-bulbs', role: 'group', 'aria-label': 'Light bulbs' });
    for (var i = 0; i < bits; i++) {
      (function (i) {
        var pic = svg('svg', { viewBox: '0 0 40 52', 'aria-hidden': 'true', focusable: 'false', 'class': 'ixa-bulb-pic' }, [
          svg('circle', { cx: 20, cy: 20, r: 15, 'class': 'ixa-glass' }),
          svg('path', { d: 'M14 22 L17 28 L20 22 L23 28 L26 22', 'class': 'ixa-filament' }),
          svg('rect', { x: 13, y: 36, width: 14, height: 10, rx: 2, 'class': 'ixa-base' }),
          svg('line', { x1: 13, y1: 40, x2: 27, y2: 40, 'class': 'ixa-thread' }),
          svg('line', { x1: 13, y1: 43, x2: 27, y2: 43, 'class': 'ixa-thread' })
        ]);
        var b = el('button', { type: 'button', 'class': 'ixa-bulb', 'aria-pressed': 'false',
          onclick: function () { toggle(i); } }, [pic, el('span', { 'class': 'ixa-val', text: String(valueOf(i)) })]);
        bulbs.push(b);
        row.appendChild(b);
      })(i);
    }
    wrap.appendChild(row);

    // Read-outs
    var outBin = el('span', { 'class': 'ixa-mono ixa-big' });
    var outSum = el('span', { 'class': 'ixa-mono' });
    var outChr = el('span', { 'class': 'ixa-mono' });
    wrap.appendChild(el('dl', { 'class': 'ixa-readout' }, [
      el('div', {}, [el('dt', { text: 'Binary' }), el('dd', {}, [outBin])]),
      el('div', {}, [el('dt', { text: 'Decimal' }), el('dd', {}, [outSum])]),
      el('div', {}, [el('dt', { text: 'ASCII letter' }), el('dd', {}, [outChr])])
    ]));

    var bar = el('div', { 'class': 'ixa-bar' }, [
      el('button', { type: 'button', 'class': 'ixa-btn', text: 'New challenge', onclick: function () { newChallenge(); } }),
      el('button', { type: 'button', 'class': 'ixa-btn', text: 'All off', onclick: function () { setValue(0); say('All bulbs are off. The number is 0.'); } })
    ]);
    wrap.appendChild(bar);
    var say = api.live(wrap);

    function value() {
      var v = 0;
      for (var i = 0; i < bits; i++) if (on[i]) v += valueOf(i);
      return v;
    }

    function render() {
      var parts = [], s = '';
      for (var i = 0; i < bits; i++) {
        s += on[i] ? '1' : '0';
        if (on[i]) parts.push(valueOf(i));
        bulbs[i].setAttribute('aria-pressed', on[i] ? 'true' : 'false');
        bulbs[i].setAttribute('aria-label', 'Bulb ' + valueOf(i) + (on[i] ? ', on' : ', off'));
      }
      var v = value();
      outBin.textContent = s;
      outSum.textContent = parts.length > 1 ? parts.join(' + ') + ' = ' + v : String(v);
      if (v >= 32 && v <= 126) outChr.textContent = v === 32 ? '(space)' : '"' + String.fromCharCode(v) + '"';
      else outChr.textContent = '(none: only 32 to 126 are letters and signs)';
      if (target !== null) {
        targetLine.hidden = false;
        targetLine.textContent = 'Challenge: make ' + target + (solved ? ' — done!' : '');
      } else targetLine.hidden = true;
    }

    function check() {
      if (target === null) return false;
      if (value() === target && !solved) {
        solved = true;
        render();
        say('Yes! ' + outBin.textContent + ' = ' + target + '. Well done!', 'ok');
        return true;
      }
      return false;
    }

    function toggle(i) {
      on[i] = !on[i];
      render();
      if (!check()) say('Bulb ' + valueOf(i) + ' is ' + (on[i] ? 'on' : 'off') + '. The number is ' + value() + '.');
    }

    function setValue(v) {
      for (var i = 0; i < bits; i++) on[i] = (v & valueOf(i)) !== 0;
      render();
      return check();
    }

    function setChallenge(t) {
      target = t; solved = false;
      render();
      say('New challenge: make ' + t + '. Which bulbs do you need?');
    }

    function newChallenge() {
      var t;
      do { t = 1 + Math.floor(Math.random() * max); } while (t === value() && max > 1);
      setChallenge(t);
    }

    function reset() {
      setValue(0);
      target = hasStartTarget ? startTarget : null;
      solved = false;
      render();
      say(target !== null ? 'Make ' + target + '. Click the bulbs.' : 'All bulbs are off. The number is 0.');
    }

    reset();

    var makeN = Math.min(65, max);
    return {
      presets: [
        { name: 'make ' + makeN, run: function () { setValue(0); setChallenge(makeN); setValue(makeN); } },
        { name: 'all on = ' + max, run: function () { target = null; setValue(max); say('All bulbs are on: ' + outSum.textContent + '.'); } },
        { name: 'clear', run: function () { reset(); } }
      ],
      reset: reset,
      value: value
    };
  });
})();
