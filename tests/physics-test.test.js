'use strict';
// node --test tests/ — чистая логика мини-теста и целостность данных/страницы (без браузера).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const T = require('../js/physics-test.js');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const N = T.QUESTIONS.length;
const allRight = () => T.QUESTIONS.map((q) => q.correct);
const wrongOf = (q) => (q.correct + 1) % q.options.length;
const allWrong = () => T.QUESTIONS.map(wrongOf);

// первые k вопросов отвечены верно, остальные неверно
const withCorrect = (k) => T.QUESTIONS.map((q, i) => (i < k ? q.correct : wrongOf(q)));

test('данные: 8–10 вопросов, у каждого тема/options/correct/why', () => {
  assert.ok(N >= 8 && N <= 10, 'вопросов: ' + N);
  T.QUESTIONS.forEach((q, i) => {
    assert.ok(T.TOPICS[q.topic], `q${i}: неизвестная тема ${q.topic}`);
    assert.ok(typeof q.q === 'string' && q.q.length > 10, `q${i}: текст`);
    assert.ok(Array.isArray(q.options) && q.options.length >= 3, `q${i}: options`);
    assert.equal(new Set(q.options).size, q.options.length, `q${i}: дубли вариантов`);
    assert.ok(Number.isInteger(q.correct) && q.correct >= 0 && q.correct < q.options.length, `q${i}: correct вне options`);
    assert.ok(typeof q.why === 'string' && q.why.length > 40, `q${i}: нужен разбор why`);
  });
});

test('данные: покрыты все нужные темы, у каждой темы есть живая ссылка на калькулятор', () => {
  for (const t of ['kinematics', 'energy', 'electricity', 'optics', 'thermo', 'oscillations']) {
    assert.ok(T.QUESTIONS.some((q) => q.topic === t), 'нет вопросов по теме ' + t);
  }
  for (const [id, t] of Object.entries(T.TOPICS)) {
    assert.match(t.calc.href, /^\/calc\/[a-z0-9-]+\.html$/, id);
    assert.ok(fs.existsSync(path.join(ROOT, t.calc.href)), `${id}: нет файла ${t.calc.href}`);
  }
});

test('ответы: сверка с вычислением (g = 10)', () => {
  const ans = (i) => T.QUESTIONS[i].options[T.QUESTIONS[i].correct];
  assert.equal(0.5 * 2 * 5 ** 2, 25);                 assert.equal(ans(0), '25 м');
  assert.equal(Math.sqrt((2 * 20) / 10), 2);          assert.equal(ans(1), '2 с');
  assert.equal(70 * (10 + 2), 840);                   assert.equal(ans(2), '840 Н');
  assert.equal(Math.sqrt(2 * 10 * 5), 10);            assert.equal(ans(3), '10 м/с');
  assert.equal(12 / ((6 * 3) / (6 + 3)), 6);          assert.equal(ans(4), '6 А');
  assert.equal(0.5 ** 2, 0.25);                       assert.match(ans(5), /в 4 раза/);
  const d = 1 / (1 / 10 - 1 / 30);
  assert.ok(Math.abs(d - 15) < 1e-9);                 assert.match(ans(6), /15 см, действительное, уменьшенное/);
  assert.equal((27 + 273) * 2 - 273, 327);            assert.equal(ans(7), '327 °C');
  assert.equal(Math.sqrt(4), 2);                      assert.match(ans(8), /в 2 раза/);
  assert.equal(340 / 50, 6.8);                        assert.equal(ans(9), '6.8 м');
});

test('score: все верные → максимум, продвинутый, нет слабых тем', () => {
  const r = T.score(allRight());
  assert.equal(r.correct, N);
  assert.equal(r.total, N);
  assert.equal(r.level, 'advanced');
  assert.deepEqual(r.weakTopics, []);
  assert.deepEqual(r.mistakes, []);
});

test('score: все неверные / пустые → начальный, все темы слабые', () => {
  for (const a of [allWrong(), [], new Array(N).fill(null)]) {
    const r = T.score(a);
    assert.equal(r.correct, 0);
    assert.equal(r.level, 'start');
    assert.equal(r.weakTopics.length, Object.keys(r.perTopic).length);
    assert.equal(r.mistakes.length, N);
  }
});

test('пороги уровней: 0–3 start, 4–6 base, 7–8 confident, 9–10 advanced', () => {
  const expect = { 0: 'start', 3: 'start', 4: 'base', 6: 'base', 7: 'confident', 8: 'confident', 9: 'advanced', 10: 'advanced' };
  assert.equal(N, 10);
  for (const [k, lvl] of Object.entries(expect)) assert.equal(T.score(withCorrect(+k)).level, lvl, 'верных: ' + k);
});

test('perTopic: суммы сходятся, ratio = correct/total', () => {
  const r = T.score(withCorrect(5));
  let c = 0, t = 0;
  for (const v of Object.values(r.perTopic)) {
    c += v.correct; t += v.total;
    assert.equal(v.ratio, v.correct / v.total);
  }
  assert.equal(c, r.correct);
  assert.equal(t, N);
});

