/* ascii-codec.js — component 2: text <-> ASCII numbers <-> 8-bit binary.
   Mode 1 "Text to numbers": type text, see each character, its number and its 8 bits.
   Mode 2 "Numbers to text": type numbers (decimal like 72, or 8 bits like 01001000), see the text.
   A token of exactly 8 digits that are all 0 or 1 is read as binary; anything else as decimal.
   Config: text (default "HI"). Contract: SITE_SPEC.md. */
(function () {
  'use strict';
  if (!window.ICT) return;

  function bin8(n) { var s = n.toString(2); while (s.length < 8) s = '0' + s; return s; }
  function okCode(n) { return n >= 32 && n <= 126; }
  function show(ch) { return ch === ' ' ? '(space)' : ch; }

  ICT.register('ascii-codec', function (root, config, api) {
    config = config || {};
    var el = api.el;
    var startText = typeof config.text === 'string' ? config.text : 'HI';
    var mode = 'encode';

    var wrap = el('div', { 'class': 'ix-ascii-codec' });
    root.appendChild(wrap);
    wrap.appendChild(el('p', { 'class': 'ixa-instr', text: 'Type some text to see its ASCII numbers, or switch mode and type numbers to see the text.' }));

    var bEnc = el('button', { type: 'button', 'class': 'ixa-btn ixa-toggle', text: 'Text to numbers', onclick: function () { setMode('encode'); } });
    var bDec = el('button', { type: 'button', 'class': 'ixa-btn ixa-toggle', text: 'Numbers to text', onclick: function () { setMode('decode'); } });
    wrap.appendChild(el('div', { 'class': 'ixa-bar', role: 'group', 'aria-label': 'Mode' }, [bEnc, bDec]));

    var uid = 'ixa-ac-' + Math.random().toString(36).slice(2, 8);
    var label = el('label', { 'for': uid, 'class': 'ixa-label' });
    var input = el('input', { id: uid, type: 'text', 'class': 'ixa-input ixa-mono', autocomplete: 'off', spellcheck: 'false',
      oninput: function () { update(); } });
    wrap.appendChild(el('div', { 'class': 'ixa-field' }, [label, input]));

    var result = el('p', { 'class': 'ixa-result' });
    wrap.appendChild(result);

    var tbody = el('tbody');
    var table = el('table', { 'class': 'ixa-table' }, [
      el('thead', {}, [el('tr', {}, [el('th', { scope: 'col', text: 'Character' }), el('th', { scope: 'col', text: 'Number' }), el('th', { scope: 'col', text: 'Binary (8 bits)' })])]),
      tbody
    ]);
    wrap.appendChild(el('div', { 'class': 'ixa-scroll' }, [table]));
    var say = api.live(wrap);

    function row(ch, num, bits, bad) {
      return el('tr', { 'class': bad ? 'is-bad' : null }, [
        el('td', { 'class': 'ixa-mono', text: ch }), el('td', { 'class': 'ixa-mono', text: num }), el('td', { 'class': 'ixa-mono', text: bits })
      ]);
    }

    function encode(text) {
      tbody.textContent = '';
      var bad = 0, chars = Array.from ? Array.from(text) : text.split('');
      chars.slice(0, 40).forEach(function (ch) {
        var n = ch.codePointAt ? ch.codePointAt(0) : ch.charCodeAt(0);
        if (okCode(n)) tbody.appendChild(row(show(ch), String(n), bin8(n), false));
        else { bad++; tbody.appendChild(row(show(ch), String(n), 'not ASCII 32–126', true)); }
      });
      var nums = chars.slice(0, 40).map(function (ch) { return ch.codePointAt ? ch.codePointAt(0) : ch.charCodeAt(0); });
      result.textContent = nums.length ? 'Numbers: ' + nums.join(' ') : 'Numbers: (type something)';
      if (!chars.length) say('Type a letter to see its number.');
      else if (bad) say(bad + (bad === 1 ? ' character is' : ' characters are') + ' not in basic ASCII (32 to 126). Try plain English letters.', 'bad');
      else say(chars.length + (chars.length === 1 ? ' character = ' : ' characters = ') + chars.length * 8 + ' bits.');
      return nums;
    }

    function decode(text) {
      tbody.textContent = '';
      var tokens = text.trim() ? text.trim().split(/[\s,;]+/) : [];
      var out = '', bad = 0;
      tokens.slice(0, 40).forEach(function (t) {
        var n = NaN;
        if (/^[01]{8}$/.test(t)) n = parseInt(t, 2);
        else if (/^\d{1,3}$/.test(t)) n = parseInt(t, 10);
        if (okCode(n)) {
          var ch = String.fromCharCode(n);
          out += ch;
          tbody.appendChild(row(show(ch), String(n), bin8(n), false));
        } else {
          bad++;
          out += '?';
          tbody.appendChild(row('?', t, isNaN(n) ? 'not a number' : 'not ASCII 32–126', true));
        }
      });
      result.textContent = 'Text: ' + (out || '(type numbers)');
      if (!tokens.length) say('Type numbers separated by spaces, like 72 73.');
      else if (bad) say(bad + ' item(s) could not be read. Use numbers 32 to 126, or 8 bits like 01000001.', 'bad');
      else say('The text is "' + out + '".', 'ok');
      return out;
    }

    function update() { return mode === 'encode' ? encode(input.value) : decode(input.value); }

    function setMode(m, value) {
      mode = m;
      bEnc.setAttribute('aria-pressed', m === 'encode' ? 'true' : 'false');
      bDec.setAttribute('aria-pressed', m === 'decode' ? 'true' : 'false');
      label.textContent = m === 'encode' ? 'Your text' : 'Numbers (decimal or 8-bit binary, with spaces)';
      input.setAttribute('maxlength', m === 'encode' ? '40' : '400');
      if (value !== undefined) input.value = value;
      else input.value = m === 'encode' ? startText : '72 73';
      return update();
    }

    function reset() { return setMode('encode', startText); }
    reset();

    return {
      presets: [
        { name: 'HI', run: function () { setMode('encode', 'HI'); } },
        { name: 'decode 72 73', run: function () { setMode('decode', '72 73'); } },
        { name: 'binary 01000001', run: function () { setMode('decode', '01000001'); } }
      ],
      reset: reset
    };
  });
})();
