#!/usr/bin/env python3
"""build_site.py — generates docs/ for ICT · Liceo Vittoria from the content modules in site_src/.

Usage:  python3 site_src/build_site.py
Static assets (docs/static, docs/img, docs/about) are kept as they are; every other page is rewritten.
"""
import html
import json
import os
import re
import shutil
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
DOCS = os.path.join(ROOT, "docs")
sys.path.insert(0, HERE)

import content_unit1 as U1  # noqa: E402

SITE_TITLE = "ICT · Liceo Vittoria"
TEACHER = "Prof. Claudio"


# ----------------------------------------------------------------------------- helpers
def esc(s):
    return html.escape(str(s), quote=True)


def attr_json(obj):
    """JSON for a data- attribute, escaped the way the original site does it."""
    return html.escape(json.dumps(obj, ensure_ascii=False), quote=True)


def inline(text):
    """Tiny inline markup: **bold**, *italic*, `code`."""
    t = esc(text)
    t = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", t)
    t = re.sub(r"(?<!\*)\*(?!\*)(.+?)\*", r"<em>\1</em>", t)
    t = re.sub(r"`(.+?)`", r"<code>\1</code>", t)
    return t


def head(root, title, description, scripts=()):
    s = [
        "<!doctype html>",
        '<html lang="en" data-theme="auto">',
        "<head>",
        '<meta charset="utf-8">',
        '<meta name="viewport" content="width=device-width, initial-scale=1">',
        f"<title>{esc(title)}</title>",
        f'<meta name="description" content="{esc(description)}">',
        '<meta name="color-scheme" content="light dark">',
        '<meta name="referrer" content="no-referrer">',
        f'<link rel="icon" href="{root}static/favicon.svg" type="image/svg+xml">',
        "<script>",
        "(function(){var d=document.documentElement;function g(k){try{var v=localStorage.getItem(k);return v===null?null:JSON.parse(v);}catch(e){return null;}}",
        "var t=g('ict-theme');if(t==='light'||t==='dark')d.setAttribute('data-theme',t);",
        "if(g('ict-read'))d.setAttribute('data-read','1');if(g('ict-font')==='atkinson')d.setAttribute('data-font','atkinson');",
        "d.className+=' js';})();",
        "</script>",
        f'<link rel="stylesheet" href="{root}static/css/site.css">',
        f'<link rel="stylesheet" href="{root}static/css/ix-a.css">',
        f'<link rel="stylesheet" href="{root}static/css/ix-b.css">',
        f'<link rel="stylesheet" href="{root}static/css/ix-c.css">',
        f'<script defer src="{root}static/js/ict-core.js"></script>',
        f'<script defer src="{root}static/js/site.js"></script>',
    ]
    for sc in scripts:
        s.append(f'<script defer src="{root}static/js/ix/{sc}.js"></script>')
    s.append("</head>")
    return "\n".join(s)


def header(root, current):
    def nav(href, label, key):
        cur = ' aria-current="page"' if key == current else ""
        return f'    <a href="{root}{href}"{cur}>{label}</a>'

    return "\n".join([
        '<a class="skip" href="#main">Skip to content</a>',
        '<header class="site-head">',
        '  <div class="head-row wrap-wide">',
        f'    <a class="brand" href="{root}index.html"><span class="brand-ict">ICT</span><span class="brand-dot" aria-hidden="true">·</span><span class="brand-school">Liceo Vittoria</span></a>',
        '    <div class="tools" role="group" aria-label="Display options">',
        '      <button type="button" class="tool" data-action="theme" aria-label="Theme: auto. Change theme">',
        '        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor"/></svg>',
        '        <span class="tool-label">Auto</span>',
        "      </button>",
        '      <button type="button" class="tool" data-action="read" aria-pressed="false">',
        '        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path d="M3 19 8.5 5h1L15 19M5 14.5h8" fill="none" stroke="currentColor" stroke-width="2"/><path d="M16 12.5c1-1 4-1.2 4 1.3V19m0-3.2c-3.2-.4-4.6.5-4.6 1.8 0 2 3.4 2 4.6-.2" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>',
        '        <span class="tool-label">Readable</span>',
        "      </button>",
        '      <button type="button" class="tool tool-font" data-action="font" aria-pressed="false">',
        '        <span class="tool-glyph" aria-hidden="true">Ag</span>',
        '        <span class="tool-label">Easy font</span>',
        "      </button>",
        '      <button type="button" class="tool" data-action="print">',
        '        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path d="M7 9V3h10v6M7 17H4v-7h16v7h-3M7 14h10v7H7z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
        '        <span class="tool-label">Print</span>',
        "      </button>",
        "    </div>",
        "  </div>",
        '  <nav class="site-nav wrap-wide" aria-label="Main">',
        nav("index.html", "Home", "home"),
        nav("unit-1/index.html", "Unit 1", "unit"),
        nav("unit-1/review/index.html", "Review", "review"),
        nav("about/index.html", "About", "about"),
        "  </nav>",
        "</header>",
    ])


