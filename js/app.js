/* ============================================================
   Calculate Everything — движок
   Калькулятор = одна декларация в js/calculators/*.js
   Добавить калькулятор = добавить объект в массив. Кода менять не нужно.
   ============================================================ */

// Глобальный реестр. Модули калькуляторов вызывают CE.register(cat, [defs]).
window.CE = (function () {
  const CATEGORIES = {
    physics:    { title: 'Физика',      en: 'Physics',     emoji: '⚛️', tut: true  },
    math:       { title: 'Математика',  en: 'Math',        emoji: '∑',  tut: true  },
    economics:  { title: 'Экономика',   en: 'Economics',   emoji: '💰', tut: false },
    statistics: { title: 'Статистика',  en: 'Statistics',  emoji: '📊', tut: true  },
    everyday:   { title: 'На каждый день', en: 'Everyday',  emoji: '🧮', tut: false },
  };

  const registry = [];          // все калькуляторы
  const byId = {};

  function register(cat, defs) {
    for (const d of defs) {
      d.cat = cat;
      registry.push(d);
      byId[d.id] = d;
    }
  }

  // ---- утилиты форматирования ----
  function fmt(x, digits) {
    if (x === null || x === undefined || Number.isNaN(x)) return '—';
    if (!isFinite(x)) return '∞';
    if (digits !== undefined) return Number(x).toLocaleString('ru-RU', { maximumFractionDigits: digits });
    const a = Math.abs(x);
    if (a !== 0 && (a < 1e-4 || a >= 1e9)) return x.toExponential(4);
    return Number(x).toLocaleString('ru-RU', { maximumFractionDigits: 6 });
  }

  return { CATEGORIES, registry, byId, register, fmt };
})();

/* ============================================================
   Рендер — выполняется после загрузки всех модулей калькуляторов
   ============================================================ */
