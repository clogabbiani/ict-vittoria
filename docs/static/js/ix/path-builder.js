/* path-builder.js — component 11: click through drive → folders → file to build a Windows path,
   plus a file-name checker (Surname_Name_Task.ext). Config: target (full path, default
   "C:\Users\Student\Documents\ICT\Rossi_Anna_Unit1.docx"). Fictional names only. Contract: SITE_SPEC.md. */
(function () {
  'use strict';
  if (!window.ICT) return;

  var DEFAULT_TARGET = 'C:\\Users\\Student\\Documents\\ICT\\Rossi_Anna_Unit1.docx';
  var EXTS = ['docx', 'xlsx', 'pptx', 'pdf', 'jpg', 'png'];

  function F(name, kids) { return { name: name, folder: true, kids: kids || [] }; }
  function f(name) { return { name: name, folder: false }; }
  function makeDisk() {
    return F('C:', [
      F('Program Files', [F('Microsoft Office'), F('Mozilla Firefox')]),
      F('Users', [
        F('Public', [F('Documents')]),
        F('Student', [
          F('Desktop', [f('notes.txt'), f('Rossi_Anna_Poster.png')]),
          F('Documents', [
            F('ICT', [f('Rossi_Anna_Unit1.docx'), f('Rossi_Anna_Timeline.pptx'), f('Rossi_Anna_Moore.xlsx')]),
            F('Maths', [f('Rossi_Anna_Fractions.pdf')]),
            F('English', [f('Rossi_Anna_Essay.docx')])
          ]),
          F('Downloads', [f('compito finale (2).docx'), f('setup.exe')]),
          F('Pictures', [f('trip_2026.jpg'), f('Screenshot 1.png')])
        ])
      ]),
      F('Windows', [F('System32')])
    ]);
  }

  // make sure the target exists in the disk (so any config.target works)
  function ensure(disk, target) {
    var parts = target.split('\\').filter(function (p) { return p !== ''; });
    if (!parts.length || !/^[A-Za-z]:$/.test(parts[0])) return;
    disk.name = parts[0].toUpperCase();
    var node = disk;
    var endsFolder = /\\$/.test(target);
    for (var i = 1; i < parts.length; i++) {
      var last = i === parts.length - 1;
      var isFolder = !last || endsFolder;
      var found = null;
      for (var k = 0; k < node.kids.length; k++) if (node.kids[k].name.toLowerCase() === parts[i].toLowerCase()) found = node.kids[k];
      if (!found) { found = isFolder ? F(parts[i]) : f(parts[i]); node.kids.push(found); }
      if (!found.folder) return;
      node = found;
    }
  }

  ICT.register('path-builder', function (root, config, api) {
    config = config || {};
    var el = api.el;
    var target = typeof config.target === 'string' && /^[A-Za-z]:\\/.test(config.target) ? config.target : DEFAULT_TARGET;
    var disk = makeDisk();
    ensure(disk, target);
    var stack = [disk];   // folders from the drive down
    var file = null;

    var wrap = el('div', { 'class': 'ix-path-builder' });
    root.appendChild(wrap);
    wrap.appendChild(el('p', { 'class': 'ixb-instr', text: 'Click the folders to find the file. Watch the path grow.' }));
    wrap.appendChild(el('p', { 'class': 'pb-target' }, ['Find: ', el('code', { 'class': 'pb-mono', text: target })]));

    var crumbs = el('nav', { 'class': 'pb-crumbs', 'aria-label': 'Where you are' });
    var pathOut = el('output', { 'class': 'pb-path pb-mono', 'aria-label': 'Path' });
    var upBtn = el('button', { type: 'button', 'class': 'ixb-btn pb-up', text: 'Up one level', onclick: function () { go(stack.length - 2); } });
    var list = el('ul', { 'class': 'pb-list', 'aria-label': 'Inside this folder' });
    wrap.appendChild(el('div', { 'class': 'pb-explorer' }, [
      el('div', { 'class': 'pb-pathrow' }, [el('span', { 'class': 'pb-pathlab', text: 'Path:' }), pathOut]),
      crumbs,
      el('div', { 'class': 'pb-head' }, [upBtn]),
      list
    ]));
    var say = api.live(wrap);

    // file-name checker
    var inId = 'pb-name-' + Math.random().toString(36).slice(2, 8);
    var input = el('input', { type: 'text', id: inId, 'class': 'pb-input pb-mono', autocomplete: 'off', spellcheck: 'false',
      placeholder: 'Surname_Name_Task.docx' });
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); checkName(true); } });
    var rulesList = el('ul', { 'class': 'pb-rules', hidden: true });
    var nameMsg = el('p', { 'class': 'pb-namemsg', 'aria-live': 'polite' });
    wrap.appendChild(el('div', { 'class': 'pb-checker' }, [
      el('h4', { 'class': 'pb-h', text: 'Name checker' }),
      el('p', { 'class': 'ixb-small', text: 'Our rule: Surname_Name_Task.ext, for example Rossi_Anna_Unit1.docx' }),
      el('label', { 'for': inId, 'class': 'pb-label', text: 'Type a file name:' }),
      el('div', { 'class': 'pb-inrow' }, [input,
        el('button', { type: 'button', 'class': 'ixb-btn ixb-primary', text: 'Check name', onclick: function () { checkName(true); } })]),
      nameMsg,
      rulesList
    ]));

    function pathString() {
      var s = stack[0].name + '\\';
      for (var i = 1; i < stack.length; i++) s += stack[i].name + '\\';
      if (file) s += file.name;
      return s;
    }
    function norm(p) { return p.toLowerCase(); }

    function render(focusFirst) {
      var p = pathString();
      pathOut.textContent = p;
      crumbs.textContent = '';
      stack.forEach(function (n, i) {
        if (i) crumbs.appendChild(el('span', { 'class': 'pb-sep', 'aria-hidden': 'true', text: '›' }));
        var cur = i === stack.length - 1 && !file;
        crumbs.appendChild(el('button', { type: 'button', 'class': 'pb-crumb', 'aria-current': cur ? 'location' : null,
          text: n.name, onclick: function () { go(i); } }));
      });
      if (file) {
        crumbs.appendChild(el('span', { 'class': 'pb-sep', 'aria-hidden': 'true', text: '›' }));
        crumbs.appendChild(el('span', { 'class': 'pb-crumb is-file', 'aria-current': 'location', text: file.name }));
      }
      upBtn.disabled = stack.length < 2;
      list.textContent = '';
      var here = stack[stack.length - 1];
      var kids = here.kids.slice().sort(function (a, b) {
        if (a.folder !== b.folder) return a.folder ? -1 : 1;
        return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1;
      });
      if (!kids.length) list.appendChild(el('li', { 'class': 'pb-empty', text: 'This folder is empty.' }));
      kids.forEach(function (n) {
        var b = el('button', { type: 'button', 'class': 'pb-item' + (n.folder ? ' is-folder' : ' is-file') + (file === n ? ' is-sel' : ''),
          'aria-pressed': n.folder ? null : (file === n ? 'true' : 'false'),
          onclick: function () { open(n); } }, [
          el('span', { 'class': 'pb-icon', 'aria-hidden': 'true' }),
          el('span', { 'class': 'pb-name', text: n.name }),
          el('span', { 'class': 'pb-kind', text: n.folder ? 'folder' : 'file' })
        ]);
        list.appendChild(el('li', {}, [b]));
      });
      if (focusFirst) { var first = list.querySelector('button'); if (first) first.focus(); }
    }

    function feedback() {
      var p = pathString();
      if (file) {
        if (norm(p) === norm(target)) say('You found it! ' + p, 'ok');
        else say('This is ' + p + '. It is not the target file. Look again.', 'bad');
      } else if (norm(target).indexOf(norm(p)) === 0) {
        say(p + ' — good, keep going.');
      } else {
        say(p + ' — the target is not in this folder. Go back.');
      }
    }

    function open(n) {
      if (n.folder) { stack.push(n); file = null; render(true); }
      else { file = n; render(false); }
      feedback();
    }
    function go(i) {
      if (i < 0) return;
      stack = stack.slice(0, i + 1);
      file = null;
      render(true);
      feedback();
    }

    // --- naming rules -------------------------------------------------------
    function rules(name) {
      var dot = name.lastIndexOf('.');
      var base = dot > 0 ? name.slice(0, dot) : name;
      var ext = dot > 0 ? name.slice(dot + 1).toLowerCase() : '';
      var parts = base.split('_');
      var threeParts = parts.length >= 3 && parts.every(function (p) { return p.length > 0; });
      var capOk = parts.length >= 2 && /^[A-Z]/.test(parts[0]) && /^[A-Z]/.test(parts[1]);
      var version = /(final|definitiv|copy|copia|nuovo|\(\d+\)|(^|[_\s\-.])new($|[_\s\-.\d]))/i.test(base);
      return [
        { ok: !/\s/.test(name), yes: 'No spaces.', no: 'There is a space. Use _ instead: spaces can break links and uploads.' },
        { ok: !/[^\x00-\x7F]/.test(name), yes: 'No accents.', no: 'Write letters without accents: e, not è. Some computers change accents into strange signs.' },
        { ok: !/[^A-Za-z0-9_\-\s\u0080-\uFFFF]/.test(base), yes: 'Only letters, numbers and _.', no: 'Remove symbols like ( ) # & ! \' and extra dots.' },
        { ok: threeParts, yes: 'Three parts with _: Surname_Name_Task.', no: 'Use three parts joined by _: Surname_Name_Task (no double __).' },
        { ok: capOk, yes: 'Capital letters on surname and name.', no: 'Start the surname and the name with a capital letter: Rossi_Anna.' },
        { ok: EXTS.indexOf(ext) >= 0, yes: 'A good extension (.' + ext + ').',
          no: ext ? '".' + ext + '" is not one of ours. Use .docx .xlsx .pptx .pdf .jpg or .png.' : 'Add an extension at the end, like .docx.' },
        { ok: !version, yes: 'No "final" or "(2)": one clear version.', no: 'Words like "final", "copy", "new" or "(2)" make a mess. Use one clear name; to keep versions, add v2 to the task.' },
        { ok: name.length > 0 && name.length <= 40, yes: 'Short: ' + name.length + ' characters.', no: name.length ? 'Too long: ' + name.length + ' characters. Keep it to 40 or fewer.' : 'Type a name first.' }
      ];
    }

    function checkName(speak) {
      var name = input.value;
      var rs = rules(name);
      rulesList.textContent = '';
      var good = 0;
      rs.forEach(function (r) {
        if (r.ok) good++;
        rulesList.appendChild(el('li', { 'class': r.ok ? 'is-ok' : 'is-bad' }, [
          el('span', { 'class': 'ixb-mark', 'aria-hidden': 'true', text: r.ok ? '✓' : '✗' }),
          el('span', { text: (r.ok ? '' : 'Fix: ') + (r.ok ? r.yes : r.no) })
        ]));
      });
      rulesList.hidden = false;
      var msg = good === rs.length ? 'Perfect file name! All ' + rs.length + ' rules are OK.'
        : good + ' of ' + rs.length + ' rules are OK. Fix the ones with a cross.';
      nameMsg.textContent = msg;
      nameMsg.className = 'pb-namemsg ' + (good === rs.length ? 'is-ok' : 'is-bad');
      return rs;
    }

    function buildTarget() {
      stack = [disk]; file = null;
      var parts = target.split('\\').filter(function (p) { return p !== ''; });
      for (var i = 1; i < parts.length; i++) {
        var here = stack[stack.length - 1], next = null;
        for (var k = 0; k < here.kids.length; k++) if (norm(here.kids[k].name) === norm(parts[i])) next = here.kids[k];
        if (!next) break;
        if (next.folder) stack.push(next); else { file = next; break; }
      }
      render(false);
      feedback();
    }

    function reset() {
      stack = [disk]; file = null;
      render(false);
      input.value = '';
      rulesList.hidden = true;
      rulesList.textContent = '';
      nameMsg.textContent = '';
      say('');
    }

    render(false);

    return {
      presets: [
        { name: 'build the target path', run: function () { buildTarget(); } },
        { name: "check a bad name 'compito finale (2).docx'", run: function () { input.value = 'compito finale (2).docx'; checkName(true); } },
        { name: "check a good name 'Rossi_Anna_Unit1.docx'", run: function () { input.value = 'Rossi_Anna_Unit1.docx'; checkName(true); } }
      ],
      reset: reset
    };
  });
})();
