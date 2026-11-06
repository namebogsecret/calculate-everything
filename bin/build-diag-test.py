#!/usr/bin/env python3
"""Генератор страницы /physics-test/ + идемпотентная запись в sitemap.xml и llms.txt.

Запускать ПОСЛЕ bin/build-pages.py: тот перезаписывает sitemap.xml и llms.txt целиком
и стирает нашу запись. Скрипт сам ничего не ломает при повторном запуске (проверка по URL).
Служебные куски (счётчик GoatCounter, клик-трекинг на tutor, session-replay, футер сети)
берутся из готового cat/physics.html, чтобы не расходиться с шаблоном генератора.

  python3 bin/build-diag-test.py
"""
import html
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = "https://calculators.podlevskikh.com"
URL = BASE + "/physics-test/"
TITLE = "Уровень по физике за 5 минут — тест онлайн · Calculate Everything"
H1 = "Уровень по физике за 5 минут"
DESC = "Бесплатный мини-тест по физике: 10 вопросов по механике, электричеству, оптике, термодинамике и колебаниям. Уровень, результат по темам и разбор ошибок. База ЕГЭ, IGCSE и IB."
OG_TITLE = "Тест: ваш уровень по физике за 5 минут"
LLMS_LINE = f"- [Уровень по физике за 5 минут (тест)]({URL}): 10 вопросов по механике, электричеству, оптике, термодинамике и колебаниям — уровень, результат по темам и разбор ошибок."


def read(p):
    with open(os.path.join(ROOT, p), encoding="utf-8") as f:
        return f.read()


def write(p, s):
    with open(os.path.join(ROOT, p), "w", encoding="utf-8") as f:
        f.write(s)


def slice_between(src, start, end, include_end=False):
    i = src.index(start)
    j = src.index(end, i) + (len(end) if include_end else 0)
    return src[i:j]


