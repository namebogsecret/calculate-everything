/* Математика. */
(function () {
  const F = (x, d) => window.CE.fmt(x, d);

  window.CE.register('math', [
    {
      id: 'quadratic', title: 'Квадратное уравнение', title_en: 'Quadratic Equation',
      desc: 'ax² + bx + c = 0 — корни и дискриминант.',
      tags: ['квадратное', 'уравнение', 'дискриминант', 'корни', 'quadratic', 'roots'],
      inputs: [
        { key: 'a', label: 'a', default: 1 },
        { key: 'b', label: 'b', default: 0 },
        { key: 'c', label: 'c', default: 0 },
      ],
      compute(v) {
        if ([v.a, v.b, v.c].some(Number.isNaN)) return { note: 'Введите коэффициенты a, b, c.' };
        if (v.a === 0) {
          if (v.b === 0) return { note: 'a=0 и b=0 — не уравнение.' };
          return { outputs: [{ label: 'Линейное: x', value: -v.c / v.b, primary: true }], formula: 'bx + c = 0 → x = −c⁄b' };
        }
        const D = v.b * v.b - 4 * v.a * v.c;
        const out = [{ label: 'Дискриминант D', value: D }];
        let note;
        if (D > 0) {
          const x1 = (-v.b + Math.sqrt(D)) / (2 * v.a), x2 = (-v.b - Math.sqrt(D)) / (2 * v.a);
          out.push({ label: 'x₁', value: x1, primary: true }, { label: 'x₂', value: x2, primary: true });
        } else if (D === 0) {
          out.push({ label: 'x (двойной)', value: -v.b / (2 * v.a), primary: true });
        } else {
          const re = -v.b / (2 * v.a), im = Math.sqrt(-D) / (2 * v.a);
          out.push({ label: 'x₁', text: `${F(re)} + ${F(im)}i`, primary: true }, { label: 'x₂', text: `${F(re)} − ${F(im)}i`, primary: true });
          note = 'D&lt;0 — корни комплексные.';
        }
        return { outputs: out, formula: 'x = (−b ± √D) ⁄ 2a,&nbsp; D = b² − 4ac', note };
      },
      explain: '<p>Уравнение <code>ax²+bx+c=0</code> решается через дискриминант <code>D=b²−4ac</code>. Если D&gt;0 — два корня, D=0 — один, D&lt;0 — комплексные. Корни: <code>x = (−b±√D)/2a</code>.</p>',
    },
    {
      id: 'percentage', title: 'Проценты', title_en: 'Percentage',
      desc: 'Сколько процентов, % от числа, изменение в %.',
      tags: ['процент', 'проценты', 'percentage', 'percent', 'скидка'],
      inputs: [
        { key: 'mode', label: 'Что считаем', options: [
          { value: 'of', label: 'X% от числа Y' },
          { value: 'is', label: 'X — это сколько % от Y' },
          { value: 'chg', label: 'Изменение от Y₁ к Y₂ в %' },
        ], default: 'of' },
        { key: 'a', label: 'X (или Y₁)' },
        { key: 'b', label: 'Y (или Y₂)' },
      ],
      compute(v) {
        if (Number.isNaN(v.a) || Number.isNaN(v.b)) return { note: 'Введите оба числа.' };
        if (v.mode === 'of') return { outputs: [{ label: `${F(v.a)}% от ${F(v.b)}`, value: v.a / 100 * v.b, primary: true }], formula: 'X⁄100 · Y' };
        if (v.mode === 'is') return { outputs: [{ label: `${F(v.a)} от ${F(v.b)}`, value: v.a / v.b * 100, unit: '%', primary: true }], formula: 'X⁄Y · 100%' };
        const chg = (v.b - v.a) / v.a * 100;
        return { outputs: [{ label: 'Изменение', value: chg, unit: '%', primary: true }], formula: '(Y₂ − Y₁)⁄Y₁ · 100%', note: chg >= 0 ? 'Рост.' : 'Снижение.' };
      },
      explain: '<p>Три самых частых вопроса о процентах: «сколько составит X% от Y», «какую долю в % составляет X от Y» и «на сколько % изменилась величина».</p>',
    },
    {
      id: 'pythagorean', title: 'Теорема Пифагора', title_en: 'Pythagorean Theorem',
      desc: 'a² + b² = c². Заполните любые два катета/гипотенузу.',
      tags: ['пифагор', 'треугольник', 'гипотенуза', 'pythagorean', 'hypotenuse'],
      inputs: [
        { key: 'a', label: 'Катет a', optional: true },
        { key: 'b', label: 'Катет b', optional: true },
        { key: 'c', label: 'Гипотенуза c', optional: true },
      ],
      compute(v) {
        const have = ['a', 'b', 'c'].filter(k => !Number.isNaN(v[k]));
        if (have.length !== 2) return { note: 'Заполните ровно два поля.' };
        if (Number.isNaN(v.c)) return { outputs: [{ label: 'Гипотенуза c', value: Math.hypot(v.a, v.b), primary: true }], formula: 'c = √(a² + b²)' };
        const known = Number.isNaN(v.a) ? 'a' : 'b', other = known === 'a' ? v.b : v.a;
        if (v.c <= other) return { error: 'Гипотенуза должна быть больше катета.' };
        return { outputs: [{ label: 'Катет ' + known, value: Math.sqrt(v.c * v.c - other * other), primary: true }], formula: known + ' = √(c² − ' + (known === 'a' ? 'b' : 'a') + '²)' };
      },
      explain: '<p>В прямоугольном треугольнике сумма квадратов катетов равна квадрату гипотенузы: <code>a²+b²=c²</code>.</p>',
    },
    {
      id: 'triangle-area', title: 'Площадь треугольника', title_en: 'Triangle Area',
      desc: 'По основанию и высоте или по трём сторонам (Герон).',
      tags: ['площадь', 'треугольник', 'герон', 'triangle area', 'heron'],
      inputs: [
        { key: 'mode', label: 'Способ', options: [{ value: 'bh', label: 'Основание × высота' }, { value: 'heron', label: 'Три стороны (Герон)' }], default: 'bh' },
        { key: 'x', label: 'Основание / сторона a' },
        { key: 'y', label: 'Высота / сторона b' },
        { key: 'z', label: 'Сторона c (только Герон)', optional: true },
      ],
      compute(v) {
        if (v.mode === 'bh') {
          if (Number.isNaN(v.x) || Number.isNaN(v.y)) return { note: 'Введите основание и высоту.' };
          return { outputs: [{ label: 'Площадь', value: 0.5 * v.x * v.y, primary: true }], formula: 'S = ½ · основание · высота' };
        }
        const [a, b, c] = [v.x, v.y, v.z];
        if ([a, b, c].some(Number.isNaN)) return { note: 'Введите три стороны.' };
        if (a + b <= c || a + c <= b || b + c <= a) return { error: 'Такого треугольника не существует (неравенство треугольника).' };
        const p = (a + b + c) / 2, S = Math.sqrt(p * (p - a) * (p - b) * (p - c));
        return { outputs: [{ label: 'Полупериметр p', value: p }, { label: 'Площадь', value: S, primary: true }], formula: 'S = √(p(p−a)(p−b)(p−c))' };
      },
      explain: '<p>Площадь треугольника: через основание и высоту <code>S=½bh</code>, либо по трём сторонам формулой Герона с полупериметром <code>p=(a+b+c)/2</code>.</p>',
    },
    {
      id: 'circle', title: 'Круг и окружность', title_en: 'Circle',
      desc: 'Площадь, длина окружности, диаметр по радиусу.',
      tags: ['круг', 'окружность', 'радиус', 'площадь', 'circle', 'radius'],
      inputs: [{ key: 'r', label: 'Радиус r' }],
      compute(v) {
        if (Number.isNaN(v.r) || v.r < 0) return { note: 'Введите радиус r ≥ 0.' };
        return {
          outputs: [
            { label: 'Площадь', value: Math.PI * v.r * v.r, primary: true },
            { label: 'Длина окружности', value: 2 * Math.PI * v.r },
            { label: 'Диаметр', value: 2 * v.r },
          ],
          formula: 'S = πr²&nbsp;&nbsp;|&nbsp;&nbsp;C = 2πr',
        };
      },
      explain: '<p>Площадь круга <code>S=πr²</code>, длина окружности <code>C=2πr</code>, диаметр <code>d=2r</code>.</p>',
    },
    {
      id: 'gcd-lcm', title: 'НОД и НОК', title_en: 'GCD & LCM',
      desc: 'Наибольший общий делитель и наименьшее общее кратное.',
      tags: ['нод', 'нок', 'делитель', 'кратное', 'gcd', 'lcm', 'евклид'],
      inputs: [{ key: 'a', label: 'Число a' }, { key: 'b', label: 'Число b' }],
      compute(v) {
        if (Number.isNaN(v.a) || Number.isNaN(v.b)) return { note: 'Введите два целых числа.' };
        let a = Math.abs(Math.round(v.a)), b = Math.abs(Math.round(v.b));
        if (a === 0 && b === 0) return { error: 'Хотя бы одно число должно быть ненулевым.' };
        const A = a, B = b;
        while (b) { [a, b] = [b, a % b]; }
        const g = a, l = A / g * B;
        return { outputs: [{ label: 'НОД', value: g, primary: true }, { label: 'НОК', value: l, primary: true }], formula: 'НОК(a,b) = a·b ⁄ НОД(a,b)' };
      },
      explain: '<p>НОД находится алгоритмом Евклида, НОК — через <code>НОК(a,b)=a·b/НОД(a,b)</code>.</p>',
    },
    {
      id: 'logarithm', title: 'Логарифм', title_en: 'Logarithm',
      desc: 'log по любому основанию, ln, lg.',
      tags: ['логарифм', 'логарифмы', 'ln', 'lg', 'logarithm', 'log'],
      inputs: [{ key: 'x', label: 'Аргумент x' }, { key: 'base', label: 'Основание', default: 10 }],
      compute(v) {
        if (Number.isNaN(v.x) || v.x <= 0) return { note: 'x должен быть > 0.' };
        if (Number.isNaN(v.base) || v.base <= 0 || v.base === 1) return { error: 'Основание > 0 и ≠ 1.' };
        return {
          outputs: [
            { label: `log_${F(v.base)}(${F(v.x)})`, value: Math.log(v.x) / Math.log(v.base), primary: true },
            { label: 'ln(x)', value: Math.log(v.x) },
            { label: 'lg(x)', value: Math.log10(v.x) },
          ],
          formula: 'log_b(x) = ln(x) ⁄ ln(b)',
        };
      },
      explain: '<p>Логарифм по любому основанию через натуральный: <code>log_b(x)=ln x / ln b</code>. ln — основание e, lg — основание 10.</p>',
    },
    {
      id: 'combinatorics', title: 'Комбинаторика: C, A, n!', title_en: 'Combinatorics',
      desc: 'Сочетания nCr, размещения nPr, факториал.',
      tags: ['комбинаторика', 'сочетания', 'размещения', 'факториал', 'combinations', 'permutations', 'factorial'],
      inputs: [{ key: 'n', label: 'n' }, { key: 'r', label: 'r', optional: true }],
      compute(v) {
        if (Number.isNaN(v.n) || v.n < 0) return { note: 'Введите целое n ≥ 0.' };
        const n = Math.round(v.n);
        if (n > 170) return { error: 'n слишком велико (переполнение факториала, n ≤ 170).' };
        const fact = k => { let p = 1; for (let i = 2; i <= k; i++) p *= i; return p; };
        const out = [{ label: 'n!', value: fact(n) }];
        if (!Number.isNaN(v.r)) {
          const r = Math.round(v.r);
          if (r < 0 || r > n) return { error: 'Нужно 0 ≤ r ≤ n.' };
          out.push({ label: `C(n,r) — сочетания`, value: fact(n) / (fact(r) * fact(n - r)), primary: true });
          out.push({ label: `A(n,r) — размещения`, value: fact(n) / fact(n - r), primary: true });
        }
        return { outputs: out, formula: 'C(n,r)=n!⁄(r!(n−r)!),&nbsp; A(n,r)=n!⁄(n−r)!' };
      },
      explain: '<p>Сочетания <code>C(n,r)</code> — выбор без учёта порядка, размещения <code>A(n,r)</code> — с учётом порядка. Факториал <code>n!</code> — число перестановок.</p>',
    },
    {
      id: 'proportion', title: 'Пропорция', title_en: 'Proportion',
      desc: 'a / b = c / x — найти x.',
      tags: ['пропорция', 'отношение', 'proportion', 'cross multiply'],
      inputs: [{ key: 'a', label: 'a' }, { key: 'b', label: 'b' }, { key: 'c', label: 'c' }],
      compute(v) {
        if ([v.a, v.b, v.c].some(Number.isNaN)) return { note: 'Введите a, b, c.' };
        if (v.a === 0) return { error: 'a не может быть 0.' };
        return { outputs: [{ label: 'x', value: v.b * v.c / v.a, primary: true }], formula: 'a⁄b = c⁄x → x = b·c ⁄ a' };
      },
      explain: '<p>Из пропорции <code>a/b = c/x</code> неизвестное находится перекрёстным умножением: <code>x = b·c/a</code>.</p>',
    },
    {
      id: 'power-root', title: 'Степень и корень', title_en: 'Power & Root',
      desc: 'xⁿ и корень n-й степени.',
      tags: ['степень', 'корень', 'возведение', 'power', 'root', 'exponent'],
      inputs: [{ key: 'x', label: 'Основание x' }, { key: 'n', label: 'Показатель n', default: 2 }],
      compute(v) {
        if (Number.isNaN(v.x) || Number.isNaN(v.n)) return { note: 'Введите x и n.' };
        const out = [{ label: `x^n`, value: Math.pow(v.x, v.n), primary: true }];
        if (v.x >= 0) out.push({ label: `корень n-й степени из x`, value: Math.pow(v.x, 1 / v.n) });
        return { outputs: out, formula: 'xⁿ&nbsp;&nbsp;|&nbsp;&nbsp;ⁿ√x = x^(1⁄n)' };
      },
      explain: '<p>Возведение в степень и обратная операция — корень: <code>ⁿ√x = x^(1/n)</code>.</p>',
    },
  ]);
})();
