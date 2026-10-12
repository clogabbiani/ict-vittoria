/* memory-kitchen.js — component 9: place cache / RAM / SSD / HDD / USB stick / cloud on a
   speed-vs-size map (5 speed rows x 5 size columns). Drag with mouse or finger, or click a chip and
   then click a square, or use the arrow keys on a chip. "Check" gives feedback per item with the
   kitchen line. No config. Contract: SITE_SPEC.md. */
(function () {
  'use strict';
  if (!window.ICT) return;

  var SPEED = ['slowest', 'slow', 'fast', 'very fast', 'fastest'];          // index 0 = bottom row
  var SIZE = ['tiny', 'small', 'big', 'very big', 'huge'];                   // index 0 = left column
  var SIZE_HINT = ['a few MB', '8–32 GB', '32–256 GB', '0.5–4 TB', 'no limit'];

  // speed/size = the correct row/column. USB and HDD share the "slow" row (accepted in either order).
  var ITEMS = [
    { id: 'cache', name: 'Cache', kitchen: 'the countertop', speed: 4, size: 0,
      line: 'tiny, but right under the cook\'s hands: the fastest of all.' },
    { id: 'ram', name: 'RAM', kitchen: 'the workbench', speed: 3, size: 1,
      line: 'very fast and quite small. It is emptied when the power goes off.' },
    { id: 'ssd', name: 'SSD', kitchen: 'the pantry (the fast one)', speed: 2, size: 3,
      line: 'very big and keeps everything when the power is off. No moving parts, so it is fast.' },
    { id: 'hdd', name: 'HDD', kitchen: 'the pantry (the slow one)', speed: 1, size: 3,
      line: 'as big as an SSD or bigger, but a spinning disk and a moving arm make it slow.' },
    { id: 'usb', name: 'USB stick', kitchen: 'a lunch box you carry around', speed: 1, size: 2,
      line: 'small enough for your pocket. Slow like an HDD: it depends on the stick, some new ones are faster.' },
    { id: 'cloud', name: 'Cloud', kitchen: 'a warehouse across town', speed: 0, size: 4,
      line: 'almost no limit, but everything travels through the internet, so it is the slowest.' }
  ];

  ICT.register('memory-kitchen', function (root, config, api) {
    var el = api.el;
    var pos = {};           // id -> {s, z} or null (in the tray)
    var selected = null;
    var chips = {};
    var cells = {};         // "s,z" -> chip container
    var suppressClick = false;

    var wrap = el('div', { 'class': 'ix-memory-kitchen' });
    root.appendChild(wrap);
    wrap.appendChild(el('p', { 'class': 'ixb-instr', text: 'Put each kind of memory on the map: how fast is it, and how much does it hold? Drag a chip, or click a chip and then a square.' }));

    var tray = el('div', { 'class': 'mk-tray', role: 'group', 'aria-label': 'Chips not placed yet' });
    var trayBtn = el('button', { type: 'button', 'class': 'mk-tray-target', 'aria-label': 'Put the chosen chip back here', onclick: function () { if (selected) place(selected, null, true); } });
    wrap.appendChild(el('div', { 'class': 'mk-tray-box' }, [trayBtn, el('span', { 'class': 'mk-tray-label', 'aria-hidden': 'true', text: 'Chips' }), tray]));

    // the map
    var grid = el('div', { 'class': 'mk-grid', role: 'group', 'aria-label': 'Speed and size map' });
    for (var s = SPEED.length - 1; s >= 0; s--) {
      grid.appendChild(el('div', { 'class': 'mk-rowlab', text: SPEED[s] }));
      for (var z = 0; z < SIZE.length; z++) {
        (function (s, z) {
          var holder = el('div', { 'class': 'mk-in' });
          var target = el('button', { type: 'button', 'class': 'mk-target', 'data-s': s, 'data-z': z,
            'aria-label': 'Speed: ' + SPEED[s] + '. Size: ' + SIZE[z] + '.',
            onclick: function () { if (selected) place(selected, { s: s, z: z }, true); else say('First choose a chip.'); } });
          grid.appendChild(el('div', { 'class': 'mk-cell' + ((s + z) % 2 ? ' is-alt' : '') }, [target, holder]));
          cells[s + ',' + z] = holder;
        })(s, z);
      }
    }
    grid.appendChild(el('div', { 'class': 'mk-corner', 'aria-hidden': 'true' }));
    for (var z2 = 0; z2 < SIZE.length; z2++) {
      grid.appendChild(el('div', { 'class': 'mk-collab' }, [SIZE[z2], el('span', { text: SIZE_HINT[z2] })]));
    }
    wrap.appendChild(el('div', { 'class': 'mk-map' }, [
      el('div', { 'class': 'mk-yaxis', 'aria-hidden': 'true', text: 'faster ↑' }),
      grid,
      el('div', { 'class': 'mk-xaxis', 'aria-hidden': 'true', text: 'holds more →' })
    ]));

    var checkBtn = el('button', { type: 'button', 'class': 'ixb-btn ixb-primary', text: 'Check', onclick: function () { check(); } });
    var resetBtn = el('button', { type: 'button', 'class': 'ixb-btn', text: 'Start again', onclick: function () { reset(); } });
    wrap.appendChild(el('div', { 'class': 'ixb-bar' }, [checkBtn, resetBtn]));
    wrap.appendChild(el('p', { 'class': 'ixb-small', text: 'Keyboard: Tab to a chip, then use the arrow keys (up = faster, right = holds more). Escape puts it back.' }));
    var say = api.live(wrap);
    var results = el('ul', { 'class': 'ixb-results', hidden: true });
    wrap.appendChild(results);

    ITEMS.forEach(function (it) {
      var b = el('button', { type: 'button', 'class': 'mk-chip', 'aria-pressed': 'false', 'data-id': it.id, text: it.name });
      b.addEventListener('click', function () {
        if (suppressClick) { suppressClick = false; return; }
        choose(selected === it.id ? null : it.id);
      });
      b.addEventListener('keydown', function (e) { onKey(e, it.id); });
      b.addEventListener('pointerdown', function (e) { startDrag(e, it.id); });
      chips[it.id] = b;
      pos[it.id] = null;
    });

    function item(id) { for (var i = 0; i < ITEMS.length; i++) if (ITEMS[i].id === id) return ITEMS[i]; return null; }

    function choose(id) {
      selected = id;
      Object.keys(chips).forEach(function (k) { chips[k].setAttribute('aria-pressed', k === id ? 'true' : 'false'); });
      wrap.classList.toggle('has-sel', !!id);
      if (id) say(item(id).name + ' chosen. Now click a square on the map.');
    }

    function render(focusId) {
      tray.textContent = '';
      Object.keys(cells).forEach(function (k) { cells[k].textContent = ''; });
      ITEMS.forEach(function (it) {
        var p = pos[it.id];
        var b = chips[it.id];
        b.classList.remove('is-ok', 'is-bad');
        var where = p ? 'Speed ' + SPEED[p.s] + ', size ' + SIZE[p.z] : 'not placed';
        b.setAttribute('aria-label', it.name + ': ' + where);
        if (p) cells[p.s + ',' + p.z].appendChild(b); else tray.appendChild(b);
      });
      tray.classList.toggle('is-empty', !tray.children.length);
      if (focusId && chips[focusId]) chips[focusId].focus();
    }

    function place(id, p, speak) {
      pos[id] = p;
      results.hidden = true;
      render(speak ? id : null);
      choose(null);
      if (speak) {
        var it = item(id);
        say(p ? it.name + ': speed ' + SPEED[p.s] + ', size ' + SIZE[p.z] + '.' : it.name + ' is back with the chips.');
      }
    }

    function onKey(e, id) {
      var p = pos[id] ? { s: pos[id].s, z: pos[id].z } : null;
      var k = e.key;
      if (k === 'Escape') { e.preventDefault(); place(id, null, true); return; }
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].indexOf(k) < 0) return;
      e.preventDefault();
      if (!p) p = { s: 2, z: 2 };
      else if (k === 'ArrowUp') p.s = Math.min(4, p.s + 1);
      else if (k === 'ArrowDown') p.s = Math.max(0, p.s - 1);
      else if (k === 'ArrowRight') p.z = Math.min(4, p.z + 1);
      else if (k === 'ArrowLeft') p.z = Math.max(0, p.z - 1);
      place(id, p, true);
    }

    // pointer drag (mouse, pen, touch)
    function startDrag(e, id) {
      if (e.button !== undefined && e.button !== 0) return;
      var b = chips[id];
      var sx = e.clientX, sy = e.clientY, dragging = false;
      function move(ev) {
        var dx = ev.clientX - sx, dy = ev.clientY - sy;
        if (!dragging && Math.abs(dx) + Math.abs(dy) > 6) { dragging = true; b.classList.add('is-drag'); }
        if (dragging) { ev.preventDefault(); b.style.transform = 'translate(' + dx + 'px,' + dy + 'px)'; }
      }
      function up(ev) {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        window.removeEventListener('pointercancel', up);
        if (!dragging) return;
        suppressClick = true;
        setTimeout(function () { suppressClick = false; }, 0);
        b.style.visibility = 'hidden';
        var t = document.elementFromPoint(ev.clientX, ev.clientY);
        b.style.visibility = '';
        b.style.transform = '';
        b.classList.remove('is-drag');
        var cell = t && t.closest ? t.closest('.mk-cell') : null;
        if (cell && grid.contains(cell)) {
          var tg = cell.querySelector('.mk-target');
          place(id, { s: +tg.getAttribute('data-s'), z: +tg.getAttribute('data-z') }, true);
        } else if (t && t.closest && t.closest('.mk-tray-box')) {
          place(id, null, true);
        }
      }
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
      window.addEventListener('pointercancel', up);
    }

    function check() {
      results.textContent = '';
      var good = 0;
      ITEMS.forEach(function (it) {
        var p = pos[it.id], ok = false, msg;
        if (!p) {
          msg = 'not placed yet.';
        } else {
          var sOk = p.s === it.speed, zOk = p.z === it.size;
          ok = sOk && zOk;
          if (ok) msg = 'right! ' + capital(it.kitchen) + ': ' + it.line;
          else {
            var parts = [];
            if (!sOk) parts.push(p.s < it.speed ? 'it is faster than that' : 'it is slower than that');
            if (!zOk) parts.push(p.z < it.size ? 'it holds more than that' : 'it holds less than that');
            msg = 'not yet: ' + parts.join(', and ') + '. Think of ' + it.kitchen + '.';
          }
        }
        if (ok) good++;
        chips[it.id].classList.add(ok ? 'is-ok' : 'is-bad');
        results.appendChild(el('li', { 'class': ok ? 'is-ok' : 'is-bad' }, [
          el('span', { 'class': 'ixb-mark', 'aria-hidden': 'true', text: ok ? '✓' : '✗' }),
          el('span', {}, [el('strong', { text: it.name + ': ' }), msg])
        ]));
      });
      if (good === ITEMS.length) {
        results.appendChild(el('li', { 'class': 'is-note' }, [el('span', {}, ['USB stick or HDD: which is slower? It depends on the model. Both are much slower than an SSD.'])]));
      }
      results.hidden = false;
      say(good + ' of ' + ITEMS.length + ' in the right place.' + (good === ITEMS.length ? ' The faster the memory, the smaller it is. That is why a computer uses all of them.' : ''),
        good === ITEMS.length ? 'ok' : null);
      return good;
    }
    function capital(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

    function reset() {
      ITEMS.forEach(function (it) { pos[it.id] = null; });
      results.hidden = true;
      results.textContent = '';
      choose(null);
      render();
      say('');
    }

    render();

    return {
      presets: [
        { name: 'place all correctly', run: function () {
          reset();
          ITEMS.forEach(function (it) { pos[it.id] = { s: it.speed, z: it.size }; });
          render(); check();
        } },
        { name: 'one mistake', run: function () {
          reset();
          ITEMS.forEach(function (it) { pos[it.id] = { s: it.speed, z: it.size }; });
          pos.hdd = { s: 2, z: 3 };     // HDD as fast as the SSD: a common mistake
          render(); check();
        } }
      ],
      reset: reset
    };
  });
})();
