/* human-or-machine.js — component 14: read short answers and guess: written by a person or by a chatbot?
   Loads api.root + (config.src || "static/data/human-or-machine.json"); if that fails (for example from
   file://) it uses the built-in copy below. The "why?" notes stay on the page: nothing is stored or sent.
   JSON: {title, note, items:[{q, a, by:"person"|"chatbot", source, note}]}. Contract: SITE_SPEC.md. */
(function () {
  'use strict';
  if (!window.ICT) return;

  // Built-in copy of static/data/human-or-machine.json (keep the two in step).
  var FALLBACK = /*FALLBACK-START*/{
    "title": "Human or machine?",
    "note": "The twist: every 'person' answer here was written by Alan Turing in 1950, in his paper 'Computing Machinery and Intelligence'. He was imagining how a machine might answer in the imitation game, while it pretends to be a person. So these answers come from a person pretending to be a machine pretending to be a person! The 'chatbot' answers were written by a real AI chatbot in 2026. Teachers: you can replace this file with your class's own answers (no names, no personal data).",
    "items": [
      {
        "q": "Please write me a sonnet on the subject of the Forth Bridge.",
        "a": "Of course! Here is the opening: \"Red iron giant striding through the mist, / Three mighty arches hold the river's breath...\"",
        "by": "chatbot",
        "source": "written by an AI chatbot (Claude) in October 2026 for this site",
        "note": "A modern chatbot almost never says no to a poem. It starts at once, happy and polite: \"Of course!\""
      },
      {
        "q": "Add 34957 to 70764.",
        "a": "(after a pause of about 30 seconds) 105621",
        "by": "person",
        "source": "Alan Turing, 'Computing Machinery and Intelligence' (1950): the answer he imagined for a machine",
        "note": "Slow, and wrong! The right answer is 105721. Later in the same paper Turing suggests that a machine could make mistakes on purpose, to seem more human."
      },
      {
        "q": "In the first line of your sonnet, 'Shall I compare thee to a summer's day', would not 'a spring day' do as well or better?",
        "a": "It wouldn't scan.",
        "by": "person",
        "source": "Alan Turing, 'Computing Machinery and Intelligence' (1950): the answer he imagined for a machine",
        "note": "Very short and sure, like a poet. 'Scan' means the rhythm of the line works: 'a spring day' has one beat too few."
      },
      {
        "q": "Do you play chess? I have only a king at K1. You have a king at K6 and a rook at R1. It is your move. What do you play?",
        "a": "Yes, I play! I would move my rook to R8. That is checkmate: my king guards the squares in front of yours, so your king cannot escape.",
        "by": "chatbot",
        "source": "written by an AI chatbot (Claude) in October 2026 for this site",
        "note": "It explains why, even if you did not ask. Chatbots love to explain their reasons step by step."
      },
      {
        "q": "Please write me a sonnet on the subject of the Forth Bridge.",
        "a": "Count me out on this one. I never could write poetry.",
        "by": "person",
        "source": "Alan Turing, 'Computing Machinery and Intelligence' (1950): the answer he imagined for a machine",
        "note": "Many people would say the same! Saying 'I can't' is a very human answer, and Turing knew it."
      },
      {
        "q": "Add 34957 to 70764.",
        "a": "34,957 + 70,764 = 105,721.",
        "by": "chatbot",
        "source": "written by an AI chatbot (Claude) in October 2026 for this site",
        "note": "Instant, correct and neat, with commas. A modern chatbot does not pretend to be slow."
      },
      {
        "q": "How about 'a winter's day'? That would scan all right.",
        "a": "Yes, but nobody wants to be compared to a winter's day.",
        "by": "person",
        "source": "Alan Turing, 'Computing Machinery and Intelligence' (1950): the answer he imagined for a machine",
        "note": "A little joke about feelings: who wants to be cold and grey? Turing used it to show what a really clever machine would need to understand."
      },
      {
        "q": "Do you play chess? I have only a king at K1. You have a king at K6 and a rook at R1. It is your move. What do you play?",
        "a": "(after a pause of 15 seconds) R-R8 mate.",
        "by": "person",
        "source": "Alan Turing, 'Computing Machinery and Intelligence' (1950): the answer he imagined for a machine",
        "note": "Short, with a pause, in chess notation. It is a correct move: a careful player, or a careful machine."
      }
    ]
  }/*FALLBACK-END*/;

  function valid(d) {
    if (!d || !Array.isArray(d.items)) return null;
    var items = d.items.filter(function (it) {
      return it && typeof it.a === 'string' && (it.by === 'person' || it.by === 'chatbot');
    });
    if (!items.length) return null;
    return { title: d.title || 'Human or machine?', note: d.note || '', items: items };
  }

  ICT.register('human-or-machine', function (root, config, api) {
    config = config || {};
    var el = api.el;
    var data = null;
    var guesses = [];
    var cards = [];
    var revealed = false;
    var uid = Math.random().toString(36).slice(2, 8);

    var wrap = el('div', { 'class': 'ix-human-or-machine' });
    root.appendChild(wrap);
    wrap.appendChild(el('p', { 'class': 'ixb-instr', text: 'Read each answer. Who wrote it: a person or a chatbot? Mark every answer, then press Reveal.' }));
    var status = el('p', { 'class': 'ixb-small hm-status', text: 'Loading the answers...' });
    wrap.appendChild(status);
    var listEl = el('ol', { 'class': 'hm-list' });
    wrap.appendChild(listEl);
    var revealBtn = el('button', { type: 'button', 'class': 'ixb-btn ixb-primary', text: 'Reveal', onclick: function () { reveal(); } });
    wrap.appendChild(el('div', { 'class': 'ixb-bar' }, [
      revealBtn,
      el('button', { type: 'button', 'class': 'ixb-btn', text: 'Start again', onclick: function () { reset(); } })
    ]));
    var scoreEl = el('p', { 'class': 'hm-score', hidden: true });
    var twist = el('div', { 'class': 'hm-twist', hidden: true });
    wrap.appendChild(scoreEl);
    wrap.appendChild(twist);
    wrap.appendChild(el('p', { 'class': 'ixb-small', text: 'Your "why?" notes stay on this page. Nothing is saved or sent anywhere.' }));
    var say = api.live(wrap.appendChild(el('div', { 'class': 'ixb-sr' })));   // the visible score is .hm-score

    function build(d) {
      data = d;
      guesses = d.items.map(function () { return null; });
      cards = [];
      listEl.textContent = '';
      d.items.forEach(function (it, i) {
        var bP = el('button', { type: 'button', 'class': 'ixb-btn hm-guess', 'aria-pressed': 'false', text: 'Person', onclick: function () { guess(i, 'person', true); } });
        var bC = el('button', { type: 'button', 'class': 'ixb-btn hm-guess', 'aria-pressed': 'false', text: 'Chatbot', onclick: function () { guess(i, 'chatbot', true); } });
        var whyId = 'hm-why-' + uid + '-' + i;
        var why = el('textarea', { id: whyId, 'class': 'hm-why', rows: '2', maxlength: '300', placeholder: 'What gives it away?' });
        var truth = el('div', { 'class': 'hm-truth', hidden: true });
        var li = el('li', { 'class': 'hm-card' }, [
          el('p', { 'class': 'hm-q' }, [el('span', { 'class': 'hm-k', text: 'Question: ' }), it.q || '']),
          el('blockquote', { 'class': 'hm-a' }, [it.a]),
          el('div', { 'class': 'ixb-seg', role: 'group', 'aria-label': 'Answer ' + (i + 1) + ' was written by' }, [bP, bC]),
          el('label', { 'for': whyId, 'class': 'hm-whylab', text: 'Why? (optional)' }),
          why,
          truth
        ]);
        cards.push({ li: li, bP: bP, bC: bC, truth: truth, why: why });
        listEl.appendChild(li);
      });
      revealed = false;
      revealBtn.disabled = false;
      scoreEl.hidden = true;
      twist.hidden = true;
    }

    function guess(i, who, speak) {
      if (!data || revealed) return;
      guesses[i] = who;
      cards[i].bP.setAttribute('aria-pressed', who === 'person' ? 'true' : 'false');
      cards[i].bC.setAttribute('aria-pressed', who === 'chatbot' ? 'true' : 'false');
      var left = guesses.filter(function (g) { return !g; }).length;
      if (speak) say('Answer ' + (i + 1) + ': ' + who + '. ' + (left ? left + ' left to mark.' : 'All marked: press Reveal.'));
    }

    function reveal() {
      if (!data) return 0;
      revealed = true;
      var good = 0;
      data.items.forEach(function (it, i) {
        var c = cards[i];
        var ok = guesses[i] === it.by;
        if (ok) good++;
        c.li.className = 'hm-card ' + (ok ? 'is-ok' : 'is-bad');
        c.bP.disabled = true;
        c.bC.disabled = true;
        c.truth.textContent = '';
        c.truth.appendChild(el('p', { 'class': 'hm-verdict' }, [
          el('span', { 'class': 'ixb-mark', 'aria-hidden': 'true', text: ok ? '✓ ' : '✗ ' }),
          el('strong', { text: (it.by === 'person' ? 'A person' : 'A chatbot') + '. ' }),
          guesses[i] ? (ok ? 'You were right.' : 'You said ' + guesses[i] + '.') : 'You did not mark this one.'
        ]));
        if (it.note) c.truth.appendChild(el('p', { text: it.note }));
        if (it.source) c.truth.appendChild(el('p', { 'class': 'hm-source', text: 'Source: ' + it.source }));
        c.truth.hidden = false;
      });
      revealBtn.disabled = true;
      var msg = 'You got ' + good + ' of ' + data.items.length + '.';
      scoreEl.textContent = msg;
      scoreEl.hidden = false;
      twist.textContent = '';
      if (data.note) {
        twist.appendChild(el('p', { 'class': 'hm-twist-title', text: 'Who really wrote them?' }));
        twist.appendChild(el('p', { text: data.note }));
        twist.hidden = false;
      }
      say(msg + (data.note ? ' Read the twist below.' : ''), good === data.items.length ? 'ok' : null);
      return good;
    }

    function reset() {
      if (!data) return;
      build(data);
      say('');
    }

    function useFallback(msg) {
      var d = valid(FALLBACK);
      if (!d) { status.textContent = 'Sorry, the answers could not be loaded.'; return; }
      build(d);
      status.textContent = msg;
    }

    var url = api.root + (typeof config.src === 'string' && config.src ? config.src : 'static/data/human-or-machine.json');
    var settled = false;
    function load() {
      if (!window.fetch) { settled = true; useFallback('Using the built-in answers.'); return; }
      try {
        window.fetch(url, { cache: 'no-cache' }).then(function (r) {
          if (!r.ok) throw new Error('HTTP ' + r.status);
          return r.json();
        }).then(function (j) {
          if (settled) return;
          var d = valid(j);
          if (!d) throw new Error('bad data');
          settled = true;
          build(d);
          status.textContent = d.items.length + ' answers to read.';
        }).catch(function () {
          if (settled) return;
          settled = true;
          useFallback('The answers file could not be opened here, so we are using the built-in answers. It works the same way.');
        });
      } catch (e) {
        settled = true;
        useFallback('Using the built-in answers.');
      }
    }
    load();

    function ensureData() {
      if (!data) { settled = true; useFallback('Using the built-in answers.'); }
    }

    return {
      presets: [
        { name: 'guess all as chatbot', run: function () {
          ensureData();
          if (revealed) reset();
          if (data) data.items.forEach(function (it, i) { guess(i, 'chatbot', false); });
          say('All answers marked as chatbot. Press Reveal.');
        } },
        { name: 'reveal', run: function () { ensureData(); reveal(); } }
      ],
      reset: reset
    };
  });
})();
