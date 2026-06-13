/* Статистика и вероятность. */
(function () {
  const F = (x, d) => window.CE.fmt(x, d);

  // парсер списка чисел: запятые / пробелы / переводы строк / ;
  function parseList(s) {
    if (!s) return [];
    return String(s).split(/[\s,;]+/).filter(x => x !== '').map(x => parseFloat(x.replace(',', '.'))).filter(x => !Number.isNaN(x));
  }
  // erf для нормального распределения (Abramowitz & Stegun 7.1.26)
  function erf(x) {
    const s = x < 0 ? -1 : 1; x = Math.abs(x);
    const t = 1 / (1 + 0.3275911 * x);
    const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
    return s * y;
  }
  const normCdf = (z) => 0.5 * (1 + erf(z / Math.SQRT2));
  // обратная нормальная (Beasley-Springer / Moro упрощённо через рациональную аппроксимацию)
  function normInv(p) {
    if (p <= 0) return -Infinity; if (p >= 1) return Infinity;
    const a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
    const b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01];
    const c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
    const d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00];
    const pl = 0.02425;
    let q, r;
    if (p < pl) { q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    if (p <= 1 - pl) { q = p - 0.5; r = q * q; return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1); }
    q = Math.sqrt(-2 * Math.log(1 - p)); return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }

  window.CE.register('statistics', [
    {
      id: 'descriptive', title: 'Описательная статистика', title_en: 'Descriptive Statistics',
      desc: 'Среднее, медиана, мода, дисперсия, СКО по списку чисел.',
      tags: ['среднее', 'медиана', 'мода', 'дисперсия', 'стандартное отклонение', 'mean', 'median', 'variance', 'std'],
      inputs: [{ key: 'data', label: 'Числа (через пробел, запятую или с новой строки)', placeholder: 'например: 4 8 15 16 23 42' }],
      compute(v) {
        const a = parseList(v.data);
        if (a.length < 1) return { note: 'Введите хотя бы одно число.' };
        const n = a.length, sum = a.reduce((s, x) => s + x, 0), mean = sum / n;
        const sorted = [...a].sort((x, y) => x - y);
        const median = n % 2 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
        const freq = {}; let mode = [], mx = 0;
        for (const x of a) { freq[x] = (freq[x] || 0) + 1; if (freq[x] > mx) mx = freq[x]; }
        for (const k in freq) if (freq[k] === mx) mode.push(parseFloat(k));
        const ss = a.reduce((s, x) => s + (x - mean) ** 2, 0);
        const varP = ss / n, varS = n > 1 ? ss / (n - 1) : NaN;
        return {
          outputs: [
            { label: 'Количество n', value: n },
            { label: 'Сумма', value: sum },
            { label: 'Среднее (mean)', value: mean, primary: true },
            { label: 'Медиана', value: median, primary: true },
            { label: 'Мода', text: mx > 1 ? mode.join(', ') : 'нет (все уникальны)' },
            { label: 'Минимум / Максимум', text: `${F(sorted[0])} / ${F(sorted[n - 1])}` },
            { label: 'Размах', value: sorted[n - 1] - sorted[0] },
            { label: 'Дисперсия (выборочная s²)', value: varS },
            { label: 'СКО выборочное (s)', value: Math.sqrt(varS), primary: true },
            { label: 'СКО генеральное (σ)', value: Math.sqrt(varP) },
          ],
          formula: 'mean = Σx⁄n,&nbsp; s² = Σ(x−mean)² ⁄ (n−1)',
        };
      },
      explain: '<p>Базовые меры: среднее (центр), медиана (устойчива к выбросам), мода (самое частое), дисперсия и стандартное отклонение (разброс). Выборочная дисперсия делит на <code>n−1</code> (поправка Бесселя), генеральная — на <code>n</code>.</p>',
    },
    {
      id: 'z-score', title: 'Z-оценка (стандартизация)', title_en: 'Z-Score',
      desc: 'На сколько σ значение отклоняется от среднего + перцентиль.',
      tags: ['z-score', 'z-оценка', 'стандартизация', 'нормальное', 'перцентиль', 'standardize'],
      inputs: [{ key: 'x', label: 'Значение x' }, { key: 'mean', label: 'Среднее μ' }, { key: 'sd', label: 'СКО σ' }],
      compute(v) {
        if ([v.x, v.mean, v.sd].some(Number.isNaN) || v.sd <= 0) return { note: 'Введите x, μ и σ>0.' };
        const z = (v.x - v.mean) / v.sd;
        const pct = normCdf(z) * 100;
        return { outputs: [{ label: 'Z-оценка', value: z, primary: true }, { label: 'Перцентиль (доля ниже x)', value: pct, unit: '%', digits: 2 }], formula: 'z = (x − μ) ⁄ σ', note: `Значение лежит выше ${F(pct, 1)}% наблюдений нормального распределения.` };
      },
      explain: '<p>Z-оценка показывает, на сколько стандартных отклонений значение отклоняется от среднего. Через нормальное распределение переводится в перцентиль. z=0 — ровно среднее, z=±1.96 — границы 95%.</p>',
    },
    {
      id: 'normal-prob', title: 'Вероятность по нормальному распределению', title_en: 'Normal Distribution',
      desc: 'P(X < x), P(X > x), P(a < X < b).',
      tags: ['нормальное распределение', 'вероятность', 'гаусс', 'normal', 'probability', 'cdf'],
      inputs: [
        { key: 'mean', label: 'Среднее μ', default: 0 },
        { key: 'sd', label: 'СКО σ', default: 1 },
        { key: 'a', label: 'Граница a', optional: true },
        { key: 'b', label: 'Граница b (для интервала)', optional: true },
      ],
      compute(v) {
        if (Number.isNaN(v.mean) || Number.isNaN(v.sd) || v.sd <= 0) return { note: 'Введите μ и σ>0.' };
        const haveA = !Number.isNaN(v.a), haveB = !Number.isNaN(v.b);
        if (!haveA && !haveB) return { note: 'Введите границу a (и при желании b для интервала).' };
        const z = x => (x - v.mean) / v.sd;
        if (haveA && haveB) {
          const lo = Math.min(v.a, v.b), hi = Math.max(v.a, v.b);
          const p = normCdf(z(hi)) - normCdf(z(lo));
          return { outputs: [{ label: `P(${F(lo)} < X < ${F(hi)})`, value: p, digits: 4, primary: true }, { label: 'в процентах', value: p * 100, unit: '%', digits: 2 }], formula: 'P = Φ((b−μ)⁄σ) − Φ((a−μ)⁄σ)' };
        }
        const pLess = normCdf(z(v.a));
        return { outputs: [{ label: `P(X < ${F(v.a)})`, value: pLess, digits: 4, primary: true }, { label: `P(X > ${F(v.a)})`, value: 1 - pLess, digits: 4, primary: true }], formula: 'P(X<x) = Φ((x−μ)⁄σ)' };
      },
      explain: '<p>Φ — функция распределения стандартной нормали. Вероятность попадания в интервал — разность значений Φ на границах. Используется приближение erf (погрешность &lt;1e−4).</p>',
    },
    {
      id: 'confidence-interval', title: 'Доверительный интервал для среднего', title_en: 'Confidence Interval',
      desc: 'CI для среднего по выборке (z-интервал).',
      tags: ['доверительный интервал', 'confidence interval', 'погрешность', 'выборка', 'margin of error'],
      inputs: [
        { key: 'mean', label: 'Выборочное среднее' },
        { key: 'sd', label: 'СКО σ (или s)' },
        { key: 'n', label: 'Размер выборки n' },
        { key: 'conf', label: 'Уровень доверия', unit: '%', default: 95 },
      ],
      compute(v) {
        if ([v.mean, v.sd, v.n, v.conf].some(Number.isNaN) || v.n < 2 || v.sd < 0) return { note: 'Введите среднее, σ, n≥2.' };
        if (v.conf <= 0 || v.conf >= 100) return { error: 'Уровень доверия между 0 и 100.' };
        const z = normInv(1 - (1 - v.conf / 100) / 2);
        const se = v.sd / Math.sqrt(v.n), moe = z * se;
        return {
          outputs: [
            { label: 'z-критическое', value: z, digits: 4 },
            { label: 'Стандартная ошибка SE', value: se, digits: 4 },
            { label: 'Погрешность (± MOE)', value: moe, digits: 4, primary: true },
            { label: 'Нижняя граница', value: v.mean - moe, digits: 4, primary: true },
            { label: 'Верхняя граница', value: v.mean + moe, digits: 4, primary: true },
          ],
          formula: 'CI = mean ± z · σ⁄√n',
          note: `Истинное среднее с вероятностью ${F(v.conf)}% лежит в [${F(v.mean - moe, 3)}; ${F(v.mean + moe, 3)}].`,
        };
      },
      explain: '<p>Доверительный интервал оценивает диапазон, в котором находится истинное среднее. Использует z-интервал (нормальное приближение) — подходит при большом n или известном σ. Погрешность <code>±z·σ/√n</code> уменьшается с ростом выборки.</p>',
    },
    {
      id: 'correlation', title: 'Корреляция Пирсона', title_en: 'Pearson Correlation',
      desc: 'Коэффициент r между двумя рядами.',
      tags: ['корреляция', 'пирсон', 'связь', 'correlation', 'pearson', 'r'],
      inputs: [
        { key: 'x', label: 'Ряд X', placeholder: '1 2 3 4 5' },
        { key: 'y', label: 'Ряд Y', placeholder: '2 4 5 4 6' },
      ],
      compute(v) {
        const X = parseList(v.x), Y = parseList(v.y);
        if (X.length < 2 || Y.length < 2) return { note: 'Введите оба ряда (≥2 чисел).' };
        if (X.length !== Y.length) return { error: `Ряды разной длины: ${X.length} и ${Y.length}.` };
        const n = X.length, mx = X.reduce((s, a) => s + a, 0) / n, my = Y.reduce((s, a) => s + a, 0) / n;
        let sxy = 0, sxx = 0, syy = 0;
        for (let i = 0; i < n; i++) { sxy += (X[i] - mx) * (Y[i] - my); sxx += (X[i] - mx) ** 2; syy += (Y[i] - my) ** 2; }
        if (sxx === 0 || syy === 0) return { error: 'Один из рядов постоянный — корреляция не определена.' };
        const r = sxy / Math.sqrt(sxx * syy);
        let strength = Math.abs(r) > 0.7 ? 'сильная' : Math.abs(r) > 0.4 ? 'умеренная' : Math.abs(r) > 0.2 ? 'слабая' : 'очень слабая/нет';
        return { outputs: [{ label: 'Коэффициент r', value: r, digits: 4, primary: true }, { label: 'r² (доля объяснённой дисперсии)', value: r * r, digits: 4 }], formula: 'r = Σ(x−x̄)(y−ȳ) ⁄ √(Σ(x−x̄)²·Σ(y−ȳ)²)', note: `Связь ${(r >= 0 ? 'положительная' : 'отрицательная')}, ${strength} (|r|=${F(Math.abs(r), 2)}).` };
      },
      explain: '<p>Коэффициент Пирсона <code>r ∈ [−1, 1]</code> измеряет линейную связь. r²— доля дисперсии Y, объяснённая X. Корреляция ≠ причинность.</p>',
    },
    {
      id: 'linear-regression', title: 'Линейная регрессия (МНК)', title_en: 'Linear Regression',
      desc: 'Прямая y = a·x + b методом наименьших квадратов.',
      tags: ['регрессия', 'мнк', 'наименьшие квадраты', 'тренд', 'regression', 'least squares'],
      inputs: [
        { key: 'x', label: 'Ряд X', placeholder: '1 2 3 4 5' },
        { key: 'y', label: 'Ряд Y', placeholder: '2 4 5 4 6' },
        { key: 'predict', label: 'Предсказать y при x =', optional: true },
      ],
      compute(v) {
        const X = parseList(v.x), Y = parseList(v.y);
        if (X.length < 2 || Y.length < 2) return { note: 'Введите оба ряда.' };
        if (X.length !== Y.length) return { error: `Ряды разной длины: ${X.length} и ${Y.length}.` };
        const n = X.length, mx = X.reduce((s, a) => s + a, 0) / n, my = Y.reduce((s, a) => s + a, 0) / n;
        let sxy = 0, sxx = 0, syy = 0;
        for (let i = 0; i < n; i++) { sxy += (X[i] - mx) * (Y[i] - my); sxx += (X[i] - mx) ** 2; syy += (Y[i] - my) ** 2; }
        if (sxx === 0) return { error: 'Все X одинаковы — наклон не определён.' };
        const a = sxy / sxx, b = my - a * mx, r2 = syy ? (sxy * sxy) / (sxx * syy) : 1;
        const out = [{ label: 'Наклон a', value: a, digits: 4, primary: true }, { label: 'Свободный член b', value: b, digits: 4, primary: true }, { label: 'R²', value: r2, digits: 4 }];
        if (!Number.isNaN(v.predict)) out.push({ label: `Прогноз y(${F(v.predict)})`, value: a * v.predict + b, digits: 4, primary: true });
        return { outputs: out, formula: 'y = a·x + b,&nbsp; a = Σ(x−x̄)(y−ȳ)⁄Σ(x−x̄)²', note: `Уравнение: <b>y = ${F(a, 4)}·x ${b >= 0 ? '+' : '−'} ${F(Math.abs(b), 4)}</b>` };
      },
      explain: '<p>Метод наименьших квадратов подбирает прямую, минимизирующую сумму квадратов отклонений. <code>R²</code> — качество подгонки (1 = идеально). Можно сразу спрогнозировать y для нового x.</p>',
    },
    {
      id: 'binomial', title: 'Биномиальная вероятность', title_en: 'Binomial Probability',
      desc: 'P(ровно k успехов из n), а также ≤k и ≥k.',
      tags: ['биномиальное', 'вероятность', 'испытания бернулли', 'binomial', 'probability'],
      inputs: [
        { key: 'n', label: 'Число испытаний n', default: 10 },
        { key: 'k', label: 'Число успехов k', default: 3 },
        { key: 'p', label: 'Вероятность успеха p', default: 0.5, hint: 'от 0 до 1' },
      ],
      compute(v) {
        if ([v.n, v.k, v.p].some(Number.isNaN)) return { note: 'Заполните n, k, p.' };
        const n = Math.round(v.n), k = Math.round(v.k);
        if (k < 0 || k > n || n < 0) return { error: 'Нужно 0 ≤ k ≤ n.' };
        if (v.p < 0 || v.p > 1) return { error: 'p от 0 до 1.' };
        if (n > 1000) return { error: 'n слишком велико (≤1000).' };
        const logFact = m => { let s = 0; for (let i = 2; i <= m; i++) s += Math.log(i); return s; };
        const pmf = j => Math.exp(logFact(n) - logFact(j) - logFact(n - j) + j * Math.log(v.p || 1e-300) + (n - j) * Math.log(1 - v.p || 1e-300));
        const exact = pmf(k);
        let cumLe = 0; for (let j = 0; j <= k; j++) cumLe += pmf(j);
        return { outputs: [{ label: `P(X = ${k})`, value: exact, digits: 5, primary: true }, { label: `P(X ≤ ${k})`, value: cumLe, digits: 5 }, { label: `P(X ≥ ${k})`, value: 1 - cumLe + exact, digits: 5 }, { label: 'Мат. ожидание E[X]', value: n * v.p, digits: 3 }], formula: 'P(X=k) = C(n,k)·pᵏ·(1−p)ⁿ⁻ᵏ' };
      },
      explain: '<p>Биномиальное распределение: вероятность получить ровно <code>k</code> успехов в <code>n</code> независимых испытаниях с вероятностью успеха <code>p</code>. Среднее <code>E[X]=np</code>.</p>',
    },
  ]);
})();
