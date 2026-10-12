/* turing-machine.js — component 6: a tape, a read/write head and a table of rules.
   Machines: "add-one" (binary +1: start on the rightmost digit) and "flip-bits" (start on the leftmost digit).
   The blank symbol is "_" and is shown as an empty cell. Step / Run (speed) / Pause / Reset.
   Config: preset ("add-one" | "flip-bits"), tape (string of 0, 1, _; default "1011"). Contract: SITE_SPEC.md. */
(function () {
  'use strict';
  if (!window.ICT) return;

  var HALT = 'HALT';
  var MACHINES = {
    'add-one': {
      label: 'Add one', start: 'carry', from: 'right',
      about: 'Adds 1 to a binary number. 1 + 1 = 10, so a 1 becomes 0 and the carry moves left.',
      rules: [
        { state: 'carry', read: '1', write: '0', move: 'L', next: 'carry' },
        { state: 'carry', read: '0', write: '1', move: '-', next: HALT },
        { state: 'carry', read: '_', write: '1', move: '-', next: HALT }
      ]
    },
    'flip-bits': {
      label: 'Flip bits', start: 'flip', from: 'left',
      about: 'Changes every 0 into 1 and every 1 into 0, from left to right.',
      rules: [
        { state: 'flip', read: '0', write: '1', move: 'R', next: 'flip' },
        { state: 'flip', read: '1', write: '0', move: 'R', next: 'flip' },
        { state: 'flip', read: '_', write: '_', move: '-', next: HALT }
      ]
    }
  };
  var MOVE_WORD = { L: 'move left', R: 'move right', '-': 'stay' };
  var MAX_STEPS = 500;

  function cleanTape(s) {
    s = String(s === undefined || s === null ? '' : s).replace(/\s/g, '_');
    return /^[01_]{1,24}$/.test(s) ? s : null;
  }

  ICT.register('turing-machine', function (root, config, api) {
    config = config || {};
    var el = api.el;
    var startMachine = MACHINES[config.preset] ? config.preset : 'add-one';
    var startTape = cleanTape(config.tape) || '1011';

    var mKey = startMachine, tapeStr = startTape;
    var tape = {}, head = 0, state = '', steps = 0, halted = false, lastRule = -1, timer = null;

    var wrap = el('div', { 'class': 'ix-turing-machine' });
    root.appendChild(wrap);
    wrap.appendChild(el('p', { 'class': 'ixa-instr', text: 'Press Step to run one rule. The head reads a cell, writes, moves, and changes state.' }));

    // machine choice
    var mBtns = {};
    var mBar = el('div', { 'class': 'ixa-bar', role: 'group', 'aria-label': 'Machine' });
    Object.keys(MACHINES).forEach(function (k) {
      mBtns[k] = el('button', { type: 'button', 'class': 'ixa-btn ixa-toggle', text: MACHINES[k].label, onclick: function () { mKey = k; load(); say('Machine: ' + MACHINES[k].label + '. ' + MACHINES[k].about); } });
      mBar.appendChild(mBtns[k]);
    });
    wrap.appendChild(mBar);
    var about = el('p', { 'class': 'ixa-note' });
    wrap.appendChild(about);

    // tape
    var cells = el('div', { 'class': 'ixa-cells' });
    var tapeView = el('div', { 'class': 'ixa-tape-view', tabindex: '0', role: 'group', 'aria-label': 'Tape' }, [cells]);
    wrap.appendChild(tapeView);

    var stateOut = el('span', { 'class': 'ixa-mono ixa-state' });
    var stepOut = el('span', { 'class': 'ixa-mono' });
    var tapeOut = el('span', { 'class': 'ixa-mono' });
    wrap.appendChild(el('dl', { 'class': 'ixa-readout' }, [
      el('div', {}, [el('dt', { text: 'State' }), el('dd', {}, [stateOut])]),
      el('div', {}, [el('dt', { text: 'Steps' }), el('dd', {}, [stepOut])]),
      el('div', {}, [el('dt', { text: 'Tape now' }), el('dd', {}, [tapeOut])])
    ]));

    // controls
    var bRun = el('button', { type: 'button', 'class': 'ixa-btn ixa-primary', text: 'Run', onclick: function () { run(); } });
    var bPause = el('button', { type: 'button', 'class': 'ixa-btn', text: 'Pause', onclick: function () { pause(); say('Paused.'); } });
    var uid = 'ixa-tm-' + Math.random().toString(36).slice(2, 8);
    var speed = el('input', { id: uid + 's', type: 'range', min: '1', max: '10', value: '3', 'class': 'ixa-range',
      oninput: function () { if (timer) { pause(); run(); } } });
    wrap.appendChild(el('div', { 'class': 'ixa-bar' }, [
      el('button', { type: 'button', 'class': 'ixa-btn ixa-primary', text: 'Step', onclick: function () { pause(); step(); } }),
      bRun, bPause,
      el('button', { type: 'button', 'class': 'ixa-btn', text: 'Reset', onclick: function () { load(); say('Reset. The head is back at the start.'); } }),
      el('label', { 'class': 'ixa-speed', 'for': uid + 's' }, ['Speed ', speed])
    ]));

    // tape input
    var tIn = el('input', { id: uid, type: 'text', 'class': 'ixa-input ixa-mono', maxlength: '24', autocomplete: 'off', spellcheck: 'false' });
    wrap.appendChild(el('div', { 'class': 'ixa-field ixa-inline' }, [
      el('label', { 'for': uid, 'class': 'ixa-label', text: 'Tape (0, 1, _ = blank)' }), tIn,
      el('button', { type: 'button', 'class': 'ixa-btn', text: 'Load tape', onclick: function () { loadTape(); } })
    ]));

    // rules table
    var rulesBody = el('tbody');
    wrap.appendChild(el('div', { 'class': 'ixa-scroll' }, [el('table', { 'class': 'ixa-table ixa-rules' }, [
      el('caption', { text: 'Rules (the highlighted rule is the next one)' }),
      el('thead', {}, [el('tr', {}, ['State', 'Read', 'Write', 'Move', 'Next state'].map(function (h) { return el('th', { scope: 'col', text: h }); }))]),
      rulesBody
    ])]));
    var say = api.live(wrap);

    function sym(i) { return tape[i] === undefined ? '_' : tape[i]; }
    function show(s) { return s === '_' ? 'blank' : s; }
    function findRule() {
      var r = MACHINES[mKey].rules, s = sym(head);
      for (var i = 0; i < r.length; i++) if (r[i].state === state && r[i].read === s) return i;
      return -1;
    }
    function tapeText() {
      var keys = Object.keys(tape).map(Number).filter(function (k) { return tape[k] !== '_'; });
      if (!keys.length) return '(empty)';
      var lo = Math.min.apply(null, keys), hi = Math.max.apply(null, keys), s = '';
      for (var i = lo; i <= hi; i++) s += sym(i);
      return s;
    }

    function render() {
      var keys = Object.keys(tape).map(Number);
      var lo = Math.min.apply(null, keys.concat([head, 0])) - 2, hi = Math.max.apply(null, keys.concat([head, tapeStr.length - 1])) + 2;
      cells.textContent = '';
      var headCell = null;
      for (var i = lo; i <= hi; i++) {
        var s = sym(i);
        var c = el('span', { 'class': 'ixa-cell' + (i === head ? ' is-head' : '') + (s === '_' ? ' is-blank' : ''),
          'aria-label': (i === head ? 'Head here: ' : '') + show(s) }, [s === '_' ? '' : s]);
        if (i === head) headCell = c;
        cells.appendChild(c);
      }
      // keep the head visible inside the tape box (without scrolling the page)
      if (headCell) {
        var left = headCell.offsetLeft - tapeView.clientWidth / 2 + headCell.offsetWidth / 2;
        tapeView.scrollLeft = Math.max(0, left);
      }
      stateOut.textContent = halted ? HALT : state;
      stateOut.classList.toggle('is-halt', halted);
      stepOut.textContent = String(steps);
      tapeOut.textContent = tapeText();
      var active = halted ? lastRule : findRule();
      var rows = rulesBody.children;
      for (var r = 0; r < rows.length; r++) {
        rows[r].classList.toggle('is-cur', r === active);
        if (r === active) rows[r].setAttribute('aria-current', 'true'); else rows[r].removeAttribute('aria-current');
      }
      bRun.disabled = halted; bPause.disabled = !timer;
    }

    function step(quiet) {
      if (halted) { if (!quiet) say('HALT: the machine has stopped. Press Reset to start again.', 'ok'); return false; }
      var i = findRule();
      if (i < 0) {
        halted = true; pause(); render();
        say('No rule for state ' + state + ' reading ' + show(sym(head)) + '. The machine stops.', 'bad');
        return false;
      }
      var r = MACHINES[mKey].rules[i], read = sym(head);
      tape[head] = r.write;
      if (r.move === 'L') head--; else if (r.move === 'R') head++;
      state = r.next; steps++; lastRule = i;
      if (state === HALT || steps >= MAX_STEPS) { halted = true; pause(); }
      render();
      if (!quiet) {
        if (halted) say('Step ' + steps + ': read ' + show(read) + ', wrote ' + show(r.write) + '. HALT! The tape now says ' + tapeText() + '.', 'ok');
        else say('Step ' + steps + ': read ' + show(read) + ', wrote ' + show(r.write) + ', ' + MOVE_WORD[r.move] + '. State: ' + state + '.');
      }
      return !halted;
    }

    function run() {
      if (halted || timer) return;
      timer = setInterval(function () { if (!step()) pause(); }, Math.round(1000 / (parseInt(speed.value, 10) || 3)));
      render();
    }
    function pause() { if (timer) { clearInterval(timer); timer = null; } if (bPause) bPause.disabled = true; }

    function load() {
      pause();
      var m = MACHINES[mKey];
      Object.keys(mBtns).forEach(function (k) { mBtns[k].setAttribute('aria-pressed', k === mKey ? 'true' : 'false'); });
      about.textContent = m.about + ' Start: the head is on the ' + m.from + 'most digit.';
      tape = {};
      for (var i = 0; i < tapeStr.length; i++) if (tapeStr[i] !== '_') tape[i] = tapeStr[i];
      var digits = tapeStr.replace(/_+$/, '');
      head = m.from === 'right' ? Math.max(0, digits.length - 1) : Math.max(0, tapeStr.search(/[01]/));
      state = m.start; steps = 0; halted = false; lastRule = -1;
      tIn.value = tapeStr;
      rulesBody.textContent = '';
      m.rules.forEach(function (r) {
        rulesBody.appendChild(el('tr', {}, [
          el('td', { text: r.state }), el('td', { 'class': 'ixa-mono', text: show(r.read) }), el('td', { 'class': 'ixa-mono', text: show(r.write) }),
          el('td', { text: r.move === '-' ? 'stay' : r.move }), el('td', { text: r.next })
        ]));
      });
      render();
    }

    function loadTape() {
      var t = cleanTape(tIn.value);
      if (!t) { say('Use only 0, 1 and _ (blank), up to 24 cells.', 'bad'); return false; }
      tapeStr = t; load();
      say('Tape loaded: ' + t + '. Press Step or Run.');
      return true;
    }

    function runToEnd(k, t) {
      mKey = k; tapeStr = t; load();
      var start = tapeText();
      while (step(true)) { /* runs until HALT (max 500 steps) */ }
      say(MACHINES[k].label + ': ' + start + ' → ' + tapeText() + ' in ' + steps + ' steps. HALT.', 'ok');
      return tapeText();
    }

    function reset() { mKey = startMachine; tapeStr = startTape; load(); say('Press Step to start.'); }
    reset();

    return {
      presets: [
        { name: 'add one to 1011 → 1100', run: function () { runToEnd('add-one', '1011'); } },
        { name: 'add one to 111 → 1000', run: function () { runToEnd('add-one', '111'); } },
        { name: 'flip 1011 → 0100', run: function () { runToEnd('flip-bits', '1011'); } }
      ],
      reset: reset,
      tape: tapeText
    };
  });
})();
