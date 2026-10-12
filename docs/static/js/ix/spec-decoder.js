/* spec-decoder.js — component 12: a phone and a laptop listing; each line explains itself in plain
   English with the kitchen metaphor; then "Which device for whom?". Config: device ("phone"|"laptop",
   default "phone"). Contract: SITE_SPEC.md. */
(function () {
  'use strict';
  if (!window.ICT) return;

  var DEVICES = {
    phone: {
      title: 'Phone', price: 'Smartphone',
      lines: [
        { spec: 'Octa-core 3.2 GHz', tag: 'CPU',
          text: 'Octa-core = 8 cores: 8 cooks in the kitchen. 3.2 GHz is the metronome: it ticks 3.2 billion times every second, and the cooks work to that beat.' },
        { spec: '8 GB RAM', tag: 'RAM',
          text: 'RAM is the workbench. 8 GB is the size of the bench: how many apps can stay open at the same time. It is emptied when the power goes off.' },
        { spec: '256 GB storage', tag: 'storage',
          text: 'Storage is the pantry: photos, apps and messages stay there, even when the phone is off. 256 GB is room for tens of thousands of photos.' },
        { spec: '6.7-inch 120 Hz OLED', tag: 'screen',
          text: '6.7 inches (about 17 cm) is the diagonal of the screen. 120 Hz = the picture is redrawn 120 times every second, so scrolling looks smooth. OLED: each pixel makes its own light.' },
        { spec: '5,000 mAh', tag: 'battery',
          text: 'mAh is the size of the tank, not the hours. A bigger tank lasts longer, but the hours depend on how you use the phone: video and games empty it fast.' },
        { spec: '5G', tag: 'radio',
          text: '5G is a radio: it talks to the mobile network (the fifth generation). It gives you fast internet when you are away from Wi-Fi.' },
        { spec: '50 MP camera', tag: 'camera',
          text: '50 MP = 50 megapixels = 50 million dots in each photo. More dots do not always mean better photos: the lens and the sensor matter too.' }
      ]
    },
    laptop: {
      title: 'Laptop', price: 'Laptop',
      lines: [
        { spec: 'Intel Core i5, 10 cores, up to 4.6 GHz', tag: 'CPU',
          text: '10 cores = 10 cooks. "Up to 4.6 GHz": the metronome can tick 4.6 billion times a second, but only in short bursts. Core i5 is the middle of Intel\'s range.' },
        { spec: '16 GB RAM', tag: 'RAM',
          text: 'A big workbench: 16 GB. Many tabs and programs can stay open at once without slowing down.' },
        { spec: '512 GB SSD', tag: 'storage',
          text: 'The pantry: 512 GB. SSD = no moving parts, so it is fast: the laptop starts in seconds and files open quickly.' },
        { spec: '15.6-inch Full HD 60 Hz', tag: 'screen',
          text: '15.6 inches (about 40 cm) diagonal. Full HD = 1920 x 1080 pixels. 60 Hz = the picture is redrawn 60 times every second: fine for school work and films.' },
        { spec: '3 USB ports, Wi-Fi 6', tag: 'ports and radio',
          text: 'USB ports are doors for cables: a mouse, a USB stick, a phone. Wi-Fi 6 is a radio for the wireless network at home and at school.' },
        { spec: '54 Wh battery', tag: 'battery',
          text: 'Wh (watt-hours) is the size of the tank. Like mAh, it does not tell you the hours: a laptop uses much more energy than a phone.' }
      ]
    }
  };

  var PEOPLE = [
    { id: 'grandma', who: 'A grandmother', want: 'She wants video calls with her family, wherever she is.', answer: 'phone',
      fb: {
        phone: 'Yes: the phone. It is light and always with her, the 6.7-inch screen is big and bright, the camera is good, and 5G works outside the house.',
        laptop: 'A laptop can do video calls, but it is heavy and stays on a table. The phone is better: big 6.7-inch screen, good camera, 5G everywhere.',
        neither: 'One of them is a good fit: the phone. Big 6.7-inch screen, good camera, and 5G works outside the house.'
      } },
    { id: 'student', who: 'A student on a budget', want: 'He writes documents and does homework every day.', answer: 'laptop',
      fb: {
        laptop: 'Yes: the laptop. A real keyboard, a 15.6-inch screen, 16 GB of RAM (a big workbench for many tabs) and a fast 512 GB SSD.',
        phone: 'Writing long documents on a phone is hard: small screen, no keyboard. The laptop is better: 16 GB RAM and a fast SSD.',
        neither: 'The laptop is a good fit: a keyboard, a big screen, 16 GB RAM and a fast SSD. He does not need anything more expensive.'
      } },
    { id: 'gamer', who: 'A gamer', want: 'She plays new 3D games on a computer.', answer: 'neither',
      fb: {
        neither: 'Right: neither is ideal. The laptop has no dedicated graphics card (GPU), so new 3D games will be slow, and its screen redraws only 60 times a second. A gaming PC or a laptop with a graphics card is better.',
        laptop: 'Not ideal: the laptop has no dedicated graphics card (GPU), so new 3D games will be slow, and the 60 Hz screen is not smooth. Neither device is a good choice.',
        phone: 'The phone is fine for phone games, but not for big 3D computer games: the screen is small and there is no graphics card for PC games. Neither device is ideal.'
      } }
  ];

  ICT.register('spec-decoder', function (root, config, api) {
    config = config || {};
    var el = api.el;
    var startDevice = config.device === 'laptop' ? 'laptop' : 'phone';
    var device = startDevice;
    var seen = {};
    var answers = {};

    var wrap = el('div', { 'class': 'ix-spec-decoder' });
    root.appendChild(wrap);
    wrap.appendChild(el('p', { 'class': 'ixb-instr', text: 'Point at, Tab to or click each line of the listing to read what it means.' }));

    var bPhone = el('button', { type: 'button', 'class': 'ixb-btn', 'aria-pressed': 'false', text: 'Phone', onclick: function () { setDevice('phone'); } });
    var bLaptop = el('button', { type: 'button', 'class': 'ixb-btn', 'aria-pressed': 'false', text: 'Laptop', onclick: function () { setDevice('laptop'); } });
    wrap.appendChild(el('div', { 'class': 'ixb-bar' }, [el('div', { 'class': 'ixb-seg', role: 'group', 'aria-label': 'Device' }, [bPhone, bLaptop])]));

    var card = el('div', { 'class': 'sd-card' });
    var cardTitle = el('h4', { 'class': 'sd-title' });
    var lineBox = el('ul', { 'class': 'sd-lines' });
    var count = el('p', { 'class': 'sd-count' });
    card.appendChild(cardTitle);
    card.appendChild(lineBox);
    var explain = el('div', { 'class': 'sd-explain', 'aria-live': 'polite' });
    wrap.appendChild(el('div', { 'class': 'sd-grid' }, [card, el('div', { 'class': 'sd-side' }, [explain, count])]));

    // quiz
    var quiz = el('div', { 'class': 'sd-quiz' });
    quiz.appendChild(el('h4', { 'class': 'sd-h', text: 'Which device for whom?' }));
    quiz.appendChild(el('p', { 'class': 'ixb-small', text: 'Look at both listings. Choose the phone, the laptop, or neither.' }));
    var qRows = {};
    PEOPLE.forEach(function (p) {
      var btns = {};
      var fbEl = el('p', { 'class': 'sd-fb' });
      var group = el('div', { 'class': 'ixb-seg sd-choices', role: 'group', 'aria-label': p.who + ': choose a device' });
      ['phone', 'laptop', 'neither'].forEach(function (c) {
        btns[c] = el('button', { type: 'button', 'class': 'ixb-btn', 'aria-pressed': 'false', text: c.charAt(0).toUpperCase() + c.slice(1),
          onclick: function () { answer(p.id, c, true); } });
        group.appendChild(btns[c]);
      });
      var row = el('div', { 'class': 'sd-person' }, [
        el('p', { 'class': 'sd-who' }, [el('strong', { text: p.who + '. ' }), p.want]), group, fbEl
      ]);
      qRows[p.id] = { btns: btns, fb: fbEl, row: row };
      quiz.appendChild(row);
    });
    wrap.appendChild(quiz);
    var say = api.live(wrap.appendChild(el('div', { 'class': 'ixb-sr' })));   // the visible feedback is in .sd-fb

    function drawCard() {
      var d = DEVICES[device];
      cardTitle.textContent = d.title + ' listing';
      lineBox.textContent = '';
      d.lines.forEach(function (l, i) {
        var b = el('button', { type: 'button', 'class': 'sd-line' + (seen[device + i] ? ' is-seen' : ''), 'data-i': i }, [
          el('span', { 'class': 'sd-spec', text: l.spec }),
          el('span', { 'class': 'sd-tag', text: l.tag })
        ]);
        b.addEventListener('mouseenter', function () { show(i); });
        b.addEventListener('focus', function () { show(i); });
        b.addEventListener('click', function () { show(i); });
        lineBox.appendChild(el('li', {}, [b]));
      });
      explain.textContent = '';
      explain.appendChild(el('p', { 'class': 'sd-placeholder', text: 'Choose a line to see what it means.' }));
      updateCount();
    }

    function show(i) {
      var l = DEVICES[device].lines[i];
      if (!l) return;
      seen[device + i] = true;
      var btns = lineBox.querySelectorAll('.sd-line');
      for (var k = 0; k < btns.length; k++) btns[k].classList.toggle('is-active', k === i);
      if (btns[i]) btns[i].classList.add('is-seen');
      explain.textContent = '';
      explain.appendChild(el('p', { 'class': 'sd-espec', text: l.spec }));
      explain.appendChild(el('p', { text: l.text }));
      updateCount();
    }

    function updateCount() {
      var n = DEVICES[device].lines.length, s = 0;
      for (var i = 0; i < n; i++) if (seen[device + i]) s++;
      count.textContent = 'You have read ' + s + ' of ' + n + ' lines.';
    }

    function setDevice(d) {
      device = d;
      bPhone.setAttribute('aria-pressed', d === 'phone' ? 'true' : 'false');
      bLaptop.setAttribute('aria-pressed', d === 'laptop' ? 'true' : 'false');
      drawCard();
    }

    function answer(id, choice, speak) {
      var p = null;
      PEOPLE.forEach(function (x) { if (x.id === id) p = x; });
      if (!p) return;
      answers[id] = choice;
      var r = qRows[id];
      Object.keys(r.btns).forEach(function (c) { r.btns[c].setAttribute('aria-pressed', c === choice ? 'true' : 'false'); });
      var ok = choice === p.answer;
      r.fb.textContent = '';
      r.fb.appendChild(el('span', { 'class': 'ixb-mark', 'aria-hidden': 'true', text: ok ? '✓ ' : '✗ ' }));
      r.fb.appendChild(document.createTextNode(p.fb[choice]));
      r.fb.className = 'sd-fb ' + (ok ? 'is-ok' : 'is-bad');
      var good = 0, done = 0;
      PEOPLE.forEach(function (x) { if (answers[x.id]) { done++; if (answers[x.id] === x.answer) good++; } });
      if (speak) say((ok ? 'Right. ' : 'Not quite. ') + p.fb[choice] + (done === PEOPLE.length ? ' Score: ' + good + ' of ' + PEOPLE.length + '.' : ''));
      return good;
    }

    function reset() {
      seen = {};
      answers = {};
      PEOPLE.forEach(function (p) {
        var r = qRows[p.id];
        Object.keys(r.btns).forEach(function (c) { r.btns[c].setAttribute('aria-pressed', 'false'); });
        r.fb.textContent = '';
        r.fb.className = 'sd-fb';
      });
      setDevice(startDevice);
      say('');
    }

    setDevice(startDevice);

    return {
      presets: [
        { name: 'explain every line', run: function () {
          var n = DEVICES[device].lines.length;
          for (var i = 0; i < n; i++) show(i);
        } },
        { name: 'answer the quiz', run: function () {
          PEOPLE.forEach(function (p, i) { answer(p.id, p.answer, i === PEOPLE.length - 1); });
        } }
      ],
      reset: reset
    };
  });
})();
