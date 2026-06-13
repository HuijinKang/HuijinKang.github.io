// games.app.js — games.js를 읽어 좌측 상세 패널 + 우측 타이틀 리스트를 렌더한다.
// 데이터(games.js)는 절대 건드리지 않는다. 빌드 스텝 없음(바닐라 JS).
(function () {
  "use strict";

  // 안전한 기본값 (games.js 누락/오타 방어)
  var GAMES = Array.isArray(typeof games !== "undefined" ? games : null) ? games : [];
  var selected = 0;
  var autoTimer = null;  // 스크린샷 자동 넘김 타이머 (게임 전환/재렌더 시 정리)

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function pad2(n) { return (n < 10 ? "0" : "") + n; }

  // ---------- 우측: 타이틀 리스트 ----------
  function renderList() {
    var list = document.getElementById("game-list");
    if (!list) return;
    list.innerHTML = "";

    if (GAMES.length === 0) {
      list.appendChild(el("li", "menu__empty", "NO GAMES FOUND"));
      return;
    }

    GAMES.forEach(function (g, i) {
      var li = el("li", "menu__item");
      var btn = el("button", "menu__btn");
      btn.type = "button";
      btn.setAttribute("data-index", i);

      btn.appendChild(el("span", "menu__arrow", "▶")); // ▶
      btn.appendChild(el("span", "menu__num", pad2(i + 1)));

      // 제목 왼쪽 작은 로고 (없으면 빈 슬롯으로 정렬만 맞춤)
      var logoSlot = el("span", "menu__logo");
      if (g && g.logo) {
        var lg = document.createElement("img");
        lg.src = g.logo; lg.alt = ""; lg.loading = "lazy";
        logoSlot.appendChild(lg);
      }
      btn.appendChild(logoSlot);

      btn.appendChild(el("span", "menu__name", g && g.title ? g.title : "UNTITLED"));

      btn.addEventListener("click", function () { select(i); });
      // 호버해도 미리보기되도록(아케이드 셀렉트 느낌). 키보드와 자연스럽게 공존.
      btn.addEventListener("mouseenter", function () { select(i); });

      li.appendChild(btn);
      list.appendChild(li);
    });
    syncSelection();
  }

  // 대표 화면 빌더: cover(있으면 첫 장) + screenshots 를 한 캐러셀로 묶는다.
  // 1장이면 정적, 2장 이상이면 ◀ ▶ 버튼 + 도트 인디케이터가 자동 생성된다.
  function buildScreen(g) {
    if (autoTimer) { clearInterval(autoTimer); autoTimer = null; } // 이전 타이머 정리
    var reduce = window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    var screen = el("div", "screen");

    if (g.status === "coming-soon") {
      screen.className += " screen--coming";
      screen.appendChild(el("span", "screen__text", "COMING SOON"));
      return screen;
    }

    var imgs = [];
    if (g.cover) imgs.push(g.cover);
    if (Array.isArray(g.screenshots)) {
      imgs = imgs.concat(g.screenshots.filter(Boolean));
    }

    if (imgs.length === 0) {
      screen.className += " screen--empty";
      screen.appendChild(el("span", "screen__text", "NO SIGNAL"));
      return screen;
    }

    var idx = 0;
    var img = el("img", "screen__img");
    img.alt = (g.title || "Game") + " screenshot";
    img.loading = "lazy";
    img.src = imgs[0];
    screen.appendChild(img);

    if (imgs.length > 1) {
      var dotEls = [];

      function go(i) {
        idx = (i + imgs.length) % imgs.length; // wrap (좌우 순환)
        img.src = imgs[idx];
        for (var k = 0; k < dotEls.length; k++) {
          dotEls[k].classList.toggle("is-on", k === idx);
        }
        counter.textContent = (idx + 1) + " / " + imgs.length;
      }

      // 3초마다 자동 넘김. 수동 조작 시 타이머를 리셋해 곧바로 튀지 않게 한다.
      function startAuto() {
        if (autoTimer) { clearInterval(autoTimer); autoTimer = null; }
        if (reduce) return; // 모션 줄이기 설정이면 자동 넘김 안 함
        autoTimer = setInterval(function () { go(idx + 1); }, 3000);
      }
      function stopAuto() {
        if (autoTimer) { clearInterval(autoTimer); autoTimer = null; }
      }

      var prev = navBtn("◀", "screen__nav screen__nav--prev", "Previous screenshot");
      var next = navBtn("▶", "screen__nav screen__nav--next", "Next screenshot");
      prev.addEventListener("click", function (e) { e.preventDefault(); go(idx - 1); startAuto(); });
      next.addEventListener("click", function (e) { e.preventDefault(); go(idx + 1); startAuto(); });

      var counter = el("span", "screen__counter", "1 / " + imgs.length);

      var dots = el("div", "screen__dots");
      imgs.forEach(function (_, i) {
        var d = el("span", "screen__dot" + (i === 0 ? " is-on" : ""));
        d.addEventListener("click", function () { go(i); startAuto(); });
        dots.appendChild(d);
        dotEls.push(d);
      });

      // 화면에 마우스를 올리면 일시정지, 벗어나면 재개
      screen.addEventListener("mouseenter", stopAuto);
      screen.addEventListener("mouseleave", startAuto);

      screen.appendChild(prev);
      screen.appendChild(next);
      screen.appendChild(counter);
      screen.appendChild(dots);

      startAuto(); // 최초 자동 넘김 시작
    }

    return screen;
  }

  function navBtn(label, cls, aria) {
    var b = el("button", cls, label);
    b.type = "button";
    b.setAttribute("aria-label", aria);
    return b;
  }

  // ---------- 좌측: 상세 패널 ----------
  function renderDetail(i) {
    var panel = document.getElementById("detail");
    if (!panel) return;
    panel.innerHTML = "";

    var g = GAMES[i];
    if (!g) {
      var blank = el("div", "screen screen--empty");
      blank.appendChild(el("span", "screen__text", "NO SIGNAL"));
      panel.appendChild(blank);
      return;
    }

    var isComing = g.status === "coming-soon";

    // 대표 화면(CRT) — 스크린샷 여러 장이면 ◀ ▶ 캐러셀
    panel.appendChild(buildScreen(g));

    // 제목
    panel.appendChild(el("h2", "detail__title", g.title || "UNTITLED"));

    // 메타: 장르 · 연도 · 플랫폼
    var meta = el("div", "detail__meta");
    if (g.genre) meta.appendChild(el("span", "tag", g.genre));
    if (g.platform) meta.appendChild(el("span", "tag tag--dim", g.platform));
    if (g.dev) meta.appendChild(el("span", "tag tag--wip", "● IN DEVELOPMENT"));
    if (meta.children.length) panel.appendChild(meta);

    // 설명
    if (g.description) panel.appendChild(el("p", "detail__desc", g.description));

    // PLAY 버튼 (스토어/웹 링크가 있고, 출시작일 때만)
    if (g.url && !isComing) {
      var play = el("a", "play-btn", "▶ PLAY");
      play.href = g.url;
      play.target = "_blank";
      play.rel = "noopener";
      panel.appendChild(play);
    }
  }

  // ---------- 선택 상태 ----------
  function select(i) {
    if (GAMES.length === 0) return;
    if (i < 0) i = GAMES.length - 1;            // 위로 넘치면 마지막으로 wrap
    if (i >= GAMES.length) i = 0;               // 아래로 넘치면 처음으로 wrap
    if (i === selected) { renderDetail(i); return; }
    selected = i;
    syncSelection();
    renderDetail(i);
  }

  function syncSelection() {
    var btns = document.querySelectorAll(".menu__btn");
    for (var k = 0; k < btns.length; k++) {
      var on = Number(btns[k].getAttribute("data-index")) === selected;
      btns[k].classList.toggle("is-selected", on);
      btns[k].setAttribute("aria-current", on ? "true" : "false");
    }
  }

  function scrollToSelected() {
    var btn = document.querySelector('.menu__btn[data-index="' + selected + '"]');
    if (btn && btn.scrollIntoView) btn.scrollIntoView({ block: "nearest" });
  }

  // ---------- 키보드 내비게이션 (고전 게임 메뉴 느낌) ----------
  function onKey(e) {
    if (GAMES.length === 0) return;
    if (e.key === "ArrowDown" || e.key === "j") {
      e.preventDefault(); select(selected + 1); scrollToSelected();
    } else if (e.key === "ArrowUp" || e.key === "k") {
      e.preventDefault(); select(selected - 1); scrollToSelected();
    } else if (e.key === "Enter") {
      var g = GAMES[selected];
      if (g && g.url && g.status !== "coming-soon") {
        window.open(g.url, "_blank", "noopener");
      }
    }
  }

  // ---------- 부트스트랩 ----------
  function init() {
    renderList();
    renderDetail(selected);
    document.addEventListener("keydown", onKey);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
