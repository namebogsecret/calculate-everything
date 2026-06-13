/* Физика. Многие — «реши относительно любой пустой переменной». */
(function () {
  const F = (x, d) => window.CE.fmt(x, d);

  // helper: для соотношения a = b*c — найти единственную пустую из {a,b,c}
  function solve3(v, ka, kb, kc, rel) {
    // rel: a = b*c
    const a = v[ka], b = v[kb], c = v[kc];
    const blanks = [ka, kb, kc].filter(k => Number.isNaN(v[k]));
    if (blanks.length === 0) return { missing: null, msg: 'Заполнено всё — оставьте одно поле пустым, чтобы вычислить его.' };
    if (blanks.length > 1) return { missing: null, msg: 'Заполните любые два поля — третье вычислю.' };
    const m = blanks[0];
    if (m === ka) return { missing: ka, value: b * c };
    if (m === kb) return { missing: kb, value: a / c };
    return { missing: kc, value: a / b };
  }

  window.CE.register('physics', [
    {
      id: 'ohms-law', title: 'Закон Ома', title_en: "Ohm's Law",
      desc: 'V = I · R. Заполните любые два — найду третье.',
      tags: ['электричество', 'напряжение', 'ток', 'сопротивление', 'voltage', 'current', 'resistance'],
      inputs: [
        { key: 'V', label: 'Напряжение V', unit: 'В', optional: true },
        { key: 'I', label: 'Сила тока I', unit: 'А', optional: true },
        { key: 'R', label: 'Сопротивление R', unit: 'Ом', optional: true },
      ],
      compute(v) {
        const r = solve3(v, 'V', 'I', 'R');
        if (!r.missing) return { note: r.msg };
        const lbl = { V: ['Напряжение V', 'В'], I: ['Сила тока I', 'А'], R: ['Сопротивление R', 'Ом'] }[r.missing];
        return {
          outputs: [{ label: lbl[0], value: r.value, unit: lbl[1], primary: true }],
          formula: 'V = I · R',
        };
      },
      explain: '<p>Закон Ома связывает напряжение <code>V</code> (вольт), силу тока <code>I</code> (ампер) и сопротивление <code>R</code> (ом): <code>V = I·R</code>. Базовая формула школьной и вузовской электротехники, постоянно встречается в ЕГЭ, IB и AP Physics.</p>',
    },
    {
      id: 'electric-power', title: 'Электрическая мощность', title_en: 'Electric Power',
      desc: 'P = V · I. Мощность по напряжению и току.',
      tags: ['мощность', 'power', 'ватт', 'электричество'],
      inputs: [
        { key: 'P', label: 'Мощность P', unit: 'Вт', optional: true },
        { key: 'V', label: 'Напряжение V', unit: 'В', optional: true },
        { key: 'I', label: 'Сила тока I', unit: 'А', optional: true },
      ],
      compute(v) {
        const r = solve3(v, 'P', 'V', 'I');
        if (!r.missing) return { note: r.msg };
        const lbl = { P: ['Мощность P', 'Вт'], V: ['Напряжение V', 'В'], I: ['Сила тока I', 'А'] }[r.missing];
        return { outputs: [{ label: lbl[0], value: r.value, unit: lbl[1], primary: true }], formula: 'P = V · I' };
      },
      explain: '<p>Электрическая мощность <code>P = V·I</code> (ватт). Также <code>P = I²·R = V²/R</code>.</p>',
    },
    {
      id: 'newton-second', title: 'Второй закон Ньютона', title_en: "Newton's 2nd Law",
      desc: 'F = m · a. Сила, масса, ускорение.',
      tags: ['сила', 'масса', 'ускорение', 'force', 'mass', 'acceleration', 'механика'],
      inputs: [
        { key: 'F', label: 'Сила F', unit: 'Н', optional: true },
        { key: 'm', label: 'Масса m', unit: 'кг', optional: true },
        { key: 'a', label: 'Ускорение a', unit: 'м/с²', optional: true },
      ],
      compute(v) {
        const r = solve3(v, 'F', 'm', 'a');
        if (!r.missing) return { note: r.msg };
        const lbl = { F: ['Сила F', 'Н'], m: ['Масса m', 'кг'], a: ['Ускорение a', 'м/с²'] }[r.missing];
        return { outputs: [{ label: lbl[0], value: r.value, unit: lbl[1], primary: true }], formula: 'F = m · a' };
      },
      explain: '<p>Второй закон Ньютона: равнодействующая сила равна произведению массы на ускорение, <code>F = m·a</code>. 1 Н = 1 кг·м/с².</p>',
    },
    {
      id: 'kinematics', title: 'Равноускоренное движение', title_en: 'Uniform Acceleration',
      desc: 'v = v₀ + a·t и s = v₀·t + a·t²/2.',
      tags: ['кинематика', 'скорость', 'ускорение', 'путь', 'kinematics', 'velocity'],
      inputs: [
        { key: 'v0', label: 'Начальная скорость v₀', unit: 'м/с', default: 0 },
        { key: 'a', label: 'Ускорение a', unit: 'м/с²', default: 0 },
        { key: 't', label: 'Время t', unit: 'с' },
      ],
      compute(v) {
        if ([v.v0, v.a, v.t].some(Number.isNaN)) return { note: 'Введите v₀, a и t.' };
        const vt = v.v0 + v.a * v.t;
        const s = v.v0 * v.t + 0.5 * v.a * v.t * v.t;
        return {
          outputs: [
            { label: 'Конечная скорость v', value: vt, unit: 'м/с', primary: true },
            { label: 'Пройденный путь s', value: s, unit: 'м' },
          ],
          formula: 'v = v₀ + a·t&nbsp;&nbsp;|&nbsp;&nbsp;s = v₀·t + a·t²⁄2',
          steps: [
            `v = ${F(v.v0)} + ${F(v.a)}·${F(v.t)} = ${F(vt)} м/с`,
            `s = ${F(v.v0)}·${F(v.t)} + ½·${F(v.a)}·${F(v.t)}² = ${F(s)} м`,
          ],
        };
      },
      explain: '<p>Кинематика равноускоренного движения по прямой. <code>v = v₀ + a·t</code>, <code>s = v₀·t + ½·a·t²</code>. При a&lt;0 — торможение.</p>',
    },
    {
      id: 'free-fall', title: 'Свободное падение', title_en: 'Free Fall',
      desc: 'Время, скорость и высота падения (g = 9.81).',
      tags: ['падение', 'гравитация', 'высота', 'free fall', 'gravity'],
      inputs: [
        { key: 'h', label: 'Высота h', unit: 'м' },
        { key: 'g', label: 'Ускорение g', unit: 'м/с²', default: 9.81 },
      ],
      compute(v) {
        if (Number.isNaN(v.h) || Number.isNaN(v.g) || v.h < 0 || v.g <= 0) return { note: 'Введите высоту h ≥ 0.' };
        const t = Math.sqrt(2 * v.h / v.g);
        const vt = v.g * t;
        return {
          outputs: [
            { label: 'Время падения t', value: t, unit: 'с', primary: true },
            { label: 'Скорость удара v', value: vt, unit: 'м/с' },
          ],
          formula: 't = √(2h⁄g)&nbsp;&nbsp;|&nbsp;&nbsp;v = g·t',
          steps: [`t = √(2·${F(v.h)}/${F(v.g)}) = ${F(t)} с`, `v = ${F(v.g)}·${F(t)} = ${F(vt)} м/с`],
        };
      },
      explain: '<p>Тело падает из состояния покоя с высоты <code>h</code>. Время <code>t = √(2h/g)</code>, скорость у земли <code>v = √(2gh)</code>. На Земле g ≈ 9.81 м/с².</p>',
    },
    {
      id: 'projectile', title: 'Бросок под углом', title_en: 'Projectile Motion',
      desc: 'Дальность, высота и время полёта.',
      tags: ['баллистика', 'дальность', 'угол', 'projectile', 'range'],
      inputs: [
        { key: 'v0', label: 'Начальная скорость v₀', unit: 'м/с' },
        { key: 'ang', label: 'Угол к горизонту', unit: '°', default: 45 },
        { key: 'g', label: 'Ускорение g', unit: 'м/с²', default: 9.81 },
      ],
      compute(v) {
        if ([v.v0, v.ang, v.g].some(Number.isNaN)) return { note: 'Введите v₀ и угол.' };
        const r = v.ang * Math.PI / 180;
        const T = 2 * v.v0 * Math.sin(r) / v.g;
        const R = v.v0 * v.v0 * Math.sin(2 * r) / v.g;
        const H = (v.v0 * Math.sin(r)) ** 2 / (2 * v.g);
        return {
          outputs: [
            { label: 'Дальность R', value: R, unit: 'м', primary: true },
            { label: 'Макс. высота H', value: H, unit: 'м' },
            { label: 'Время полёта T', value: T, unit: 'с' },
          ],
          formula: 'R = v₀²·sin(2α)⁄g&nbsp;&nbsp;|&nbsp;&nbsp;H = (v₀·sinα)²⁄(2g)',
        };
      },
      explain: '<p>Снаряд брошен со скоростью <code>v₀</code> под углом <code>α</code> с уровня земли. Максимальная дальность — при 45°. Не учитывается сопротивление воздуха.</p>',
    },
    {
      id: 'kinetic-energy', title: 'Кинетическая энергия', title_en: 'Kinetic Energy',
      desc: 'E = m·v²/2.',
      tags: ['энергия', 'кинетическая', 'kinetic energy', 'джоуль'],
      inputs: [
        { key: 'm', label: 'Масса m', unit: 'кг' },
        { key: 'v', label: 'Скорость v', unit: 'м/с' },
      ],
      compute(v) {
        if (Number.isNaN(v.m) || Number.isNaN(v.v)) return { note: 'Введите массу и скорость.' };
        const E = 0.5 * v.m * v.v * v.v;
        return { outputs: [{ label: 'Кинетическая энергия', value: E, unit: 'Дж', primary: true }], formula: 'E = m·v²⁄2', steps: [`E = ½·${F(v.m)}·${F(v.v)}² = ${F(E)} Дж`] };
      },
      explain: '<p>Кинетическая энергия движущегося тела <code>E = ½mv²</code> (джоуль). Растёт как квадрат скорости — поэтому удвоение скорости учетверяет энергию (и тормозной путь).</p>',
    },
    {
      id: 'potential-energy', title: 'Потенциальная энергия', title_en: 'Potential Energy',
      desc: 'E = m·g·h.',
      tags: ['энергия', 'потенциальная', 'potential energy', 'высота'],
      inputs: [
        { key: 'm', label: 'Масса m', unit: 'кг' },
        { key: 'h', label: 'Высота h', unit: 'м' },
        { key: 'g', label: 'g', unit: 'м/с²', default: 9.81 },
      ],
      compute(v) {
        if ([v.m, v.h, v.g].some(Number.isNaN)) return { note: 'Введите массу и высоту.' };
        const E = v.m * v.g * v.h;
        return { outputs: [{ label: 'Потенциальная энергия', value: E, unit: 'Дж', primary: true }], formula: 'E = m·g·h' };
      },
      explain: '<p>Гравитационная потенциальная энергия <code>E = mgh</code> относительно выбранного нулевого уровня.</p>',
    },
    {
      id: 'density', title: 'Плотность', title_en: 'Density',
      desc: 'ρ = m / V. Заполните любые два.',
      tags: ['плотность', 'масса', 'объём', 'density', 'volume'],
      inputs: [
        { key: 'm', label: 'Масса m', unit: 'кг', optional: true },
        { key: 'V', label: 'Объём V', unit: 'м³', optional: true },
        { key: 'rho', label: 'Плотность ρ', unit: 'кг/м³', optional: true },
      ],
      compute(v) {
        const r = solve3(v, 'm', 'rho', 'V');  // m = rho * V
        if (!r.missing) return { note: r.msg };
        const lbl = { m: ['Масса m', 'кг'], rho: ['Плотность ρ', 'кг/м³'], V: ['Объём V', 'м³'] }[r.missing];
        return { outputs: [{ label: lbl[0], value: r.value, unit: lbl[1], primary: true }], formula: 'ρ = m ⁄ V' };
      },
      explain: '<p>Плотность <code>ρ = m/V</code>. Вода ≈ 1000 кг/м³, воздух ≈ 1.2 кг/м³.</p>',
    },
    {
      id: 'pressure', title: 'Давление', title_en: 'Pressure',
      desc: 'P = F / A. Заполните любые два.',
      tags: ['давление', 'сила', 'площадь', 'pressure', 'паскаль'],
      inputs: [
        { key: 'F', label: 'Сила F', unit: 'Н', optional: true },
        { key: 'A', label: 'Площадь A', unit: 'м²', optional: true },
        { key: 'P', label: 'Давление P', unit: 'Па', optional: true },
      ],
      compute(v) {
        const r = solve3(v, 'F', 'P', 'A'); // F = P * A
        if (!r.missing) return { note: r.msg };
        const lbl = { F: ['Сила F', 'Н'], P: ['Давление P', 'Па'], A: ['Площадь A', 'м²'] }[r.missing];
        return { outputs: [{ label: lbl[0], value: r.value, unit: lbl[1], primary: true }], formula: 'P = F ⁄ A' };
      },
      explain: '<p>Давление <code>P = F/A</code> (паскаль = Н/м²). Атмосферное ≈ 101 325 Па.</p>',
    },
    {
      id: 'wave', title: 'Волна: скорость · частота · длина', title_en: 'Wave Equation',
      desc: 'v = f · λ. Заполните любые два.',
      tags: ['волна', 'частота', 'длина волны', 'wave', 'frequency', 'wavelength'],
      inputs: [
        { key: 'v', label: 'Скорость v', unit: 'м/с', optional: true },
        { key: 'f', label: 'Частота f', unit: 'Гц', optional: true },
        { key: 'lam', label: 'Длина волны λ', unit: 'м', optional: true },
      ],
      compute(v) {
        const r = solve3(v, 'v', 'f', 'lam'); // v = f * lam
        if (!r.missing) return { note: r.msg };
        const lbl = { v: ['Скорость v', 'м/с'], f: ['Частота f', 'Гц'], lam: ['Длина волны λ', 'м'] }[r.missing];
        return { outputs: [{ label: lbl[0], value: r.value, unit: lbl[1], primary: true }], formula: 'v = f · λ' };
      },
      explain: '<p>Для любой волны скорость = частота × длина волны: <code>v = f·λ</code>. Скорость света c ≈ 3·10⁸ м/с, звука в воздухе ≈ 343 м/с.</p>',
    },
    {
      id: 'thin-lens', title: 'Тонкая линза', title_en: 'Thin Lens',
      desc: '1/f = 1/d₀ + 1/dᵢ.',
      tags: ['оптика', 'линза', 'фокус', 'lens', 'optics'],
      inputs: [
        { key: 'd0', label: 'Расстояние до предмета d₀', unit: 'м' },
        { key: 'di', label: 'Расстояние до изображения dᵢ', unit: 'м', optional: true },
        { key: 'f', label: 'Фокусное расстояние f', unit: 'м', optional: true },
      ],
      compute(v) {
        const have = ['d0', 'di', 'f'].filter(k => !Number.isNaN(v[k]));
        if (have.length < 2) return { note: 'Введите d₀ и одно из {dᵢ, f}.' };
        if (Number.isNaN(v.f)) {
          const f = 1 / (1 / v.d0 + 1 / v.di);
          const M = -v.di / v.d0;
          return { outputs: [{ label: 'Фокусное расстояние f', value: f, unit: 'м', primary: true }, { label: 'Увеличение M', value: M }], formula: '1⁄f = 1⁄d₀ + 1⁄dᵢ' };
        }
        const di = 1 / (1 / v.f - 1 / v.d0);
        const M = -di / v.d0;
        return { outputs: [{ label: 'Расстояние до изображения dᵢ', value: di, unit: 'м', primary: true }, { label: 'Увеличение M', value: M }], formula: '1⁄f = 1⁄d₀ + 1⁄dᵢ', note: M < 0 ? 'M&lt;0 — изображение перевёрнутое и действительное.' : 'M&gt;0 — изображение прямое и мнимое.' };
      },
      explain: '<p>Формула тонкой линзы <code>1/f = 1/d₀ + 1/dᵢ</code>. Увеличение <code>M = −dᵢ/d₀</code>. Для собирающей линзы f&gt;0, для рассеивающей f&lt;0.</p>',
    },
  ]);
})();