def footer(root):
    return "\n".join([
        '<footer class="site-foot">',
        '  <div class="wrap-wide foot-grid">',
        f'    <p class="foot-title">{SITE_TITLE}<br><span>{TEACHER}</span></p>',
        "    <p>No accounts, no tracking, no cookies. Your answers stay in this browser.<br>",
        f'      Photos are free licences, credited under each photo and on the <a href="{root}about/index.html">About</a> page.</p>',
        "  </div>",
        "</footer>",
        "</body>",
        "</html>",
    ])


# ----------------------------------------------------------------------------- blocks
def photo(root, key, cap, inline_photo=False):
    img = U1.IMAGES[key]
    cls = "photo photo-inline" if inline_photo else "photo "
    return "\n".join([
        f'<figure class="{cls}">',
        f'  <img src="{root}img/{key}.jpg"',
        f'       srcset="{root}img/{key}-800.jpg 800w, {root}img/{key}.jpg 1600w"',
        '       sizes="(min-width: 1140px) 1100px, 100vw"',
        f'       width="{img["w"]}" height="{img["h"]}" alt="{esc(cap)}" loading="lazy" decoding="async">',
        "  <figcaption>",
        f'<span class="cap">{esc(cap)}</span>    <span class="credit">Photo: {esc(img["author"])}, {esc(img["licence"])} · <a href="{esc(img["url"])}" rel="noopener noreferrer">source</a></span>',
        "  </figcaption>",
        "</figure>",
    ])


def question(q, qid, kind):
    """Markup for one question: a .q div the site's JS turns into an interactive item."""
    t = q["type"]
    data = dict(q)
    parts = [f'<div class="q q-type-{t}" id="{qid}" data-kind="{kind}" data-q="{attr_json(data)}">',
             f'  <p class="q-text">{esc(q["q"])}</p>']
    if t == "mc":
        parts.append('  <ol class="q-fallback" type="a">' + "".join(f"<li>{esc(o)}</li>" for o in q["options"]) + "</ol>")
    elif t == "tf":
        parts.append('  <p class="q-fallback">True or false?</p>')
    elif t == "order":
        items = sorted(q["items"])
        parts.append('  <ul class="q-fallback">' + "".join(f"<li>{esc(o)}</li>" for o in items) + "</ul>")
    elif t == "match":
        parts.append('  <ul class="q-fallback">' + "".join(f"<li>{esc(a)} — ?</li>" for a, b in q["pairs"]) + "</ul>")
    parts.append("</div>")
    return "\n".join(parts)


def ix_figure(root, ix, fid):
    cfg = ix.get("config", {})
    s = [f'<figure class="ix" data-ix="{ix["name"]}" data-config="{attr_json(cfg)}" id="{fid}">',
         f'  <figcaption class="ix-title">{esc(ix["title"])}</figcaption>']
    if ix.get("intro"):
        s.append(f'<p class="ix-intro">{esc(ix["intro"])}</p>')
    s.append('  <div class="ix-body"></div>')
    s.append('  <div class="ix-print">')
    s.append('    <p class="ix-print-label">Paper version</p>')
    s.append(f'    <p>{esc(ix.get("print", ""))}</p>')
    s.append("  </div>")
    s.append("</figure>")
    return "\n".join(s)


