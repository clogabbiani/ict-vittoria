/* fde-stepper.js — component 7: the fetch–decode–execute cycle, like the class "Human CPU" activity.
   RAM has 8 boxes (0–7). The program lives in boxes 0–5 (stored-program idea: code and data share memory);
   boxes 6 and 7 hold data. One accumulator = "the CPU's hand".
   Instructions: INPUT → box n, LOAD box n, ADD box n, SUB box n, STORE → box n, OUTPUT box n,
                 JUMP line n, JUMPZERO line n, HALT.
   Design choice: the CPU stops (HALT) when the program counter reaches a box that holds no instruction
   (e.g. box 6, which holds data). So the 6-line "add" program needs no HALT line:
     0 INPUT → box 6 · 1 INPUT → box 7 · 2 LOAD box 6 · 3 ADD box 7 · 4 STORE → box 6 · 5 OUTPUT box 6
   With inputs 7 and 5 the output is 12. Errors (box 8, empty input queue, writing over the program,
   endless loops) stop the CPU with a kind message; nothing throws.
   Config: program (list of up to 6 lines as text), inputs (list of numbers), data ({"6": n, "7": n}).
   Contract: SITE_SPEC.md. */
(function () {
  'use strict';
  if (!window.ICT) return;

  var ARROW = '→';
  var PROGRAMS = {
    add: { label: 'Add two numbers', lines: ['INPUT → box 6', 'INPUT → box 7', 'LOAD box 6', 'ADD box 7', 'STORE → box 6', 'OUTPUT box 6'], inputs: [7, 5], data: {} },
    countdown: { label: 'Countdown', lines: ['OUTPUT box 6', 'LOAD box 6', 'SUB box 7', 'STORE → box 6', 'JUMPZERO line 6', 'JUMP line 0'], inputs: [], data: { 6: 3, 7: 1 } },
    bug: { label: 'A program with a bug', lines: ['INPUT → box 6', 'INPUT → box 7', 'LOAD box 6', 'ADD box 8', 'STORE → box 6', 'OUTPUT box 6'], inputs: [7, 5], data: {} }
  };
  var OPS = ['INPUT', 'LOAD', 'ADD', 'SUB', 'STORE', 'OUTPUT', 'JUMPZERO', 'JUMP', 'HALT'];
  var MAX_INSTRUCTIONS = 300;

  // "ADD box 7" -> {op:'ADD', n:7}; returns {bad:text} if it cannot be read
  function parse(text) {
    var t = String(text || '').toUpperCase().trim();
    var m = t.match(/^(INPUT|LOAD|ADD|SUB|STORE|OUTPUT|JUMPZERO|JUMP|HALT)\b[^0-9-]*(-?\d+)?/);
    if (!m) return { bad: String(text) };
    if (m[1] === 'HALT') return { op: 'HALT', n: null };
    if (m[2] === undefined) return { bad: String(text) };
    return { op: m[1], n: parseInt(m[2], 10) };
  }
  function fmt(i) {
    if (i.bad !== undefined) return i.bad || '(empty)';
    switch (i.op) {
      case 'INPUT': return 'INPUT ' + ARROW + ' box ' + i.n;
      case 'STORE': return 'STORE ' + ARROW + ' box ' + i.n;
      case 'JUMP': case 'JUMPZERO': return i.op + ' line ' + i.n;
      case 'HALT': return 'HALT';
      default: return i.op + ' box ' + i.n;
    }
  }
  function toNum(x) { var n = parseInt(x, 10); return isNaN(n) ? null : n; }

  ICT.register('fde-stepper', function (root, config, api) {
    config = config || {};
    var el = api.el;

    // starting program from config (falls back to the "add" program)
    var custom = null;
    if (Array.isArray(config.program) && config.program.length) {
      custom = { label: 'Your program', lines: config.program.slice(0, 6).map(String),
        inputs: Array.isArray(config.inputs) ? config.inputs : PROGRAMS.add.inputs, data: config.data || {} };
    } else if (Array.isArray(config.inputs)) {
      custom = { label: PROGRAMS.add.label, lines: PROGRAMS.add.lines, inputs: config.inputs, data: config.data || {} };
    }
    var startProg = custom || PROGRAMS.add;
    var prog = startProg;

    var ram = [], pc = 0, acc = 0, phase = 'ready', ir = null, inQ = [], out = [], halted = false, count = 0, timer = null, touched = -1;

    var wrap = el('div', { 'class': 'ix-fde-stepper' });
    root.appendChild(wrap);
    wrap.appendChild(el('p', { 'class': 'ixa-instr', text: 'Step through the program. Watch the CPU fetch, decode and execute each line.' }));

    // program choice
    var sel = el('select', { 'class': 'ixa-select', 'aria-label': 'Program', onchange: function () { choose(sel.value); } });
    function fillSelect() {
      sel.textContent = '';
      if (custom) sel.appendChild(el('option', { value: 'custom', text: custom.label }));
      Object.keys(PROGRAMS).forEach(function (k) { sel.appendChild(el('option', { value: k, text: PROGRAMS[k].label })); });
    }
    fillSelect();
    var uid = 'ixa-fde-' + Math.random().toString(36).slice(2, 8);
    sel.id = uid + 'p';
    var inField = el('input', { id: uid, type: 'text', 'class': 'ixa-input ixa-mono', autocomplete: 'off', spellcheck: 'false', maxlength: '40',
      onchange: function () { load(); say('New INPUT numbers ready. Press Step phase.'); } });
    var d6 = el('input', { id: uid + '6', type: 'number', 'class': 'ixa-input ixa-num', step: '1', placeholder: 'empty', onchange: function () { load(); } });
    var d7 = el('input', { id: uid + '7', type: 'number', 'class': 'ixa-input ixa-num', step: '1', placeholder: 'empty', onchange: function () { load(); } });
    wrap.appendChild(el('div', { 'class': 'ixa-settings' }, [
      el('div', { 'class': 'ixa-field' }, [el('label', { 'for': uid + 'p', 'class': 'ixa-label', text: 'Program' }), sel]),
      el('div', { 'class': 'ixa-field' }, [el('label', { 'for': uid, 'class': 'ixa-label', text: 'INPUT numbers (spaces between)' }), inField]),
      el('div', { 'class': 'ixa-field' }, [el('label', { 'for': uid + '6', 'class': 'ixa-label', text: 'Box 6 starts' }), d6]),
      el('div', { 'class': 'ixa-field' }, [el('label', { 'for': uid + '7', 'class': 'ixa-label', text: 'Box 7 starts' }), d7])
    ]));

    // CPU box
    var lamps = {};
    ['fetch', 'decode', 'execute'].forEach(function (p) { lamps[p] = el('span', { 'class': 'ixa-phase', text: p.toUpperCase() }); });
    var pcOut = el('span', { 'class': 'ixa-mono' }), irOut = el('span', { 'class': 'ixa-mono' }), accOut = el('span', { 'class': 'ixa-mono ixa-acc' });
    var cpu = el('div', { 'class': 'ixa-cpu' }, [
      el('p', { 'class': 'ixa-sub', text: 'CPU' }),
      el('div', { 'class': 'ixa-phases', 'aria-hidden': 'true' }, [lamps.fetch, lamps.decode, lamps.execute]),
      el('dl', { 'class': 'ixa-readout ixa-col' }, [
        el('div', {}, [el('dt', { text: 'Program counter' }), el('dd', {}, [pcOut])]),
        el('div', {}, [el('dt', { text: 'Instruction' }), el('dd', {}, [irOut])]),
        el('div', {}, [el('dt', { text: 'Hand (accumulator)' }), el('dd', {}, [accOut])])
      ])
    ]);
    // RAM
    var cards = [];
    var ramBox = el('div', { 'class': 'ixa-ram', role: 'list', 'aria-label': 'RAM: 8 boxes' });
    for (var b = 0; b < 8; b++) {
      var c = { head: el('span', { 'class': 'ixa-box-n', text: 'box ' + b }), body: el('span', { 'class': 'ixa-box-v ixa-mono' }) };
      c.node = el('div', { 'class': 'ixa-card', role: 'listitem' }, [c.head, c.body]);
      cards.push(c); ramBox.appendChild(c.node);
    }
    // IO
    var inOut = el('div', { 'class': 'ixa-chips' }), outOut = el('div', { 'class': 'ixa-chips ixa-out' });
    var io = el('div', { 'class': 'ixa-io' }, [
      el('p', { 'class': 'ixa-sub', text: 'INPUT queue' }), inOut,
      el('p', { 'class': 'ixa-sub', text: 'OUTPUT tape' }), outOut
    ]);
    wrap.appendChild(el('div', { 'class': 'ixa-machine' }, [cpu, el('div', { 'class': 'ixa-mem' }, [el('p', { 'class': 'ixa-sub', text: 'RAM (lines 0–5 = program, boxes 6–7 = data)' }), ramBox]), io]));

    var bRun = el('button', { type: 'button', 'class': 'ixa-btn', text: 'Run', onclick: function () { if (timer) pause(); else run(); } });
    wrap.appendChild(el('div', { 'class': 'ixa-bar' }, [
      el('button', { type: 'button', 'class': 'ixa-btn ixa-primary', text: 'Step phase', onclick: function () { pause(); stepPhase(); } }),
      el('button', { type: 'button', 'class': 'ixa-btn', text: 'Step instruction', onclick: function () { pause(); stepInstruction(); } }),
      bRun,
      el('button', { type: 'button', 'class': 'ixa-btn', text: 'Reset', onclick: function () { load(); say('Reset. Press Step phase to begin.'); } })
    ]));
    var say = api.live(wrap);

    // ---------- machine ----------
    function render() {
      ['fetch', 'decode', 'execute'].forEach(function (p) { lamps[p].classList.toggle('is-on', p === phase); });
      pcOut.textContent = halted ? 'stopped' : String(pc);
      irOut.textContent = ir ? fmt(ir) : '–';
      accOut.textContent = String(acc);
      for (var i = 0; i < 8; i++) {
        var r = ram[i], c = cards[i];
        c.body.textContent = r.code ? fmt(r.code) : (r.value === null ? '(empty)' : String(r.value));
        c.node.className = 'ixa-card ' + (r.code ? 'is-code' : 'is-data') + (i === pc && !halted ? ' is-pc' : '') + (i === touched ? ' is-touch' : '');
        c.head.textContent = (r.code ? 'line ' + i + ' · box ' + i : 'box ' + i);
      }
      inOut.textContent = '';
      if (!inQ.length) inOut.appendChild(el('span', { 'class': 'ixa-empty', text: '(empty)' }));
      inQ.forEach(function (v) { inOut.appendChild(el('span', { 'class': 'ixa-chip ixa-mono', text: String(v) })); });
      outOut.textContent = '';
      if (!out.length) outOut.appendChild(el('span', { 'class': 'ixa-empty', text: '(nothing yet)' }));
      out.forEach(function (v) { outOut.appendChild(el('span', { 'class': 'ixa-chip ixa-mono', text: String(v) })); });
      bRun.textContent = timer ? 'Pause' : 'Run';
      bRun.setAttribute('aria-pressed', timer ? 'true' : 'false');
    }

    function stop(msg, kind) { halted = true; pause(); phase = 'ready'; render(); say(msg, kind || 'ok'); return false; }
    function oops(msg) { return stop('Oops! ' + msg + ' The CPU stops here. Fix the program and press Reset.', 'bad'); }

    // check a box number used by an instruction; returns an error text or ''
    function boxProblem(n, forWriting) {
      if (n < 0 || n > 7) return 'There is no box ' + n + '. RAM has boxes 0 to 7 only.';
      if (ram[n].code) return forWriting ? 'Box ' + n + ' holds line ' + n + ' of the program. Writing a number there would break the program.'
        : 'Box ' + n + ' holds an instruction (line ' + n + '), not a number.';
      return '';
    }
    function val(n) { return ram[n].value === null ? 0 : ram[n].value; }

    function decodeText(i) {
      switch (i.op) {
        case 'INPUT': return 'INPUT means: take the next number from the INPUT queue and put it in box ' + i.n + '.';
        case 'LOAD': return 'LOAD means: pick up the number in box ' + i.n + ' with the hand.';
        case 'ADD': return 'ADD means: add the number in box ' + i.n + ' to the number in the hand.';
        case 'SUB': return 'SUB means: take the number in box ' + i.n + ' away from the number in the hand.';
        case 'STORE': return 'STORE means: put the number in the hand into box ' + i.n + '.';
        case 'OUTPUT': return 'OUTPUT means: copy the number in box ' + i.n + ' to the OUTPUT tape.';
        case 'JUMP': return 'JUMP means: the next line will be line ' + i.n + '.';
        case 'JUMPZERO': return 'JUMPZERO means: if the hand holds 0, go to line ' + i.n + '. If not, go on to the next line.';
        default: return 'HALT means: stop.';
      }
    }

    function execute(i) {
      var n = i.n, p, a;
      switch (i.op) {
        case 'INPUT':
          if ((p = boxProblem(n, true))) return oops(p);
          if (!inQ.length) return oops('The INPUT queue is empty. Type more numbers in the INPUT box.');
          a = inQ.shift(); ram[n].value = a; touched = n; pc++;
          return 'The CPU takes ' + a + ' from the INPUT queue and puts it in box ' + n + '.';
        case 'LOAD':
          if ((p = boxProblem(n))) return oops(p);
          acc = val(n); touched = n; pc++;
          return 'The hand picks up ' + acc + ' from box ' + n + '. The hand now holds ' + acc + '.';
        case 'ADD':
          if ((p = boxProblem(n))) return oops(p);
          a = acc; acc = a + val(n); touched = n; pc++;
          return a + ' + ' + val(n) + ' = ' + acc + '. The hand now holds ' + acc + '.';
        case 'SUB':
          if ((p = boxProblem(n))) return oops(p);
          a = acc; acc = a - val(n); touched = n; pc++;
          return a + ' − ' + val(n) + ' = ' + acc + '. The hand now holds ' + acc + '.';
        case 'STORE':
          if ((p = boxProblem(n, true))) return oops(p);
          ram[n].value = acc; touched = n; pc++;
          return 'The CPU puts ' + acc + ' into box ' + n + '.';
        case 'OUTPUT':
          if ((p = boxProblem(n))) return oops(p);
          out.push(val(n)); touched = n; pc++;
          return 'The CPU writes ' + val(n) + ' on the OUTPUT tape.';
        case 'JUMP':
          if (n < 0 || n > 7) return oops('There is no line ' + n + '. Lines go from 0 to 7.');
          pc = n; touched = -1;
          return 'The program counter is now ' + n + '. Next: line ' + n + '.';
        case 'JUMPZERO':
          if (n < 0 || n > 7) return oops('There is no line ' + n + '. Lines go from 0 to 7.');
          touched = -1;
          if (acc === 0) { pc = n; return 'The hand holds 0, so the CPU jumps. Next: line ' + n + '.'; }
          pc++; return 'The hand holds ' + acc + ', not 0, so no jump. Next: line ' + pc + '.';
        default:
          return stop('EXECUTE: HALT. The program has finished.' + outputSummary());
      }
    }

    function outputSummary() { return out.length ? ' OUTPUT: ' + out.join(', ') + '.' : ''; }

    // one phase: fetch -> decode -> execute -> fetch ...
    function stepPhase() {
      if (halted) { say('The CPU has stopped. Press Reset to run the program again.'); return false; }
      if (phase === 'ready' || phase === 'execute') {
        if (count >= MAX_INSTRUCTIONS) return stop('The CPU has run ' + MAX_INSTRUCTIONS + ' instructions. The program may loop forever, so we stopped it.', 'bad');
        if (pc < 0 || pc > 7) return oops('There is no line ' + pc + '.');
        var r = ram[pc];
        if (!r.code) {
          ir = null;
          return stop('HALT: box ' + pc + ' holds data, not an instruction. The program has ended.' + outputSummary());
        }
        if (r.code.bad !== undefined) { ir = r.code; return oops('Line ' + pc + ' ("' + fmt(r.code) + '") is not an instruction the CPU knows.'); }
        phase = 'fetch'; ir = r.code; touched = -1; render();
        say('FETCH: the CPU reads line ' + pc + ' from box ' + pc + ': ' + fmt(ir) + '.');
        return true;
      }
      if (phase === 'fetch') { phase = 'decode'; render(); say('DECODE: ' + decodeText(ir)); return true; }
      // execute
      phase = 'execute'; count++;
      var msg = execute(ir);
      if (msg === false) return false;
      render(); say('EXECUTE: ' + msg);
      return true;
    }

    function stepInstruction() {
      if (!stepPhase()) return false;
      while (phase !== 'execute' && !halted) if (!stepPhase()) return false;
      return !halted;
    }

    function run() {
      if (halted) load();
      timer = setInterval(function () { if (!stepPhase()) pause(); }, 700);
      render();
    }
    function pause() { if (timer) { clearInterval(timer); timer = null; } if (cards.length && ram.length) render(); }

    function load() {
      pause();
      ram = [];
      var lines = (prog.lines || []).slice(0, 6);
      for (var i = 0; i < 8; i++) ram.push({ code: i < lines.length ? parse(lines[i]) : null, value: null });
      var v6 = toNum(d6.value), v7 = toNum(d7.value);
      if (!ram[6].code) ram[6].value = v6;
      if (!ram[7].code) ram[7].value = v7;
      inQ = inField.value.split(/[\s,;]+/).map(toNum).filter(function (x) { return x !== null; });
      pc = 0; acc = 0; phase = 'ready'; ir = null; out = []; halted = false; count = 0; touched = -1;
      render();
    }

    function choose(key) {
      prog = key === 'custom' && custom ? custom : (PROGRAMS[key] || PROGRAMS.add);
      sel.value = PROGRAMS[key] || key === 'custom' ? key : 'add';
      inField.value = (prog.inputs || []).join(' ');
      var d = prog.data || {};
      d6.value = toNum(d[6]) === null ? '' : String(toNum(d[6]));
      d7.value = toNum(d[7]) === null ? '' : String(toNum(d[7]));
      load();
      say(prog.label + '. Press Step phase to begin.');
    }

    function runAll(key) {
      choose(key);
      var guard = 0;
      while (stepPhase() && guard++ < 3000) { /* run to the end, synchronously */ }
      return out.slice();
    }

    function reset() { choose(custom ? 'custom' : 'add'); }
    reset();

    return {
      presets: [
        { name: 'add 7 + 5', run: function () { runAll('add'); } },
        { name: 'a bug: box 8 does not exist', run: function () { runAll('bug'); } },
        { name: 'countdown 3, 2, 1', run: function () { runAll('countdown'); } }
      ],
      reset: reset,
      output: function () { return out.slice(); }
    };
  });
})();
