/* mini-enigma.js — component 4: a small but historically accurate Enigma I.
   Rotors I, II, III (real wirings and notches), reflector B, ring settings fixed at A-A-A, no plugboard.
   Stepping: the right rotor steps before every letter; when it passes its notch the middle rotor steps;
   when the middle rotor is on its own notch it steps again together with the left rotor (the "double step").
   Test vectors (checked by the presets and by test_ix_a.py):
     rotors I-II-III, rings AAA, start AAA, reflector B, no plugboard: AAAAA -> BDZGO, and BDZGO -> AAAAA.
     start ADU, four key presses: windows ADV, AEW, BFX, BFY (middle rotor steps twice in a row).
   Config: rotors (default ["I","II","III"], left to right), positions (default "AAA"), message (typed at start).
   Contract: SITE_SPEC.md. */
(function () {
  'use strict';
  if (!window.ICT) return;

  var ABC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  var ROTORS = {
    I:   { wiring: 'EKMFLGDQVZNTOWYHXUSPAIBRCJ', notch: 'Q' },
    II:  { wiring: 'AJDKSIRUXBLHWTMCQGZNPYFVOE', notch: 'E' },
    III: { wiring: 'BDFHJLCPRTXVZNYEIWGAKMUSQO', notch: 'V' }
  };
  var REFLECTOR_B = 'YRUHQSLDPXNGOKMIEBFZCWVJAT';
  var ROWS = ['QWERTZUIO', 'ASDFGHJK', 'PYXCVBNML'];

  function mod(n) { return ((n % 26) + 26) % 26; }
  function idx(c) { return c.charCodeAt(0) - 65; }
  // inverse wirings, for the way back after the reflector
  Object.keys(ROTORS).forEach(function (k) {
    var inv = new Array(26), w = ROTORS[k].wiring;
    for (var i = 0; i < 26; i++) inv[idx(w[i])] = ABC[i];
    ROTORS[k].inverse = inv.join('');
  });

  // one rotor, ring setting A: shift in by the position, look up the wiring, shift back out
  function through(map, c, pos) { return mod(idx(map[mod(c + pos)]) - pos); }

  ICT.register('mini-enigma', function (root, config, api) {
    config = config || {};
    var el = api.el;
    function cleanRotors(r) {
      if (!Array.isArray(r) || r.length !== 3) return ['I', 'II', 'III'];
      var ok = r.every(function (x) { return ROTORS[x]; });
      return ok ? r.slice() : ['I', 'II', 'III'];
    }
    function cleanPos(p) { p = String(p || '').toUpperCase(); return /^[A-Z]{3}$/.test(p) ? p : 'AAA'; }
    var cfgRotors = cleanRotors(config.rotors), cfgPos = cleanPos(config.positions);
    var cfgMsg = typeof config.message === 'string' ? config.message.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 60) : '';

    var order = cfgRotors.slice();       // left, middle, right
    var start = cfgPos;                  // positions to go back to with "Reset positions"
    var pos = [0, 0, 0];                 // current window letters as numbers
    var tapeIn = '', tapeOut = '', selfCount = 0;

    var wrap = el('div', { 'class': 'ix-mini-enigma' });
    root.appendChild(wrap);
    wrap.appendChild(el('p', { 'class': 'ixa-instr', text: 'Set the three rotors, then type. Each key lights one lamp: the secret letter.' }));

    // ---- rotors: choose, window, up/down ----
    var rotorBox = el('div', { 'class': 'ixa-rotors', role: 'group', 'aria-label': 'Rotors' });
    var windows = [], selects = [];
    ['Left', 'Middle', 'Right'].forEach(function (name, i) {
      var sel = el('select', { 'class': 'ixa-select', 'aria-label': name + ' rotor type', onchange: function () { order[i] = sel.value; clearTapes(); render(); say(name + ' rotor is now rotor ' + sel.value + '.'); } },
        ['I', 'II', 'III'].map(function (k) { return el('option', { value: k, text: k }); }));
      var w = el('span', { 'class': 'ixa-window ixa-mono', 'aria-live': 'off' });
      windows.push(w); selects.push(sel);
      rotorBox.appendChild(el('div', { 'class': 'ixa-rotor' }, [
        el('span', { 'class': 'ixa-rname', text: name }),
        sel,
        el('button', { type: 'button', 'class': 'ixa-btn ixa-sm', 'aria-label': name + ' rotor up', text: '▲︎', onclick: function () { turn(i, 1); } }),
        w,
        el('button', { type: 'button', 'class': 'ixa-btn ixa-sm', 'aria-label': name + ' rotor down', text: '▼︎', onclick: function () { turn(i, -1); } })
      ]));
    });
    wrap.appendChild(rotorBox);
    wrap.appendChild(el('p', { 'class': 'ixa-note', text: 'Reflector B. Ring settings fixed at A-A-A. The real machine also had a plugboard; ours does not.' }));

    // ---- lampboard and keyboard (QWERTZ, as on the real Enigma) ----
    var lamps = {}, keys = {};
    var lampBoard = el('div', { 'class': 'ixa-lampboard', 'aria-hidden': 'true' });
    var keyBoard = el('div', { 'class': 'ixa-keyboard', role: 'group', 'aria-label': 'Keyboard' });
    ROWS.forEach(function (r) {
      var lr = el('div', { 'class': 'ixa-krow' }), kr = el('div', { 'class': 'ixa-krow' });
      r.split('').forEach(function (c) {
        lamps[c] = el('span', { 'class': 'ixa-lamp', text: c });
        keys[c] = el('button', { type: 'button', 'class': 'ixa-key', text: c, 'aria-label': 'Key ' + c, onclick: function () { press(c); } });
        lr.appendChild(lamps[c]); kr.appendChild(keys[c]);
      });
      lampBoard.appendChild(lr); keyBoard.appendChild(kr);
    });
    wrap.appendChild(el('p', { 'class': 'ixa-sub', text: 'Lamps' }));
    wrap.appendChild(lampBoard);
    wrap.appendChild(el('p', { 'class': 'ixa-sub', text: 'Keys (you can also type on your keyboard)' }));
    wrap.appendChild(keyBoard);

    // ---- tapes ----
    var inOut = el('span', { 'class': 'ixa-mono ixa-tape' });
    var outOut = el('span', { 'class': 'ixa-mono ixa-tape ixa-tape-out' });
    var tapes = el('div', { 'class': 'ixa-tapes', tabindex: '0', 'aria-label': 'Tapes. Click here and type letters.' }, [
      el('div', {}, [el('span', { 'class': 'ixa-k', text: 'Typed' }), inOut]),
      el('div', {}, [el('span', { 'class': 'ixa-k', text: 'Lamps lit' }), outOut])
    ]);
    wrap.appendChild(tapes);
    wrap.appendChild(el('div', { 'class': 'ixa-bar' }, [
      el('button', { type: 'button', 'class': 'ixa-btn ixa-primary', text: 'Reset positions', onclick: function () { resetPositions(); say('Rotors back to ' + start + '. Tapes cleared.'); } }),
      el('button', { type: 'button', 'class': 'ixa-btn', text: 'Type AAAAAAAAAA', onclick: function () { flawDemo(); } })
    ]));

    // ---- the flaw ----
    var flawLine = el('p', { 'class': 'ixa-flaw-count' });
    wrap.appendChild(el('div', { 'class': 'ixa-panel ixa-flaw' }, [
      el('p', { 'class': 'ixa-sub', text: 'The flaw' }),
      el('p', { text: 'Enigma never turns a letter into itself. A is never A. This helped the codebreakers at Bletchley Park: they could rule out many guesses.' }),
      flawLine
    ]));
    var say = api.live(wrap);

    // physical keyboard: works when focus is anywhere inside the component (not in the selects)
    wrap.addEventListener('keydown', function (e) {
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      var t = e.target && e.target.tagName;
      if (t === 'SELECT' || t === 'INPUT' || t === 'TEXTAREA') return;
      var k = (e.key || '').toUpperCase();
      if (k.length === 1 && k >= 'A' && k <= 'Z') { e.preventDefault(); press(k); }
    });

    function windowsText() { return pos.map(function (p) { return ABC[p]; }).join(''); }

    function render() {
      for (var i = 0; i < 3; i++) { windows[i].textContent = ABC[pos[i]]; selects[i].value = order[i]; }
      inOut.textContent = group5(tapeIn) || ' ';
      outOut.textContent = group5(tapeOut) || ' ';
      flawLine.textContent = 'So far: ' + tapeIn.length + ' letters typed, ' + selfCount + ' encrypted to themselves — it can never happen.';
    }
    function group5(s) { return s.replace(/(.{5})(?=.)/g, '$1 '); }

    function turn(i, d) { pos[i] = mod(pos[i] + d); render(); say(['Left', 'Middle', 'Right'][i] + ' rotor: ' + ABC[pos[i]] + '. Windows: ' + windowsText() + '.'); }

    // step the rotors (before the letter is encrypted, like the real machine)
    function stepRotors() {
      var M = ROTORS[order[1]], R = ROTORS[order[2]];
      if (ABC[pos[1]] === M.notch) { pos[1] = mod(pos[1] + 1); pos[0] = mod(pos[0] + 1); }  // double step
      else if (ABC[pos[2]] === R.notch) pos[1] = mod(pos[1] + 1);
      pos[2] = mod(pos[2] + 1);
    }

    function encrypt(c) {
      var x = idx(c);
      for (var i = 2; i >= 0; i--) x = through(ROTORS[order[i]].wiring, x, pos[i]);   // right -> left
      x = idx(REFLECTOR_B[x]);
      for (i = 0; i <= 2; i++) x = through(ROTORS[order[i]].inverse, x, pos[i]);       // left -> right
      return ABC[x];
    }

    var lit = null;
    function press(c, quiet) {
      c = String(c).toUpperCase();
      if (!/^[A-Z]$/.test(c)) return '';
      if (tapeIn.length >= 200) { tapeIn = ''; tapeOut = ''; }
      stepRotors();
      var o = encrypt(c);
      tapeIn += c; tapeOut += o;
      if (o === c) selfCount++;          // stays 0: the reflector makes this impossible
      if (lit) lit.classList.remove('is-lit');
      lit = lamps[o]; lit.classList.add('is-lit');
      render();
      if (!quiet) say(c + ' → ' + o + '. Windows now ' + windowsText() + '.');
      return o;
    }

    function typeText(s) { var r = ''; String(s).toUpperCase().replace(/[A-Z]/g, function (c) { r += press(c, true); return c; }); render(); return r; }

    function clearTapes() {
      tapeIn = ''; tapeOut = ''; selfCount = 0;
      if (lit) { lit.classList.remove('is-lit'); lit = null; }
    }
    function setPositions(p) { for (var i = 0; i < 3; i++) pos[i] = idx(p[i]); }
    function resetPositions() { setPositions(start); clearTapes(); render(); }

    function flawDemo() {
      resetPositions();
      var out = typeText('AAAAAAAAAA');
      say('AAAAAAAAAA became ' + out + '. Look: no A in the output!', out.indexOf('A') < 0 ? 'ok' : 'bad');
      return out;
    }

    function useStandard(p) { order = ['I', 'II', 'III']; start = p; resetPositions(); }

    function reset() {
      order = cfgRotors.slice(); start = cfgPos; resetPositions();
      if (cfgMsg) { var o = typeText(cfgMsg); say(cfgMsg + ' became ' + o + '.'); }
      else say('Rotors ' + order.join('-') + ' at ' + start + '. Type a letter.');
    }
    reset();

    return {
      presets: [
        { name: 'AAAAA → BDZGO', run: function () {
          useStandard('AAA'); var o = typeText('AAAAA');
          say('Rotors I-II-III from AAA: AAAAA became ' + o + (o === 'BDZGO' ? '. This matches the real Enigma.' : '.'), o === 'BDZGO' ? 'ok' : 'bad'); } },
        { name: 'decrypt back: BDZGO → AAAAA', run: function () {
          useStandard('AAA'); var o = typeText('BDZGO');
          say('Same start (AAA), type BDZGO: you get ' + o + '. Enigma decrypts with the same settings.', o === 'AAAAA' ? 'ok' : 'bad'); } },
        { name: 'double step demo (ADU)', run: function () {
          useStandard('ADU'); var seen = [];
          for (var i = 0; i < 4; i++) { press('A', true); seen.push(windowsText()); }
          render();
          say('Start ADU. Windows: ' + seen.join(' → ') + '. The middle rotor stepped twice in a row (D→E→F): the double step.', seen.join(' ') === 'ADV AEW BFX BFY' ? 'ok' : 'bad'); } },
        { name: 'the flaw: AAAAAAAAAA', run: function () { flawDemo(); } }
      ],
      reset: reset,
      windows: windowsText
    };
  });
})();