def notes_block(root, concept):
    """One concept of the study notes: heading, paragraphs, optional table / flow / list / photo."""
    s = ['    <div class="concept">', f'      <h3 class="concept-h">{inline(concept["h"])}</h3>']
    for p in concept.get("p", []):
        s.append(f"      <p>{inline(p)}</p>")
    if "flow" in concept:
        s.append('      <ol class="flow">' + "".join(f"<li>{inline(x)}</li>" for x in concept["flow"]) + "</ol>")
    if "list" in concept:
        s.append('      <ul class="plain-list notes-list">' + "".join(f"<li>{inline(x)}</li>" for x in concept["list"]) + "</ul>")
    if "table" in concept:
        tb = concept["table"]
        s.append('      <div class="table-scroll"><table class="gloss-table notes-table">')
        s.append("        <thead><tr>" + "".join(f'<th scope="col">{inline(h)}</th>' for h in tb[0]) + "</tr></thead>")
        s.append("        <tbody>")
        for row in tb[1:]:
            cells = [f'<th scope="row">{inline(row[0])}</th>'] + [f"<td>{inline(c)}</td>" for c in row[1:]]
            s.append("        <tr>" + "".join(cells) + "</tr>")
        s.append("        </tbody></table></div>")
    if "remember" in concept:
        s.append(f'      <p class="one-line">{inline(concept["remember"])}</p>')
    if "photo" in concept:
        key, cap = concept["photo"]
        s.append(photo(root, key, cap, inline_photo=True))
    if "p_after" in concept:
        for p in concept["p_after"]:
            s.append(f"      <p>{inline(p)}</p>")
    s.append("    </div>")
    return "\n".join(s)


def stars(n):
    return "★" * n + "☆" * (3 - n)


