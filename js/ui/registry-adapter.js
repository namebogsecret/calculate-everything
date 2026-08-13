/* ============================================================
   Registry adapter — мост между движком (window.CE) и UI-дизайном.
   Движок (js/app.js) + data-файлы наполняют window.CE.registry.
   Этот файл выставляет глобали, которых ждёт дизайн-слой (app.jsx):
     window.CALCS, window.CATS, window.catById, window.fmt, window.raw, window.CEnorm
   ВАЖНО: CE_boot() на главной НЕ вызывается — старый рендерер не нужен,
   калькуляторы (и их compute) переиспользуются как есть → один источник
   правды с SEO-страницами /calc/*.html. Добавить калькулятор =
   по-прежнему один объект в js/calculators/*.js, ничего тут не менять.
   ============================================================ */
(function () {
  'use strict';
  var CE = window.CE;
  if (!CE) { console.error('[adapter] window.CE не найден — загрузите js/app.js до адаптера'); return; }

  /* ---------- форматирование чисел (ru) — из дизайн-системы ---------- */
  window.fmt = function (x, dp) {
    if (x === undefined || x === null || (typeof x === 'number' && !isFinite(x))) return '—';
    var n = Number(x);
    if (isNaN(n)) return '—';
    if (dp === undefined) {
      var a = Math.abs(n);
      if (a !== 0 && (a < 1e-4 || a >= 1e12)) return n.toExponential(3).replace('.', ',').replace('e', '·10^');
      if (Number.isInteger(n)) dp = 0;
      else if (a < 1) dp = 4;
      else if (a < 10) dp = 3;
      else dp = 2;
    }
    var s = n.toFixed(dp);
    if (s.indexOf('.') >= 0) s = s.replace(/0+$/, '').replace(/\.$/, '');
    var parts = s.split('.'), int = parts[0], frac = parts[1];
    var neg = int.charAt(0) === '-'; if (neg) int = int.slice(1);
    int = int.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return (neg ? '-' : '') + int + (frac ? (',' + frac) : '');
  };
  // «сырое» значение для копирования (точка-десятичный, без группировки)
  window.raw = function (x, dp) {
    if (!isFinite(x)) return String(x);
    return (dp === undefined) ? String(+(+x).toPrecision(10)) : Number(x).toFixed(dp);
  };

  /* ---------- категории: CE.CATEGORIES → форма дизайна ----------
     Главная (tab:'home') = предметное ядро, где Vladimir репетитор (tut:true):
       Школа · Физика · Математика · Химия · Статистика.
     Вкладка «Все» (#/all) = полный каталог (все разделы, включая донорские
     tut:false: Экономика, IT, Здоровье, Быт, Стройка, Кухня, Генераторы).
     tab выводится из флага tut — один источник правды, не дублируем разметку.
     Glyph/cls совпадают с классами в css/app.css (.g-*). */
  var CATMETA = {
    school:      { glyph: 'А⁺', cls: 'g-school'   },
    physics:     { glyph: 'Ω',  cls: 'g-physics'  },
    math:        { glyph: '∑',  cls: 'g-math'     },
    chemistry:   { glyph: '⚗',  cls: 'g-chem'     },
    statistics:  { glyph: 'σ',  cls: 'g-stats'    },
    economics:   { glyph: '₽',  cls: 'g-econ'     },
    it:          { glyph: '01', cls: 'g-it'       },
    health:      { glyph: '♥',  cls: 'g-health'   },
    everyday:    { glyph: '≈',  cls: 'g-everyday' },
    construction:{ glyph: '⌂',  cls: 'g-construction' },
    cooking:     { glyph: '♨',  cls: 'g-cooking'  },
    generators:  { glyph: '⚙',  cls: 'g-generators' }
  };
  var ORDER = ['school', 'physics', 'math', 'chemistry', 'statistics', 'economics',
               'it', 'health', 'everyday', 'construction', 'cooking', 'generators'];
  window.CATS = ORDER.filter(function (id) { return CE.CATEGORIES[id]; }).map(function (id) {
    var m = CATMETA[id] || { glyph: '·', cls: 'g-everyday' };
    var tut = !!CE.CATEGORIES[id].tut;
    return { id: id, name: CE.CATEGORIES[id].title, glyph: m.glyph, cls: m.cls,
             tab: tut ? 'home' : 'other', tut: tut };
  });
  window.catById = function (id) { return window.CATS.find(function (c) { return c.id === id; }); };

  /* ---------- CE-input → design-field ---------- */
  function looksLikeList(inp) {
    if (inp.area || inp.list) return true;
    var lbl = inp.label || '', ph = inp.placeholder || '';
    // «выборк» без уточнения ловил «Размер выборки n» (скаляр!) → textarea-баг;
    // списком считаем только явные множественные формулировки.
    if (/список|числа|через пробел|новой строки|значения выборки|ряд значений/i.test(lbl)) return true;
    if (/\d[\s,;]+\d/.test(ph)) return true; // плейсхолдер вида «4 8 15 16»
    return false;
  }
  function toField(inp) {
    var f = { k: inp.key, label: inp.label };
    if (inp.unit) f.unit = inp.unit;
    if (inp.placeholder) f.ph = inp.placeholder;

    if (inp.options) {
      var opts = inp.options.map(function (o) { return { v: String(o.value), label: o.label }; });
      var maxLen = opts.reduce(function (m, o) { return Math.max(m, o.label.length); }, 0);
      f.type = (opts.length <= 3 && maxLen <= 12) ? 'seg' : 'select';
      f.opts = opts;
      f.def = (inp.default != null) ? String(inp.default) : opts[0].v;
    } else if (looksLikeList(inp)) {
      f.type = 'list';
      if (inp.default != null) f.def = String(inp.default);
    } else if (/\d{4}-\d{2}-\d{2}/.test(inp.placeholder || '') || /ГГГГ-ММ-ДД|YYYY-MM-DD/i.test(inp.label || '')) {
      f.type = 'date'; // нативный date-picker → value 'YYYY-MM-DD' (как и ждёт compute)
    } else {
      // свободный текст / формула? (нечисловой default, либо hint про операторы/функции)
      var numericDefault = (inp.default == null) || !isNaN(Number(String(inp.default).replace(',', '.')));
      var isFormula = /^(expr|formula)$/i.test(inp.key) || /оператор|функци|формул/i.test(inp.hint || '');
      if (isFormula) {
        f.type = 'expr';
        if (inp.hint) f.hint = inp.hint;
        if (inp.default != null) f.def = String(inp.default);
      } else if (!numericDefault) {
        f.type = 'text';
        if (inp.default != null) f.def = String(inp.default);
      } else {
        f.type = 'num';
        if (inp.default != null) f.def = String(inp.default);
        if (!f.ph && inp.optional) f.ph = '—'; // «реши относительно пустого поля»
      }
    }
    return f;
  }

  /* ---------- нормализация результата CE → результат дизайна ---------- */
  function normalize(res) {
    if (!res) return { outputs: null };
    if (res.error) return { outputs: null, error: res.error };
    var out = { note: res.note, steps: res.steps, formula: res.formula };
    if (res.outputs && res.outputs.length) {
      out.outputs = res.outputs.map(function (o) {
        var value;
        if (o.text !== undefined) value = o.text;
        else if (o.digits != null && typeof o.value === 'number') value = CE.fmt(o.value, o.digits);
        else value = o.value;
        return { label: o.label, unit: o.unit, primary: !!o.primary, value: value };
      });
    } else {
      out.outputs = null;
    }
    return out;
  }
  window.CEnorm = normalize;

  /* ---------- compute-обёртка: design-parsed → CE.compute(vals) ----------
     Воспроизводит подготовку входов из старого recompute():
       num  → parseFloat | NaN (для «реши относительно пустого»)
       opt  → строковое значение (CE.compute сам делает Number при нужде)
       list → строка как есть (CE.compute парсит сам). */
  function wrapCompute(def, fields) {
    return function (parsed) {
      var v = {};
      fields.forEach(function (f) {
        var val = parsed[f.k];
        if (f.type === 'num' || f.type === 'int') {
          v[f.k] = (val === undefined || val === null || val === '') ? NaN : Number(val);
        } else if (f.type === 'list') {
          v[f.k] = (val == null ? '' : String(val));
        } else {
          v[f.k] = val; // seg/select → строка
        }
      });
      var res;
      try { res = def.compute(v); }
      catch (e) { return { outputs: null, error: e.message }; }
      if (res && typeof res.then === 'function') return res; // async → Promise отдаём как есть, useCalcState ждёт и зовёт CEnorm
      return normalize(res);
    };
  }

  /* ---------- сборка плоского реестра CALCS ----------
     Каталог, поиск и счётчики разделов живут на МЕТАДАННЫХ (window.CE_CALC_INDEX,
     22 КБ) — раньше ради них страница грузила все js/calculators/*.js, 412 КБ.
     Полный объект (inputs + compute) есть сразу только у калькулятора, открытого
     на этой странице; остальные дополняются на лету через window.CEensure(id).
     Если индекса нет (локальный запуск без пересборки) — работаем как раньше,
     целиком из CE.registry. */
  function fill(entry, def) {
    var fields = (def.inputs || []).map(toField);
    entry.sub = def.sub;                                  // обычно undefined → строка падает на desc
    entry.explain = def.explain;                          // HTML
    entry.faq = def.faq;                                  // [{q,a}] — частые вопросы
    entry.fields = fields;
    entry.compute = def.compute ? wrapCompute(def, fields) : null;
    if (def.url || def.external) entry.external = def.url || def.external;
    return entry;
  }

  var loaded = {};
  CE.registry.forEach(function (d) { loaded[d.id] = d; });
  var index = window.CE_CALC_INDEX;
  var source = (index && index.length) ? index : CE.registry;

  window.CALCS = source.map(function (m) {
    var e = { id: m.id, cat: m.cat, title: m.title, desc: m.desc, tags: m.tags || [],
              fields: null, compute: null };
    if (m.url || m.external) e.external = m.url || m.external;   // ЕГЭ/ОГЭ → ссылка-наружу
    if (loaded[m.id]) fill(e, loaded[m.id]);
    return e;
  });

  /* Догрузка полного калькулятора: возвращает Promise с той же записью CALCS —
     объект мутируется на месте, потому что на него уже ссылается UI. */
  var pending = {};
  window.CEensure = function (id) {
    var entry = window.CALCS.find(function (c) { return c.id === id; });
    if (!entry) return Promise.reject(new Error('нет калькулятора ' + id));
    if (entry.fields || entry.external) return Promise.resolve(entry);
    if (pending[id]) return pending[id];
    var file = (window.CE_CALC_FILES || {})[id];
    if (!file || !CE.loadScript) return Promise.reject(new Error('нечего грузить для ' + id));
    var deps = (window.CE_CALC_DEPS || {})[file] || [];
    var chain = deps.reduce(function (p, d) {
      return p.then(function () { return CE.loadScript('/js/calculators/' + d + '.js'); });
    }, Promise.resolve());
    pending[id] = chain
      .then(function () { return CE.loadScript('/js/calculators/' + file + '.js'); })
      .then(function () {
        var def = CE.byId[id];      // byId в движке — объект-словарь, не функция
        if (!def) throw new Error('файл ' + file + ' загружен, но ' + id + ' в нём не нашёлся');
        return fill(entry, def);
      })
      .catch(function (e) { delete pending[id]; throw e; });   // дать шанс повторной попытке
    return pending[id];
  };
})();
