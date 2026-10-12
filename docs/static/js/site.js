/* site.js — shell for the ICT · Liceo Vittoria site: theme, readability, print, progress,
   "Your turn" autosave, and the quiz engine (mc, tf, num, order, match, open).
   Contract: site_src/SITE_SPEC.md. Vanilla ES2017, no globals, no console output. */
(function () {
  'use strict';

  var doc = document;
  var html = doc.documentElement;

  /* ---------------------------------------------------------------- storage (try/catch-safe) */
  var store = (window.ICT && window.ICT.api && window.ICT.api.store) || {
    get: function (k, f) { try { var r = window.localStorage.getItem(k); return r === null ? f : JSON.parse(r); } catch (e) { return f; } },
    set: function (k, v) { try { window.localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  };

  function el(tag, attrs, children) {
    var n = doc.createElement(tag);
    attrs = attrs || {};
    Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v === null || v === undefined || v === false) return;
      if (k === 'class') n.className = v;
      else if (k === 'text') n.textContent = v;
      else if (k.slice(0, 2) === 'on' && typeof v === 'function') n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? '' : v);
    });
    (children || []).forEach(function (c) {
      if (c === null || c === undefined || c === false) return;
      n.appendChild(typeof c === 'string' || typeof c === 'number' ? doc.createTextNode(String(c)) : c);
    });
    return n;
  }

  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function safe(fn) { try { fn(); } catch (e) { /* never break the page */ } }

  var uid = 0;
  function nextId(prefix) { uid += 1; return (prefix || 'x') + '-' + uid; }

  /* ---------------------------------------------------------------- theme */
  var THEMES = ['auto', 'light', 'dark'];
  var THEME_NAMES = { auto: 'Auto', light: 'Light', dark: 'Dark' };

  function applyTheme(t) {
    if (THEMES.indexOf(t) < 0) t = 'auto';
    html.setAttribute('data-theme', t);
    var b = doc.querySelector('[data-action="theme"]');
    if (b) {
      var lab = b.querySelector('.tool-label');
      if (lab) lab.textContent = THEME_NAMES[t];
      b.setAttribute('aria-label', 'Theme: ' + THEME_NAMES[t] + '. Change theme');
    }
  }

  function initTheme() {
    applyTheme(store.get('ict-theme', 'auto'));
    var b = doc.querySelector('[data-action="theme"]');
    if (!b) return;
    b.addEventListener('click', function () {
      var cur = html.getAttribute('data-theme') || 'auto';
      var nxt = THEMES[(THEMES.indexOf(cur) + 1) % THEMES.length];
      applyTheme(nxt);
      store.set('ict-theme', nxt);
    });
  }

  /* ---------------------------------------------------------------- readability + font */
  function applyRead(on) {
    if (on) html.setAttribute('data-read', '1'); else html.removeAttribute('data-read');
    var b = doc.querySelector('[data-action="read"]');
    if (b) b.setAttribute('aria-pressed', on ? 'true' : 'false');
  }
  function applyFont(on) {
    if (on) html.setAttribute('data-font', 'atkinson'); else html.removeAttribute('data-font');
    var b = doc.querySelector('[data-action="font"]');
    if (b) b.setAttribute('aria-pressed', on ? 'true' : 'false');
  }
  function initRead() {
    applyRead(!!store.get('ict-read', false));
    applyFont(store.get('ict-font', '') === 'atkinson');
    var r = doc.querySelector('[data-action="read"]');
    if (r) r.addEventListener('click', function () {
      var on = html.getAttribute('data-read') !== '1';
      applyRead(on); store.set('ict-read', on);
    });
    var f = doc.querySelector('[data-action="font"]');
    if (f) f.addEventListener('click', function () {
      var on = html.getAttribute('data-font') !== 'atkinson';
      applyFont(on); store.set('ict-font', on ? 'atkinson' : '');
    });
  }

  /* ---------------------------------------------------------------- print */
  function initPrint() {
    var b = doc.querySelector('[data-action="print"]');
    if (b) b.addEventListener('click', function () { safe(function () { window.print(); }); });
    var closed = [];
    window.addEventListener('beforeprint', function () {
      closed = [];
      var ds = doc.querySelectorAll('details:not([open])');
      for (var i = 0; i < ds.length; i++) { closed.push(ds[i]); ds[i].open = true; }
    });
    window.addEventListener('afterprint', function () {
      closed.forEach(function (d) { d.open = false; });
      closed = [];
    });
  }

  /* ---------------------------------------------------------------- progress */
  var PKEY = 'ict-u1-progress-';
  var progress = null;   // {slug, key, state, items:[ids]}

  function pctText(p) { return p >= 100 ? 'Done' : (p > 0 ? p + '% done' : 'Not started'); }

  function initProgress() {
    var slug = doc.body.getAttribute('data-slug');
    if (!slug) return;
    var items = [];
    if (doc.querySelector('[data-section="check"] .q')) items.push('check');
    var ex = doc.querySelectorAll('[data-section="exercises"] .q');
    for (var i = 0; i < ex.length; i++) items.push(ex[i].id);
    if (doc.querySelector('[data-section="turn"] textarea')) items.push('turn');
    var st = store.get(PKEY + slug, null);
    if (!st || typeof st !== 'object' || typeof st.done !== 'object' || st.done === null) st = { done: {} };
    progress = { slug: slug, key: PKEY + slug, state: st, items: items };
    renderProgress();
  }

  function renderProgress() {
    if (!progress) return;
    var n = 0;
    progress.items.forEach(function (id) { if (progress.state.done[id]) n += 1; });
    var p = progress.items.length ? Math.round(100 * n / progress.items.length) : 0;
    progress.state.pct = p;
    progress.state.total = progress.items.length;
    var bar = doc.querySelector('.progress');
    if (!bar) return;
    var fill = bar.querySelector('.progress-fill');
    var track = bar.querySelector('.progress-track');
    var txt = bar.querySelector('.progress-text');
    if (fill) fill.style.width = p + '%';
    if (track) { track.setAttribute('aria-valuenow', String(p)); track.setAttribute('aria-valuetext', p + '% of this chapter done'); }
    if (txt) txt.textContent = p + '% done';
  }

  function markDone(id) {
    if (!progress || progress.items.indexOf(id) < 0 || progress.state.done[id]) return;
    progress.state.done[id] = true;
    renderProgress();
    store.set(progress.key, progress.state);
  }

  function initUnitBars() {
    var cards = doc.querySelectorAll('.chapter-card[data-progress-slug]');
    for (var i = 0; i < cards.length; i++) {
      var c = cards[i];
      var st = store.get(PKEY + c.getAttribute('data-progress-slug'), null);
      var p = 0;
      if (st && typeof st === 'object') {
        if (typeof st.pct === 'number') p = st.pct;
        else if (st.done && st.total) p = Math.round(100 * Object.keys(st.done).length / st.total);
      }
      p = Math.max(0, Math.min(100, p));
      var bar = c.querySelector('.mini-bar span');
      var txt = c.querySelector('.mini-text');
      if (bar) bar.style.width = p + '%';
      if (txt) txt.textContent = pctText(p);
    }
  }

  /* ---------------------------------------------------------------- your turn */
  function copyText(text, done) {
    function fallback() {
      var ta = el('textarea', { 'class': 'sr-only', 'aria-hidden': 'true' });
      ta.value = text; doc.body.appendChild(ta); ta.select();
      var ok = false;
      try { ok = doc.execCommand('copy'); } catch (e) { ok = false; }
      doc.body.removeChild(ta);
      done(ok);
    }
    try {
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(function () { done(true); }, fallback);
        return;
      }
    } catch (e) { /* fall through */ }
    fallback();
  }

  function initYourTurn() {
    var tas = doc.querySelectorAll('textarea[data-turn-id]');
    for (var i = 0; i < tas.length; i++) (function (ta) {
      var key = 'ict-u1-turn-' + ta.getAttribute('data-turn-id');
      var box = ta.closest('section') || ta.parentNode;
      var note = box.querySelector('.turn-note');
      var saved = store.get(key, '');
      if (typeof saved === 'string' && saved) { ta.value = saved; markDone('turn'); }
      var t = null;
      ta.addEventListener('input', function () {
        if (t) clearTimeout(t);
        t = setTimeout(function () {
          var ok = store.set(key, ta.value);
          if (note) note.textContent = ok ? 'Saved in this browser only. Nothing is sent anywhere.'
            : 'This browser does not allow saving. Copy your text before you leave the page.';
          if (ta.value.trim().length) markDone('turn');
        }, 400);
      });
      var btn = box.querySelector('[data-action="copy-turn"]');
      if (btn) btn.addEventListener('click', function () {
        copyText(ta.value, function (ok) {
          if (note) note.textContent = ok ? 'Copied. Paste it where your teacher asks.' : 'Select the text and copy it with Ctrl+C.';
        });
      });
    })(tas[i]);
  }

  /* ---------------------------------------------------------------- quiz engine */
  var LETTERS = 'ABCDEFGHIJ';

  function Quiz(root) {
    this.root = root;
    this.q = JSON.parse(root.getAttribute('data-q'));
    this.kind = root.getAttribute('data-kind') || 'check';
    this.attempts = 0;
    this.build();
  }

  Quiz.prototype.build = function () {
    var q = this.q, self = this;
    var root = this.root;
    while (root.firstChild) root.removeChild(root.firstChild);
    this.textId = nextId('qt');
    root.appendChild(el('p', { 'class': 'q-text', id: this.textId, text: q.q || '' }));
    this.body = el('div', { 'class': 'q-body' });
    root.appendChild(this.body);
    this.actions = el('div', { 'class': 'q-actions' });
    this.feedback = el('p', { 'class': 'q-feedback', 'aria-live': 'polite' });
    var t = q.type;
    if (t === 'mc' || t === 'tf') this.buildChoice();
    else if (t === 'num') this.buildNum();
    else if (t === 'order') this.buildOrder();
    else if (t === 'match') this.buildMatch();
    else if (t === 'open') this.buildOpen();
    else this.body.appendChild(el('p', { 'class': 'q-help', text: 'This question type is not supported.' }));

    if (this.kind === 'exercise') {
      if (q.hint) this.addReveal('Hint', 'q-hint', q.hint);
      if (q.solution && t !== 'open') this.addReveal('Show solution', 'q-solution', q.solution, 'Solution');
    }
    if (this.actions.childNodes.length) root.appendChild(this.actions);
    root.appendChild(this.feedback);
    if (this.extras) this.extras.forEach(function (n) { root.appendChild(n); });
    self.root.classList.add('is-ready');
  };

  Quiz.prototype.addReveal = function (label, cls, text, title) {
    var id = nextId(cls);
    var box = el('p', { 'class': cls, id: id, hidden: true }, [el('strong', { text: title || label }), text]);
    var btn = el('button', { type: 'button', 'class': 'btn btn-ghost', 'aria-expanded': 'false', 'aria-controls': id, text: label });
    var self = this;
    btn.addEventListener('click', function () {
      var open = box.hasAttribute('hidden');
      if (open) box.removeAttribute('hidden'); else box.setAttribute('hidden', '');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (cls === 'q-solution' && open) self.attempted(null);
    });
    this.actions.appendChild(btn);
    (this.extras = this.extras || []).push(box);
    return btn;
  };

  Quiz.prototype.say = function (kind, verdict, text) {
    var f = this.feedback;
    while (f.firstChild) f.removeChild(f.firstChild);
    f.className = 'q-feedback' + (kind ? ' is-' + kind : '');
    if (verdict) f.appendChild(el('span', { 'class': 'q-verdict', text: verdict }));
    if (text) f.appendChild(doc.createTextNode(text));
  };

  /* ok: true / false / null (not graded) */
  Quiz.prototype.attempted = function (ok) {
    this.attempts += 1;
    var r = this.root;
    if (!r.hasAttribute('data-answered')) {
      r.setAttribute('data-answered', '1');
      if (ok !== null) r.setAttribute('data-first', ok ? 'ok' : 'bad');
      onAnswered(r);
    }
    if (ok === true) r.setAttribute('data-correct', '1');
  };

  Quiz.prototype.grade = function (ok) {
    this.attempted(ok);
    var ex = this.q.explain || '';
    if (ok) this.say('ok', 'Correct.', ex);
    else {
      var more = this.attempts >= 2 && ex ? ex : (this.kind === 'exercise' && this.q.hint ? 'Try again, or open the hint.' : 'Try again.');
      this.say('bad', 'Not yet.', more);
    }
  };

  /* mc + tf */
  Quiz.prototype.buildChoice = function () {
    var q = this.q, self = this;
    var opts = q.type === 'tf' ? ['True', 'False'] : (q.options || []);
    var ans = q.type === 'tf' ? (q.answer ? 0 : 1) : q.answer;
    var ul = el('ul', { 'class': 'q-opts', role: 'list', 'aria-labelledby': this.textId });
    opts.forEach(function (o, i) {
      var mark = el('span', { 'class': 'q-mark' });
      var b = el('button', { type: 'button', 'class': 'q-opt' }, [
        q.type === 'tf' ? null : el('span', { 'class': 'q-letter', 'aria-hidden': 'true', text: LETTERS.charAt(i) }),
        el('span', { 'class': 'q-opt-text', text: String(o) }), mark]);
      b.addEventListener('click', function () {
        var ok = i === ans;
        b.classList.remove('is-correct', 'is-wrong');
        b.classList.add(ok ? 'is-correct' : 'is-wrong');
        mark.textContent = ok ? '✓ Right' : '✗ No';
        self.grade(ok);
      });
      ul.appendChild(el('li', null, [b]));
    });
    this.body.appendChild(ul);
  };

  /* num */
  Quiz.prototype.buildNum = function () {
    var q = this.q, self = this;
    var id = nextId('qn');
    var input = el('input', { type: 'text', inputmode: 'decimal', autocomplete: 'off', 'class': 'q-num-input', id: id, 'aria-describedby': this.textId });
    var btn = el('button', { type: 'button', 'class': 'btn', text: 'Check' });
    function check() {
      var raw = String(input.value || '').trim().replace(/\s+/g, '').replace(',', '.');
      var v = parseFloat(raw);
      if (!raw || isNaN(v)) { self.say('info', '', 'Write a number, then press Check.'); return; }
      var ok = Math.abs(v - Number(q.answer)) <= (Number(q.tolerance) || 0) + 1e-9;
      input.classList.remove('is-correct', 'is-wrong');
      input.classList.add(ok ? 'is-correct' : 'is-wrong');
      self.grade(ok);
    }
    btn.addEventListener('click', check);
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); check(); } });
    this.body.appendChild(el('div', { 'class': 'q-row' }, [
      el('label', { 'for': id, 'class': 'sr-only', text: 'Your answer' }), input,
      q.unit ? el('span', { 'class': 'q-unit', text: q.unit }) : null, btn]));
  };

  /* order */
  Quiz.prototype.buildOrder = function () {
    var q = this.q, self = this;
    var correct = (q.items || []).slice();
    var cur = shuffle(correct);
    var tries = 0;
    while (correct.length > 1 && cur.join('\u0001') === correct.join('\u0001') && tries++ < 10) cur = shuffle(correct);
    var picked = -1, dragFrom = -1;
    this.body.appendChild(el('p', { 'class': 'q-help', text: 'Use the arrows, or click an item and then click the place where it goes. You can also drag.' }));
    var ol = el('ol', { 'class': 'q-order', 'aria-labelledby': this.textId });
    this.body.appendChild(ol);

    function move(from, to, focusSel) {
      if (from === to || from < 0 || to < 0 || to >= cur.length) return;
      var it = cur.splice(from, 1)[0];
      cur.splice(to, 0, it);
      picked = -1;
      draw(to, focusSel);
    }
    function draw(focusIdx, focusSel) {
      while (ol.firstChild) ol.removeChild(ol.firstChild);
      cur.forEach(function (text, i) {
        var item = el('button', { type: 'button', 'class': 'q-item' + (picked === i ? ' is-picked' : ''), 'aria-pressed': picked === i ? 'true' : 'false', text: text });
        var up = el('button', { type: 'button', 'class': 'q-move q-up', 'aria-label': 'Move up: ' + text, disabled: i === 0, text: '↑' });
        var dn = el('button', { type: 'button', 'class': 'q-move q-down', 'aria-label': 'Move down: ' + text, disabled: i === cur.length - 1, text: '↓' });
        item.addEventListener('click', function () {
          if (picked === -1) { picked = i; draw(i, '.q-item'); }
          else if (picked === i) { picked = -1; draw(i, '.q-item'); }
          else move(picked, i, '.q-item');
        });
        up.addEventListener('click', function () { move(i, i - 1, i - 1 === 0 ? '.q-down' : '.q-up'); });
        dn.addEventListener('click', function () { move(i, i + 1, i + 1 === cur.length - 1 ? '.q-up' : '.q-down'); });
        var li = el('li', { draggable: 'true' }, [item, up, dn]);
        li.addEventListener('dragstart', function (e) {
          dragFrom = i; item.classList.add('is-dragging');
          try { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(i)); } catch (x) { /* old browsers */ }
        });
        li.addEventListener('dragend', function () { item.classList.remove('is-dragging'); });
        li.addEventListener('dragover', function (e) { e.preventDefault(); item.classList.add('is-over'); });
        li.addEventListener('dragleave', function () { item.classList.remove('is-over'); });
        li.addEventListener('drop', function (e) { e.preventDefault(); item.classList.remove('is-over'); if (dragFrom >= 0) move(dragFrom, i, '.q-item'); dragFrom = -1; });
        ol.appendChild(li);
      });
      if (focusIdx !== undefined && focusIdx !== null && ol.children[focusIdx]) {
        var f = ol.children[focusIdx].querySelector(focusSel || '.q-item');
        if (f && !f.disabled) f.focus();
      }
    }
    draw();
    var btn = el('button', { type: 'button', 'class': 'btn', text: 'Check' });
    btn.addEventListener('click', function () {
      var right = 0;
      for (var i = 0; i < cur.length; i++) {
        var li = ol.children[i];
        var ok = cur[i] === correct[i];
        if (ok) right += 1;
        li.classList.remove('is-correct', 'is-wrong');
        li.classList.add(ok ? 'is-correct' : 'is-wrong');
        var it = li.querySelector('.q-item');
        var oldTag = it.querySelector('.q-tag'); if (oldTag) it.removeChild(oldTag);
        var tag = el('span', { 'class': 'q-tag', text: ok ? '✓ ok' : '✗ move' });
        it.appendChild(tag);
      }
      var all = right === cur.length;
      self.grade(all);
      if (!all) self.feedback.appendChild(doc.createTextNode(' ' + right + ' of ' + cur.length + ' in the right place.'));
    });
    this.actions.appendChild(btn);
  };

  /* match */
  Quiz.prototype.buildMatch = function () {
    var q = this.q, self = this;
    var pairs = q.pairs || [];
    var chips = shuffle(pairs.map(function (p, i) { return { id: i, text: String(p[1]) }; }));
    var placed = pairs.map(function () { return null; });   // slot index -> chip
    var sel = null, dragChip = null;
    this.body.appendChild(el('p', { 'class': 'q-help', text: 'Click a card, then click the box where it goes. You can also drag. Click a filled box to empty it.' }));
    var ul = el('ul', { 'class': 'q-match', role: 'list', 'aria-labelledby': this.textId });
    var pool = el('div', { 'class': 'q-pool', role: 'group', 'aria-label': 'Cards to place' });
    this.body.appendChild(ul);
    this.body.appendChild(pool);

    function inPool() { return chips.filter(function (c) { return placed.indexOf(c) < 0; }); }
    function place(slot, chip) {
      var old = placed[slot];
      var from = placed.indexOf(chip);
      if (from >= 0) placed[from] = null;
      placed[slot] = chip;
      if (old && from >= 0) placed[from] = old;   // swap between slots
      sel = null;
      clearMarks();
      draw('slot', slot);
    }
    function clearMarks() {
      for (var i = 0; i < ul.children.length; i++) ul.children[i].classList.remove('is-correct', 'is-wrong');
    }
    function draw(focusKind, focusIdx) {
      while (ul.firstChild) ul.removeChild(ul.firstChild);
      while (pool.firstChild) pool.removeChild(pool.firstChild);
      pairs.forEach(function (p, i) {
        var c = placed[i];
        var slot = el('button', { type: 'button', 'class': 'q-slot' + (c ? ' is-filled' : ''),
          'aria-label': String(p[0]) + ': ' + (c ? c.text + '. Click to remove.' : 'empty. Choose a card first.'),
          text: c ? c.text : 'Drop a card here' });
        slot.addEventListener('click', function () {
          if (sel) place(i, sel);
          else if (placed[i]) { placed[i] = null; clearMarks(); draw('slot', i); }
          else self.say('info', '', 'First choose a card from the box below.');
        });
        slot.addEventListener('dragover', function (e) { e.preventDefault(); slot.classList.add('is-over'); });
        slot.addEventListener('dragleave', function () { slot.classList.remove('is-over'); });
        slot.addEventListener('drop', function (e) { e.preventDefault(); if (dragChip) place(i, dragChip); dragChip = null; });
        ul.appendChild(el('li', null, [el('span', { 'class': 'q-left', text: String(p[0]) }), slot]));
      });
      inPool().forEach(function (c, k) {
        var b = el('button', { type: 'button', 'class': 'q-chip', draggable: 'true', 'aria-pressed': sel === c ? 'true' : 'false', text: c.text });
        b.addEventListener('click', function () { sel = sel === c ? null : c; draw('chip', k); });
        b.addEventListener('dragstart', function (e) {
          dragChip = c;
          try { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', c.text); } catch (x) { /* ignore */ }
        });
        pool.appendChild(b);
      });
      var target = null;
      if (focusKind === 'slot') target = ul.children[focusIdx] && ul.children[focusIdx].querySelector('.q-slot');
      if (focusKind === 'chip') target = pool.children[Math.min(focusIdx, pool.children.length - 1)] || null;
      if (focusKind && !target) target = pool.children[0] || (ul.children[0] && ul.children[0].querySelector('.q-slot'));
      if (target) target.focus();
    }
    draw();
    var btn = el('button', { type: 'button', 'class': 'btn', text: 'Check' });
    btn.addEventListener('click', function () {
      if (placed.some(function (c) { return !c; })) { self.say('info', '', 'Place all the cards first, then press Check.'); return; }
      var right = 0;
      pairs.forEach(function (p, i) {
        var ok = placed[i].text === String(p[1]);
        if (ok) right += 1;
        var li = ul.children[i];
        li.classList.remove('is-correct', 'is-wrong');
        li.classList.add(ok ? 'is-correct' : 'is-wrong');
        var s = li.querySelector('.q-slot');
        var oldTag = s.querySelector('.q-tag'); if (oldTag) s.removeChild(oldTag);
        s.appendChild(el('span', { 'class': 'q-tag', text: ok ? '✓ ok' : '✗ no' }));
      });
      var all = right === pairs.length;
      self.grade(all);
      if (!all) self.feedback.appendChild(doc.createTextNode(' ' + right + ' of ' + pairs.length + ' are right.'));
    });
    this.actions.appendChild(btn);
  };

  /* open */
  Quiz.prototype.buildOpen = function () {
    var q = this.q, self = this;
    var id = nextId('qo');
    var ta = el('textarea', { id: id, 'class': 'q-open-text', rows: '4' });
    this.body.appendChild(el('label', { 'for': id, 'class': 'sr-only', text: 'Your answer' }));
    this.body.appendChild(ta);
    ta.addEventListener('change', function () { if (ta.value.trim()) self.attempted(null); });
    if (q.solution) {
      var b = this.addReveal('Show model answer', 'q-solution', q.solution, 'Model answer');
      b.addEventListener('click', function () { self.attempted(null); });
    }
  };

  /* answered → progress + review score */
  function onAnswered(qEl) {
    if (qEl.getAttribute('data-kind') === 'exercise') markDone(qEl.id);
    var sec = qEl.closest('[data-section="check"]');
    if (sec) {
      var all = sec.querySelectorAll('.q');
      var done = sec.querySelectorAll('.q[data-answered]');
      if (all.length && all.length === done.length) markDone('check');
    }
    var quiz = qEl.closest('.quiz');
    if (quiz) {
      var out = quiz.querySelector('.quiz-score');
      var graded = quiz.querySelectorAll('.q[data-first]');
      var ok = quiz.querySelectorAll('.q[data-first="ok"]');
      var total = 0;
      var qs = quiz.querySelectorAll('.q');
      for (var i = 0; i < qs.length; i++) { try { if (JSON.parse(qs[i].getAttribute('data-q')).type !== 'open') total += 1; } catch (e) { /* skip */ } }
      if (out && graded.length) out.textContent = 'Right at the first try: ' + ok.length + ' of ' + graded.length + ' answered so far (' + total + ' in this quiz).';
    }
  }

  function initQuizzes() {
    var qs = doc.querySelectorAll('.q[data-q]');
    for (var i = 0; i < qs.length; i++) (function (q) { safe(function () { q.__quiz = new Quiz(q); }); })(qs[i]);
  }

  /* ---------------------------------------------------------------- boot */
  function boot() {
    safe(initTheme);
    safe(initRead);
    safe(initPrint);
    safe(initProgress);
    safe(initQuizzes);
    safe(initYourTurn);
    safe(initUnitBars);
    html.classList.add('site-ready');
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', boot); else boot();
})();
