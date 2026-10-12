/* moore-chart.js — component 8: transistors on one chip, 1971 → 2024.
   Linear/log toggle, a "Moore's line" (doubling every 2 years from 2,300 in 1971), focusable points
   with tooltips, and "Find your phone". Config: scale ("log"|"linear", default "log"). Contract: SITE_SPEC.md. */
(function () {
  'use strict';
  if (!window.ICT) return;

  /* DATA — transistor counts as published by the makers, cross-checked with the Wikipedia
     "Transistor count" table (accessed 2026). "about: true" = the number is rounded or sources differ.
     - Intel 4004 (1971): 2,300 (some sources: 2,250).
     - Intel 8080 (1974): 4,500 is Intel's own figure; older books say 6,000. We use 4,500 (about).
     - Intel 8086 (1978): 29,000.   Intel 80386 (1985): 275,000.
     - Intel 80486 (1989): 1,180,235 → "about 1.2 million".   Intel Pentium (1993): 3.1 million.
     - Intel Pentium 4 "Willamette" (2000): 42 million.   Intel Core 2 Duo "Conroe" (2006): 291 million.
     - Apple A7 (2013, iPhone 5s): Apple said "over 1 billion" (about).
     - Apple A14 (2020, iPhone 12): 11.8 billion.   Apple M1 (2020): 16 billion.
     - Apple A15 (2021, iPhone 13): 15 billion.     NVIDIA H100 (2022): 80 billion.
     - Apple A17 Pro (2023, iPhone 15 Pro): 19 billion.   Apple M3 Max (2023): 92 billion.
     - NVIDIA B200 (2024): 208 billion, on two dies in one package. */
  var CHIPS = [
    { id: '4004', year: 1971, chip: 'Intel 4004', n: 2300 },
    { id: '8080', year: 1974, chip: 'Intel 8080', n: 4500, about: true },
    { id: '8086', year: 1978, chip: 'Intel 8086', n: 29000 },
    { id: '386', year: 1985, chip: 'Intel 80386', n: 275000 },
    { id: '486', year: 1989, chip: 'Intel 80486', n: 1200000, about: true },
    { id: 'pentium', year: 1993, chip: 'Intel Pentium', n: 3100000 },
    { id: 'p4', year: 2000, chip: 'Intel Pentium 4', n: 42000000 },
    { id: 'core2', year: 2006, chip: 'Intel Core 2 Duo', n: 291000000 },
    { id: 'a7', year: 2013, chip: 'Apple A7 (iPhone 5s)', n: 1e9, about: true, phone: 'iPhone 5s (2013)' },
    { id: 'a14', year: 2020, chip: 'Apple A14 (iPhone 12)', n: 11.8e9, phone: 'iPhone 12 (2020)' },
    { id: 'm1', year: 2020, chip: 'Apple M1 (laptop)', n: 16e9 },
    { id: 'a15', year: 2021, chip: 'Apple A15 (iPhone 13)', n: 15e9, phone: 'iPhone 13 (2021)' },
    { id: 'h100', year: 2022, chip: 'NVIDIA H100 (AI)', n: 80e9 },
    { id: 'a17', year: 2023, chip: 'Apple A17 Pro (iPhone 15 Pro)', n: 19e9, phone: 'iPhone 15 Pro (2023)' },
    { id: 'm3max', year: 2023, chip: 'Apple M3 Max (laptop)', n: 92e9 },
    { id: 'b200', year: 2024, chip: 'NVIDIA B200 (AI, two dies)', n: 208e9 }
  ];
  var BASE = 2300; // the Intel 4004

  function commas(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function one(x) { return String(Math.round(x * 10) / 10); }
  function words(n) {
    if (n >= 1e12) return one(n / 1e12) + ' trillion';
    if (n >= 1e9) return one(n / 1e9) + ' billion';
    if (n >= 1e6) return one(n / 1e6) + ' million';
    return commas(n);
  }
  function sig2(x) {
    if (x <= 0) return 0;
    var k = Math.floor(Math.log(x) / Math.LN10) - 1;
    var p = Math.pow(10, k);
    return Math.round(x / p) * p;
  }
  function countText(c) { return (c.about ? 'about ' : '') + words(c.n) + ' transistors'; }
  function moore(year) { return BASE * Math.pow(2, (year - 1971) / 2); }

  ICT.register('moore-chart', function (root, config, api) {
    config = config || {};
    var el = api.el, svg = api.svg;
    var startScale = config.scale === 'linear' ? 'linear' : 'log';
    var state = { scale: startScale, moore: false, sel: null };

    var wrap = el('div', { 'class': 'ix-moore-chart' });
    root.appendChild(wrap);
    wrap.appendChild(el('p', { 'class': 'ixb-instr', text: 'How many transistors fit on one chip? Touch or Tab to a dot to read it.' }));

    var bLog = el('button', { type: 'button', 'class': 'ixb-btn', 'aria-pressed': 'false', text: 'Log scale', onclick: function () { setScale('log', true); } });
    var bLin = el('button', { type: 'button', 'class': 'ixb-btn', 'aria-pressed': 'false', text: 'Linear scale', onclick: function () { setScale('linear', true); } });
    var bMoore = el('button', { type: 'button', 'class': 'ixb-btn', 'aria-pressed': 'false', text: "Moore's line", onclick: function () { setMoore(!state.moore, true); } });
    var phoneSel = el('select', { 'class': 'ixb-select', id: 'mc-phone-' + Math.random().toString(36).slice(2, 8),
      onchange: function () { findPhone(phoneSel.value, true); } });
    phoneSel.appendChild(el('option', { value: '', text: 'Choose a phone' }));
    CHIPS.forEach(function (c) { if (c.phone) phoneSel.appendChild(el('option', { value: c.id, text: c.phone })); });

    wrap.appendChild(el('div', { 'class': 'ixb-bar' }, [
      el('div', { 'class': 'ixb-seg', role: 'group', 'aria-label': 'Scale' }, [bLog, bLin]),
      bMoore
    ]));
    wrap.appendChild(el('div', { 'class': 'ixb-bar' }, [
      el('label', { 'for': phoneSel.id, 'class': 'mc-label', text: 'Find your phone:' }), phoneSel
    ]));

    var plot = el('div', { 'class': 'mc-plot' });
    var tip = el('div', { 'class': 'mc-tip', hidden: true, 'aria-hidden': 'true' });
    wrap.appendChild(plot);
    var info = el('p', { 'class': 'mc-info', text: 'Each dot is one chip. Up = more transistors.' });
    wrap.appendChild(info);
    wrap.appendChild(el('p', { 'class': 'ixb-small', text: '"About" means the number is rounded or sources give slightly different numbers. Sources: the chip makers and the Wikipedia "Transistor count" table.' }));
    var say0 = api.live(wrap.appendChild(el('div', { 'class': 'ixb-sr' })));   // screen readers; the same text is shown in .mc-info
    function say(msg) { if (msg) info.textContent = msg; say0(msg); }

    var lastW = 0, geo = null, svgEl = null, pts = {};

    function geometry(W) {
      var narrow = W < 520;
      var H = Math.round(Math.min(430, Math.max(300, W * 0.62)));
      var m = { l: narrow ? 66 : 82, r: 14, t: 14, b: 46 };
      var x0 = 1968, x1 = 2026;
      var g = { W: W, H: H, m: m, narrow: narrow, pw: W - m.l - m.r, ph: H - m.t - m.b };
      g.x = function (yr) { return m.l + (yr - x0) / (x1 - x0) * g.pw; };
      if (state.scale === 'log') {
        g.y = function (n) { var v = Math.log(Math.max(n, 1000)) / Math.LN10; return m.t + (1 - (v - 3) / 9) * g.ph; };
      } else {
        g.y = function (n) { return m.t + (1 - n / 250e9) * g.ph; };
      }
      return g;
    }

    function draw() {
      var W = Math.round(plot.clientWidth) || 640;
      if (W < 280) W = 280;
      lastW = W;
      var g = geo = geometry(W);
      var m = g.m;
      var kids = [];
      // grid + y labels
      if (state.scale === 'log') {
        for (var p = 3; p <= 12; p++) {
          var yy = g.y(Math.pow(10, p));
          var major = (p % 3 === 0);
          kids.push(svg('line', { x1: m.l, x2: g.W - m.r, y1: yy, y2: yy, 'class': major ? 'mc-grid mc-grid-major' : 'mc-grid' }));
          if (major) kids.push(svg('text', { x: m.l - 8, y: yy + 4, 'text-anchor': 'end', 'class': 'mc-tick',
            text: { 3: '1,000', 6: '1 million', 9: '1 billion', 12: '1 trillion' }[p] }));
        }
      } else {
        for (var v = 0; v <= 250e9; v += 50e9) {
          var y2 = g.y(v);
          kids.push(svg('line', { x1: m.l, x2: g.W - m.r, y1: y2, y2: y2, 'class': v === 0 ? 'mc-grid mc-grid-major' : 'mc-grid' }));
          kids.push(svg('text', { x: m.l - 8, y: y2 + 4, 'text-anchor': 'end', 'class': 'mc-tick', text: v === 0 ? '0' : (v / 1e9) + ' billion' }));
        }
      }
      // x axis
      kids.push(svg('line', { x1: m.l, x2: g.W - m.r, y1: m.t + g.ph, y2: m.t + g.ph, 'class': 'mc-axis' }));
      kids.push(svg('line', { x1: m.l, x2: m.l, y1: m.t, y2: m.t + g.ph, 'class': 'mc-axis' }));
      for (var yr = 1970; yr <= 2020; yr += 10) {
        if (g.narrow && (yr === 1990 || yr === 2010) && W < 330) continue;
        kids.push(svg('line', { x1: g.x(yr), x2: g.x(yr), y1: m.t + g.ph, y2: m.t + g.ph + 5, 'class': 'mc-axis' }));
        kids.push(svg('text', { x: g.x(yr), y: m.t + g.ph + 20, 'text-anchor': 'middle', 'class': 'mc-tick', text: String(yr) }));
      }
      kids.push(svg('text', { x: m.l + g.pw / 2, y: g.H - 6, 'text-anchor': 'middle', 'class': 'mc-axis-title', text: 'Year' }));
      // Moore's line
      if (state.moore) {
        var d = '';
        for (var t = 1971; t <= 2024.01; t += 0.5) {
          d += (d ? ' L' : 'M') + g.x(t).toFixed(1) + ' ' + g.y(moore(t)).toFixed(1);
        }
        kids.push(svg('path', { d: d, 'class': 'mc-moore' }));
        kids.push(svg('text', { x: g.x(1971), y: state.scale === 'log' ? g.y(3e10) : g.y(30e9),
          'class': 'mc-moore-label', text: 'Moore: x2 every 2 years' }));
      }
      // points
      pts = {};
      CHIPS.forEach(function (c) {
        var cx = g.x(c.year), cy = g.y(c.n);
        var label = c.year + ', ' + c.chip + ', ' + countText(c);
        var gp = svg('g', { 'class': 'mc-pt' + (state.sel === c.id ? ' is-sel' : ''), tabindex: '0', role: 'button',
          'aria-label': label, 'data-id': c.id }, [
          svg('circle', { cx: cx, cy: cy, r: 16, 'class': 'mc-hit' }),
          svg('circle', { cx: cx, cy: cy, r: 6, 'class': 'mc-dot' })
        ]);
        gp.addEventListener('mouseenter', function () { showTip(c); });
        gp.addEventListener('mouseleave', function () { if (state.sel !== c.id) hideTip(); else showTip(c); });
        gp.addEventListener('focus', function () { showTip(c); });
        gp.addEventListener('blur', function () { if (state.sel) showTip(byId(state.sel)); else hideTip(); });
        gp.addEventListener('click', function () { select(c.id, true); });
        gp.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(c.id, true); }
        });
        pts[c.id] = gp;
        kids.push(gp);
      });
      var s = svg('svg', { viewBox: '0 0 ' + g.W + ' ' + g.H, 'class': 'mc-svg', role: 'group',
        'aria-label': 'Chart: transistors on one chip, by year, ' + state.scale + ' scale' }, kids);
      plot.textContent = '';
      plot.appendChild(s);
      plot.appendChild(tip);
      svgEl = s;
      if (state.sel) showTip(byId(state.sel)); else hideTip();
    }

    function byId(id) { for (var i = 0; i < CHIPS.length; i++) if (CHIPS[i].id === id) return CHIPS[i]; return null; }

    function showTip(c) {
      if (!c || !geo) return;
      var k = (svgEl && svgEl.getBoundingClientRect().width) ? svgEl.getBoundingClientRect().width / geo.W : 1;
      tip.textContent = '';
      tip.appendChild(el('strong', { text: c.chip }));
      tip.appendChild(el('span', { text: c.year + ' · ' + countText(c) }));
      tip.hidden = false;
      var px = geo.x(c.year) * k, py = geo.y(c.n) * k;
      var tw = tip.offsetWidth || 180, th = tip.offsetHeight || 44;
      var left = Math.min(Math.max(4, px - tw / 2), geo.W * k - tw - 4);
      var top = py - th - 12;
      if (top < 2) top = py + 14;
      tip.style.left = left + 'px';
      tip.style.top = top + 'px';
      info.textContent = c.year + ': ' + c.chip + ' has ' + countText(c) + '.';
    }
    function hideTip() { tip.hidden = true; }

    function select(id, speak) {
      state.sel = id;
      Object.keys(pts).forEach(function (k) { pts[k].setAttribute('class', 'mc-pt' + (k === id ? ' is-sel' : '')); });
      var c = byId(id);
      if (c) {
        showTip(c);
        if (speak) say(c.year + ': ' + c.chip + ', ' + countText(c) + '.');
      }
    }

    function setScale(s, speak) {
      state.scale = s;
      bLog.setAttribute('aria-pressed', s === 'log' ? 'true' : 'false');
      bLin.setAttribute('aria-pressed', s === 'linear' ? 'true' : 'false');
      draw();
      if (speak) say(s === 'log'
        ? 'Log scale: each grid line is 1,000 times more. The dots make an almost straight line.'
        : 'Linear scale: almost every chip sits on the floor. Only the newest chips shoot up. That is the explosion.');
    }
    function setMoore(on, speak) {
      state.moore = on;
      bMoore.setAttribute('aria-pressed', on ? 'true' : 'false');
      draw();
      if (speak) say(on ? "Moore's line is on: start at 2,300 in 1971 and double every 2 years. By 2024 that is about "
        + words(sig2(moore(2024))) + '.' : "Moore's line is off.");
    }
    function findPhone(id, speak) {
      if (!id) { state.sel = null; draw(); return; }
      var c = byId(id);
      if (!c) return;
      phoneSel.value = id;
      select(id, false);
      var msg = 'The ' + c.phone.replace(/ \(\d+\)$/, '') + ' chip (' + c.chip.replace(/ \(.*\)$/, '') + ', ' + c.year + ') has '
        + countText(c) + ': about ' + words(sig2(c.n / BASE)) + ' times the Intel 4004.';
      info.textContent = msg;
      if (speak !== false) say0(msg);
    }

    function reset() {
      state.sel = null;
      state.moore = false;
      bMoore.setAttribute('aria-pressed', 'false');
      phoneSel.value = '';
      setScale(startScale, false);
      info.textContent = 'Each dot is one chip. Up = more transistors.';
      say('');
    }

    setScale(startScale, false);
    if (window.ResizeObserver) {
      new ResizeObserver(function () {
        var w = Math.round(plot.clientWidth);
        if (w && Math.abs(w - lastW) > 2) draw();
      }).observe(plot);
    } else {
      window.addEventListener('resize', function () { draw(); });
    }

    return {
      presets: [
        { name: 'log scale', run: function () { reset(); setMoore(true, false); setScale('log', true); } },
        { name: 'linear scale shows the explosion', run: function () { reset(); setScale('linear', true); select('b200', false); } },
        { name: 'find iPhone 15 Pro chip', run: function () { reset(); findPhone('a17', true); } }
      ],
      reset: reset
    };
  });
})();