# ----------------------------------------------------------------------------- pages
def chapter_page(ch, prev_ch, next_ch, unit):
    root = "../../"
    slug = ch["slug"]
    scripts = [ix["name"] for ix in ch.get("ix", [])]
    out = [head(root, f'{ch["title"]} · Unit 1 · {SITE_TITLE}', ch["hook"], scripts),
           f'<body data-root="{root}" data-page="chapter" data-slug="{slug}">',
           header(root, "unit"),
           f'<div class="progress" data-progress-slug="{slug}">',
           '  <div class="progress-track" role="progressbar" aria-label="Chapter progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span class="progress-fill"></span></div>',
           '  <span class="progress-text">0% done</span>',
           "</div>",
           '<main id="main" tabindex="-1">',
           '<article class="chapter">',
           '  <header class="ch-head wrap">',
           f'    <p class="eyebrow"><a href="{root}unit-1/index.html">Unit 1</a> · Lesson {ch["num"]}</p>',
           f'    <h1 class="ch-title">{esc(ch["title"])}</h1>',
           f'    <p class="ch-hook">{esc(ch["hook"])}</p>',
           '    <nav class="toc" aria-label="On this page">',
           '      <a href="#test-h">In the test</a><a href="#story-h">The story</a><a href="#notes-h">The notes</a><a href="#check-h">Check now</a>'
           + ('<a href="#try-h">Try it</a>' if ch.get("ix") else "")
           + '<a href="#ex-h">Exercises</a>',
           "    </nav>",
           "  </header>",
           ""]
    n = 0

    # 01 In the test
    n += 1
    out.append(f'  <section class="block in-test wrap" aria-labelledby="test-h">')
    out.append(f'    <h2 id="test-h" class="block-h"><span class="block-n" aria-hidden="true">{n:02d}</span>What the test will ask</h2>')
    out.append('    <p class="block-lede">After this lesson you should be able to:</p>')
    out.append('    <ul class="plain-list objectives">' + "".join(f"<li>{inline(o)}</li>" for o in ch["objectives"]) + "</ul>")
    out.append("  </section>\n")

    # 02 The story
    n += 1
    out.append('  <section class="block story" aria-labelledby="story-h">')
    out.append(f'    <h2 id="story-h" class="block-h wrap"><span class="block-n" aria-hidden="true">{n:02d}</span>The story</h2>')
    for item in ch["story"]:
        if isinstance(item, tuple):
            out.append('      <div class="wrap-photo">' + photo(root, item[0], item[1]) + "</div>")
        else:
            out.append(f'      <p class="wrap story-p">{inline(item)}</p>')
    out.append("  </section>\n")

    # 03 The notes
    n += 1
    out.append('  <section class="block science wrap" aria-labelledby="notes-h">')
    out.append(f'    <h2 id="notes-h" class="block-h"><span class="block-n" aria-hidden="true">{n:02d}</span>The notes</h2>')
    out.append('    <p class="block-lede">Everything from the lesson, in order. This is the part to study.</p>')
    for c in ch["notes"]:
        out.append(notes_block(root, c))
    out.append("  </section>\n")

    # 04 Check now
    n += 1
    out.append('  <section class="block check-now wrap" aria-labelledby="check-h" data-section="check">')
    out.append(f'    <h2 id="check-h" class="block-h"><span class="block-n" aria-hidden="true">{n:02d}</span>Check now</h2>')
    out.append('    <p class="block-lede">Quick questions. You see the answer at once.</p>')
    out.append('    <ol class="q-list" role="list">')
    for i, q in enumerate(ch["check"], 1):
        out.append("<li>" + question(q, f"q-{slug}-c{i}", "check") + "</li>")
    out.append("    </ol>")
    out.append("  </section>\n")

    # 05 Try it
    if ch.get("ix"):
        n += 1
        out.append('  <section class="block try" aria-labelledby="try-h">')
        out.append(f'    <h2 id="try-h" class="block-h wrap"><span class="block-n" aria-hidden="true">{n:02d}</span>Try it</h2>')
        for i, ix in enumerate(ch["ix"], 1):
            if ix.get("lead"):
                out.append(f'<p class="wrap">{inline(ix["lead"])}</p>')
            out.append('    <div class="wrap-ix">' + ix_figure(root, ix, f'ix-{ch["num"]:02d}-{i}') + "</div>")
        out.append("  </section>\n")

    # 06 Your turn
    n += 1
    tid = f'u1-{slug}-turn'
    out.append('  <section class="block your-turn wrap" aria-labelledby="turn-h" data-section="turn">')
    out.append(f'    <h2 id="turn-h" class="block-h"><span class="block-n" aria-hidden="true">{n:02d}</span>Your turn</h2>')
    out.append(f'    <label class="turn-prompt" for="turn-{tid}">{esc(ch["turn"])}</label>')
    out.append(f'    <textarea id="turn-{tid}" class="turn-text" data-turn-id="{tid}" rows="6" spellcheck="true"></textarea>')
    out.append('    <div class="turn-bar">')
    out.append(f'      <button type="button" class="btn btn-ghost" data-action="copy-turn" data-target="turn-{tid}">Copy</button>')
    out.append('      <p class="turn-note" aria-live="polite">Saved in this browser only. Nothing is sent anywhere.</p>')
    out.append("    </div>")
    out.append("  </section>\n")

    # 07 Exercises
    n += 1
    out.append('  <section class="block exercises wrap" aria-labelledby="ex-h" data-section="exercises">')
    out.append(f'    <h2 id="ex-h" class="block-h"><span class="block-n" aria-hidden="true">{n:02d}</span>Exercises</h2>')
    out.append('    <p class="block-lede">From ★☆☆ (easy) to ★★★ (hard). Use a hint if you are stuck.</p>')
    out.append('    <ol class="ex-list" role="list">')
    for i, q in enumerate(ch["exercises"], 1):
        st = q.get("stars", 1)
        out.append('      <li class="ex">')
        out.append(f'        <p class="ex-head"><span class="ex-n">Exercise {i}</span>')
        out.append(f'          <span class="stars" role="img" aria-label="difficulty {st} of 3">{stars(st)}</span></p>')
        out.append("        " + question(q, f"q-{slug}-e{i}", "exercise"))
        out.append("      </li>")
    out.append("    </ol>")
    out.append("  </section>\n")

    # 08 Words
    n += 1
    out.append('  <section class="block wrap" aria-labelledby="words-h">')
    out.append(f'    <h2 id="words-h" class="block-h"><span class="block-n" aria-hidden="true">{n:02d}</span>Words of this lesson</h2>')
    out.append('    <dl class="gloss">')
    for w, m, it in ch["glossary"]:
        out.append(f'      <div class="gloss-row"><dt>{esc(w)} <span class="it" lang="it">{esc(it)}</span></dt><dd>{inline(m)}</dd></div>')
    out.append("    </dl>")
    out.append("  </section>\n")

    # pager
    out.append('  <nav class="pager wrap" aria-label="Chapters">')
    if prev_ch:
        out.append(f'    <a class="pager-link pager-prev" href="{root}unit-1/{prev_ch["slug"]}/index.html" rel="prev"><span class="pager-dir">Previous</span><span class="pager-title">{esc(prev_ch["title"])}</span></a>')
    if next_ch:
        out.append(f'    <a class="pager-link pager-next" href="{root}unit-1/{next_ch["slug"]}/index.html" rel="next"><span class="pager-dir">Next</span><span class="pager-title">{esc(next_ch["title"])}</span></a>')
    else:
        out.append(f'    <a class="pager-link pager-next" href="{root}unit-1/review/index.html" rel="next"><span class="pager-dir">Next</span><span class="pager-title">Review and practice test</span></a>')
    out.append("  </nav>")
    out.append("</article>")
    out.append("</main>")
    out.append(footer(root))
    return "\n".join(out)


