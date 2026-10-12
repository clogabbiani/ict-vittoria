/* timeline-game.js — component 13: put 12 inventions in order (oldest at the top).
   Drag a card, or select it and use Move up / Move down (or the arrow keys), or select it and click
   another card to move it there. "Check" marks each place and shows the year and one line.
   Config: items [{year, label, line}], seed (int, optional: deterministic shuffle). Contract: SITE_SPEC.md. */
(function () {
  'use strict';
  if (!window.ICT) return;

  var DEFAULT_ITEMS = [
    { year: 1804, label: "Jacquard's punched-card loom", line: 'Cards tell the loom which threads to lift.' },
    { year: 1843, label: "Ada Lovelace's Note G", line: 'A method for a machine that was never built.' },
    { year: 1854, label: "Boole's logic", line: 'Thinking as TRUE and FALSE.' },
    { year: 1936, label: "Turing's paper on computable numbers", line: 'A machine that can do any calculation.' },
    { year: 1937, label: "Shannon's switches", line: 'Circuits can do logic.' },
    { year: 1940, label: 'The Bombe', line: 'Machines against Enigma.' },
    { year: 1945, label: 'ENIAC', line: 'The giant electronic calculator.' },
    { year: 1947, label: 'The transistor', line: 'A switch with no moving parts.' },
    { year: 1956, label: 'The RAMAC hard disk', line: 'The first hard disk.' },
    { year: 1971, label: 'The Intel 4004', line: 'A CPU on one chip.' },
    { year: 1984, label: 'The Macintosh', line: 'A computer for everyone, with a mouse.' },
    { year: 2007, label: 'The iPhone', line: 'A computer in your pocket.' }
  ];

  function rng(seed) {   // mulberry32: same seed, same shuffle
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  ICT.register('timeline-game', function (root, config, api) {
    config = config || {};
    var el = api.el;
    var items = [];
    (Array.isArray(config.items) ? config.items : []).forEach(function (it) {
      if (it && it.label && isFinite(+it.year)) items.push({ year: +it.year, label: String(it.label), line: String(it.line || '') });
    });
    if (items.length < 2) items = DEFAULT_ITEMS.slice();
    items.forEach(function (it, i) { it.id = i; });
    var sorted = items.slice().sort(function (a, b) { return a.year - b.year; });

    var order = [];         // current order of item ids
    var selected = null;    // id
    var marks = null;       // array of booleans after Check
    var revealed = {};      // id -> true once its year has been shown
    var suppressClick = false;
    var cardEls = {};

    var wrap = el('div', { 'class': 'ix-timeline-game' });
    root.appendChild(wrap);
    wrap.appendChild(el('p', { 'class': 'ixb-instr', text: 'Put the inventions in order: the oldest at the top. Drag a card, or select it and move it up or down.' }));
    var list = el('ol', { 'class': 'tg-list', 'aria-label': 'Inventions, from oldest (top) to newest (bottom)' });
    wrap.appendChild(list);
    var score = el('p', { 'class': 'tg-score', hidden: true });
    wrap.appendChild(el('div', { 'class': 'ixb-bar' }, [
      el('button', { type: 'button', 'class': 'ixb-btn ixb-primary', text: 'Check', onclick: function () { check(); } }),
      el('button', { type: 'button', 'class': 'ixb-btn', text: 'Shuffle', onclick: function () { shuffle(); render(); say('Shuffled. Try again.'); } })
    ]));
    wrap.appendChild(score);
    var say = api.live(wrap.appendChild(el('div', { 'class': 'ixb-sr' })));   // the visible score is .tg-score

    function byId(id) { return items[id]; }

    function shuffle(seed) {
      var ids = items.map(function (it) { return it.id; });
      var rand = seed !== undefined ? rng(seed) : Math.random;
      var tries = 0;
      do {
        for (var i = ids.length - 1; i > 0; i--) {
          var j = Math.floor(rand() * (i + 1));
          var t = ids[i]; ids[i] = ids[j]; ids[j] = t;
        }
        tries++;
      } while (tries < 10 && rightCount(ids) > ids.length / 3);
      order = ids;
      marks = null;
      revealed = {};
      selected = null;
      score.hidden = true;
    }

    function rightCount(ids) {
      var n = 0;
      ids.forEach(function (id, pos) { if (byId(id).year === sorted[pos].year) n++; });
      return n;
    }

    function render(focusId) {
      list.textContent = '';
      cardEls = {};
      order.forEach(function (id, pos) {
        var it = byId(id);
        var main = el('button', { type: 'button', 'class': 'tg-main', 'aria-pressed': selected === id ? 'true' : 'false',
          'aria-label': (pos + 1) + '. ' + it.label + (revealed[id] ? ', ' + it.year : '') + (marks ? (marks[pos] ? ', right place' : ', wrong place') : '')
            + '. Arrow keys move it.' }, [
          el('span', { 'class': 'tg-grip', 'aria-hidden': 'true' }),
          el('span', { 'class': 'tg-pos', 'aria-hidden': 'true', text: String(pos + 1) }),
          el('span', { 'class': 'tg-text' }, [
            el('span', { 'class': 'tg-label', text: it.label }),
            revealed[id] ? el('span', { 'class': 'tg-line' }, [el('strong', { text: it.year + ' · ' }), it.line]) : null
          ])
        ]);
        main.addEventListener('click', function () {
          if (suppressClick) { suppressClick = false; return; }
          if (selected !== null && selected !== id) { moveTo(selected, order.indexOf(id), true); return; }
          selected = selected === id ? null : id;
          render(id);
          if (selected !== null) say(it.label + ' selected. Use Move up and Move down, or click the place where it goes.');
        });
        main.addEventListener('keydown', function (e) {
          if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault();
            moveTo(id, order.indexOf(id) + (e.key === 'ArrowUp' ? -1 : 1), true);
          } else if (e.key === 'Escape') { selected = null; render(id); }
        });
        main.addEventListener('pointerdown', function (e) { startDrag(e, id); });
        var up = el('button', { type: 'button', 'class': 'tg-move', 'aria-label': 'Move up: ' + it.label, disabled: pos === 0,
          onclick: function () { moveTo(id, order.indexOf(id) - 1, true, 'up'); } }, ['▲']);
        var down = el('button', { type: 'button', 'class': 'tg-move', 'aria-label': 'Move down: ' + it.label, disabled: pos === order.length - 1,
          onclick: function () { moveTo(id, order.indexOf(id) + 1, true, 'down'); } }, ['▼']);
        var cls = 'tg-card' + (selected === id ? ' is-sel' : '') + (marks ? (marks[pos] ? ' is-ok' : ' is-bad') : '');
        var li = el('li', { 'class': cls, 'data-id': id }, [main, el('span', { 'class': 'tg-btns' }, [up, down]),
          marks ? el('span', { 'class': 'tg-mark', 'aria-hidden': 'true', text: marks[pos] ? '✓' : '✗' }) : null]);
        cardEls[id] = { li: li, main: main, up: up, down: down };
        list.appendChild(li);
      });
      if (focusId !== undefined && focusId !== null && cardEls[focusId]) cardEls[focusId].main.focus();
    }

    function moveTo(id, to, speak, which) {
      var from = order.indexOf(id);
      if (from < 0) return;
      to = Math.max(0, Math.min(order.length - 1, to));
      if (to === from) return;
      order.splice(from, 1);
      order.splice(to, 0, id);
      marks = null;
      score.hidden = true;
      selected = id;
      render(id);
      var c = cardEls[id];
      if (which === 'up' && c && !c.up.disabled) c.up.focus();
      if (which === 'down' && c && !c.down.disabled) c.down.focus();
      if (speak) say(byId(id).label + ' is now number ' + (to + 1) + ' of ' + order.length + '.');
    }

    function startDrag(e, id) {
      if (e.button !== undefined && e.button !== 0) return;
      // on touch screens only the grip drags, so the page can still scroll
      if (e.pointerType === 'touch' && !(e.target.closest && e.target.closest('.tg-grip'))) return;
      var li = cardEls[id].li;
      var sy = e.clientY, sx = e.clientX, dragging = false;
      function move(ev) {
        var dy = ev.clientY - sy;
        if (!dragging && Math.abs(dy) + Math.abs(ev.clientX - sx) > 6) { dragging = true; li.classList.add('is-drag'); }
        if (dragging) { ev.preventDefault(); li.style.transform = 'translateY(' + dy + 'px)'; }
      }
      function up(ev) {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        window.removeEventListener('pointercancel', up);
        if (!dragging) return;
        suppressClick = true;
        setTimeout(function () { suppressClick = false; }, 0);
        li.style.transform = '';
        li.classList.remove('is-drag');
        // new index = how many other cards have their middle above the pointer
        var to = 0;
        order.forEach(function (oid) {
          if (oid === id) return;
          var r = cardEls[oid].li.getBoundingClientRect();
          if (r.top + r.height / 2 < ev.clientY) to++;
        });
        selected = null;
        moveTo(id, to, true);
        selected = null;
        render(id);
      }
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
      window.addEventListener('pointercancel', up);
    }

    function check() {
      marks = order.map(function (id, pos) { return byId(id).year === sorted[pos].year; });
      order.forEach(function (id) { revealed[id] = true; });
      selected = null;
      render();
      var n = marks.filter(Boolean).length;
      var msg = n + ' of ' + order.length + ' in the right place.' + (n === order.length ? ' Perfect timeline!' : ' The years are now shown: move the wrong cards and check again.');
      score.textContent = msg;
      score.className = 'tg-score' + (n === order.length ? ' is-ok' : '');
      score.hidden = false;
      say(msg, n === order.length ? 'ok' : null);
      return n;
    }

    function reset() {
      if (config.seed !== undefined && isFinite(+config.seed)) shuffle(+config.seed); else shuffle();
      render();
      say('');
    }

    reset();

    return {
      presets: [
        { name: 'solve', run: function () {
          order = sorted.map(function (it) { return it.id; });
          selected = null;
          check();
        } },
        { name: 'shuffle and check', run: function () { shuffle(7); render(); check(); } }
      ],
      reset: reset
    };
  });
})();
