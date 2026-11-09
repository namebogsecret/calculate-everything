#!/usr/bin/env python3
"""Playwright-смоук страницы /physics-test/: статический http.server на свободном порту,
внешние запросы (GoatCounter и пр.) мокаются — наружу тест не ходит.
Запуск: ~/.venv/playwright/bin/python tests/smoke_physics_test.py
"""
import functools
import http.server
import os
import sys
import threading
from urllib.parse import urlparse, parse_qs

from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FAILS = []


def check(cond, msg):
    print(("PASS " if cond else "FAIL ") + msg)
    if not cond:
        FAILS.append(msg)


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


def serve():
    handler = functools.partial(Quiet, directory=ROOT)
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv


def run(browser, base, width, outbound):
    ctx = browser.new_context(viewport={"width": width, "height": 800})

    def handler(route):
        u = urlparse(route.request.url)
        if u.hostname in ("127.0.0.1", "localhost"):
            return route.continue_()
        outbound.append(route.request.url)
        ct = "application/javascript" if u.path.endswith(".js") else "text/plain"
        route.fulfill(status=200, content_type=ct, body="")

    ctx.route("**/*", handler)
    page = ctx.new_page()
    errors = []
    page.on("pageerror", lambda e: errors.append("pageerror: %s" % e))
    page.on("console", lambda m: errors.append("console.error: %s" % m.text) if m.type == "error" else None)
    return ctx, page, errors