def unit_index(unit):
    root = "../"
    out = [head(root, f'Unit 1 · {unit["title"]} · {SITE_TITLE}', unit["title"]),
           f'<body data-root="{root}" data-page="unit">',
           header(root, "unit"),
           '<main id="main" tabindex="-1">',
           '<section class="hero hero-unit">',
           '  <div class="wrap-wide">',
           f'    <p class="eyebrow">Unit 1 · {esc(unit["when"])}</p>',
           '    <h1 class="hero-title hero-ask">Can machines think?</h1>',
           f'    <p class="hero-lede">{esc(unit["lede"])}</p>',
           f'    <p class="hero-source">{esc(unit["source"])}</p>',
           "  </div>",
           "</section>",
           "",
           '<section class="wrap-wide section" aria-labelledby="ch-h">',
           '  <h2 id="ch-h" class="section-title">Lessons</h2>',
           '  <p class="section-lede">One chapter for each lesson, in the same order as the slides. Your progress is saved in this browser only.</p>',
           '  <ol class="chapter-list" role="list">']
    for ch in unit["chapters"]:
        out.append(f'    <li class="chapter-card" data-progress-slug="{ch["slug"]}">')
        out.append(f'      <p class="chapter-num">Lesson {ch["num"]}</p>')
        out.append(f'      <h3 class="chapter-title"><a class="card-link" href="{root}unit-1/{ch["slug"]}/index.html">{esc(ch["title"])}</a></h3>')
        out.append(f'<p class="chapter-hook">{esc(ch["hook"])}</p>      <div class="mini-progress">')
        out.append('        <div class="mini-bar" aria-hidden="true"><span style="width:0%"></span></div>')
        out.append('        <span class="mini-text">Not started</span>')
        out.append("      </div>")
        out.append("    </li>")
    out.append('    <li class="chapter-card chapter-review">')
    out.append('      <p class="chapter-num">Lesson 5</p>')
    out.append(f'      <h3 class="chapter-title"><a class="card-link" href="{root}unit-1/review/index.html">Review and the test</a></h3>')
    out.append('      <p class="chapter-hook">What the test covers, the key terms, all the quizzes, the glossary, the timeline game and a practice test with model answers.</p>')
    out.append("    </li>")
    out.append("  </ol>")
    out.append("</section>")
    # timeline
    out.append("")
    out.append('<section class="wrap-wide section" aria-labelledby="tl-h">')
    out.append('  <h2 id="tl-h" class="section-title">Ninety years in one line</h2>')
    out.append('  <p class="section-lede">The dates you must know. Every dot invents a part that is still inside every computer and phone.</p>')
    out.append('  <ol class="timeline" role="list">')
    for year, label in unit["timeline"]:
        out.append(f'    <li class="tl-item"><span class="tl-year">{esc(year)}</span><span class="tl-label">{esc(label)}</span></li>')
    out.append("  </ol>")
    out.append("</section>")
    # test box
    out.append("")
    out.append('<section class="wrap-wide section" aria-labelledby="test-box-h">')
    out.append('  <h2 id="test-box-h" class="section-title">The end-of-unit test</h2>')
    out.append('  <ul class="plain-list objectives">' + "".join(f"<li>{inline(x)}</li>" for x in unit["test_format"]) + "</ul>")
    out.append(f'  <p><a class="btn" href="{root}unit-1/review/index.html">Open the review page</a> <a class="btn btn-ghost" href="{root}unit-1/extra/index.html">Extra (not in the test)</a></p>')
    out.append("</section>")
    out.append("</main>")
    out.append(footer(root))
    return "\n".join(out)


