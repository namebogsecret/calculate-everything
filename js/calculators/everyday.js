/* На каждый день — расширяет охват трафика. */
(function () {
  const F = (x, d) => window.CE.fmt(x, d);

  window.CE.register('everyday', [
    {
      id: 'bmi', title: 'Индекс массы тела (ИМТ)', title_en: 'BMI',
      desc: 'ИМТ по росту и весу + категория.',
      tags: ['имт', 'bmi', 'вес', 'рост', 'ожирение', 'weight'],
      inputs: [{ key: 'w', label: 'Вес', unit: 'кг' }, { key: 'h', label: 'Рост', unit: 'см', default: 175 }],
      compute(v) {
        if (Number.isNaN(v.w) || Number.isNaN(v.h) || v.h <= 0) return { note: 'Введите вес и рост.' };
        const m = v.h / 100, bmi = v.w / (m * m);
        let cat = bmi < 18.5 ? 'недостаток веса' : bmi < 25 ? 'норма' : bmi < 30 ? 'избыточный вес' : 'ожирение';
        const lo = 18.5 * m * m, hi = 24.9 * m * m;
        return { outputs: [{ label: 'ИМТ', value: bmi, digits: 1, primary: true }, { label: 'Категория', text: cat }, { label: 'Норма веса для роста', text: `${F(lo, 1)}–${F(hi, 1)} кг` }], formula: 'ИМТ = вес ⁄ рост²&nbsp; (рост в метрах)' };
      },
      explain: '<p>Индекс массы тела <code>ИМТ = вес(кг) / рост²(м)</code>. ВОЗ: &lt;18.5 недостаток, 18.5–25 норма, 25–30 избыток, &gt;30 ожирение. Не учитывает мышечную массу.</p>',
    },
    {
      id: 'temperature', title: 'Температура: °C ⇄ °F ⇄ K', title_en: 'Temperature Converter',
      desc: 'Перевод между Цельсием, Фаренгейтом и Кельвином.',
      tags: ['температура', 'цельсий', 'фаренгейт', 'кельвин', 'temperature', 'celsius', 'fahrenheit'],
      inputs: [{ key: 'val', label: 'Значение' }, { key: 'from', label: 'Из шкалы', options: [{ value: 'C', label: '°C Цельсий' }, { value: 'F', label: '°F Фаренгейт' }, { value: 'K', label: 'K Кельвин' }], default: 'C' }],
      compute(v) {
        if (Number.isNaN(v.val)) return { note: 'Введите значение.' };
        let c;
        if (v.from === 'C') c = v.val; else if (v.from === 'F') c = (v.val - 32) * 5 / 9; else c = v.val - 273.15;
        return { outputs: [{ label: '°C Цельсий', value: c, digits: 2, primary: v.from !== 'C' }, { label: '°F Фаренгейт', value: c * 9 / 5 + 32, digits: 2, primary: v.from !== 'F' }, { label: 'K Кельвин', value: c + 273.15, digits: 2, primary: v.from !== 'K' }], formula: '°F = °C·9⁄5 + 32,&nbsp; K = °C + 273.15' };
      },
      explain: '<p>0 °C = 32 °F = 273.15 K. Кельвин отсчитывается от абсолютного нуля.</p>',
    },
    {
      id: 'length-converter', title: 'Конвертер длины', title_en: 'Length Converter',
      desc: 'м, км, см, мм, миля, фут, дюйм, ярд.',
      tags: ['длина', 'метры', 'мили', 'футы', 'дюймы', 'конвертер', 'length', 'converter'],
      inputs: [
        { key: 'val', label: 'Значение', default: 1 },
        { key: 'from', label: 'Из', options: [{ value: 1, label: 'метр' }, { value: 1000, label: 'километр' }, { value: 0.01, label: 'см' }, { value: 0.001, label: 'мм' }, { value: 1609.344, label: 'миля' }, { value: 0.3048, label: 'фут' }, { value: 0.0254, label: 'дюйм' }, { value: 0.9144, label: 'ярд' }, { value: 1852, label: 'морская миля' }], default: 1 },
      ],
      compute(v) {
        if (Number.isNaN(v.val)) return { note: 'Введите значение.' };
        const m = v.val * parseFloat(v.from);
        const u = [['км', 1000], ['метр', 1], ['см', 0.01], ['мм', 0.001], ['миля', 1609.344], ['ярд', 0.9144], ['фут', 0.3048], ['дюйм', 0.0254], ['морская миля', 1852]];
        return { outputs: u.map(([n, f]) => ({ label: n, value: m / f, digits: 4 })) };
      },
      explain: '<p>Все длины приводятся к метрам, затем переводятся в нужные единицы. 1 миля = 1609.344 м, 1 фут = 0.3048 м, 1 дюйм = 2.54 см.</p>',
    },
    {
      id: 'weight-converter', title: 'Конвертер массы', title_en: 'Weight Converter',
      desc: 'кг, г, т, фунт, унция, стоун.',
      tags: ['масса', 'вес', 'килограммы', 'фунты', 'унции', 'weight', 'converter'],
      inputs: [
        { key: 'val', label: 'Значение', default: 1 },
        { key: 'from', label: 'Из', options: [{ value: 1, label: 'кг' }, { value: 0.001, label: 'грамм' }, { value: 1000, label: 'тонна' }, { value: 0.45359237, label: 'фунт (lb)' }, { value: 0.0283495, label: 'унция (oz)' }, { value: 6.35029, label: 'стоун' }], default: 1 },
      ],
      compute(v) {
        if (Number.isNaN(v.val)) return { note: 'Введите значение.' };
        const kg = v.val * parseFloat(v.from);
        const u = [['тонна', 1000], ['кг', 1], ['грамм', 0.001], ['фунт (lb)', 0.45359237], ['унция (oz)', 0.0283495], ['стоун', 6.35029]];
        return { outputs: u.map(([n, f]) => ({ label: n, value: kg / f, digits: 4 })) };
      },
      explain: '<p>Приведение к килограммам и обратно. 1 фунт = 0.4536 кг, 1 унция = 28.35 г.</p>',
    },
    {
      id: 'fuel-cost', title: 'Стоимость поездки по топливу', title_en: 'Fuel Cost',
      desc: 'Расход, литры и деньги на дорогу.',
      tags: ['топливо', 'бензин', 'расход', 'поездка', 'fuel', 'cost', 'авто'],
      inputs: [
        { key: 'dist', label: 'Расстояние', unit: 'км', default: 100 },
        { key: 'cons', label: 'Расход', unit: 'л/100км', default: 8 },
        { key: 'price', label: 'Цена топлива', unit: '/л', default: 1.2 },
      ],
      compute(v) {
        if ([v.dist, v.cons, v.price].some(Number.isNaN)) return { note: 'Заполните поля.' };
        const liters = v.dist * v.cons / 100, cost = liters * v.price;
        return { outputs: [{ label: 'Нужно топлива', value: liters, digits: 2, unit: 'л' }, { label: 'Стоимость', value: cost, digits: 2, primary: true }, { label: 'Цена за км', value: cost / v.dist, digits: 3 }], formula: 'Литры = расстояние · расход ⁄ 100' };
      },
      explain: '<p>Литры = расстояние × расход на 100 км / 100. Умножаем на цену литра — получаем стоимость поездки.</p>',
    },
    {
      id: 'date-diff', title: 'Сколько дней между датами', title_en: 'Date Difference',
      desc: 'Дни, недели и месяцы между двумя датами.',
      tags: ['даты', 'дни', 'возраст', 'date difference', 'days between'],
      inputs: [
        { key: 'd1', label: 'Дата 1 (ГГГГ-ММ-ДД)', placeholder: '2026-01-01' },
        { key: 'd2', label: 'Дата 2 (ГГГГ-ММ-ДД)', placeholder: '2026-12-31' },
      ],
      compute(v) {
        // даты приходят как строки только если без unit/options; но мы parseFloat-им — обойдём через DOM-чтение
        const s1 = (document.getElementById('in_d1') || {}).value;
        const s2 = (document.getElementById('in_d2') || {}).value;
        if (!s1 || !s2) return { note: 'Введите обе даты в формате ГГГГ-ММ-ДД.' };
        const t1 = Date.parse(s1), t2 = Date.parse(s2);
        if (Number.isNaN(t1) || Number.isNaN(t2)) return { error: 'Не удалось распознать дату. Формат: 2026-12-31.' };
        const days = Math.round((t2 - t1) / 86400000);
        const ad = Math.abs(days);
        return { outputs: [{ label: 'Разница в днях', value: ad, primary: true }, { label: 'Недель', value: ad / 7, digits: 1 }, { label: 'Месяцев (≈30.44 дн)', value: ad / 30.4375, digits: 1 }, { label: 'Лет (≈365.25 дн)', value: ad / 365.25, digits: 2 }], note: days < 0 ? 'Дата 2 раньше Даты 1.' : undefined };
      },
      explain: '<p>Разница в днях между датами; недели, месяцы и годы — производные оценки. Используйте формат ГГГГ-ММ-ДД.</p>',
    },
  ]);
})();