function CE_boot() {
  const CE = window.CE;
  const app = document.getElementById('app');

  // --- роутер по hash: #/  | #/cat/physics | #/calc/ohms-law ---
  function parseHash() {
    const h = (location.hash || '#/').replace(/^#/, '');
    const parts = h.split('/').filter(Boolean);
    if (parts[0] === 'calc' && parts[1]) return { view: 'calc', id: parts[1] };
    if (parts[0] === 'cat' && parts[1])  return { view: 'cat', cat: parts[1] };
    // статическая предрендеренная страница: <body data-calc="id"> и пустой hash
    const dc = document.body && document.body.dataset && document.body.dataset.calc;
    if (dc && (!location.hash || location.hash === '#/' || location.hash === '#')) return { view: 'calc', id: dc };
    return { view: 'home' };
  }

  function el(tag, attrs, ...kids) {
    const e = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      if (k === 'class') e.className = attrs[k];
      else if (k === 'html') e.innerHTML = attrs[k];
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), attrs[k]);
      else e.setAttribute(k, attrs[k]);
    }
    for (const kid of kids) {
      if (kid == null) continue;
      e.appendChild(typeof kid === 'string' ? document.createTextNode(kid) : kid);
    }
    return e;
  }

  // ---------- HOME ----------
  function renderHome() {
    app.innerHTML = '';
    // hero
    app.appendChild(el('section', { class: 'hero' },
      el('h1', null, 'Calculate ', el('em', null, 'Everything')),
      el('p', { class: 'lead' },
        'Калькуляторы на все случаи жизни. Физика · математика · экономика · статистика. ' +
        'Формула, пошаговое решение и пояснение к каждому.'),
      (function () {
        const box = el('div', { class: 'searchbox' });
        const inp = el('input', { type: 'search', id: 'q', placeholder: '🔎  Поиск калькулятора: «закон ома», «ипотека», «z-score»…', autocomplete: 'off' });
        inp.addEventListener('input', () => renderResults(inp.value.trim().toLowerCase()));
        box.appendChild(inp);
        return box;
      })()
    ));

    const results = el('div', { id: 'results' });
    app.appendChild(results);
    renderResults('');
  }

  function matches(d, q) {
    if (!q) return true;
    const hay = (d.title + ' ' + (d.title_en || '') + ' ' + (d.desc || '') + ' ' + (d.tags || []).join(' ')).toLowerCase();
    return q.split(/\s+/).every(w => hay.includes(w));
  }

  function renderResults(q) {
    const wrap = document.getElementById('results');
    if (!wrap) return;
    wrap.innerHTML = '';
    for (const key in CE.CATEGORIES) {
      const c = CE.CATEGORIES[key];
      const items = CE.registry.filter(d => d.cat === key && matches(d, q));
      if (!items.length) continue;
      const sec = el('section', { class: 'cat' },
        el('h2', null, el('span', { class: 'emoji' }, c.emoji), c.title,
          el('span', { class: 'count' }, String(items.length))));
      const grid = el('div', { class: 'grid' });
      for (const d of items) {
        grid.appendChild(el('a', { class: 'card', href: '#/calc/' + d.id },
          el('h3', null, d.title),
          el('p', null, d.desc || '')));
      }
      sec.appendChild(grid);
      wrap.appendChild(sec);
    }
    if (!wrap.children.length) {
      wrap.appendChild(el('p', { class: 'empty' }, 'Ничего не найдено. Попробуйте другой запрос.'));
    }
  }

  // ---------- CALC ----------
  function renderCalc(id, opts) {
    opts = opts || {};
    const d = CE.byId[id];
    if (!d) { location.hash = '#/'; return; }
    app.innerHTML = '';
    const c = CE.CATEGORIES[d.cat];

    if (!opts.embed) app.appendChild(el('nav', { class: 'crumbs' },
      el('a', { href: '#/' }, '← Все калькуляторы'),
      el('span', null, ' · '),
      el('span', { class: 'crumb-cat' }, c.emoji + ' ' + c.title)));

    const head = el('header', { class: 'calc-head' },
      el('h1', null, d.title),
      d.title_en ? el('p', { class: 'en' }, d.title_en) : null,
      d.desc ? el('p', { class: 'desc' }, d.desc) : null);
    app.appendChild(head);

    const form = el('div', { class: 'calc-form' });
    const inputs = {};
    for (const f of (d.inputs || [])) {
      const id2 = 'in_' + f.key;
      const row = el('div', { class: 'field' });
      row.appendChild(el('label', { for: id2 }, f.label + (f.unit ? '' : '')));
      const inWrap = el('div', { class: 'in-wrap' });
      let control;
      if (f.options) {
        control = el('select', { id: id2 });
        for (const o of f.options) control.appendChild(el('option', { value: String(o.value) }, o.label));
        if (f.default !== undefined) control.value = String(f.default);
      } else {
        control = el('input', { id: id2, type: 'text', inputmode: 'decimal',
          placeholder: f.placeholder || (f.optional ? 'оставьте пустым, чтобы найти' : '') });
        if (f.default !== undefined) control.value = String(f.default);
      }
      control.addEventListener('input', recompute);
      control.addEventListener('change', recompute);
      inWrap.appendChild(control);
      if (f.unit) inWrap.appendChild(el('span', { class: 'unit' }, f.unit));
      row.appendChild(inWrap);
      if (f.hint) row.appendChild(el('small', { class: 'hint' }, f.hint));
      form.appendChild(row);
      inputs[f.key] = control;
    }
    app.appendChild(form);

    const out = el('div', { class: 'calc-out', id: 'out' });
    app.appendChild(out);

    function recompute() {
      const vals = {};
      for (const f of (d.inputs || [])) {
        const raw = inputs[f.key].value;
        if (f.options) { vals[f.key] = raw; }
        else if (raw.trim() === '') { vals[f.key] = NaN; }
        else { vals[f.key] = parseFloat(raw.replace(',', '.')); }
      }
      let res;
      try { res = d.compute(vals); }
      catch (e) { res = { error: e.message }; }
      renderOut(out, res);
    }

    function renderOut(out, res) {
      out.innerHTML = '';
      if (!res) return;
      if (res.error) {
        out.appendChild(el('div', { class: 'err' }, res.error));
        return;
      }
      if (res.outputs && res.outputs.length) {
        const ob = el('div', { class: 'outputs' });
        for (const o of res.outputs) {
          ob.appendChild(el('div', { class: 'result' + (o.primary ? ' primary' : '') },
            el('span', { class: 'r-label' }, o.label),
            el('span', { class: 'r-val' }, (o.text !== undefined ? o.text : CE.fmt(o.value, o.digits)),
              o.unit ? el('span', { class: 'r-unit' }, ' ' + o.unit) : null)));
        }
        out.appendChild(ob);
      }
      if (res.formula) out.appendChild(el('div', { class: 'formula', html: res.formula }));
      if (res.steps && res.steps.length) {
        const ul = el('ul', { class: 'steps' });
        for (const s of res.steps) ul.appendChild(el('li', { html: s }));
        out.appendChild(el('details', { class: 'steps-d', open: '' },
          el('summary', null, 'Пошаговое решение'), ul));
      }
      if (res.note) out.appendChild(el('p', { class: 'note', html: res.note }));
    }

    recompute();

    // embed-режим (Трек 2): только калькулятор, без статьи/CTA/связанных
    if (opts.embed) {
      app.appendChild(el('p', { class: 'embed-credit' },
        el('a', { href: 'https://calculators.podlevskikh.com/#/calc/' + d.id, target: '_blank', rel: 'noopener' },
          'Калькулятор · calculators.podlevskikh.com')));
      return;
    }

    // короткое объяснение (лид)
    if (d.explain) {
      app.appendChild(el('section', { class: 'explain' },
        el('h2', null, 'Как это работает'),
        el('div', { html: d.explain })));
    }

    // полная статья «теория за расчётом» (SEO + образование + воронка)
    const art = (window.CE_ARTICLES || {})[d.id];
    if (art) {
      app.appendChild(el('article', { class: 'article', html: art }));
    }

    // ВОРОНКА: для предметов, где Vladimir репетитор — CTA на бронь
    if (c.tut) app.appendChild(tutorCTA(c));

    // связанные калькуляторы той же категории
    const related = CE.registry.filter(x => x.cat === d.cat && x.id !== d.id).slice(0, 6);
    if (related.length) {
      const sec = el('section', { class: 'related' }, el('h2', null, 'Похожие калькуляторы'));
      const grid = el('div', { class: 'grid' });
      for (const r of related) grid.appendChild(el('a', { class: 'card', href: '#/calc/' + r.id },
        el('h3', null, r.title), el('p', null, r.desc || '')));
      sec.appendChild(grid);
      app.appendChild(sec);
    }
  }

  // ---- Воронка на репетиторство (физика/математика/статистика) ----
  function tutorCTA(c) {
    return el('section', { class: 'cta' },
      el('div', { class: 'cta-inner' },
        el('h2', null, 'Застряли в ' + c.title.toLowerCase() + '?'),
        el('p', null,
          'Я — Владимир, преподаю физику и математику 20+ лет (МГУ, IB/AP/SAT, Praxis 200/200). ' +
          'Разберём вашу задачу на бесплатной 20-минутной консультации.'),
        el('div', { class: 'cta-btns' },
          el('a', { class: 'btn primary', href: 'https://calendly.com/vladimir-podlevskikh/30min', target: '_blank', rel: 'noopener' }, '📅 Записаться'),
          el('a', { class: 'btn', href: 'https://t.me/VladimirPodlevskikh', target: '_blank', rel: 'noopener' }, '✈️ Telegram'),
          el('a', { class: 'btn', href: 'https://wa.me/37455873402', target: '_blank', rel: 'noopener' }, '💬 WhatsApp'))));
  }

  // ---- роутинг ----
  function route() {
    const r = parseHash();
    window.scrollTo(0, 0);
    if (r.view === 'calc') renderCalc(r.id);
    else renderHome();
    // обновить <title> для SEO
    if (r.view === 'calc' && CE.byId[r.id]) {
      document.title = CE.byId[r.id].title + ' — онлайн-калькулятор · Calculate Everything';
    } else {
      document.title = 'Calculate Everything — калькуляторы: физика, математика, экономика, статистика';
    }
  }
  // embed-режим (Трек 2): ?embed=<id>&brand=<hex> → один калькулятор для <iframe>
  const qs = new URLSearchParams(location.search);
  const embedId = qs.get('embed');
  if (embedId) {
    document.body.classList.add('embed');
    const brand = qs.get('brand');
    if (brand && /^[0-9a-fA-F]{3,8}$/.test(brand)) {
      document.documentElement.style.setProperty('--accent', '#' + brand);
    }
    if (CE.byId[embedId]) {
      renderCalc(embedId, { embed: true });
      document.title = CE.byId[embedId].title;
    } else {
      app.appendChild(el('p', { class: 'empty' }, 'Калькулятор не найден.'));
    }
    return;
  }

  window.addEventListener('hashchange', route);
  route();
}