def review_page(unit):
    root = "../../"
    chs = unit["chapters"]
    scripts = ["timeline-game"]
    out = [head(root, f"Review and the test · Unit 1 · {SITE_TITLE}", "Everything you need before the test.", scripts),
           f'<body data-root="{root}" data-page="review">',
           header(root, "review"),
           '<main id="main" tabindex="-1">',
           '<article class="chapter review">',
           '  <header class="ch-head wrap">',
           f'    <p class="eyebrow"><a href="{root}unit-1/index.html">Unit 1</a> · Lesson 5</p>',
           '    <h1 class="ch-title">Review and the test</h1>',
           '    <p class="ch-hook">Everything you need before the test: what it covers, the key terms, one quiz per lesson, the glossary, the timeline and a practice test with model answers.</p>',
           '    <nav class="toc" aria-label="On this page">',
           '      <a href="#spec-h">What the test covers</a><a href="#terms-h">Key terms</a><a href="#quizzes-h">Quizzes</a><a href="#gloss-h">Glossary</a><a href="#tl-game-h">Timeline game</a><a href="#past-h">Practice test</a>',
           "    </nav>",
           "  </header>",
           ""]
    n = 0
    # spec
    n += 1
    out.append('  <section class="block wrap" aria-labelledby="spec-h">')
    out.append(f'    <h2 id="spec-h" class="block-h"><span class="block-n" aria-hidden="true">{n:02d}</span>What the test covers</h2>')
    out.append('    <ul class="plain-list objectives">' + "".join(f"<li>{inline(x)}</li>" for x in unit["test_format"]) + "</ul>")
    for ch in chs:
        out.append(f'    <h3 class="sub-h">Lesson {ch["num"]} · {esc(ch["title"])}</h3>')
        out.append('    <ul class="plain-list objectives">' + "".join(f"<li>{inline(o)}</li>" for o in ch["objectives"]) + "</ul>")
    out.append("  </section>\n")
    # key terms
    n += 1
    out.append('  <section class="block wrap" aria-labelledby="terms-h">')
    out.append(f'    <h2 id="terms-h" class="block-h"><span class="block-n" aria-hidden="true">{n:02d}</span>Key terms: can you define them?</h2>')
    out.append('    <p class="block-lede">Cover the right column and say the definition out loud. These are the definitions the test expects.</p>')
    out.append('    <div class="table-scroll"><table class="gloss-table notes-table"><thead><tr><th scope="col">Term</th><th scope="col">Definition</th></tr></thead><tbody>')
    for term, d in unit["key_terms"]:
        out.append(f'      <tr><th scope="row">{esc(term)}</th><td>{inline(d)}</td></tr>')
    out.append("    </tbody></table></div>")
    out.append("  </section>\n")
    # quizzes
    n += 1
    out.append('  <section class="block wrap" aria-labelledby="quizzes-h">')
    out.append(f'    <h2 id="quizzes-h" class="block-h"><span class="block-n" aria-hidden="true">{n:02d}</span>Quizzes</h2>')
    for i, ch in enumerate(chs, 1):
        qs = ch["review"]
        out.append(f'    <details class="quiz" id="quiz-{i}"{" open" if i == 1 else ""}>')
        out.append(f'      <summary><span class="quiz-title">Lesson {ch["num"]} — {esc(ch["title"])}</span> <span class="quiz-count">{len(qs)} questions</span></summary>')
        out.append('      <p class="quiz-score" aria-live="polite"></p>')
        out.append('      <ol class="q-list" role="list">')
        for j, q in enumerate(qs, 1):
            out.append("<li>" + question(q, f"q-review-{i}-{j}", "review") + "</li>")
        out.append("      </ol>")
        out.append("    </details>")
    out.append("  </section>\n")
    # glossary A-Z
    n += 1
    allg = {}
    for ch in chs:
        for w, m, it in ch["glossary"]:
            allg.setdefault(w, (m, it))
    out.append('  <section class="block wrap glossary-all" aria-labelledby="gloss-h">')
    out.append(f'    <h2 id="gloss-h" class="block-h"><span class="block-n" aria-hidden="true">{n:02d}</span>Glossary A–Z</h2>')
    out.append('    <p class="block-lede">All the words of the unit, with the Italian word in grey. Print it with the Print button.</p>')
    out.append('    <table class="gloss-table">')
    out.append('      <caption class="sr-only">Glossary of Unit 1</caption>')
    out.append('      <thead><tr><th scope="col">Word</th><th scope="col">What it means</th><th scope="col" lang="it">Italiano</th></tr></thead>')
    letter = None
    for w in sorted(allg, key=lambda s: s.lower()):
        L = w[0].upper()
        if L != letter:
            if letter is not None:
                out.append("      </tbody>")
            letter = L
            out.append("      <tbody>")
            out.append(f'        <tr class="gloss-letter"><th scope="rowgroup" colspan="3">{L}</th></tr>')
        m, it = allg[w]
        out.append(f'        <tr><th scope="row">{esc(w)}</th><td>{inline(m)}</td><td class="it" lang="it">{esc(it)}</td></tr>')
    out.append("      </tbody>")
    out.append("    </table>")
    out.append("  </section>\n")
    # timeline game
    n += 1
    out.append('  <section class="block" aria-labelledby="tl-game-h">')
    out.append(f'    <h2 id="tl-game-h" class="block-h wrap"><span class="block-n" aria-hidden="true">{n:02d}</span>Timeline game</h2>')
    out.append('    <div class="wrap-ix">' + ix_figure(root, unit["timeline_game"], "ix-review-tl") + "</div>")
    out.append("  </section>\n")
    # practice test
    n += 1
    out.append('  <section class="block wrap" aria-labelledby="past-h">')
    out.append(f'    <h2 id="past-h" class="block-h"><span class="block-n" aria-hidden="true">{n:02d}</span>Practice test</h2>')
    out.append('    <p class="block-lede">Questions like the ones in the real test, with the marks in brackets. Try them on paper first, then check the model answer. One mark = one correct point.</p>')
    out.append('    <div class="quiz quiz-flat">')
    out.append('      <p class="quiz-score" aria-live="polite"></p>')
    out.append('      <ol class="q-list" role="list">')
    for j, q in enumerate(unit["practice"], 1):
        out.append("<li>" + question(q, f"q-past-{j}", "review") + "</li>")
    out.append("      </ol>")
    out.append("    </div>")
    out.append("  </section>")
    out.append("</article>")
    out.append("</main>")
    out.append(footer(root))
    return "\n".join(out)


