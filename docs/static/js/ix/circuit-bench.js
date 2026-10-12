/* circuit-bench.js — component 5: battery, switches and a bulb. Logic gates made of switches.
   Modes: series (AND), parallel (OR), NOT (a switch that short-circuits the bulb: the bulb is on when
   the switch is OPEN; a resistor protects the battery), three ((A AND B) OR C).
   The truth table fills in as each combination is tried; the gate name is revealed when every row is tried.
   Config: preset ("series" | "parallel" | "not" | "three"). Contract: SITE_SPEC.md. */
(function () {
  'use strict';
  if (!window.ICT) return;

  var MODES = {
    series:   { label: 'Series', inputs: ['A', 'B'], f: function (v) { return v[0] && v[1]; },
                gate: 'AND gate: the bulb is on only when A AND B are both closed.' },
    parallel: { label: 'Parallel', inputs: ['A', 'B'], f: function (v) { return v[0] || v[1]; },
                gate: 'OR gate: the bulb is on when A OR B (or both) is closed.' },
    not:      { label: 'NOT', inputs: ['A'], f: function (v) { return !v[0]; },
                gate: 'NOT gate: the bulb does the opposite of the switch. Closed switch = a shortcut, so the current skips the bulb.' },
    three:    { label: 'Three switches', inputs: ['A', 'B', 'C'], f: function (v) { return (v[0] && v[1]) || v[2]; },
                gate: '(A AND B) OR C: an AND gate and an OR gate working together.' }
  };

  ICT.register('circuit-bench', function (root, config, api) {
    config = config || {};
    var el = api.el, S = api.svg;
    var startMode = MODES[config.preset] ? config.preset : 'series';
    var mode = startMode, sw = [], tried = {}, swBtns = [];

    var wrap = el('div', { 'class': 'ix-circuit-bench' });
    root.appendChild(wrap);
    wrap.appendChild(el('p', { 'class': 'ixa-instr', text: 'Click the switches to open or close them. Try every row of the table.' }));

    var modeBtns = {};
    var modeBar = el('div', { 'class': 'ixa-bar', role: 'group', 'aria-label': 'Circuit' });
    Object.keys(MODES).forEach(function (k) {
      modeBtns[k] = el('button', { type: 'button', 'class': 'ixa-btn ixa-toggle', text: MODES[k].label, onclick: function () { setMode(k); } });
      modeBar.appendChild(modeBtns[k]);
    });
    wrap.appendChild(modeBar);

    var pic = el('div', { 'class': 'ixa-pic' });
    var swBar = el('div', { 'class': 'ixa-bar ixa-center', role: 'group', 'aria-label': 'Switches' });
    var tableBox = el('div', { 'class': 'ixa-tt' });
    var gateLine = el('p', { 'class': 'ixa-gate' });
    wrap.appendChild(el('div', { 'class': 'ixa-layout' }, [
      el('div', { 'class': 'ixa-left' }, [pic, swBar]),
      el('div', { 'class': 'ixa-right' }, [tableBox, gateLine])
    ]));
    var say = api.live(wrap);

    // ---------- drawing helpers (viewBox 420 x 250) ----------
    function wire(pts) { return S('polyline', { points: pts, 'class': 'ixa-wire' }); }
    function battery() {
      return S('g', {}, [
        wire('50,50 50,113'), wire('50,137 50,200'),
        S('line', { x1: 30, y1: 117, x2: 70, y2: 117, 'class': 'ixa-plate' }),
        S('line', { x1: 40, y1: 133, x2: 60, y2: 133, 'class': 'ixa-plate ixa-plate-s' }),
        S('text', { x: 82, y: 113, 'class': 'ixa-svg-l', text: '+' }),
        S('text', { x: 82, y: 160, 'class': 'ixa-svg-s', text: 'battery' })
      ]);
    }
    function bulb(x, cy, on) {
      var g = S('g', { 'class': 'ixa-bulb' + (on ? ' is-on' : '') }, [
        wire(x + ',50 ' + x + ',' + (cy - 18)), wire(x + ',' + (cy + 18) + ' ' + x + ',200')
      ]);
      if (on) [[0, -32, 0, -42], [26, -20, 34, -26], [-26, -20, -34, -26], [28, 6, 38, 8], [-28, 6, -38, 8]].forEach(function (r) {
        g.appendChild(S('line', { x1: x + r[0], y1: cy + r[1], x2: x + r[2], y2: cy + r[3], 'class': 'ixa-ray' }));
      });
      g.appendChild(S('circle', { cx: x, cy: cy, r: 18, 'class': 'ixa-glass' }));
      g.appendChild(S('path', { d: 'M' + (x - 12) + ' ' + (cy - 12) + ' L' + (x + 12) + ' ' + (cy + 12) + ' M' + (x + 12) + ' ' + (cy - 12) + ' L' + (x - 12) + ' ' + (cy + 12), 'class': 'ixa-fil' }));
      g.appendChild(S('text', { x: x - 10, y: cy + 52, 'text-anchor': 'end', 'class': 'ixa-svg-s', text: on ? 'bulb ON' : 'bulb off' }));
      return g;
    }
    // a switch between (x1,y) and (x2,y); vertical when vert = true (then x1,x2 are y values and y is x)
    function switchSym(i, a, b, c, vert) {
      var closed = sw[i];
      var p1 = vert ? [c, a] : [a, c], p2 = vert ? [c, b] : [b, c];
      var tip = closed ? p2 : (vert ? [c + 24, b - 6] : [b - 6, c - 24]);
      var name = MODES[mode].inputs[i];
      var g = S('g', { 'class': 'ixa-sw' + (closed ? ' is-closed' : ''), onclick: function () { toggle(i); } }, [
        S('rect', { x: Math.min(p1[0], p2[0]) - 10, y: Math.min(p1[1], p2[1]) - 30, width: Math.abs(p2[0] - p1[0]) + 40, height: Math.abs(p2[1] - p1[1]) + 40, 'class': 'ixa-hit' }),
        S('line', { x1: p1[0], y1: p1[1], x2: tip[0], y2: tip[1], 'class': 'ixa-lever' }),
        S('circle', { cx: p1[0], cy: p1[1], r: 4.5, 'class': 'ixa-dot' }),
        S('circle', { cx: p2[0], cy: p2[1], r: 4.5, 'class': 'ixa-dot' }),
        S('text', vert ? { x: c - 30, y: (a + b) / 2 + 6, 'class': 'ixa-svg-l', text: name } : { x: (a + b) / 2 - 6, y: c + 26, 'class': 'ixa-svg-l', text: name })
      ]);
      return g;
    }
    function resistor(x1, x2, y) {
      var d = 'M' + x1 + ' ' + y, n = 6, w = (x2 - x1) / n;
      for (var k = 0; k < n; k++) d += ' L' + (x1 + w * (k + 0.5)) + ' ' + (y + (k % 2 ? 9 : -9));
      d += ' L' + x2 + ' ' + y;
      return S('g', {}, [S('path', { d: d, 'class': 'ixa-wire' }), S('text', { x: x1 + 2, y: y + 30, 'class': 'ixa-svg-s', text: 'resistor' })]);
    }

    function drawing() {
      var on = !!MODES[mode].f(sw), parts = [battery()];
      if (mode === 'series') {
        parts.push(wire('50,50 120,50'), switchSym(0, 120, 170, 50), wire('170,50 230,50'), switchSym(1, 230, 280, 50),
          wire('280,50 370,50'), wire('370,200 50,200'), bulb(370, 125, on));
      } else if (mode === 'parallel') {
        parts.push(wire('50,50 110,50 110,115'), wire('110,50 180,50'), switchSym(0, 180, 230, 50), wire('230,50 300,50'),
          wire('110,115 180,115'), switchSym(1, 180, 230, 115), wire('230,115 300,115 300,50'),
          wire('300,50 370,50'), wire('370,200 50,200'), bulb(370, 140, on));
      } else if (mode === 'not') {
        parts.push(wire('50,50 100,50'), resistor(100, 170, 50), wire('170,50 370,50'),
          wire('270,50 270,95'), switchSym(0, 95, 150, 270, true), wire('270,150 270,200'),
          wire('370,200 50,200'), bulb(370, 125, on));
      } else {
        parts.push(wire('50,50 100,50 100,125'), wire('100,50 125,50'), switchSym(0, 125, 165, 50), wire('165,50 210,50'),
          switchSym(1, 210, 250, 50), wire('250,50 300,50'),
          wire('100,125 170,125'), switchSym(2, 170, 210, 125), wire('210,125 300,125 300,50'),
          wire('300,50 370,50'), wire('370,200 50,200'), bulb(370, 140, on));
      }
      return S('svg', { viewBox: '0 0 420 250', 'class': 'ixa-svg', role: 'img',
        'aria-label': MODES[mode].label + ' circuit. The bulb is ' + (on ? 'on.' : 'off.') }, parts);
    }

    function rowIndex() { var r = 0; sw.forEach(function (v) { r = r * 2 + (v ? 1 : 0); }); return r; }

    function table() {
      var m = MODES[mode], n = m.inputs.length, rows = Math.pow(2, n), cur = rowIndex();
      var head = el('tr', {}, m.inputs.map(function (x) { return el('th', { scope: 'col', text: x }); })
        .concat([el('th', { scope: 'col', text: 'Bulb' }), el('th', { scope: 'col', text: 'Tried' })]));
      var body = el('tbody');
      for (var r = 0; r < rows; r++) {
        var vals = [];
        for (var k = n - 1; k >= 0; k--) vals.push((r >> k) & 1);
        var out = m.f(vals.map(Boolean)) ? 1 : 0, t = !!tried[r];
        body.appendChild(el('tr', { 'class': (r === cur ? 'is-cur' : '') + (t ? ' is-tried' : ''), 'aria-current': r === cur ? 'true' : null },
          vals.map(function (v) { return el('td', { 'class': 'ixa-mono', text: String(v) }); }).concat([
            el('td', { 'class': 'ixa-mono', text: t ? (out ? '1 on' : '0 off') : '?' }),
            el('td', { text: t ? '✓ yes' : '–' })
          ])));
      }
      return el('table', { 'class': 'ixa-table' }, [
        el('caption', { text: 'Truth table: 1 = closed / on, 0 = open / off' }), el('thead', {}, [head]), body]);
    }

    function countTried() { return Object.keys(tried).length; }
    function allTried() { return countTried() === Math.pow(2, MODES[mode].inputs.length); }

    function render() {
      var m = MODES[mode];
      tried[rowIndex()] = true;
      Object.keys(modeBtns).forEach(function (k) { modeBtns[k].setAttribute('aria-pressed', k === mode ? 'true' : 'false'); });
      pic.textContent = ''; pic.appendChild(drawing());
      swBtns.forEach(function (b, i) {
        var name = m.inputs[i];
        b.setAttribute('aria-pressed', sw[i] ? 'true' : 'false');
        b.setAttribute('aria-label', 'Switch ' + name + ', ' + (sw[i] ? 'closed' : 'open'));
        b.textContent = name + ': ' + (sw[i] ? 'closed' : 'open');
      });
      tableBox.textContent = ''; tableBox.appendChild(table());
      var total = Math.pow(2, m.inputs.length);
      if (allTried()) { gateLine.textContent = 'Which gate is this? ' + m.gate; gateLine.classList.add('is-done'); }
      else { gateLine.textContent = 'Which gate is this? Try every row to find out (' + countTried() + ' of ' + total + ' tried).'; gateLine.classList.remove('is-done'); }
    }

    function toggle(i, quiet) {
      var wasDone = allTried();
      sw[i] = !sw[i];
      render();
      var on = MODES[mode].f(sw);
      if (quiet) return;
      if (allTried() && !wasDone) say('All rows tried! ' + MODES[mode].gate, 'ok');
      else say('Switch ' + MODES[mode].inputs[i] + ' is ' + (sw[i] ? 'closed' : 'open') + '. The bulb is ' + (on ? 'ON.' : 'off.'));
    }

    function setMode(k) {
      mode = MODES[k] ? k : 'series';
      sw = MODES[mode].inputs.map(function () { return false; });
      tried = {};
      swBar.textContent = '';
      swBtns = MODES[mode].inputs.map(function (name, i) {
        var b = el('button', { type: 'button', 'class': 'ixa-btn ixa-swbtn', onclick: function () { toggle(i); } });
        swBar.appendChild(b);
        return b;
      });
      render();
      say(MODES[mode].label + ' circuit. All switches are open. The bulb is ' + (MODES[mode].f(sw) ? 'ON.' : 'off.'));
    }

    // try every combination in table order (used by the presets)
    function tryAll(k) {
      setMode(k);
      var n = sw.length, rows = Math.pow(2, n);
      for (var r = 0; r < rows; r++) {
        for (var b = 0; b < n; b++) sw[b] = !!((r >> (n - 1 - b)) & 1);
        render();
      }
      say('All ' + rows + ' rows tried. ' + MODES[mode].gate, 'ok');
    }

    function reset() { setMode(startMode); }
    reset();

    return {
      presets: [
        { name: 'series: try all four', run: function () { tryAll('series'); } },
        { name: 'parallel: try all four', run: function () { tryAll('parallel'); } },
        { name: 'NOT', run: function () { tryAll('not'); } },
        { name: 'three switches: try all eight', run: function () { tryAll('three'); } }
      ],
      reset: reset
    };
  });
})();
