/* be-the-gpu.js — "Be the GPU" (lesson 6): colour a 10 x 10 picture with 1 cook, then with 100 cooks.
   Simulated time, so the result is always the same: 1 cook paints 1 square per tick (100 ticks);
   100 cooks need 1 tick to get their squares, 1 tick to paint all at once, 1 tick to put the picture
   together (3 ticks). In class, 1 tick = about 1 second. On screen a tick lasts `speed` ms (default 40).
   Then a bar chart compares the two times and explains CPU (a few fast cooks) vs GPU (thousands of simple cooks).
   Config: picture (10 strings of 10 colour codes: . white, y yellow, n navy, r red, g green, b blue-grey),
   speed (ms per tick, 5-400). prefers-reduced-motion: no animation, results at once. Contract: SITE_SPEC.md. */
(function () {
  'use strict';
  if (!window.ICT) return;

  var SIZE = 10;
  var DEFAULT_PICTURE = [
    '..yyyyyy..',
    '.yyyyyyyy.',
    'yyyyyyyyyy',
    'yynnyynnyy',
    'yynnyynnyy',
    'yyyyyyyyyy',
    'ynyyyyyyny',
    'yynyyyynyy',
    '.yynnnnyy.',
    '..yyyyyy..'
  ];
  var COLOURS = { '.': '#FFFFFF', w: '#FFFFFF', y: '#FFC247', n: '#12213F', k: '#12213F', r: '#B3412F', g: '#2E7D5B', b: '#A8B1C7' };
  var NAMES = { '.': 'white', w: 'white', y: 'yellow', n: 'navy', k: 'navy', r: 'red', g: 'green', b: 'blue-grey' };
  var TICKS = { one: SIZE * SIZE, many: 3 };

  function parsePicture(p) {
    if (!Array.isArray(p) || p.length !== SIZE) return DEFAULT_PICTURE;
    var rows = [];
    for (var r = 0; r < SIZE; r++) {
      var row = String(p[r] || '');
      if (row.length !== SIZE) return DEFAULT_PICTURE;
      for (var c = 0; c < SIZE; c++) if (!COLOURS[row.charAt(c)]) return DEFAULT_PICTURE;
      rows.push(row);
    }
    return rows;
  }

  function reducedMotion() {
    try { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
  }

  ICT.register('be-the-gpu', function (root, config, api) {
    config = config || {};
    var el = api.el;
    var picture = parsePicture(config.picture);
    var speed = isFinite(+config.speed) ? Math.max(5, Math.min(400, +config.speed)) : 40;

    var timer = null;          // running interval
    var results = { one: null, many: null };
    var busy = null;           // 'one' | 'many' | null

    var wrap = el('div', { 'class': 'ix-be-the-gpu' });
    root.appendChild(wrap);
    wrap.appendChild(el('p', { 'class': 'bg-instr', text: 'Colour the picture: first with 1 cook, then with 100 cooks. Which is faster?' }));

    var stage = el('div', { 'class': 'bg-stage' });
    var grid = el('div', { 'class': 'bg-grid', role: 'img', 'aria-label': 'A 10 by 10 picture, not coloured yet' });
    var cells = [];
    for (var i = 0; i < SIZE * SIZE; i++) {
      var c = el('span', { 'class': 'bg-cell' });
      cells.push(c);
      grid.appendChild(c);
    }
    var side = el('div', { 'class': 'bg-side' });
    var clockOne = el('span', { 'class': 'bg-clock-val', text: '–' });
    var clockMany = el('span', { 'class': 'bg-clock-val', text: '–' });
    var phase = el('p', { 'class': 'bg-phase', text: 'Ready.' });
    side.appendChild(el('dl', { 'class': 'bg-clocks' }, [
      el('div', { 'class': 'bg-clock' }, [el('dt', { text: '1 cook' }), el('dd', null, [clockOne])]),
      el('div', { 'class': 'bg-clock' }, [el('dt', { text: '100 cooks' }), el('dd', null, [clockMany])])
    ]));
    side.appendChild(phase);
    stage.appendChild(grid);
    stage.appendChild(side);
    wrap.appendChild(stage);

    var btnOne = el('button', { type: 'button', 'class': 'bg-btn bg-primary', text: 'Run: 1 cook', onclick: function () { run('one', false); } });
    var btnMany = el('button', { type: 'button', 'class': 'bg-btn bg-primary', text: 'Run: 100 cooks', onclick: function () { run('many', false); } });
    var btnReset = el('button', { type: 'button', 'class': 'bg-btn', text: 'Start again', onclick: function () { reset(); say('Cleared. Choose a run.'); } });
    wrap.appendChild(el('div', { 'class': 'bg-bar' }, [btnOne, btnMany, btnReset]));

    var compare = el('div', { 'class': 'bg-compare', hidden: true });
    wrap.appendChild(compare);
    wrap.appendChild(el('p', { 'class': 'bg-note', text: 'Time is in ticks. In class, 1 tick is about 1 second: the time to colour one square.' }));
    var say = api.live(wrap);

    function fmt(t) { return t + (t === 1 ? ' tick' : ' ticks'); }

    function stop() {
      if (timer) { clearInterval(timer); timer = null; }
      busy = null;
      btnOne.disabled = false;
      btnMany.disabled = false;
    }

    function clearGrid() {
      cells.forEach(function (c) { c.style.backgroundColor = ''; c.className = 'bg-cell'; });
      grid.setAttribute('aria-label', 'A 10 by 10 picture, not coloured yet');
    }

    function paint(i) {
      var ch = picture[Math.floor(i / SIZE)].charAt(i % SIZE);
      cells[i].style.backgroundColor = COLOURS[ch];
      cells[i].className = 'bg-cell is-done';
    }

    function finished(kind) {
      var t = TICKS[kind];
      results[kind] = t;
      (kind === 'one' ? clockOne : clockMany).textContent = fmt(t);
      grid.setAttribute('aria-label', picture === DEFAULT_PICTURE ? 'The finished picture: a yellow smiling face, 100 squares' : 'The finished picture, 100 squares');
      phase.textContent = kind === 'one' ? 'Done: 1 cook painted 100 squares, one after the other.' : 'Done: 100 cooks painted 100 squares at the same time.';
      say((kind === 'one' ? '1 cook' : '100 cooks') + ': the picture took ' + fmt(t) + '.', 'ok');
      stop();
      if (results.one !== null && results.many !== null) showCompare();
    }

    function run(kind, instant) {
      stop();
      clearGrid();
      compare.hidden = true;
      busy = kind;
      var clock = kind === 'one' ? clockOne : clockMany;
      if (instant || reducedMotion()) {
        for (var i = 0; i < cells.length; i++) paint(i);
        finished(kind);
        return;
      }
      btnOne.disabled = true;
      btnMany.disabled = true;
      var tick = 0;
      clock.textContent = fmt(0);
      if (kind === 'one') {
        phase.textContent = '1 cook paints the squares one by one.';
        say('1 cook starts painting.');
        timer = setInterval(function () {
          if (tick > 0) cells[tick - 1].classList.remove('is-cook');
          if (tick >= cells.length) { finished('one'); return; }
          paint(tick);
          cells[tick].classList.add('is-cook');
          tick++;
          clock.textContent = fmt(tick);
        }, speed);
      } else {
        phase.textContent = 'Tick 1: each cook gets one square.';
        say('100 cooks start.');
        var stepMs = Math.max(speed * 6, 240);   // slow enough to see the 3 steps
        timer = setInterval(function () {
          tick++;
          clock.textContent = fmt(tick);
          if (tick === 1) {
            cells.forEach(function (c) { c.classList.add('is-cook'); });
            phase.textContent = 'Tick 2: all 100 cooks paint at the same time.';
          } else if (tick === 2) {
            for (var j = 0; j < cells.length; j++) paint(j);
            cells.forEach(function (c) { c.classList.add('is-cook'); });
            phase.textContent = 'Tick 3: the squares are put together into one picture.';
          } else {
            cells.forEach(function (c) { c.classList.remove('is-cook'); });
            finished('many');
          }
        }, stepMs);
      }
    }

    function bar(label, t, max, cls) {
      var pct = Math.max(1.5, Math.round(t / max * 1000) / 10);
      return el('div', { 'class': 'bg-row ' + cls }, [
        el('span', { 'class': 'bg-row-label', text: label }),
        el('span', { 'class': 'bg-track', 'aria-hidden': 'true' }, [el('span', { 'class': 'bg-fill', style: { width: pct + '%' } })]),
        el('span', { 'class': 'bg-row-val', text: fmt(t) })
      ]);
    }

    function showCompare() {
      var one = results.one, many = results.many;
      var x = Math.round(one / many);
      compare.textContent = '';
      compare.appendChild(el('h4', { 'class': 'bg-compare-h', text: '100 cooks were ' + x + ' times faster' }));
      compare.appendChild(el('div', { 'class': 'bg-chart', role: 'img', 'aria-label': '1 cook: ' + fmt(one) + '. 100 cooks: ' + fmt(many) + '.' }, [
        bar('1 cook', one, one, 'is-one'),
        bar('100 cooks', many, one, 'is-many')
      ]));
      compare.appendChild(el('ul', { 'class': 'bg-explain' }, [
        el('li', null, [el('strong', { text: 'A CPU' }), ' is a few very fast cooks (4 to 16 cores). Great for jobs that go step by step.']),
        el('li', null, [el('strong', { text: 'A GPU' }), ' is thousands of simple cooks. Each one does a tiny job, all at the same time.']),
        el('li', null, ['A game screen has millions of pixels, and an AI model has billions of numbers: the same small job, again and again. That is why ',
          el('strong', { text: 'games and AI use GPUs' }), '.'])
      ]));
      compare.hidden = false;
    }

    function reset() {
      stop();
      clearGrid();
      results = { one: null, many: null };
      clockOne.textContent = '–';
      clockMany.textContent = '–';
      phase.textContent = 'Ready.';
      compare.hidden = true;
      say('');
    }

    reset();

    return {
      presets: [
        { name: '1 cook', run: function () { run('one', true); } },
        { name: '100 cooks', run: function () { run('many', true); } },
        { name: 'compare', run: function () { run('one', true); run('many', true); } }
      ],
      reset: reset
    };
  });
})();