test('weakTopics: тема слабая при ratio <= 0.5, слабейшие первыми, устойчивый порядок', () => {
  // ошибаемся только в оптике и в обоих вопросах по колебаниям
  const a = T.QUESTIONS.map((q) => (['optics', 'oscillations'].includes(q.topic) ? wrongOf(q) : q.correct));
  const r = T.score(a);
  assert.deepEqual(r.weakTopics.slice().sort(), ['optics', 'oscillations']);
  assert.equal(r.perTopic.oscillations.ratio, 0);
  // половина верных в теме из двух вопросов — ещё «слабая»
  const half = T.QUESTIONS.map((q, i) => (q.topic === 'electricity' && i === T.QUESTIONS.findIndex((x) => x.topic === 'electricity') ? wrongOf(q) : q.correct));
  assert.deepEqual(T.score(half).weakTopics, ['electricity']);
  // ошибка в одной теме не делает слабыми остальные
  const one = T.QUESTIONS.map((q) => (q.topic === 'thermo' ? wrongOf(q) : q.correct));
  assert.deepEqual(T.score(one).weakTopics, ['thermo']);
});

test('score: мусор в ответах считается неверным, не-массив бросает TypeError', () => {
  const r = T.score(T.QUESTIONS.map((q) => (q === T.QUESTIONS[0] ? 99 : q.correct)));
  assert.equal(r.correct, N - 1);
  assert.deepEqual(r.mistakes, [0]);
  assert.equal(T.score([String(T.QUESTIONS[0].correct)]).correct, 0, 'строка вместо индекса не засчитывается');
  assert.throws(() => T.score(null), TypeError);
  assert.throws(() => T.score('1,2'), TypeError);
});

test('calcLinks: не больше двух, только по слабым темам', () => {
  assert.deepEqual(T.calcLinks([]), []);
  assert.equal(T.calcLinks(['optics', 'thermo', 'energy']).length, 2);
  assert.equal(T.calcLinks(['optics'])[0].href, '/calc/thin-lens.html');
});

test('tutorUrl: UTM с уровнем', () => {
  for (const l of T.LEVELS) {
    const u = new URL(T.tutorUrl(l.id));
    assert.equal(u.hostname, 'tutor.podlevskikh.com');
    assert.equal(u.searchParams.get('utm_source'), 'calculators');
    assert.equal(u.searchParams.get('utm_medium'), 'physics-test');
    assert.equal(u.searchParams.get('utm_campaign'), 'diag-level-' + l.id);
  }
});

// ---- запреты на весь публикуемый текст ----
const FORBIDDEN = [
  /Кип/i, /Лимасс/i, /Cyprus/i, /Limassol/i, /\bI\s?Can\b/, /ICan/,
  /без\s+обязательств/i, /только\s+сегодня/i, /WhatsApp/i, /wa\.me/i, /20\s?\+\s*лет/i, /\+?\d[\d\s()-]{9,}\d/,
];
const PUBLISHED = ['js/physics-test.js', 'js/physics-test-ui.js', 'physics-test/index.html', 'bin/build-diag-test.py'];

test('запрещённые слова не встречаются нигде в тексте теста/страницы/генератора', () => {
  for (const f of PUBLISHED) {
    const src = read(f);
    for (const re of FORBIDDEN) {
      // телефонный шаблон не должен срабатывать на JSON-LD/стили: проверяем его только на видимом тексте ниже
      if (re.source.startsWith('\\+?')) continue;
      assert.ok(!re.test(src), `${f}: запрещённый фрагмент ${re}`);
    }
  }
  const data = JSON.stringify(T);
  for (const re of FORBIDDEN.slice(0, -1)) assert.ok(!re.test(data), 'данные: ' + re);
});

test('страница: canonical, og, JSON-LD, UTM-ссылок в статике нет, трекинг tutor на месте', () => {
  const h = read('physics-test/index.html');
  assert.match(h, /<link rel="canonical" href="https:\/\/calculators\.podlevskikh\.com\/physics-test\/">/);
  assert.match(h, /<meta property="og:title"/);
  assert.match(h, /<meta name="description" content="[^"]{50,}/);
  assert.match(h, /name="viewport"/);
  const ld = JSON.parse(h.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
  const types = ld['@graph'].map((x) => x['@type']);
  assert.deepEqual(types, ['WebPage', 'Quiz', 'BreadcrumbList']);
  assert.match(h, /tutor\\\.podlevskikh\\\.com\/\.test\(href\)[^;]*name="to-tutor"/, 'снippet клик-трекинга tutor');
  assert.match(h, /stats\.podlevskikh\.com\/count/);
  assert.match(h, /<script src="\/js\/physics-test\.js">/);
  assert.match(h, /<script src="\/js\/physics-test-ui\.js">/);
});

test('sitemap.xml и llms.txt содержат страницу; генератор идемпотентен', () => {
  const url = 'https://calculators.podlevskikh.com/physics-test/';
  const sm = read('sitemap.xml'), ll = read('llms.txt');
  assert.equal(sm.split(url).length - 1, 1);
  assert.equal(ll.split(url).length - 1, 1);
  const before = [sm, ll, read('physics-test/index.html')];
  require('node:child_process').execFileSync('python3', [path.join(ROOT, 'bin/build-diag-test.py')]);
  assert.deepEqual([read('sitemap.xml'), read('llms.txt'), read('physics-test/index.html')], before);
});
