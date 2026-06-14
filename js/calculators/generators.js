/* Генераторы — пароли, числа, UUID, lorem ipsum. Всё считается в браузере. */
(function () {
  const F = (x, d) => window.CE.fmt(x, d);

  // Криптостойкие случайные индексы 0..max-1 (равномерно, через crypto).
  function randInts(count, max) {
    const out = [];
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const buf = new Uint32Array(count);
      crypto.getRandomValues(buf);
      for (let i = 0; i < count; i++) out.push(buf[i] % max);
    } else {
      for (let i = 0; i < count; i++) out.push(Math.floor(Math.random() * max));
    }
    return out;
  }

  function uuidV4() {
    const b = new Uint8Array(16);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) crypto.getRandomValues(b);
    else for (let i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256);
    b[6] = (b[6] & 0x0f) | 0x40; // версия 4
    b[8] = (b[8] & 0x3f) | 0x80; // вариант 10xx
    const h = [];
    for (let i = 0; i < 16; i++) h.push(b[i].toString(16).padStart(2, '0'));
    return (
      h[0] + h[1] + h[2] + h[3] + '-' + h[4] + h[5] + '-' + h[6] + h[7] + '-' +
      h[8] + h[9] + '-' + h[10] + h[11] + h[12] + h[13] + h[14] + h[15]
    );
  }

  const LOREM = (
    'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor ' +
    'incididunt ut labore et dolore magna aliqua enim ad minim veniam quis nostrud ' +
    'exercitation ullamco laboris nisi aliquip ex ea commodo consequat duis aute irure ' +
    'in reprehenderit voluptate velit esse cillum eu fugiat nulla pariatur excepteur sint ' +
    'occaecat cupidatat non proident sunt culpa qui officia deserunt mollit anim id est laborum'
  ).split(' ');

  window.CE.register('generators', [
    {
      id: 'password-gen', title: 'Генератор паролей', title_en: 'Password Generator',
      desc: 'Случайный надёжный пароль из выбранных наборов символов прямо в браузере.',
      tags: ['пароль', 'генератор паролей', 'случайный пароль', 'password', 'generator', 'random password', 'безопасность', 'security'],
      inputs: [
        { key: 'len', label: 'Длина', default: 16, hint: 'От 4 до 128 символов' },
        { key: 'digits', label: 'Включить цифры', options: [{ value: '1', label: 'Да' }, { value: '0', label: 'Нет' }], default: '1' },
        { key: 'symbols', label: 'Включить символы', options: [{ value: '1', label: 'Да' }, { value: '0', label: 'Нет' }], default: '1' },
        { key: 'upper', label: 'Включить прописные', options: [{ value: '1', label: 'Да' }, { value: '0', label: 'Нет' }], default: '1' },
      ],
      compute(v) {
        let len = Math.round(v.len);
        if (Number.isNaN(len)) return { note: 'Введите длину пароля.' };
        len = Math.max(4, Math.min(128, len));
        let alphabet = 'abcdefghijklmnopqrstuvwxyz';
        if (v.upper === '1') alphabet += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        if (v.digits === '1') alphabet += '0123456789';
        if (v.symbols === '1') alphabet += '!@#$%^&*()-_=+[]{}';
        const idx = randInts(len, alphabet.length);
        let pw = '';
        for (let i = 0; i < len; i++) pw += alphabet[idx[i]];
        const entropy = Math.round(len * Math.log2(alphabet.length));
        let grade;
        if (entropy < 40) grade = 'слабый';
        else if (entropy < 60) grade = 'средний';
        else if (entropy < 80) grade = 'сильный';
        else grade = 'очень сильный';
        return {
          outputs: [
            { label: 'Пароль', text: pw, primary: true },
            { label: 'Энтропия', text: String(entropy) + ' бит' },
            { label: 'Размер алфавита', text: String(alphabet.length) + ' символов' },
            { label: 'Оценка', text: grade },
          ],
          formula: 'Энтропия = длина × log₂(размер алфавита)',
          note: 'Пароль обновляется при изменении параметров и не покидает браузер.',
        };
      },
      explain: '<p>Из выбранных наборов (строчные всегда, плюс прописные, цифры и символы) собирается алфавит, после чего <code>crypto.getRandomValues</code> равномерно выбирает символы. Энтропия = <code>длина × log₂(размер алфавита)</code> — она и определяет стойкость к перебору.</p>',
      faq: [
        { q: 'Пароль точно никуда не отправляется?', a: '<p>Да. Генерация выполняется в JavaScript прямо в вашем браузере через локальный криптогенератор. Ни одна строка не уходит на сервер, поэтому можно использовать результат сразу.</p>' },
        { q: 'Какую длину выбрать?', a: '<p>Для важных аккаунтов берите 16 символов и больше: при полном алфавите это уже свыше 100 бит энтропии — перебор нереален. Минимум здесь — 4 символа, максимум — 128.</p>' },
        { q: 'Почему строчные буквы включены всегда?', a: '<p>Чтобы алфавит никогда не был пустым и пароль всегда генерировался. Строчные a–z дают базовые 26 символов; прописные, цифры и символы добавляются по вашему выбору.</p>' },
        { q: 'Почему пароль меняется, когда я правлю настройки?', a: '<p>Движок пересчитывает результат при каждом изменении ввода, поэтому новый пароль генерируется на лету. Скопируйте устроивший вас вариант до правки параметров.</p>' },
      ],
    },
    {
      id: 'random-number', title: 'Генератор случайных чисел', title_en: 'Random Number Generator',
      desc: 'Случайные целые числа в заданном диапазоне с суммой и средним.',
      tags: ['случайное число', 'генератор чисел', 'рандом', 'random', 'random number', 'rng', 'жребий', 'lottery'],
      inputs: [
        { key: 'min', label: 'Минимум', default: 1 },
        { key: 'max', label: 'Максимум', default: 100 },
        { key: 'count', label: 'Сколько чисел', default: 5, hint: 'От 1 до 100' },
      ],
      compute(v) {
        if (Number.isNaN(v.min) || Number.isNaN(v.max) || Number.isNaN(v.count)) return { note: 'Заполните диапазон и количество.' };
        const min = Math.round(v.min), max = Math.round(v.max);
        if (min > max) return { error: 'Минимум не может быть больше максимума.' };
        let count = Math.round(v.count);
        if (count < 1 || count > 100) return { error: 'Количество должно быть от 1 до 100.' };
        const span = max - min + 1;
        const idx = randInts(count, span);
        const nums = idx.map(i => min + i);
        const sum = nums.reduce((a, b) => a + b, 0);
        const outputs = [{ label: 'Числа', text: nums.join(', '), primary: true }];
        if (count > 1) {
          outputs.push({ label: 'Сумма', text: String(sum) });
          outputs.push({ label: 'Среднее', text: F(sum / count, 2) });
        }
        return {
          outputs,
          note: 'Числа целые, диапазон [' + min + '; ' + max + '] включительно; результат обновляется при изменении параметров.',
        };
      },
      explain: '<p>Калькулятор генерирует заданное число целых значений из диапазона <code>[мин; макс]</code> включительно (ширина = макс − мин + 1) и при количестве больше одного показывает их сумму и среднее. Каждое число выбирается независимо, повторы возможны.</p>',
      faq: [
        { q: 'Числа могут повторяться?', a: '<p>Да. Каждое значение выбирается независимо, поэтому в выборке возможны повторы — как при подбрасывании кубика. Это не выборка «без возврата».</p>' },
        { q: 'Границы диапазона тоже выпадают?', a: '<p>Да, диапазон включительный: и минимум, и максимум входят в набор возможных значений. Для диапазона 1–6 выпадают все числа от 1 до 6.</p>' },
        { q: 'Можно использовать для розыгрыша или жребия?', a: '<p>Для бытовых нужд — да. Числа берутся из криптогенератора браузера и распределены равномерно. Для официальных лотерей нужны сертифицированные ГСЧ, но для жеребьёвки в чате этого достаточно.</p>' },
        { q: 'Сколько чисел можно сгенерировать за раз?', a: '<p>От 1 до 100. Если нужно больше — запустите генерацию несколько раз; результат обновляется при каждом изменении полей.</p>' },
      ],
    },
    {
      id: 'uuid-gen', title: 'Генератор UUID (v4)', title_en: 'UUID v4 Generator',
      desc: 'Случайные идентификаторы UUID версии 4 по стандарту RFC 4122.',
      tags: ['uuid', 'guid', 'идентификатор', 'uuid v4', 'rfc 4122', 'unique id', 'генератор uuid'],
      inputs: [
        { key: 'count', label: 'Сколько', default: 1, hint: 'От 1 до 50' },
      ],
      compute(v) {
        if (Number.isNaN(v.count)) return { note: 'Укажите количество UUID.' };
        let count = Math.round(v.count);
        count = Math.max(1, Math.min(50, count));
        const list = [];
        for (let i = 0; i < count; i++) list.push(uuidV4());
        if (count === 1) {
          return {
            outputs: [{ label: 'UUID v4', text: list[0], primary: true }],
            note: 'Версия 4 — случайная; вероятность совпадения двух UUID пренебрежимо мала.',
          };
        }
        return {
          outputs: list.map((u, i) => ({ label: 'UUID ' + (i + 1), text: u, primary: i === 0 })),
          note: 'Сгенерировано ' + count + ' UUID версии 4 (RFC 4122); обновляются при изменении количества.',
        };
      },
      explain: '<p>UUID v4 — это 128 случайных бит, записанных как <code>xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx</code>, где цифра <code>4</code> задаёт версию, а <code>y</code> — вариант (8, 9, A или B). Биты берутся из <code>crypto.getRandomValues</code>, поэтому идентификаторы непредсказуемы.</p>',
      faq: [
        { q: 'Насколько вероятно совпадение двух UUID?', a: '<p>Пренебрежимо мало. В версии 4 случайны 122 бита — это около 5.3·10³⁶ вариантов. Чтобы получить хотя бы одно совпадение с заметной вероятностью, нужно сгенерировать порядка миллиардов миллиардов идентификаторов.</p>' },
        { q: 'Чем UUID v4 отличается от v1?', a: '<p>v1 строится на времени и MAC-адресе (предсказуем и раскрывает железо), а v4 полностью случаен. Для большинства задач v4 предпочтительнее: он не утекает метаданных.</p>' },
        { q: 'Что означают версия и вариант?', a: '<p>Цифра <code>4</code> в третьей группе фиксирует версию (случайная), а первый символ четвёртой группы (8, 9, A или B) — вариант RFC 4122. Эти биты выставляются принудительно, остальные случайны.</p>' },
        { q: 'Идентификаторы генерируются на сервере?', a: '<p>Нет, всё считается в браузере локальным криптогенератором. UUID можно безопасно использовать как ключи в базе, имена файлов или request-id.</p>' },
      ],
    },
    {
      id: 'lorem-ipsum', title: 'Генератор Lorem ipsum', title_en: 'Lorem Ipsum Generator',
      desc: 'Текст-рыба Lorem ipsum заданного объёма для макетов и вёрстки.',
      tags: ['lorem ipsum', 'текст-рыба', 'placeholder', 'заглушка', 'lorem', 'ipsum', 'dummy text', 'макет'],
      inputs: [
        { key: 'paras', label: 'Абзацев', default: 3, hint: 'От 1 до 20' },
        { key: 'words', label: 'Слов в абзаце', default: 40, hint: 'От 5 до 150' },
      ],
      compute(v) {
        if (Number.isNaN(v.paras) || Number.isNaN(v.words)) return { note: 'Укажите число абзацев и слов.' };
        const paras = Math.max(1, Math.min(20, Math.round(v.paras)));
        const words = Math.max(5, Math.min(150, Math.round(v.words)));
        const result = [];
        let total = 0;
        for (let p = 0; p < paras; p++) {
          const picks = randInts(words, LOREM.length).map(i => LOREM[i]);
          if (p === 0) {
            picks[0] = 'lorem'; picks[1] = 'ipsum'; picks[2] = 'dolor'; picks[3] = 'sit'; picks[4] = 'amet';
          }
          // Расставим запятые и точки: предложения по 8–12 слов.
          let sentence = '';
          let para = '';
          let sentLen = 8 + (randInts(1, 5)[0]);
          let sinceStart = 0, sinceComma = 0;
          for (let w = 0; w < picks.length; w++) {
            let word = picks[w];
            if (sinceStart === 0) word = word.charAt(0).toUpperCase() + word.slice(1);
            sentence += (sinceStart === 0 ? '' : ' ') + word;
            sinceStart++; sinceComma++;
            const last = w === picks.length - 1;
            if (last || sinceStart >= sentLen) {
              para += (para ? ' ' : '') + sentence + '.';
              sentence = '';
              sinceStart = 0; sinceComma = 0;
              sentLen = 8 + (randInts(1, 5)[0]);
            } else if (sinceComma >= 4 && randInts(1, 3)[0] === 0) {
              sentence += ',';
              sinceComma = 0;
            }
          }
          result.push(para);
          total += words;
        }
        return {
          outputs: [
            { label: 'Текст', text: result.join('\n\n'), primary: true },
            { label: 'Слов всего', text: String(total) },
          ],
          note: 'Текст-заглушка для макетов; обновляется при изменении параметров.',
        };
      },
      explain: '<p>Из классического пула слов lorem ipsum случайно набираются абзацы заданной длины. Первый абзац начинается с канонического «Lorem ipsum dolor sit amet…», слова делятся на предложения по 8–12 слов с запятыми и точками — получается реалистичная «рыба» для вёрстки.</p>',
      faq: [
        { q: 'Что такое Lorem ipsum?', a: '<p>Это стандартный текст-заполнитель («рыба») на псевдолатыни, искажённый отрывок из Цицерона. Он нужен, чтобы показать вёрстку и шрифты, не отвлекая читателя смыслом текста.</p>' },
        { q: 'Зачем использовать бессмысленный текст?', a: '<p>Осмысленный текст притягивает внимание к содержанию, и заказчик начинает читать вместо оценки макета. Lorem ipsum даёт реалистичную «массу» букв с привычной для латиницы частотой символов.</p>' },
        { q: 'Можно ли задать точный объём?', a: '<p>Да. Укажите число абзацев (1–20) и слов в каждом (5–150) — счётчик «слов всего» покажет итог. Это удобно, когда дизайн рассчитан на конкретную длину блока.</p>' },
        { q: 'Текст каждый раз разный?', a: '<p>Да, слова выбираются случайно, поэтому при каждом изменении параметров получается новый вариант. Скопируйте подходящий текст до правки полей.</p>' },
      ],
    },
  ]);
})();