def extra_page(unit):
    root = "../../"
    ex = unit["extra"]
    scripts = [b["ix"]["name"] for b in ex["blocks"]]
    out = [head(root, f'{ex["title"]} · Unit 1 · {SITE_TITLE}', ex["hook"], scripts),
           f'<body data-root="{root}" data-page="extra">',
           header(root, "unit"),
           '<main id="main" tabindex="-1">',
           '<article class="chapter extra">',
           '  <header class="ch-head wrap">',
           f'    <p class="eyebrow"><a href="{root}unit-1/index.html">Unit 1</a> · Extra</p>',
           f'    <h1 class="ch-title">{esc(ex["title"])}</h1>',
           f'    <p class="ch-hook">{esc(ex["hook"])}</p>',
           '    <p class="extra-note">Not part of the test. For anyone who wants more.</p>',
           "  </header>",
           ""]
    for i, b in enumerate(ex["blocks"], 1):
        out.append(f'  <section class="block try" aria-labelledby="extra-h-{i}">')
        out.append(f'    <h2 id="extra-h-{i}" class="block-h wrap"><span class="block-n" aria-hidden="true">{i:02d}</span>{esc(b["h"])}</h2>')
        out.append(f'<p class="wrap">{inline(b["p"])}</p>    <div class="wrap-ix">' + ix_figure(root, b["ix"], f"ix-extra-{i}") + "</div>")
        out.append("  </section>\n")
    out.append("</article>")
    out.append("</main>")
    out.append(footer(root))
    return "\n".join(out)


