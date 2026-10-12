/* milestone-timeline.js — the unit page timeline: the 11 milestones and the two bookends (brief v6 section 3).
   One marker per item (year + short title). Click or Enter on a marker opens the detail panel: photo, year,
   title, two lines, "Inside your computer today: ...", and a link to the chapter.
   Keyboard: arrow keys (and Home / End) move between markers, Enter or Space opens.
   Config: items [{year, title, short, lines: [a, b], today, img, img_fallback, credit, credit_fallback,
   href (relative to the site root), bookend (bool)}], open (index, default 0). Contract: SITE_SPEC.md. */
(function () {
  'use strict';
  if (!window.ICT) return;

  var DEFAULT_ITEMS = [
    { year: '1837', short: 'Analytical Engine', title: "Babbage's Analytical Engine", lesson: 2,
      lines: ['A store for numbers and a mill that calculates, run by punched cards.', 'Designed from 1837, never completed.'],
      today: 'the CPU (the mill) and the memory (the store)', img: 'h_babbage_engine', href: 'unit-1/02-the-idea-of-a-program/index.html' },
    { year: '1890 → today', short: 'Cards to SSD', title: 'From punched cards to SSD', lesson: 5,
      lines: ['Cards (1890), tape, the hard disk (1956), then flash with no moving parts.', 'Storage keeps your data when the power is off.'],
      today: 'the SSD in your laptop, the flash in your phone', img: 'h_ramac', href: 'unit-1/05-memory/index.html' },
    { year: '1936', short: "Turing's machine", title: "Turing's machine", lesson: 2,
      lines: ['An imaginary machine: a tape, a head, a list of rules.', 'Give it the right rules and it can do any calculation.'],
      today: 'every app: a new list of rules for the same machine', img: 'v5_turing_machine_model', href: 'unit-1/02-the-idea-of-a-program/index.html' },
    { year: '1946', short: 'ENIAC', title: 'ENIAC and vacuum tubes', lesson: 3,
      lines: ['About 17,500 glass tubes, each a switch: on is 1, off is 0.', 'Huge, hot, and a tube failed every few days.'],
      today: 'the idea of the switch, in every chip', img: 'L1_eniac_room', href: 'unit-1/03-switches/index.html' },
    { year: '1947', short: 'Transistor', title: 'The transistor', lesson: 3,
      lines: ['A tiny switch with no moving parts replaces the tube.', 'Today: billions of them on one chip.'],
      today: 'billions of transistors in every chip', img: 'h_transistor', href: 'unit-1/03-switches/index.html' },
    { year: '1950', short: 'Can machines think?', title: 'Can machines think?', lesson: 1, bookend: true,
      lines: ["Turing's paper 'Computing Machinery and Intelligence'.", 'If a judge cannot tell a machine from a person by typed answers, does it think?'],
      today: 'the question we ask about chatbots', img: 'v5_manchester_baby', href: 'unit-1/01-can-machines-think/index.html' },
    { year: '1970 → today', short: 'RAM', title: 'RAM, the working desk', lesson: 5,
      lines: ["Fast memory chips, from the Intel 1103 (1970) to today's 8–16 GB.", 'It empties when the power goes off.'],
      today: 'the RAM sticks or chips next to the CPU', img: 'L4_ram_stick', href: 'unit-1/05-memory/index.html' },
    { year: '1971', short: 'Intel 4004', title: 'The Intel 4004', lesson: 4,
      lines: ['The whole CPU on one chip: about 2,300 transistors.', 'Fetch, decode, execute, again and again.'],
      today: 'the CPU in your phone or laptop', img: 'L3_4004', href: 'unit-1/04-the-cpu/index.html' },
    { year: '1980s', short: 'Mouse and windows', title: 'The mouse and windows', lesson: 6,
      lines: ['Invented in the 1960s, in every home in the 1980s.', 'Point and click instead of typing commands.'],
      today: 'every window, icon and touch screen', img: 'h_macintosh', href: 'unit-1/06-interface-and-gpu/index.html' },
    { year: '1981 → today', short: 'Motherboard', title: 'The motherboard', lesson: 7,
      lines: ['One board connects CPU, RAM, GPU and storage.', 'Signals travel along copper paths in billionths of a second.'],
      today: 'the main board inside every PC', img: 'L5_desktop_open', href: 'unit-1/07-how-the-parts-talk/index.html' },
    { year: '1990s', short: 'GPU', title: 'The graphics card becomes the GPU', lesson: 6,
      lines: ['Thousands of small calculators working at the same time, built for 3D games.', 'Now they also train AI.'],
      today: 'the GPU in your phone, laptop or console, and in AI data centres', img: 'L5_gpu_card2', href: 'unit-1/06-interface-and-gpu/index.html' },
    { year: '2007 → today', short: 'System on a chip', title: 'The system on a chip', lesson: 7,
      lines: ['CPU, GPU and memory controller on one chip, to save battery and space.', 'First in phones (2007), then in laptops (2020).'],
      today: 'the chip inside your phone', img: 'L3_phone_soc', href: 'unit-1/07-how-the-parts-talk/index.html' },
    { year: 'today', short: 'Chatbots', title: 'Chatbots', lesson: 9, bookend: true,
      lines: ['Programs that predict words, trained on huge amounts of text.', 'They run on GPUs in data centres.'],
      today: 'the chatbot on your phone', img: 'L7_datacenter', href: 'unit-1/09-can-machines-think-today/index.html' }
  ];

  function str(v) { return v === null || v === undefined ? '' : String(v); }

  function clean(it) {
    if (!it || typeof it !== 'object' || !(it.title || it.short)) return null;
    var lines = Array.isArray(it.lines) ? it.lines.map(str).filter(Boolean) : (it.line ? [str(it.line)] : []);
    return {
      year: str(it.year), title: str(it.title || it.short), short: str(it.short || it.title),
      lines: lines.slice(0, 2), today: str(it.today), img: str(it.img), imgFallback: str(it.img_fallback),
      credit: it.credit && typeof it.credit === 'object' ? it.credit : null,
      creditFallback: it.credit_fallback && typeof it.credit_fallback === 'object' ? it.credit_fallback : null,
      href: str(it.href), bookend: !!it.bookend
    };
  }

  ICT.register('milestone-timeline', function (root, config, api) {
    config = config || {};
    var el = api.el;
    var items = (Array.isArray(config.items) ? config.items : []).map(clean).filter(Boolean);
    if (!items.length) items = DEFAULT_ITEMS.map(clean);
    var first = isFinite(+config.open) ? Math.max(0, Math.min(items.length - 1, Math.floor(+config.open))) : 0;
    var uid = 'mt' + Math.random().toString(36).slice(2, 8);

    var current = -1;
    var focusIdx = first;

    var wrap = el('div', { 'class': 'ix-milestone-timeline' });
    root.appendChild(wrap);
    wrap.appendChild(el('p', { 'class': 'mt-instr', text: 'Click a year to open it. With the keyboard: arrow keys to move, Enter to open.' }));

    var scroller = el('div', { 'class': 'mt-scroller' });
    var track = el('div', { 'class': 'mt-track', role: 'tablist', 'aria-label': 'Milestones, from the oldest to today', 'aria-orientation': 'horizontal' });
    scroller.appendChild(track);
    wrap.appendChild(scroller);

    var markers = items.map(function (it, i) {
      var b = el('button', {
        type: 'button', role: 'tab', id: uid + '-t' + i, 'class': 'mt-marker' + (it.bookend ? ' is-bookend' : ''),
        'aria-selected': 'false', 'aria-controls': uid + '-panel', tabindex: i === first ? '0' : '-1',
        onclick: function () { open(i, true, true); },
        onkeydown: function (e) { onKey(e, i); },
        onfocus: function () { focusIdx = i; }
      }, [
        el('span', { 'class': 'mt-dot', 'aria-hidden': 'true' }),
        el('span', { 'class': 'mt-year', text: it.year }),
        el('span', { 'class': 'mt-short', text: it.short })
      ]);
      track.appendChild(b);
      return b;
    });

    try {   // the markers stack vertically on narrow screens (ix-c.css)
      var mq = window.matchMedia('(max-width: 700px)');
      var orient = function () { track.setAttribute('aria-orientation', mq.matches ? 'vertical' : 'horizontal'); };
      orient();
      if (mq.addEventListener) mq.addEventListener('change', orient); else if (mq.addListener) mq.addListener(orient);
    } catch (e) { /* matchMedia missing: keep horizontal */ }

    var panel = el('div', { 'class': 'mt-panel', id: uid + '-panel', role: 'tabpanel', tabindex: '-1' });
    wrap.appendChild(panel);
    var say = api.live(wrap);

    function onKey(e, i) {
      var k = e.key, n = items.length, to = null;
      if (k === 'ArrowRight' || k === 'ArrowDown') to = (i + 1) % n;
      else if (k === 'ArrowLeft' || k === 'ArrowUp') to = (i - 1 + n) % n;
      else if (k === 'Home') to = 0;
      else if (k === 'End') to = n - 1;
      else if (k === 'Enter' || k === ' ' || k === 'Spacebar') { e.preventDefault(); open(i, true, true); return; }
      if (to === null) return;
      e.preventDefault();
      moveFocus(to);
    }

    function moveFocus(i) {
      markers.forEach(function (m, j) { m.setAttribute('tabindex', j === i ? '0' : '-1'); });
      focusIdx = i;
      markers[i].focus();
      reveal(i);
    }

    function reveal(i) {   // scroll the marker into view inside the scroller only (never the page)
      var m = markers[i];
      if (!m || scroller.scrollWidth <= scroller.clientWidth + 1) return;
      var left = m.offsetLeft - track.offsetLeft, right = left + m.offsetWidth;
      if (left < scroller.scrollLeft) scroller.scrollLeft = Math.max(0, left - 16);
      else if (right > scroller.scrollLeft + scroller.clientWidth) scroller.scrollLeft = right - scroller.clientWidth + 16;
    }

    function photo(it) {
      if (!it.img) return null;
      var fig = el('figure', { 'class': 'mt-photo' });
      var cap = el('figcaption', { 'class': 'mt-credit' });
      var img = el('img', { alt: it.title, loading: 'lazy', decoding: 'async', width: '640', height: '480' });
      var triedFallback = false;
      function setCredit(c) {
        cap.textContent = '';
        if (!c || !(c.author || c.licence)) { cap.hidden = true; return; }
        cap.hidden = false;
        cap.appendChild(document.createTextNode('Photo: ' + str(c.author || 'see source') + (c.licence ? ', ' + str(c.licence) : '')));
        if (c.source_url) {
          cap.appendChild(document.createTextNode(' · '));
          cap.appendChild(el('a', { href: str(c.source_url), rel: 'noopener noreferrer', text: 'source' }));
        }
      }
      img.addEventListener('error', function () {
        if (!triedFallback && it.imgFallback) {
          triedFallback = true;
          setCredit(it.creditFallback);
          img.src = api.root + 'img/' + it.imgFallback + '.jpg';
          return;
        }
        fig.classList.add('is-missing');
        if (panel.contains(fig)) panel.classList.remove('has-photo');
        img.hidden = true;
        cap.hidden = true;
      });
      setCredit(it.credit);
      img.src = api.root + 'img/' + it.img + '.jpg';
      fig.appendChild(img);
      fig.appendChild(cap);
      return fig;
    }

    function open(i, speak, byUser) {
      if (i < 0 || i >= items.length) return;
      var it = items[i];
      current = i;
      markers.forEach(function (m, j) {
        m.setAttribute('aria-selected', j === i ? 'true' : 'false');
        m.setAttribute('tabindex', j === i ? '0' : '-1');
        m.classList.toggle('is-open', j === i);
      });
      focusIdx = i;
      panel.setAttribute('aria-labelledby', uid + '-t' + i);
      panel.className = 'mt-panel' + (it.bookend ? ' is-bookend' : '');
      panel.textContent = '';
      var text = el('div', { 'class': 'mt-text' }, [
        el('p', { 'class': 'mt-p-year', text: it.year }),
        el('h3', { 'class': 'mt-p-title', text: it.title })
      ]);
      it.lines.forEach(function (ln) { text.appendChild(el('p', { 'class': 'mt-line', text: ln })); });
      if (it.today) {
        text.appendChild(el('p', { 'class': 'mt-today' }, [el('strong', { text: 'Inside your computer today: ' }), it.today]));
      }
      if (it.href) {
        text.appendChild(el('p', { 'class': 'mt-more' }, [
          el('a', { 'class': 'mt-link', href: api.root + it.href.replace(/^\/+/, ''), text: 'Read the chapter →' })
        ]));
      }
      var ph = photo(it);
      if (ph) { panel.classList.add('has-photo'); panel.appendChild(ph); }
      panel.appendChild(text);
      reveal(i);
      if (speak) say(it.year + ': ' + it.title + '. Opened below.');
      if (byUser && track.getAttribute('aria-orientation') === 'vertical' && panel.scrollIntoView) {
        try { panel.scrollIntoView({ block: 'nearest' }); } catch (e) { /* old browser */ }
      }
    }

    function find(word) {
      for (var i = 0; i < items.length; i++) if (items[i].title.toLowerCase().indexOf(word) >= 0) return i;
      return 0;
    }

    function reset() {
      open(first, false);
      scroller.scrollLeft = 0;
      reveal(first);
      say('');
    }

    reset();

    return {
      presets: [
        { name: 'open the transistor', run: function () { open(find('transistor'), true); } },
        { name: 'open each in turn', run: function () {
          for (var i = 0; i < items.length; i++) open(i, false);
          say('Opened all ' + items.length + ' milestones, one after the other. Now showing: ' + items[current].title + '.');
        } }
      ],
      reset: reset,
      open: open
    };
  });
})();
