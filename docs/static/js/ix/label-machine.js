/* label-machine.js — component 10: drag labels onto numbered spots on a photo of an opened PC or phone.
   Click alternative: click a label, then click a spot (keyboard: Tab, Enter, Tab, Enter).
   Config: machine ("pc"|"phone"), image (URL relative to the site root), labels [{text, x, y}] (x, y in % of the image).
   Contract: SITE_SPEC.md. */
(function () {
  'use strict';
  if (!window.ICT) return;

  /* PLACEHOLDER_POSITIONS — rough positions only (x, y in % of the image width/height).
     The site builder passes the verified positions for each photo through config.labels.
     ratio = image height / width, used for the drawn placeholder if the photo does not load. */
  var PLACEHOLDER_POSITIONS = {
    pc: {
      image: 'img/L5_desktop_open.jpg', ratio: 0.75, name: 'an opened desktop PC',
      labels: [
        { text: 'CPU (under the cooler)', x: 53, y: 47 },
        { text: 'RAM', x: 66, y: 74 },
        { text: 'graphics card (GPU)', x: 26, y: 52 },
        { text: 'power supply', x: 26, y: 13 },
        { text: 'motherboard', x: 45, y: 90 },
        { text: 'storage', x: 72, y: 18 }
      ]
    },
    phone: {
      image: 'img/L1_cold_teardown.jpg', ratio: 1.5, name: 'an opened smartphone',
      labels: [
        { text: 'battery', x: 64, y: 50 },
        { text: 'system on a chip (SoC)', x: 30, y: 31 },
        { text: 'camera', x: 26, y: 11 },
        { text: 'screen connector', x: 36, y: 77 }
      ]
    }
  };

  ICT.register('label-machine', function (root, config, api) {
    config = config || {};
    var el = api.el, svg = api.svg;
    var kind = config.machine === 'phone' ? 'phone' : 'pc';
    var def = PLACEHOLDER_POSITIONS[kind];
    var labels = [];
    (Array.isArray(config.labels) && config.labels.length ? config.labels : def.labels).forEach(function (l) {
      if (l && typeof l.text === 'string') {
        labels.push({ text: l.text, x: Math.max(0, Math.min(100, +l.x || 50)), y: Math.max(0, Math.min(100, +l.y || 50)) });
      }
    });
    if (!labels.length) labels = def.labels.slice();
    var src = api.root + (typeof config.image === 'string' && config.image ? config.image : def.image);

    var assigned = [];       // spot index -> label index or null
    var selected = null;     // label index
    var spots = [], chipEls = [], legendItems = [];
    var suppressClick = false;

    var wrap = el('div', { 'class': 'ix-label-machine is-' + kind });
    root.appendChild(wrap);
    wrap.appendChild(el('p', { 'class': 'ixb-instr', text: 'Put each label on the right number. Drag a label, or click a label and then click a number.' }));

    var stage = el('div', { 'class': 'lm-stage' });
    var img = el('img', { 'class': 'lm-img', alt: 'Photo of ' + def.name + ' with numbered spots', src: src, draggable: 'false' });
    img.addEventListener('error', function () { usePlaceholder(); });
    stage.appendChild(img);

    labels.forEach(function (l, i) {
      var b = el('button', { type: 'button', 'class': 'lm-spot', 'data-i': i, style: { left: l.x + '%', top: l.y + '%' },
        onclick: function () { spotClick(i); } }, [String(i + 1)]);
      spots.push(b);
      stage.appendChild(b);
      assigned.push(null);
    });
    wrap.appendChild(el('div', { 'class': 'lm-frame' }, [stage]));

    var bank = el('div', { 'class': 'lm-bank', role: 'group', 'aria-label': 'Labels' });
    // the bank is sorted A to Z so that the order does not give the answer away
    var order = labels.map(function (l, i) { return i; }).sort(function (a, b) {
      return labels[a].text.toLowerCase() < labels[b].text.toLowerCase() ? -1 : 1;
    });
    order.forEach(function (i) {
      var c = el('button', { type: 'button', 'class': 'lm-chip', 'aria-pressed': 'false', text: labels[i].text });
      c.addEventListener('click', function () {
        if (suppressClick) { suppressClick = false; return; }
        choose(selected === i ? null : i);
      });
      c.addEventListener('pointerdown', function (e) { startDrag(e, i); });
      chipEls[i] = c;
      bank.appendChild(c);
    });
    wrap.appendChild(bank);

    var legend = el('ol', { 'class': 'lm-legend' });
    labels.forEach(function (l, i) {
      var li = el('li', {}, [el('span', { 'class': 'lm-num', 'aria-hidden': 'true', text: String(i + 1) }), el('span', { 'class': 'lm-ans', text: '?' })]);
      legendItems.push(li);
      legend.appendChild(li);
    });
    wrap.appendChild(legend);

    wrap.appendChild(el('div', { 'class': 'ixb-bar' }, [
      el('button', { type: 'button', 'class': 'ixb-btn ixb-primary', text: 'Check', onclick: function () { check(); } }),
      el('button', { type: 'button', 'class': 'ixb-btn', text: 'Show answers', onclick: function () { showAnswers(); } }),
      el('button', { type: 'button', 'class': 'ixb-btn', text: 'Start again', onclick: function () { reset(); } })
    ]));
    var say = api.live(wrap);

    function usePlaceholder() {
      var ratio = def.ratio;
      var H = 100 * ratio;
      var kids = [];
      if (kind === 'phone') {
        kids.push(svg('rect', { x: 14, y: 2, width: 72, height: H - 4, rx: 10, 'class': 'lm-ph-outline' }));
      } else {
        kids.push(svg('rect', { x: 8, y: 3, width: 84, height: H - 6, rx: 2, 'class': 'lm-ph-outline' }));
      }
      labels.forEach(function (l) {
        var w = kind === 'phone' ? 26 : 18, h = kind === 'phone' ? 18 : 12;
        var cx = l.x, cy = l.y * ratio;
        kids.push(svg('rect', { x: Math.max(1, cx - w / 2), y: Math.max(1, cy - h / 2), width: w, height: h, rx: 1.5, 'class': 'lm-ph-part' }));
      });
      var pic = svg('svg', { viewBox: '0 0 100 ' + H, 'class': 'lm-ph', role: 'img', 'aria-label': 'Simple drawing of ' + def.name + ' with numbered parts' }, kids);
      if (img.parentNode) img.parentNode.replaceChild(pic, img);
      wrap.classList.add('is-drawn');
      note.hidden = false;
    }
    var note = el('p', { 'class': 'ixb-small', hidden: true, text: 'The photo did not load, so here is a simple drawing. The labels work the same way.' });
    wrap.insertBefore(note, wrap.children[1].nextSibling);

    function choose(i) {
      selected = i;
      chipEls.forEach(function (c, k) { if (c) c.setAttribute('aria-pressed', k === i ? 'true' : 'false'); });
      wrap.classList.toggle('has-sel', i !== null);
      if (i !== null) say('"' + labels[i].text + '" chosen. Now click a number on the picture.');
    }

    function spotClick(s) {
      if (suppressClick) { suppressClick = false; return; }
      if (selected !== null) { put(selected, s, true); return; }
      if (assigned[s] !== null) {
        var li = assigned[s];
        assigned[s] = null;
        render();
        choose(li);
        say('Spot ' + (s + 1) + ' is empty again. "' + labels[li].text + '" is chosen: click a number to move it.');
      } else {
        say('First choose a label.');
      }
    }

    function put(li, s, speak) {
      for (var k = 0; k < assigned.length; k++) if (assigned[k] === li) assigned[k] = null;
      assigned[s] = li;
      choose(null);
      render();
      if (speak) {
        say('"' + labels[li].text + '" is on number ' + (s + 1) + '.');
        spots[s].focus();
      }
    }

    function render(marks) {
      spots.forEach(function (b, s) {
        var li = assigned[s];
        var cls = 'lm-spot' + (li !== null ? ' is-full' : '');
        if (marks) cls += marks[s] ? ' is-ok' : ' is-bad';
        b.className = cls;
        b.setAttribute('aria-label', 'Number ' + (s + 1) + ': ' + (li !== null ? labels[li].text : 'empty')
          + (marks ? (marks[s] ? ', correct' : ', not correct') : ''));
        var ans = legendItems[s].querySelector('.lm-ans');
        ans.textContent = li !== null ? labels[li].text : '?';
        legendItems[s].className = marks ? (marks[s] ? 'is-ok' : 'is-bad') : '';
        var old = legendItems[s].querySelector('.ixb-mark');
        if (old) old.parentNode.removeChild(old);
        if (marks) legendItems[s].appendChild(el('span', { 'class': 'ixb-mark', text: marks[s] ? '✓ right' : '✗ ' + (li === null ? 'empty' : 'not this one') }));
      });
      chipEls.forEach(function (c, i) {
        if (!c) return;
        var at = assigned.indexOf(i);
        c.classList.toggle('is-used', at >= 0);
        c.setAttribute('aria-label', labels[i].text + (at >= 0 ? ' (on number ' + (at + 1) + ')' : ''));
      });
    }

    function check() {
      var marks = assigned.map(function (li, s) { return li !== null && labels[li].text === labels[s].text; });
      render(marks);
      var good = marks.filter(Boolean).length;
      say(good + ' of ' + labels.length + ' labels are right.' + (good === labels.length ? ' Well done!' : ' Move the wrong ones and check again.'),
        good === labels.length ? 'ok' : null);
      return good;
    }

    function showAnswers() {
      for (var s = 0; s < labels.length; s++) assigned[s] = s;
      choose(null);
      render(labels.map(function () { return true; }));
      say('Here are the answers. Number 1 is ' + labels[0].text + '.');
    }

    function startDrag(e, li) {
      if (e.button !== undefined && e.button !== 0) return;
      var b = chipEls[li];
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
        var spot = t && t.closest ? t.closest('.lm-spot') : null;
        if (!spot && t && stage.contains(t)) {
          // dropped near a spot: take the closest one within 40 px
          var best = -1, bd = 40 * 40;
          spots.forEach(function (sp, k) {
            var r = sp.getBoundingClientRect();
            var d = Math.pow(r.left + r.width / 2 - ev.clientX, 2) + Math.pow(r.top + r.height / 2 - ev.clientY, 2);
            if (d < bd) { bd = d; best = k; }
          });
          if (best >= 0) spot = spots[best];
        }
        if (spot && stage.contains(spot)) put(li, +spot.getAttribute('data-i'), true);
      }
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
      window.addEventListener('pointercancel', up);
    }

    function reset() {
      for (var s = 0; s < assigned.length; s++) assigned[s] = null;
      choose(null);
      render();
      say('');
    }

    render();

    return {
      presets: [
        { name: 'label all correctly', run: function () {
          reset();
          for (var s = 0; s < labels.length; s++) assigned[s] = s;
          render(); check();
        } },
        { name: 'reset', run: function () { reset(); } }
      ],
      reset: reset
    };
  });
})();