def build_page():
    tpl = read("cat/physics.html")
    # сообщение об ошибках + viewport/favicons: от <script>window.__fbConfig до <title>
    head_top = slice_between(tpl, '  <script>window.__fbConfig', '  <title>')
    analytics = slice_between(tpl, '  <script>/* analytics', '</script>\n', True)
    click = slice_between(tpl, '  <script>document.addEventListener("click"', '</script>\n', True)
    assert "tutor\\.podlevskikh\\.com" in click and "cta-" in click, "в шаблоне нет клик-трекинга tutor"
    tail = tpl[tpl.index('<div class="net-band"'):]

    ld = {
        "@context": "https://schema.org",
        "@graph": [
            {"@type": "WebPage", "name": H1, "url": URL, "inLanguage": "ru", "description": DESC,
             "isPartOf": {"@type": "WebSite", "name": "Calculate Everything", "url": BASE + "/"}},
            {"@type": "Quiz", "name": H1, "url": URL, "inLanguage": "ru", "description": DESC,
             "about": {"@type": "Thing", "name": "Физика"},
             "educationalLevel": "База ЕГЭ, IGCSE, IB Physics",
             "timeRequired": "PT5M", "isAccessibleForFree": True,
             "educationalUse": "Самопроверка", "learningResourceType": "Диагностический тест"},
            {"@type": "BreadcrumbList", "itemListElement": [
                {"@type": "ListItem", "position": 1, "name": "Калькуляторы", "item": BASE + "/"},
                {"@type": "ListItem", "position": 2, "name": "Физика", "item": BASE + "/cat/physics.html"},
                {"@type": "ListItem", "position": 3, "name": H1, "item": URL}]},
        ],
    }
    e = html.escape
    css = """<style>
.pt-intro p,.pt-res p{max-width:68ch}
.pt-step{margin:0 0 8px;color:var(--faint);font-size:14px}
.pt-bar{height:6px;border-radius:6px;background:var(--bg-2);border:1px solid var(--line);overflow:hidden;margin:0 0 18px}
.pt-bar span{display:block;height:100%;background:var(--accent)}
.pt-text{font-size:20px;line-height:1.4;margin:0 0 16px;overflow-wrap:anywhere}
.pt-opts{display:flex;flex-direction:column;gap:10px}
.pt-opt{text-align:left;font:inherit;padding:13px 16px;border-radius:12px;border:1px solid var(--line);background:var(--card);color:var(--txt);cursor:pointer;overflow-wrap:anywhere}
.pt-opt:hover,.pt-opt:focus-visible{border-color:var(--accent)}
.pt-start{margin-top:6px;font:inherit;cursor:pointer;padding:12px 22px}
.pt-level{font-size:28px;margin:0 0 4px;color:var(--accent-2)}
.pt-score{font-size:18px;font-weight:700;margin:0 0 10px}
.pt-note{color:var(--muted);font-size:14px}
.pt-sec{margin:30px 0 0}
.pt-sec h2{font-size:20px;margin:0 0 12px}
.pt-topics{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:10px}
.pt-topics li{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr) auto;gap:10px;align-items:center}
.pt-tname{overflow-wrap:anywhere}
.pt-tbar{height:8px;border-radius:8px;background:var(--bg-2);border:1px solid var(--line);overflow:hidden}
.pt-tbar span{display:block;height:100%;background:var(--accent)}
.pt-topics .weak .pt-tbar span{background:var(--err)}
.pt-tval{font-size:13px;color:var(--muted);text-align:right}
.pt-mistake{background:var(--card);border:1px solid var(--line);border-radius:var(--radius);padding:14px 16px;margin:0 0 12px}
.pt-mistake h3{font-size:16px;margin:0 0 8px;overflow-wrap:anywhere}
.pt-mistake p{margin:0 0 6px;overflow-wrap:anywhere}
.pt-given{color:var(--err)}
.pt-right{font-weight:700}
.pt-why{color:var(--muted);font-size:15px}
.pt-cta{margin-top:34px}
.pt-cta .tutor-cta-btn{white-space:normal;text-align:center}
.pt-creds{margin-top:8px!important;font-size:14px!important}
.pt-again{margin-top:18px;font:inherit;cursor:pointer;padding:10px 18px}
@media (max-width:560px){.pt-cta .tutor-cta-inner{padding:18px 16px}.pt-topics li{grid-template-columns:1fr auto}.pt-tbar{grid-column:1/-1;order:3}.pt-text{font-size:18px}}
</style>
"""
    page = f"""<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
{head_top}  <title>{e(TITLE)}</title>
  <meta name="description" content="{e(DESC)}">
  <link rel="canonical" href="{URL}">
  <meta property="og:type" content="website">
  <meta property="og:title" content="{e(OG_TITLE)}">
  <meta property="og:description" content="{e(DESC)}">
  <meta property="og:url" content="{URL}">
  <link rel="stylesheet" href="/css/style.css">
  <script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script>
{analytics}{click}{css}</head>
<body>
  <div class="topbar"><div class="topbar-inner">
      <a class="logo" href="/">Calculate <em>Everything</em></a>
      <span class="sub">калькуляторы на все случаи жизни</span>
    </div></div>
  <main id="app">
    <nav class="crumbs"><a href="/cat/physics.html">← Физика</a></nav>
    <header class="calc-head"><h1>⚛️ {H1}</h1>
      <p class="desc">Десять вопросов разной сложности: механика, электричество, оптика, термодинамика, колебания. В конце — ваш уровень, результат по темам и разбор каждой ошибки. Без регистрации, прямо в браузере.</p></header>
    <section id="pt-app" aria-live="polite"><noscript><p>Для теста нужен включённый JavaScript.</p></noscript></section>
  </main>
  <div class="footer"><div class="footer-inner">
      Calculate Everything · формула + пошаговое решение к каждому расчёту.
      Физику и математику ведёт <a href="https://t.me/VladimirPodlevskikh" target="_blank" rel="noopener">Владимир</a> (МГУ, IB/AP/SAT), занятия онлайн.
    </div></div>
  <script src="/js/physics-test.js"></script>
  <script src="/js/physics-test-ui.js"></script>
{tail}"""
    os.makedirs(os.path.join(ROOT, "physics-test"), exist_ok=True)
    write("physics-test/index.html", page)


def patch_sitemap():
    s = read("sitemap.xml")
    if URL in s:
        return False
    entry = f"  <url><loc>{URL}</loc><changefreq>monthly</changefreq><priority>0.8</priority></url>\n"
    s = s.replace("</urlset>", entry + "</urlset>")
    write("sitemap.xml", s)
    return True


def patch_llms():
    s = read("llms.txt")
    if URL in s:
        return False
    marker = "\n## [Математика]"
    assert marker in s, "в llms.txt нет раздела Математика"
    s = s.replace(marker, LLMS_LINE + "\n" + marker, 1)
    write("llms.txt", s)
    return True


if __name__ == "__main__":
    build_page()
    print("page: physics-test/index.html; sitemap added:", patch_sitemap(), "; llms added:", patch_llms())
