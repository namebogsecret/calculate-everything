/* IT и программирование — донорский трафик (tut:false). */
(function () {
  const F = (x, d) => window.CE.fmt(x, d);

  // Человекочитаемая длительность из секунд (для энтропии паролей).
  function humanTime(sec) {
    if (!isFinite(sec)) return 'практически бесконечно';
    if (sec < 1) return 'мгновенно (доли секунды)';
    if (sec < 60) return F(sec, 1) + ' с';
    if (sec < 3600) return F(sec / 60, 1) + ' мин';
    if (sec < 86400) return F(sec / 3600, 1) + ' ч';
    if (sec < 31557600) return F(sec / 86400, 1) + ' дн';
    const years = sec / 31557600;
    if (years < 1e3) return F(years, 1) + ' лет';
    if (years < 1e6) return F(years / 1e3, 1) + ' тыс. лет';
    if (years < 1e9) return F(years / 1e6, 1) + ' млн лет';
    if (years < 1e12) return F(years / 1e9, 1) + ' млрд лет';
    return 'триллионы лет (нереально)';
  }

  function int2ip(n) {
    return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');
  }

  window.CE.register('it', [
    {
      id: 'number-base', title: 'Перевод систем счисления (HEX · BIN · DEC · OCT)', title_en: 'Number Base Converter',
      desc: 'Перевод между двоичной, восьмеричной, десятичной и шестнадцатеричной системами.',
      tags: ['система счисления', 'двоичная', 'шестнадцатеричная', 'hex', 'binary', 'bin', 'dec', 'oct', 'перевод', 'base', 'radix', 'двоичный код', 'перевод чисел'],
      inputs: [
        { key: 'value', label: 'Число', default: 'FF', hint: 'Например: FF, 1010, 255, 777' },
        { key: 'from', label: 'Система исходного числа', options: [{ value: '2', label: '2 (двоичная)' }, { value: '8', label: '8 (восьмеричная)' }, { value: '10', label: '10 (десятичная)' }, { value: '16', label: '16 (шестнадцатеричная)' }], default: '16' },
      ],
      compute(v) {
        const raw = ((document.getElementById('in_value') || {}).value || '').trim();
        if (!raw) return { note: 'Введите число.' };
        const base = parseInt(v.from, 10);
        const cleaned = raw.replace(/^0[xXbBoO]/, '');
        const n = parseInt(cleaned, base);
        if (Number.isNaN(n) || !isFinite(n)) return { error: 'Недопустимое число для этой системы.' };
        // Проверим, что строка целиком валидна в данной системе.
        const re = base === 2 ? /^[01]+$/ : base === 8 ? /^[0-7]+$/ : base === 10 ? /^[0-9]+$/ : /^[0-9a-fA-F]+$/;
        if (!re.test(cleaned)) return { error: 'Недопустимое число для этой системы.' };
        return {
          outputs: [
            { label: 'Шестнадцатеричная (HEX)', text: n.toString(16).toUpperCase(), primary: true },
            { label: 'Десятичная (DEC)', text: n.toString(10) },
            { label: 'Восьмеричная (OCT)', text: n.toString(8) },
            { label: 'Двоичная (BIN)', text: n.toString(2) },
          ],
          note: 'Десятичное значение: ' + n + '.',
        };
      },
      explain: '<p>Число переводится в десятичное представление через <code>parseInt(строка, основание)</code>, а затем в нужную систему через <code>toString(основание)</code>. HEX (16) использует цифры 0–9 и буквы A–F, восьмеричная (8) — 0–7, двоичная (2) — 0 и 1.</p>',
      faq: [
        { q: 'Зачем нужна шестнадцатеричная система?', a: '<p>HEX компактно записывает байты: один байт = ровно две шестнадцатеричные цифры (00–FF). Она применяется для цветов в CSS, адресов памяти, MAC-адресов и дампов данных.</p>' },
        { q: 'Можно ли вводить число с префиксом 0x?', a: '<p>Да, префиксы <code>0x</code>, <code>0b</code>, <code>0o</code> отбрасываются автоматически — основание берётся из выпадающего списка, а не из префикса.</p>' },
        { q: 'Почему буквы в HEX до F?', a: '<p>В системе с основанием 16 нужно 16 разных цифр: 0–9 дают первые десять, а A–F обозначают значения 10–15.</p>' },
      ],
    },
    {
      id: 'cidr', title: 'Калькулятор подсетей CIDR (IPv4)', title_en: 'CIDR Subnet Calculator',
      desc: 'Маска, адрес сети, broadcast, диапазон и число хостов по записи CIDR.',
      tags: ['cidr', 'подсеть', 'маска', 'ip', 'ipv4', 'subnet', 'netmask', 'broadcast', 'сеть', 'network'],
      inputs: [
        { key: 'cidr', label: 'Адрес/префикс', default: '192.168.1.0/24', hint: 'Например: 10.0.0.0/8, 172.16.5.0/24' },
      ],
      compute(v) {
        const raw = ((document.getElementById('in_cidr') || {}).value || '').trim();
        if (!raw) return { note: 'Введите адрес в формате 192.168.1.0/24.' };
        const m = raw.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\/(\d{1,2})$/);
        if (!m) return { error: 'Неверный формат. Пример: 192.168.1.0/24.' };
        const oct = [+m[1], +m[2], +m[3], +m[4]];
        const p = +m[5];
        if (oct.some(o => o > 255)) return { error: 'Каждый октет должен быть в диапазоне 0–255.' };
        if (p > 32) return { error: 'Префикс должен быть в диапазоне 0–32.' };
        const ip = ((oct[0] << 24) | (oct[1] << 16) | (oct[2] << 8) | oct[3]) >>> 0;
        const mask = p === 0 ? 0 : (0xFFFFFFFF << (32 - p)) >>> 0;
        const wildcard = (~mask) >>> 0;
        const network = (ip & mask) >>> 0;
        const broadcast = (network | wildcard) >>> 0;
        const total = Math.pow(2, 32 - p);
        const hosts = Math.max(0, total - 2);
        let first, last;
        if (p >= 31) { first = network; last = broadcast; } // /31 и /32 — особые случаи
        else { first = (network + 1) >>> 0; last = (broadcast - 1) >>> 0; }
        return {
          outputs: [
            { label: 'Адрес сети', text: int2ip(network) + '/' + p, primary: true },
            { label: 'Маска подсети', text: int2ip(mask) },
            { label: 'Wildcard-маска', text: int2ip(wildcard) },
            { label: 'Broadcast-адрес', text: int2ip(broadcast) },
            { label: 'Диапазон хостов', text: int2ip(first) + ' — ' + int2ip(last) },
            { label: 'Всего адресов', text: F(total, 0) },
            { label: 'Доступных хостов', text: F(hosts, 0) },
          ],
          formula: 'Число адресов = 2^(32 − префикс),&nbsp; хостов = адреса − 2',
          note: 'Из общего числа адресов 2 зарезервированы: адрес сети и broadcast. Для /31 и /32 это правило не действует (point-to-point и одиночный хост).',
        };
      },
      explain: '<p>Префикс <code>/p</code> задаёт, сколько старших бит адреса — это сеть. Маска = p единиц слева, остальные нули. Адрес сети = IP AND маска; broadcast = сеть OR wildcard. Число адресов = <code>2^(32−p)</code>, из них для обычных подсетей 2 служебных.</p>',
      faq: [
        { q: 'Что такое /24?', a: '<p>Это префикс из 24 бит, то есть маска <code>255.255.255.0</code>. Под хосты остаётся 8 бит — 256 адресов, из них 254 пригодны для устройств.</p>' },
        { q: 'Почему «минус 2» при подсчёте хостов?', a: '<p>Первый адрес подсети — это адрес самой сети, последний — broadcast (широковещательный). Их нельзя назначить устройству, поэтому из общего числа адресов вычитается 2.</p>' },
        { q: 'Что такое wildcard-маска?', a: '<p>Это инверсия обычной маски (биты переставлены: 0 ↔ 1). Она применяется в списках доступа (ACL) Cisco для указания диапазона адресов.</p>' },
        { q: 'Зачем нужны /31 и /32?', a: '<p>/32 — один конкретный хост (маршрут к адресу). /31 — пара адресов для канала точка-точка (RFC 3021), где broadcast не нужен.</p>' },
      ],
    },
    {
      id: 'color-converter', title: 'Конвертер цвета HEX ⇄ RGB ⇄ HSL', title_en: 'Color Converter',
      desc: 'Перевод цвета между HEX, RGB и HSL.',
      tags: ['цвет', 'color', 'hex', 'rgb', 'hsl', 'конвертер цвета', 'css', 'палитра'],
      inputs: [
        { key: 'hex', label: 'HEX-цвет', default: '#3b7a8c', hint: 'Например: #3b7a8c, fff, #FF0000' },
      ],
      compute(v) {
        let raw = ((document.getElementById('in_hex') || {}).value || '').trim();
        if (!raw) return { note: 'Введите HEX-цвет, например #3b7a8c.' };
        raw = raw.replace(/^#/, '');
        if (raw.length === 3) raw = raw.split('').map(c => c + c).join('');
        if (!/^[0-9a-fA-F]{6}$/.test(raw)) return { error: 'Неверный HEX. Используйте 3 или 6 шестнадцатеричных цифр.' };
        const r = parseInt(raw.slice(0, 2), 16);
        const g = parseInt(raw.slice(2, 4), 16);
        const b = parseInt(raw.slice(4, 6), 16);
        const rn = r / 255, gn = g / 255, bn = b / 255;
        const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
        const l = (max + min) / 2;
        let h = 0, s = 0;
        if (max !== min) {
          const d = max - min;
          s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
          if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0);
          else if (max === gn) h = (bn - rn) / d + 2;
          else h = (rn - gn) / d + 4;
          h /= 6;
        }
        const H = Math.round(h * 360), S = Math.round(s * 100), L = Math.round(l * 100);
        const normHex = '#' + raw.toUpperCase();
        return {
          outputs: [
            { label: 'RGB', text: 'rgb(' + r + ', ' + g + ', ' + b + ')', primary: true },
            { label: 'HEX (нормализованный)', text: normHex },
            { label: 'HSL', text: 'hsl(' + H + ', ' + S + '%, ' + L + '%)' },
          ],
          steps: ['R = ' + r + ', G = ' + g + ', B = ' + b + ' (из пар HEX по основанию 16)', 'Яркость L = (max + min) / 2 от нормированных каналов'],
          note: 'HEX-каналы — это просто RGB в шестнадцатеричной записи: каждая пара цифр = один канал 0–255.',
        };
      },
      explain: '<p>Шесть HEX-цифр — это три канала по два символа: RR, GG, BB (по основанию 16, 0–255). RGB переводится в HSL через нормировку каналов к 0–1 и вычисление тона (Hue), насыщенности (Saturation) и яркости (Lightness).</p>',
      faq: [
        { q: 'В чём разница между RGB и HSL?', a: '<p>RGB задаёт цвет смешением красного, зелёного и синего. HSL описывает цвет интуитивнее: тон (0–360°), насыщенность и светлота. HSL удобнее для подбора оттенков и осветления/затемнения.</p>' },
        { q: 'Можно ли вводить сокращённый HEX?', a: '<p>Да. Трёхзначный <code>#fff</code> раскрывается в <code>#ffffff</code> (каждая цифра дублируется). Решётку <code>#</code> можно опускать.</p>' },
        { q: 'Что значит #FF0000?', a: '<p>Красный канал максимален (FF = 255), зелёный и синий нулевые — это чистый красный <code>rgb(255, 0, 0)</code>.</p>' },
      ],
    },
    {
      id: 'base64', title: 'Base64: кодирование и декодирование', title_en: 'Base64 Encode / Decode',
      desc: 'Перевод текста в Base64 и обратно с поддержкой UTF-8 (кириллица).',
      tags: ['base64', 'кодирование', 'декодирование', 'encode', 'decode', 'btoa', 'atob', 'utf-8'],
      inputs: [
        { key: 'text', label: 'Текст или Base64', default: 'Привет, мир!', hint: 'Введите строку для кодирования или Base64 для декодирования' },
        { key: 'mode', label: 'Направление', options: [{ value: 'enc', label: 'Текст → Base64' }, { value: 'dec', label: 'Base64 → текст' }], default: 'enc' },
      ],
      compute(v) {
        const raw = (document.getElementById('in_text') || {}).value;
        if (raw === undefined || raw === '') return { note: 'Введите текст.' };
        try {
          if (v.mode === 'enc') {
            const out = btoa(unescape(encodeURIComponent(raw)));
            return { outputs: [{ label: 'Base64', text: out, primary: true }], note: 'Длина исходной строки: ' + raw.length + ' символов; результат: ' + out.length + ' символов.' };
          } else {
            const out = decodeURIComponent(escape(atob(raw.trim())));
            return { outputs: [{ label: 'Декодированный текст', text: out, primary: true }], note: 'Декодировано из Base64 с восстановлением UTF-8.' };
          }
        } catch (e) {
          return { error: v.mode === 'dec' ? 'Не удалось декодировать: строка не является корректным Base64.' : 'Не удалось закодировать строку.' };
        }
      },
      explain: '<p>Base64 кодирует 3 байта (24 бита) в 4 печатных символа из алфавита A–Z, a–z, 0–9, + и /. Для UTF-8-безопасности применяется <code>btoa(unescape(encodeURIComponent(s)))</code> при кодировании и обратная цепочка при декодировании — иначе кириллица ломается.</p>',
      faq: [
        { q: 'Зачем нужен Base64?', a: '<p>Чтобы передавать двоичные данные (картинки, файлы) по каналам, рассчитанным на текст: вложения email, data-URI в CSS/HTML, токены в JSON. Это не шифрование — данные легко раскодировать обратно.</p>' },
        { q: 'Почему в конце бывают знаки =?', a: '<p>Это padding (дополнение). Когда длина входа не кратна 3 байтам, результат дополняется одним или двумя <code>=</code> до кратности 4 символам.</p>' },
        { q: 'Base64 защищает данные?', a: '<p>Нет. Это обратимое кодирование, а не шифрование. Любой может декодировать строку. Для защиты нужны шифрование или хеширование.</p>' },
        { q: 'Почему кириллица иногда превращается в мусор?', a: '<p>Наивный <code>btoa</code> работает только с латиницей. Этот калькулятор сначала кодирует строку в UTF-8, поэтому «Привет» декодируется корректно.</p>' },
      ],
    },
    {
      id: 'timestamp', title: 'Unix-timestamp ⇄ дата', title_en: 'Unix Timestamp Converter',
      desc: 'Перевод Unix-времени (секунды) в дату и обратно.',
      tags: ['timestamp', 'unix', 'время', 'дата', 'epoch', 'unixtime', 'utc', 'преобразование времени'],
      inputs: [
        { key: 'mode', label: 'Направление', options: [{ value: 'ts', label: 'Timestamp → дата' }, { value: 'date', label: 'Дата → timestamp' }], default: 'ts' },
        { key: 'value', label: 'Значение', default: '1700000000', hint: 'Timestamp в секундах или дата ГГГГ-ММ-ДД ЧЧ:ММ:СС' },
      ],
      compute(v) {
        const raw = ((document.getElementById('in_value') || {}).value || '').trim();
        if (!raw) return { note: 'Введите значение.' };
        if (v.mode === 'ts') {
          const sec = parseFloat(raw);
          if (Number.isNaN(sec)) return { error: 'Введите число — timestamp в секундах.' };
          const d = new Date(sec * 1000);
          if (Number.isNaN(d.getTime())) return { error: 'Недопустимый timestamp.' };
          return {
            outputs: [
              { label: 'ISO 8601 (UTC)', text: d.toISOString(), primary: true },
              { label: 'Дата и время (UTC)', text: d.toUTCString() },
              { label: 'Локальное время', text: d.toLocaleString('ru-RU') },
              { label: 'Timestamp (мс)', text: String(sec * 1000) },
            ],
            note: 'Unix-время отсчитывается от 00:00:00 UTC 1 января 1970 года.',
          };
        } else {
          const t = Date.parse(raw);
          if (Number.isNaN(t)) return { error: 'Не удалось распознать дату. Формат: 2026-12-31 23:59:59.' };
          return {
            outputs: [
              { label: 'Timestamp (секунды)', text: String(Math.floor(t / 1000)), primary: true },
              { label: 'Timestamp (миллисекунды)', text: String(t) },
              { label: 'ISO 8601 (UTC)', text: new Date(t).toISOString() },
            ],
            note: 'Если зону не указать, дата трактуется в локальном часовом поясе браузера.',
          };
        }
      },
      explain: '<p>Unix-timestamp — число секунд, прошедших с 1 января 1970 года (UTC), без учёта високосных секунд. В JavaScript <code>Date</code> работает в миллисекундах, поэтому секунды умножаются/делятся на 1000.</p>',
      faq: [
        { q: 'Что такое «эпоха Unix»?', a: '<p>Это нулевая точка отсчёта: 00:00:00 UTC 1 января 1970 года. Все timestamp измеряются как число секунд от этого момента.</p>' },
        { q: 'Секунды или миллисекунды?', a: '<p>Классический Unix-timestamp — в секундах (10 цифр для нынешних дат). JavaScript и многие API используют миллисекунды (13 цифр). Калькулятор показывает оба.</p>' },
        { q: 'Что за «проблема 2038 года»?', a: '<p>32-битное знаковое целое переполнится 19 января 2038 года. Современные системы используют 64-битное время и от этого не страдают.</p>' },
        { q: 'Почему время в UTC, а не в моём поясе?', a: '<p>Timestamp абсолютен и не зависит от пояса. Калькулятор показывает и UTC, и локальное время вашего браузера для удобства.</p>' },
      ],
    },
    {
      id: 'data-size', title: 'Конвертер размера данных', title_en: 'Data Size Converter',
      desc: 'Перевод между байтами, битами, КБ, МБ, ГБ, ТБ (двоичная мера).',
      tags: ['размер данных', 'байты', 'биты', 'килобайт', 'мегабайт', 'гигабайт', 'data size', 'bytes', 'bits', 'kb', 'mb', 'gb'],
      inputs: [
        { key: 'value', label: 'Значение', default: 1 },
        { key: 'from', label: 'Единица', options: [{ value: '1', label: 'Байт' }, { value: '0.125', label: 'Бит' }, { value: '1024', label: 'КиБ (КБ)' }, { value: '1048576', label: 'МиБ (МБ)' }, { value: '1073741824', label: 'ГиБ (ГБ)' }, { value: '1099511627776', label: 'ТиБ (ТБ)' }], default: '1048576' },
      ],
      compute(v) {
        if (Number.isNaN(v.value)) return { note: 'Введите значение.' };
        const factor = parseFloat(v.from);
        const bytes = v.value * factor;
        const u = [['Бит', 0.125], ['Байт', 1], ['КиБ (КБ)', 1024], ['МиБ (МБ)', 1048576], ['ГиБ (ГБ)', 1073741824], ['ТиБ (ТБ)', 1099511627776]];
        return {
          outputs: u.map(([n, f]) => ({ label: n, value: bytes / f, digits: 4 })),
          note: '1 КиБ = 1024 байта (двоичная мера). Производители дисков используют десятичные КБ = 1000 байт.',
        };
      },
      explain: '<p>Все единицы приводятся к байтам, затем делятся на множитель нужной единицы. Бит — это 1/8 байта. В двоичной мере каждая ступень больше предыдущей в 1024 раза: 1 КиБ = 1024 Б, 1 МиБ = 1024 КиБ и т. д.</p>',
      faq: [
        { q: 'Чем КиБ отличается от КБ?', a: '<p>КиБ (кибибайт) = 1024 байта — двоичная мера, которую использует операционная система. «КБ» у производителей дисков часто означает 1000 байт (десятичная). Поэтому диск «500 ГБ» в системе показывается меньше.</p>' },
        { q: 'Почему интернет-скорость в мегабитах, а файлы в мегабайтах?', a: '<p>Скорость канала традиционно меряют в битах в секунду (Мбит/с), а размер файлов — в байтах. 1 байт = 8 бит, поэтому 100 Мбит/с дают около 12.5 МБ/с.</p>' },
        { q: 'Сколько байт в гигабайте?', a: '<p>В двоичной мере 1 ГиБ = 1 073 741 824 байта (1024³). В десятичной «маркетинговой» 1 ГБ = 1 000 000 000 байт.</p>' },
      ],
    },
    {
      id: 'password-entropy', title: 'Энтропия и надёжность пароля', title_en: 'Password Entropy',
      desc: 'Оценка энтропии пароля в битах и времени полного перебора.',
      tags: ['пароль', 'энтропия', 'надёжность', 'password', 'entropy', 'brute force', 'безопасность', 'security'],
      inputs: [
        { key: 'password', label: 'Пароль', default: 'P@ssw0rd!', hint: 'Анализируется только в браузере, никуда не уходит' },
      ],
      compute(v) {
        const pw = (document.getElementById('in_password') || {}).value;
        if (pw === undefined || pw === '') return { note: 'Введите пароль.' };
        let charset = 0;
        if (/[a-z]/.test(pw)) charset += 26;
        if (/[A-Z]/.test(pw)) charset += 26;
        if (/[0-9]/.test(pw)) charset += 10;
        if (/[^a-zA-Z0-9]/.test(pw)) charset += 33;
        const len = pw.length;
        const entropy = len * Math.log2(charset);
        let grade;
        if (entropy < 40) grade = 'слабый';
        else if (entropy < 60) grade = 'средний';
        else if (entropy < 80) grade = 'сильный';
        else grade = 'очень сильный';
        // Время полного перебора: combos / скорость. combos = charset^len.
        // Считаем 2^entropy, чтобы не упереться в Infinity для огромных charset^len.
        const guessesPerSec = 1e10;
        const log10combos = entropy * Math.log10(2);
        const log10sec = log10combos - Math.log10(guessesPerSec);
        let timeText;
        if (log10sec > 14) {
          const log10years = log10sec - Math.log10(31557600);
          timeText = log10years > 12 ? 'миллиарды лет (нереально)' : humanTime(Math.pow(10, log10sec));
        } else {
          timeText = humanTime(Math.pow(10, log10sec));
        }
        return {
          outputs: [
            { label: 'Энтропия', value: entropy, digits: 1, unit: 'бит', primary: true },
            { label: 'Размер алфавита', text: String(charset) + ' символов' },
            { label: 'Длина пароля', text: String(len) + ' символов' },
            { label: 'Оценка', text: grade },
            { label: 'Время полного перебора (≈10¹⁰ догадок/с)', text: timeText },
          ],
          formula: 'Энтропия = длина × log₂(размер алфавита)',
          note: 'Пароль обрабатывается только в вашем браузере и никуда не отправляется.',
        };
      },
      explain: '<p>Энтропия пароля = <code>длина × log₂(размер алфавита)</code>, измеряется в битах. Размер алфавита растёт от используемых наборов: строчные (+26), прописные (+26), цифры (+10), символы (+33). Каждый бит удваивает число вариантов перебора.</p>',
      faq: [
        { q: 'Что значит «энтропия 60 бит»?', a: '<p>Это значит, что для угадывания нужно перебрать до 2⁶⁰ ≈ 1.15·10¹⁸ вариантов. Чем больше бит, тем экспоненциально дольше перебор.</p>' },
        { q: 'Длина или сложность важнее?', a: '<p>Длина. Добавление символа умножает число вариантов на размер алфавита, тогда как смена одного типа символов даёт лишь разовый прирост. Длинная фраза часто надёжнее короткого «P@ssw0rd!».</p>' },
        { q: 'Учитывает ли расчёт словарные атаки?', a: '<p>Нет. Формула предполагает случайный пароль. Реальный «Password123» взламывается мгновенно по словарю, хотя по формуле энтропия кажется приемлемой. Не используйте слова и шаблоны.</p>' },
        { q: 'Пароль точно никуда не уходит?', a: '<p>Да. Весь расчёт выполняется в JavaScript прямо в вашем браузере; ни одна строка не отправляется на сервер.</p>' },
      ],
    },
  ]);
})();
