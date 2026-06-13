/* Экономика и финансы. */
(function () {
  const F = (x, d) => window.CE.fmt(x, d);
  const money = x => window.CE.fmt(x, 2);

  window.CE.register('economics', [
    {
      id: 'compound-interest', title: 'Сложный процент', title_en: 'Compound Interest',
      desc: 'Рост вклада с капитализацией + регулярные пополнения.',
      tags: ['сложный процент', 'вклад', 'депозит', 'инвестиции', 'compound interest', 'savings'],
      inputs: [
        { key: 'P', label: 'Начальная сумма', unit: '' },
        { key: 'r', label: 'Ставка в год', unit: '%', default: 10 },
        { key: 'years', label: 'Срок', unit: 'лет', default: 10 },
        { key: 'n', label: 'Капитализаций в год', default: 12, hint: '12 — ежемесячно, 1 — раз в год' },
        { key: 'pmt', label: 'Пополнение каждый период', unit: '', default: 0, optional: true },
      ],
      compute(v) {
        if ([v.P, v.r, v.years, v.n].some(Number.isNaN)) return { note: 'Заполните сумму, ставку, срок.' };
        const i = v.r / 100 / v.n, N = v.n * v.years, pmt = Number.isNaN(v.pmt) ? 0 : v.pmt;
        const fromP = v.P * Math.pow(1 + i, N);
        const fromPmt = i === 0 ? pmt * N : pmt * (Math.pow(1 + i, N) - 1) / i;
        const total = fromP + fromPmt;
        const contributed = v.P + pmt * N;
        return {
          outputs: [
            { label: 'Итоговая сумма', value: total, digits: 2, primary: true },
            { label: 'Внесено всего', value: contributed, digits: 2 },
            { label: 'Начислено процентов', value: total - contributed, digits: 2 },
          ],
          formula: 'FV = P(1+i)ᴺ + PMT·((1+i)ᴺ−1)⁄i,&nbsp; i = r⁄n',
        };
      },
      explain: '<p>Сложный процент начисляется и на тело вклада, и на ранее начисленные проценты. Чем чаще капитализация (n) и длиннее срок, тем сильнее эффект. С регулярными пополнениями PMT добавляется будущая стоимость аннуитета.</p>',
    },
    {
      id: 'loan-payment', title: 'Кредит / ипотека', title_en: 'Loan & Mortgage',
      desc: 'Аннуитетный платёж, переплата, полная стоимость.',
      tags: ['кредит', 'ипотека', 'займ', 'платёж', 'аннуитет', 'loan', 'mortgage', 'payment'],
      inputs: [
        { key: 'P', label: 'Сумма кредита' },
        { key: 'r', label: 'Ставка в год', unit: '%', default: 15 },
        { key: 'years', label: 'Срок', unit: 'лет', default: 20 },
      ],
      compute(v) {
        if ([v.P, v.r, v.years].some(Number.isNaN) || v.P <= 0) return { note: 'Введите сумму, ставку и срок.' };
        const i = v.r / 100 / 12, N = Math.round(v.years * 12);
        const pay = i === 0 ? v.P / N : v.P * i * Math.pow(1 + i, N) / (Math.pow(1 + i, N) - 1);
        const total = pay * N;
        return {
          outputs: [
            { label: 'Ежемесячный платёж', value: pay, digits: 2, primary: true },
            { label: 'Всего выплат за срок', value: total, digits: 2 },
            { label: 'Переплата по процентам', value: total - v.P, digits: 2 },
          ],
          formula: 'Платёж = P·i·(1+i)ᴺ ⁄ ((1+i)ᴺ−1),&nbsp; i = r⁄12, N = лет·12',
          note: `Срок: <b>${N} мес.</b> Переплата = <b>${F((total / v.P - 1) * 100, 1)}%</b> от тела кредита.`,
        };
      },
      explain: '<p>Аннуитетный кредит — равный платёж каждый месяц. Формула учитывает месячную ставку <code>i=r/12</code> и число платежей <code>N</code>. Переплата = сумма всех платежей минус тело долга.</p>',
    },
    {
      id: 'cagr', title: 'CAGR — среднегодовой рост', title_en: 'CAGR',
      desc: 'Среднегодовая доходность инвестиции.',
      tags: ['cagr', 'доходность', 'рост', 'инвестиции', 'growth rate'],
      inputs: [
        { key: 'begin', label: 'Начальная стоимость' },
        { key: 'end', label: 'Конечная стоимость' },
        { key: 'years', label: 'Срок', unit: 'лет', default: 5 },
      ],
      compute(v) {
        if ([v.begin, v.end, v.years].some(Number.isNaN) || v.begin <= 0 || v.years <= 0) return { note: 'Введите положительные значения.' };
        const cagr = (Math.pow(v.end / v.begin, 1 / v.years) - 1) * 100;
        const totalRet = (v.end / v.begin - 1) * 100;
        return {
          outputs: [
            { label: 'CAGR (в год)', value: cagr, unit: '%', digits: 2, primary: true },
            { label: 'Общая доходность', value: totalRet, unit: '%', digits: 2 },
          ],
          formula: 'CAGR = (Конец ⁄ Начало)^(1⁄лет) − 1',
        };
      },
      explain: '<p>CAGR (Compound Annual Growth Rate) — какой постоянный годовой процент дал бы тот же итоговый результат. Корректнее «среднего», т.к. учитывает капитализацию.</p>',
    },
    {
      id: 'roi', title: 'ROI — рентабельность', title_en: 'Return on Investment',
      desc: 'Прибыль относительно вложений в %.',
      tags: ['roi', 'рентабельность', 'прибыль', 'окупаемость', 'return'],
      inputs: [{ key: 'gain', label: 'Доход / выручка' }, { key: 'cost', label: 'Вложения / затраты' }],
      compute(v) {
        if (Number.isNaN(v.gain) || Number.isNaN(v.cost) || v.cost === 0) return { note: 'Введите доход и затраты (≠0).' };
        const roi = (v.gain - v.cost) / v.cost * 100;
        return { outputs: [{ label: 'Чистая прибыль', value: v.gain - v.cost, digits: 2 }, { label: 'ROI', value: roi, unit: '%', digits: 2, primary: true }], formula: 'ROI = (Доход − Затраты) ⁄ Затраты · 100%' };
      },
      explain: '<p>ROI показывает прибыль на единицу вложений. ROI = 100% означает удвоение вложенного.</p>',
    },
    {
      id: 'npv', title: 'NPV — чистая приведённая стоимость', title_en: 'Net Present Value',
      desc: 'Дисконтирование равных годовых потоков.',
      tags: ['npv', 'дисконтирование', 'приведённая стоимость', 'инвестпроект', 'present value'],
      inputs: [
        { key: 'C0', label: 'Начальные вложения (−)', hint: 'вводите положительным числом' },
        { key: 'cf', label: 'Годовой денежный поток' },
        { key: 'years', label: 'Число лет', default: 5 },
        { key: 'r', label: 'Ставка дисконта', unit: '%', default: 10 },
      ],
      compute(v) {
        if ([v.C0, v.cf, v.years, v.r].some(Number.isNaN)) return { note: 'Заполните все поля.' };
        const i = v.r / 100; let npv = -Math.abs(v.C0);
        for (let t = 1; t <= Math.round(v.years); t++) npv += v.cf / Math.pow(1 + i, t);
        return { outputs: [{ label: 'NPV', value: npv, digits: 2, primary: true }], formula: 'NPV = −C₀ + Σ CFₜ ⁄ (1+r)ᵗ', note: npv >= 0 ? 'NPV ≥ 0 — проект создаёт стоимость.' : 'NPV &lt; 0 — проект разрушает стоимость при этой ставке.' };
      },
      explain: '<p>NPV приводит будущие денежные потоки к сегодняшнему дню по ставке дисконта <code>r</code> и вычитает начальные вложения. Положительный NPV — проект выгоден.</p>',
    },
    {
      id: 'break-even', title: 'Точка безубыточности', title_en: 'Break-Even Point',
      desc: 'Сколько единиц продать, чтобы выйти в ноль.',
      tags: ['безубыточность', 'break-even', 'бизнес', 'постоянные затраты', 'маржа'],
      inputs: [
        { key: 'fixed', label: 'Постоянные затраты' },
        { key: 'price', label: 'Цена за единицу' },
        { key: 'varcost', label: 'Переменные затраты на единицу' },
      ],
      compute(v) {
        if ([v.fixed, v.price, v.varcost].some(Number.isNaN)) return { note: 'Заполните все поля.' };
        const margin = v.price - v.varcost;
        if (margin <= 0) return { error: 'Цена должна быть выше переменных затрат.' };
        const units = v.fixed / margin;
        return { outputs: [{ label: 'Маржа на единицу', value: margin, digits: 2 }, { label: 'Точка безубыточности', value: units, digits: 1, unit: 'ед.', primary: true }, { label: 'Выручка в точке', value: units * v.price, digits: 2 }], formula: 'Q = Постоянные ⁄ (Цена − Перем. затраты)' };
      },
      explain: '<p>Точка безубыточности — объём продаж, при котором выручка покрывает все затраты. Каждая единица сверх неё приносит прибыль, равную марже.</p>',
    },
    {
      id: 'inflation', title: 'Инфляция / покупательная способность', title_en: 'Inflation',
      desc: 'Сколько будут стоить деньги через N лет.',
      tags: ['инфляция', 'покупательная способность', 'обесценивание', 'inflation'],
      inputs: [
        { key: 'amount', label: 'Сумма сегодня' },
        { key: 'rate', label: 'Инфляция в год', unit: '%', default: 7 },
        { key: 'years', label: 'Срок', unit: 'лет', default: 10 },
      ],
      compute(v) {
        if ([v.amount, v.rate, v.years].some(Number.isNaN)) return { note: 'Заполните поля.' };
        const i = v.rate / 100;
        const futureNominal = v.amount * Math.pow(1 + i, v.years);
        const realValue = v.amount / Math.pow(1 + i, v.years);
        return { outputs: [{ label: `Реальная стоимость суммы через ${F(v.years)} лет`, value: realValue, digits: 2, primary: true }, { label: 'Сколько нужно, чтобы сохранить покупат. способность', value: futureNominal, digits: 2 }], formula: 'Реальная = Сумма ⁄ (1+i)ᵗ' };
      },
      explain: '<p>Инфляция снижает покупательную способность денег: на ту же сумму через годы можно купить меньше. Калькулятор показывает реальную стоимость сегодняшней суммы в будущем и необходимую индексацию.</p>',
    },
    {
      id: 'vat', title: 'НДС / налог: выделить и начислить', title_en: 'VAT / Sales Tax',
      desc: 'Добавить налог к сумме или выделить из суммы.',
      tags: ['ндс', 'налог', 'vat', 'tax', 'выделить ндс'],
      inputs: [
        { key: 'mode', label: 'Операция', options: [{ value: 'add', label: 'Начислить налог сверху' }, { value: 'extract', label: 'Выделить налог из суммы' }], default: 'add' },
        { key: 'amount', label: 'Сумма' },
        { key: 'rate', label: 'Ставка', unit: '%', default: 20 },
      ],
      compute(v) {
        if (Number.isNaN(v.amount) || Number.isNaN(v.rate)) return { note: 'Введите сумму и ставку.' };
        const i = v.rate / 100;
        if (v.mode === 'add') {
          const tax = v.amount * i;
          return { outputs: [{ label: 'Налог', value: tax, digits: 2 }, { label: 'Сумма с налогом', value: v.amount + tax, digits: 2, primary: true }], formula: 'Итог = Сумма · (1 + ставка)' };
        }
        const net = v.amount / (1 + i), tax = v.amount - net;
        return { outputs: [{ label: 'Сумма без налога', value: net, digits: 2, primary: true }, { label: 'В т.ч. налог', value: tax, digits: 2 }], formula: 'Без налога = Сумма ⁄ (1 + ставка)' };
      },
      explain: '<p>Начислить: умножаем на (1+ставка). Выделить из суммы, уже включающей налог: делим на (1+ставка), разница — налог.</p>',
    },
    {
      id: 'discount', title: 'Скидка', title_en: 'Discount',
      desc: 'Цена после скидки и сколько сэкономлено.',
      tags: ['скидка', 'распродажа', 'discount', 'sale', 'процент скидки'],
      inputs: [{ key: 'price', label: 'Цена' }, { key: 'disc', label: 'Скидка', unit: '%', default: 20 }],
      compute(v) {
        if (Number.isNaN(v.price) || Number.isNaN(v.disc)) return { note: 'Введите цену и скидку.' };
        const save = v.price * v.disc / 100;
        return { outputs: [{ label: 'Цена со скидкой', value: v.price - save, digits: 2, primary: true }, { label: 'Экономия', value: save, digits: 2 }], formula: 'Итог = Цена · (1 − скидка⁄100)' };
      },
      explain: '<p>Цена со скидкой = исходная цена × (1 − процент/100).</p>',
    },
    {
      id: 'tip', title: 'Чаевые и счёт на компанию', title_en: 'Tip Calculator',
      desc: 'Чаевые и деление счёта поровну.',
      tags: ['чаевые', 'счёт', 'tip', 'split', 'ресторан'],
      inputs: [{ key: 'bill', label: 'Счёт' }, { key: 'tip', label: 'Чаевые', unit: '%', default: 10 }, { key: 'people', label: 'Человек', default: 1 }],
      compute(v) {
        if (Number.isNaN(v.bill) || Number.isNaN(v.tip)) return { note: 'Введите счёт.' };
        const tip = v.bill * v.tip / 100, total = v.bill + tip;
        const p = Number.isNaN(v.people) || v.people < 1 ? 1 : Math.round(v.people);
        return { outputs: [{ label: 'Чаевые', value: tip, digits: 2 }, { label: 'Итого', value: total, digits: 2, primary: true }, { label: `С каждого (${p})`, value: total / p, digits: 2 }], formula: 'Итого = Счёт · (1 + чаевые⁄100)' };
      },
      explain: '<p>Чаевые считаются от суммы счёта, затем итог делится на число гостей.</p>',
    },
  ]);
})();
