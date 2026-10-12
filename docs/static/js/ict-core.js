/* ict-core.js — component registry and helpers for the ICT · Unit 1 site.
   Contract: site_src/SITE_SPEC.md. Every interactive registers with ICT.register(name, factory). */
(function () {
  'use strict';
  var factories = {};
  var instances = [];

  function el(tag, attrs, children) {
    var n = document.createElement(tag);
    attrs = attrs || {};
    Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v === null || v === undefined || v === false) return;
      if (k === 'class') n.className = v;
      else if (k === 'text') n.textContent = v;
      else if (k === 'html') n.innerHTML = v;
      else if (k.slice(0, 2) === 'on' && typeof v === 'function') n.addEventListener(k.slice(2), v);
      else if (k === 'style' && typeof v === 'object') Object.keys(v).forEach(function (s) { n.style[s] = v[s]; });
      else n.setAttribute(k, v === true ? '' : v);
    });
    (children || []).forEach(function (c) {
      if (c === null || c === undefined || c === false) return;
      n.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
    });
    return n;
  }

  function svg(tag, attrs, children) {
    var n = document.createElementNS('http://www.w3.org/2000/svg', tag);
    attrs = attrs || {};
    Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v === null || v === undefined || v === false) return;
      if (k === 'text') n.textContent = v;
      else if (k.slice(0, 2) === 'on' && typeof v === 'function') n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v);
    });
    (children || []).forEach(function (c) { if (c) n.appendChild(c); });
    return n;
  }

  var store = {
    get: function (key, fallback) {
      try {
        var raw = window.localStorage.getItem(key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch (e) { return fallback; }
    },
    set: function (key, value) {
      try { window.localStorage.setItem(key, JSON.stringify(value)); return true; } catch (e) { return false; }
    },
    remove: function (key) {
      try { window.localStorage.removeItem(key); } catch (e) { /* storage blocked */ }
    }
  };

  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function live(root) {
    var r = el('p', { 'class': 'ix-live', 'aria-live': 'polite' });
    root.appendChild(r);
    return function (msg, kind) {
      r.textContent = msg;
      r.className = 'ix-live' + (kind ? ' is-' + kind : '');
    };
  }

  function root() {
    var b = document.body;
    return (b && b.getAttribute('data-root')) || './';
  }

  var api = { el: el, svg: svg, store: store, shuffle: shuffle, live: live };
  Object.defineProperty(api, 'root', { get: root });

  function mount(fig) {
    if (fig.__ixMounted) return;
    var name = fig.getAttribute('data-ix');
    var f = factories[name];
    if (!f) return;
    var body = fig.querySelector('.ix-body') || fig;
    var cfg = {};
    try { cfg = JSON.parse(fig.getAttribute('data-config') || '{}') || {}; } catch (e) { cfg = {}; }
    fig.__ixMounted = true;
    fig.classList.add('ix-ready');
    var inst = f(body, cfg, api) || {};
    inst.name = name;
    inst.id = fig.id || name;
    instances.push(inst);
  }

  function mountAll(scope) {
    var figs = (scope || document).querySelectorAll('.ix[data-ix]');
    for (var i = 0; i < figs.length; i++) mount(figs[i]);
  }

  window.ICT = {
    register: function (name, factory) {
      factories[name] = factory;
      if (document.readyState !== 'loading') mountAll();
    },
    mountAll: mountAll,
    instances: instances,
    api: api
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { mountAll(); });
})();
