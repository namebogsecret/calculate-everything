/* Интерфейс мини-теста «Уровень по физике»: по одному вопросу, итог в конце.
 * Логика и данные — в physics-test.js (window.CE_PHYS_TEST). Без бэкенда и хранения
 * персональных данных: ответы живут только в памяти страницы. */
(function () {
  'use strict';
  var T = window.CE_PHYS_TEST;
  var root = document.getElementById('pt-app');
  if (!T || !root) return;

  var answers = [];
  var current = 0;

  function el(tag, attrs) {
    var n = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      if (k === 'class') n.className = attrs[k];
      else if (k === 'text') n.textContent = attrs[k];
      else n.setAttribute(k, attrs[k]);
    }
    for (var i = 2; i < arguments.length; i++) if (arguments[i]) n.appendChild(arguments[i]);
    return n;
  }

  /* Событие прохождения: тот же счётчик, что и у кликов, без персональных данных. */
  function beacon(path) {
    try {
      var u = 'https://stats.podlevskikh.com/count?p=' + encodeURIComponent(location.host + path) + '&e=true';
      if (navigator.sendBeacon) navigator.sendBeacon(u); else (new Image()).src = u;
    } catch (e) {}
  }
  function countDone() { beacon('/physics-test-done'); }

  function focusHeading() {
    var h = root.querySelector('[data-focus]');
    if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: false }); }
  }

  function start() {
    answers = []; current = 0;
    root.textContent = '';
    root.appendChild(el('div', { class: 'pt-intro' },
      el('h2', { text: 'Что будет в тесте' }),
      el('p', { text: T.QUESTIONS.length + ' вопросов, около 5 минут: кинематика, динамика, законы сохранения, электричество, оптика, термодинамика, колебания и волны. Уровень — база ЕГЭ и IGCSE/IB Physics, вопросы разной сложности. Калькулятор не нужен: считать можно в уме или на бумаге (где указано, g = 10 м/с²).' }),
      el('p', { text: 'Верные ответы и разбор — в конце, сразу по всем темам. Ответы никуда не отправляются.' }),
      el('button', { class: 'btn primary pt-start', type: 'button', id: 'pt-start', text: 'Начать тест' })));
    root.querySelector('#pt-start').addEventListener('click', function () { showQuestion(); });
  }

  function showQuestion() {
    var qu = T.QUESTIONS[current];
    var total = T.QUESTIONS.length;
    root.textContent = '';
    var bar = el('div', { class: 'pt-bar', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(total), 'aria-valuenow': String(current) },
      el('span', { style: 'width:' + Math.round(current / total * 100) + '%' }));
    var opts = el('div', { class: 'pt-opts' });
    qu.options.forEach(function (text, i) {
      var b = el('button', { class: 'pt-opt', type: 'button', 'data-i': String(i), text: text });
      b.addEventListener('click', function (ev) {
        // второй клик двойного тапа попал бы уже на следующий вопрос и пропустил бы его
        if (ev.detail > 1) return;
        answers[current] = i; current++; current < total ? showQuestion() : showResult(); });
      opts.appendChild(b);
    });
    root.appendChild(el('div', { class: 'pt-q' },
      el('p', { class: 'pt-step', text: 'Вопрос ' + (current + 1) + ' из ' + total + ' · ' + T.TOPICS[qu.topic].label }),
      bar,
      el('h2', { class: 'pt-text', 'data-focus': '1', text: qu.q }),
      opts));
    focusHeading();
  }

  function showResult() {
    var r = T.score(answers);
    root.textContent = '';

    root.appendChild(el('div', { class: 'pt-res' },
      el('p', { class: 'pt-step', text: 'Ваш результат' }),
      el('h2', { class: 'pt-level', 'data-focus': '1', id: 'pt-level', 'data-level': r.level, text: 'Уровень: ' + r.levelLabel }),
      el('p', { class: 'pt-score', text: r.correct + ' из ' + r.total + ' верных ответов' }),
      el('p', { text: r.levelText }),
      el('p', { class: 'pt-note', text: 'Тест короткий: по 1–2 вопроса на тему, поэтому это ориентир, а не оценка на экзамене.' })));

    // результат по темам
    var topics = el('ul', { class: 'pt-topics' });
    Object.keys(r.perTopic).forEach(function (id) {
      var t = r.perTopic[id];
      var weak = r.weakTopics.indexOf(id) >= 0;
      topics.appendChild(el('li', { class: weak ? 'weak' : 'ok' },
        el('span', { class: 'pt-tname', text: t.label }),
        el('span', { class: 'pt-tbar' }, el('span', { style: 'width:' + Math.round(t.ratio * 100) + '%' })),
        el('span', { class: 'pt-tval', text: t.correct + '/' + t.total + (weak ? ' · подтянуть' : '') })));
    });
    root.appendChild(el('section', { class: 'pt-sec' }, el('h2', { text: 'Результат по темам' }), topics));

    // разбор ошибок
    if (r.mistakes.length) {
      var list = el('div', { class: 'pt-mistakes' });
      r.mistakes.forEach(function (i) {
        var qu = T.QUESTIONS[i];
        var given = answers[i];
        list.appendChild(el('article', { class: 'pt-mistake' },
          el('h3', { text: qu.q }),
          el('p', { class: 'pt-given', text: 'Ваш ответ: ' + (given == null ? 'без ответа' : qu.options[given]) }),
          el('p', { class: 'pt-right', text: 'Верно: ' + qu.options[qu.correct] }),
          el('p', { class: 'pt-why', text: qu.why })));
      });
      root.appendChild(el('section', { class: 'pt-sec' }, el('h2', { text: 'Разбор ошибок' }), list));
    } else {
      root.appendChild(el('section', { class: 'pt-sec' }, el('h2', { text: 'Разбор ошибок' }), el('p', { text: 'Ошибок нет — разбирать нечего.' })));
    }

    // калькуляторы по слабым темам
    var links = T.calcLinks(r.weakTopics);
    if (links.length) {
      var grid = el('div', { class: 'grid pt-calcs' });
      links.forEach(function (c) {
        grid.appendChild(el('a', { class: 'card', href: c.href }, el('h3', { text: c.title }), el('p', { text: 'Формула и решение по шагам — потренируйтесь на своих числах.' })));
      });
      root.appendChild(el('section', { class: 'pt-sec' }, el('h2', { text: 'Потренироваться на калькуляторах' }), grid));
    }

    // естественный следующий шаг: репетитор
    var weakNames = r.weakTopics.map(function (id) { return r.perTopic[id].label.toLowerCase(); });
    var lead = weakNames.length
      ? 'По вашим слабым темам (' + weakNames.join(', ') + ') вот как я разбираю такое с учениками: на каких задачах ловятся типичные ошибки, в каком порядке закрывать пробелы и как это связано с экзаменом.'
      : 'Вот как я разбираю такое с учениками дальше: задачи второй части ЕГЭ и IB HL, ловушки формулировок и оформление решений.';
    var cta = el('aside', { class: 'tutor-cta pt-cta' },
      el('div', { class: 'tutor-cta-inner' },
        el('div', { class: 'tutor-cta-text' },
          el('h2', { text: 'Что дальше' }),
          el('p', { text: lead }),
          el('p', { class: 'pt-creds', text: 'Владимир, преподаватель физики и математики онлайн: МГУ, IB/AP/SAT, Praxis 200/200.' })),
        el('a', { class: 'tutor-cta-btn', id: 'pt-tutor', href: T.tutorUrl(r.level), target: '_blank', rel: 'noopener', text: 'Как я разбираю такие темы →' })));
    root.appendChild(cta);
    // отдельная метрика именно этого теста (общий /cta-to-tutor считает и футеры всех страниц)
    cta.querySelector('#pt-tutor').addEventListener('click', function () { beacon('/cta-to-tutor-physics-test'); });

    var again = el('button', { class: 'btn pt-again', type: 'button', id: 'pt-again', text: 'Пройти ещё раз' });
    again.addEventListener('click', start);
    root.appendChild(again);

    countDone(r.level);
    focusHeading();
  }

  start();
})();