def home_page(unit):
    root = "./"
    out = [head(root, SITE_TITLE, "ICT lessons for Liceo Vittoria: chapters, interactive objects and exercises."),
           f'<body data-root="{root}" data-page="home">',
           header(root, "home"),
           '<main id="main" tabindex="-1">',
           '<section class="hero">',
           '  <div class="wrap-wide">',
           f'    <p class="eyebrow">{TEACHER}</p>',
           f'    <h1 class="hero-title">{SITE_TITLE}</h1>',
           '    <p class="hero-lede">Information and communication technology for the first year. Read the notes, try the machines, check what you know. Everything works in your browser.</p>',
           "  </div>",
           "</section>",
           '<section class="wrap-wide section" aria-labelledby="units-h">',
           '  <h2 id="units-h" class="section-title">Units this year</h2>',
           '  <ul class="unit-grid" role="list">',
           '    <li class="unit-card">',
           f'      <p class="unit-num">Unit 1 <span class="unit-when">· {esc(unit["when"])}</span></p>',
           '      <h3 class="unit-title">',
           f'<a class="card-link" href="{root}unit-1/index.html">{esc(unit["title"])}</a>      </h3>',
           f'<p class="unit-hook">{esc(unit["home_hook"])}</p><p class="badge badge-live">Open now</p>    </li>']
    for num, title, when in unit["coming"]:
        out.append('    <li class="unit-card is-soon">')
        out.append(f'      <p class="unit-num">Unit {num}{(" <span class=" + chr(34) + "unit-when" + chr(34) + ">· " + esc(when) + "</span>") if when else ""}</p>')
        out.append('      <h3 class="unit-title">')
        out.append(f"{esc(title)}      </h3>")
        out.append('<p class="badge">Coming soon</p>    </li>')
    out.append("  </ul>")
    out.append("</section>")
    out.append('<section class="wrap-wide section how" aria-labelledby="how-h">')
    out.append('  <h2 id="how-h" class="section-title">How this site works</h2>')
    out.append('  <ol class="how-list">')
    out.append("    <li><strong>Read</strong> the chapter after each lesson: the story first, then the notes.</li>")
    out.append("    <li><strong>Try</strong> the interactive objects: click, drag, break them.</li>")
    out.append("    <li><strong>Check</strong> yourself with the questions. You see the answer at once.</li>")
    out.append("    <li><strong>Before the test</strong>, open Review: what it covers, the key terms, the practice test.</li>")
    out.append("  </ol>")
    out.append("</section>")
    out.append("</main>")
    out.append(footer(root))
    return "\n".join(out)


# ----------------------------------------------------------------------------- build
def write(path, text):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(text)


def main():
    unit = U1.UNIT
    chs = unit["chapters"]
    # remove old generated chapter folders (keep static, img, about)
    u1 = os.path.join(DOCS, "unit-1")
    if os.path.isdir(u1):
        for name in os.listdir(u1):
            p = os.path.join(u1, name)
            if os.path.isdir(p):
                shutil.rmtree(p)
    write(os.path.join(DOCS, "index.html"), home_page(unit))
    write(os.path.join(u1, "index.html"), unit_index(unit))
    for i, ch in enumerate(chs):
        prev_ch = chs[i - 1] if i > 0 else None
        next_ch = chs[i + 1] if i + 1 < len(chs) else None
        write(os.path.join(u1, ch["slug"], "index.html"), chapter_page(ch, prev_ch, next_ch, unit))
    write(os.path.join(u1, "review", "index.html"), review_page(unit))
    write(os.path.join(u1, "extra", "index.html"), extra_page(unit))
    # small CSS additions for the notes blocks, appended once
    css_path = os.path.join(DOCS, "static", "css", "site.css")
    with open(css_path, encoding="utf-8") as f:
        css = f.read()
    marker = "/* ---- build_site additions ---- */"
    extra_css = marker + """
.objectives { display: grid; gap: 8px; margin: .5rem 0 0; }
.objectives li { padding-left: 1.6em; position: relative; }
.objectives li::before { content: "☐"; position: absolute; left: 0; top: 0; }
.in-test .block-lede { margin-bottom: .25rem; }
.notes-list { display: grid; gap: 6px; margin: .75rem 0; }
.notes-list li { padding-left: 1.1em; position: relative; }
.notes-list li::before { content: "–"; position: absolute; left: 0; }
.notes-table { font-size: .9375rem; margin: .75rem 0 1rem; }
.notes-table th[scope="row"] { white-space: normal; }
.concept .one-line { margin: 1rem 0 .5rem; font-size: clamp(1.125rem, 2vw, 1.375rem); }
.sub-h { margin: 1.5rem 0 .25rem; font-size: 1.0625rem; }
.gloss-row .it { font-weight: 400; color: var(--muted); font-size: .9em; margin-left: .35em; }
.timeline .tl-year { font-family: var(--mono); font-weight: 700; }
"""
    if marker not in css:
        with open(css_path, "a", encoding="utf-8") as f:
            f.write("\n" + extra_css)
    print("built", len(chs), "chapters + index, review, extra, home")


if __name__ == "__main__":
    main()