def main():
    srv = serve()
    base = "http://127.0.0.1:%d" % srv.server_address[1]
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch()

            # --- 1. полный проход на десктопе: все варианты по очереди ---
            outbound = []
            ctx, page, errors = run(browser, base, 1000, outbound)
            page.goto(base + "/physics-test/index.html", wait_until="load")
            check("Уровень по физике" in page.title(), "title содержит название теста")
            page.click("#pt-start")
            n = 0
            while page.locator(".pt-opt").count():
                page.locator(".pt-opt").nth(n % 3).click()
                n += 1
                if n > 30:
                    break
            check(n == 10, "пройдено 10 вопросов (получилось %d)" % n)
            page.wait_for_selector("#pt-level")
            lvl = page.get_attribute("#pt-level", "data-level")
            check(lvl in ("start", "base", "confident", "advanced"), "показан уровень: %s" % lvl)
            check(page.locator(".pt-topics li").count() == 7, "результат по 7 темам")
            check(page.locator(".pt-mistake").count() >= 1, "есть разбор ошибок")
            check(page.locator(".pt-calcs a.card").count() in (1, 2), "1-2 ссылки на калькуляторы")
            for href in page.locator(".pt-calcs a.card").evaluate_all("els => els.map(e => e.getAttribute('href'))"):
                check(os.path.exists(ROOT + href), "калькулятор существует: %s" % href)
            href = page.get_attribute("#pt-tutor", "href")
            check(href.startswith("https://tutor.podlevskikh.com/") and "utm_source=calculators" in href
                  and "utm_medium=physics-test" in href and "utm_campaign=diag-level-%s" % lvl in href,
                  "ссылка на репетитора с utm_*: %s" % href)
            check(page.locator(".pt-cta .tutor-cta-text p").first.inner_text().startswith("По вашим слабым темам"),
                  "блок-шаг упоминает слабые темы")
            body = page.inner_text("body").lower()
            for bad in ("кипр", "лимасс", "cyprus", "limassol", "whatsapp", "без обязательств", "20+"):
                check(bad not in body, "на странице нет «%s»" % bad)
            page.wait_for_timeout(300)
            check(any("physics-test-done" in u for u in outbound), "событие прохождения /physics-test-done отправлено")

            # клик по кнопке → запрос в GoatCounter с cta-to-tutor
            outbound.clear()
            with ctx.expect_page() as newp:
                page.click("#pt-tutor")
            newp.value.close()
            page.wait_for_timeout(300)
            cta = [u for u in outbound if "stats.podlevskikh.com/count" in u and "cta-to-tutor" in parse_qs(urlparse(u).query).get("p", [""])[0]]
            check(len(cta) >= 1, "клик по tutor → stats.podlevskikh.com/count?p=…/cta-to-tutor")
            own = [u for u in outbound if "stats.podlevskikh.com/count" in u and parse_qs(urlparse(u).query).get("p", [""])[0] == "127.0.0.1:%d/cta-to-tutor-physics-test" % int(base.rsplit(":", 1)[1])]
            check(len(own) == 1 and "e=true" in own[0], "клик по #pt-tutor → отдельный beacon /cta-to-tutor-physics-test (e=true)")
            check(not errors, "0 JS-ошибок в консоли (десктоп): %s" % errors)
            check(page.evaluate("document.documentElement.scrollWidth <= document.documentElement.clientWidth"), "нет горизонтального скролла (1000px, итог)")
            ctx.close()

            # --- 2. все ответы верные → продвинутый, без слабых тем ---
            outbound = []
            ctx, page, errors = run(browser, base, 1000, outbound)
            page.goto(base + "/physics-test/index.html", wait_until="load")
            correct = page.evaluate("window.CE_PHYS_TEST.QUESTIONS.map(q => q.correct)")
            page.click("#pt-start")
            for c in correct:
                page.locator(".pt-opt").nth(c).click()
            page.wait_for_selector("#pt-level")
            check(page.get_attribute("#pt-level", "data-level") == "advanced", "все верные → advanced")
            check(page.locator(".pt-mistake").count() == 0, "при всех верных нет разбора ошибок")
            check("utm_campaign=diag-level-advanced" in page.get_attribute("#pt-tutor", "href"), "utm_campaign=diag-level-advanced")
            check(not errors, "0 JS-ошибок (все верные): %s" % errors)
            ctx.close()

            # --- 3. 320px: без горизонтального скролла на вопросе и на итоге ---
            outbound = []
            ctx, page, errors = run(browser, base, 320, outbound)
            page.goto(base + "/physics-test/index.html", wait_until="load")
            noscroll = "document.documentElement.scrollWidth <= document.documentElement.clientWidth"
            check(page.evaluate(noscroll), "320px: нет скролла на стартовом экране")
            page.click("#pt-start")
            for i in range(10):
                check(page.evaluate(noscroll), "320px: нет скролла на вопросе %d" % (i + 1))
                page.locator(".pt-opt").nth(0).click()
            page.wait_for_selector("#pt-level")
            check(page.evaluate(noscroll), "320px: нет скролла на итоге")
            btn = page.locator("#pt-tutor").bounding_box()
            check(btn is not None and btn["x"] >= 0 and btn["x"] + btn["width"] <= 320, "320px: кнопка репетитора в пределах экрана")
            check(not errors, "0 JS-ошибок (320px): %s" % errors)
            ctx.close()

            # --- 3b. двойной клик по варианту не пропускает следующий вопрос ---
            ctx, page, errors = run(browser, base, 1000, [])
            page.goto(base + "/physics-test/index.html", wait_until="load")
            page.click("#pt-start")
            page.locator(".pt-opt").nth(0).dblclick()
            page.wait_for_timeout(200)
            check("Вопрос 2 из 10" in page.inner_text(".pt-step"), "dblclick: после двойного клика показан вопрос 2, а не 3")
            page.locator(".pt-opt").nth(0).dblclick()
            page.wait_for_timeout(200)
            check("Вопрос 3 из 10" in page.inner_text(".pt-step"), "dblclick: второй двойной клик → вопрос 3")
            check(not errors, "0 JS-ошибок (dblclick): %s" % errors)
            ctx.close()

            # --- 4. «Пройти ещё раз» ---
            ctx, page, errors = run(browser, base, 1000, [])
            page.goto(base + "/physics-test/index.html", wait_until="load")
            page.click("#pt-start")
            for _ in range(10):
                page.locator(".pt-opt").nth(0).click()
            page.click("#pt-again")
            check(page.locator("#pt-start").count() == 1, "«Пройти ещё раз» возвращает на старт")
            ctx.close()
            browser.close()
    finally:
        srv.shutdown()
        srv.server_close()
    print("\nsmoke: %d fail" % len(FAILS))
    return 1 if FAILS else 0


if __name__ == "__main__":
    sys.exit(main())
