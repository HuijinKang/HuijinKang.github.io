// app.js — data.js를 읽어 DOM 렌더링 + 총합 계산 + 테마 토글.
// 데이터(data.js)는 절대 건드리지 않는다.
(function () {
  "use strict";

  // 안전한 기본값 (data.js 누락/오타 방어)
  var P = (typeof profile === "object" && profile) ? profile : {};
  var APPS = Array.isArray(typeof apps !== "undefined" ? apps : null) ? apps : [];
  var CURRENCY = P.currency || "USD";

  var SVG_NS = "http://www.w3.org/2000/svg";

  // 알려진 SNS 아이콘 (라벨 소문자 기준). 외부 라이브러리 없이 인라인 SVG path.
  var SOCIAL_ICONS = {
    github: "M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"
  };

  // 위치 핀 아이콘
  var PIN_ICON = "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z";

  function svgEl(tag, attrs) {
    var n = document.createElementNS(SVG_NS, tag);
    if (attrs) for (var k in attrs) if (attrs.hasOwnProperty(k)) n.setAttribute(k, attrs[k]);
    return n;
  }

  function svgIcon(path, size) {
    var s = String(size || 20);
    var svg = svgEl("svg", { viewBox: "0 0 24 24", width: s, height: s,
      "aria-hidden": "true", focusable: "false" });
    svg.appendChild(svgEl("path", { d: path, fill: "currentColor" }));
    return svg;
  }

  // ---------- 유틸 ----------
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  // 통화 포맷: 0~999 그대로, 1000+ 는 $1.2k 축약
  function formatMrr(value) {
    var v = Number(value);
    if (!isFinite(v) || v < 0) v = 0; // 음수/undefined 방어
    var symbol = currencySymbol(CURRENCY);
    if (v >= 1000) {
      var k = v / 1000;
      // 정수면 소수 제거 (1.0k → 1k)
      var str = (k % 1 === 0) ? k.toFixed(0) : k.toFixed(1);
      return symbol + str + "k";
    }
    return symbol + v.toLocaleString("en-US");
  }

  function currencySymbol(code) {
    try {
      var parts = new Intl.NumberFormat("en-US", {
        style: "currency", currency: code, maximumFractionDigits: 0
      }).formatToParts(0);
      for (var i = 0; i < parts.length; i++) {
        if (parts[i].type === "currency") return parts[i].value;
      }
    } catch (e) {}
    return "$";
  }

  // ---------- 헤더 ----------
  function renderHeader() {
    var info = document.getElementById("profile-info");
    if (!info) return;
    info.innerHTML = "";

    var total = APPS.reduce(function (sum, a) {
      var m = Number(a && a.mrr);
      return sum + (isFinite(m) && m > 0 ? m : 0);
    }, 0);
    var totalDl = APPS.reduce(function (sum, a) {
      var d = Number(a && a.downloads);
      return sum + (isFinite(d) && d > 0 ? d : 0);
    }, 0);

    // 히어로: 총 월수익 — 로봇 바로 아래, 카운트업으로 강조
    var hero = el("div", "mrr-hero");
    var heroValue = el("div", "mrr-hero__value readout", formatMrr(0) + "/mo");
    hero.appendChild(heroValue);

    var labelText = "total monthly revenue";
    if (P.showDownloads && totalDl > 0) {
      labelText += " · " + totalDl.toLocaleString("en-US") + "+ downloads";
    }
    hero.appendChild(el("div", "mrr-hero__label", labelText));
    info.appendChild(hero);

    // 이름
    info.appendChild(el("h1", "header__name", P.name || "Untitled"));

    // 위치 (핀 아이콘 + 텍스트, 장식 없이)
    if (P.location) {
      var loc = el("p", "header__location");
      loc.appendChild(svgIcon(PIN_ICON, 12));
      loc.appendChild(document.createTextNode(P.location));
      info.appendChild(loc);
    }

    // 태그라인
    if (P.tagline) {
      info.appendChild(el("p", "header__tagline", P.tagline));
    }

    // SNS
    var socials = buildSocials();
    if (socials) info.appendChild(socials);

    countUp(heroValue, total);
  }

  // 0 → target 카운트업 (easeOutCubic). 모션 줄이기 설정이면 즉시 표시.
  function countUp(node, target) {
    var reduce = window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !(target > 0)) {
      node.textContent = formatMrr(target) + "/mo";
      return;
    }
    var duration = 1400;
    var start = null;
    function tick(ts) {
      if (start === null) start = ts;
      var p = Math.min((ts - start) / duration, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      node.textContent = formatMrr(Math.round(target * eased)) + "/mo";
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function buildSocials() {
    if (!Array.isArray(P.socials) || P.socials.length === 0) return null;
    var ul = el("ul", "socials");
    P.socials.forEach(function (s) {
      if (!s || !s.url) return;
      var li = el("li");
      var a = el("a");
      a.href = s.url;
      a.target = "_blank";
      a.rel = "noopener";

      var key = String(s.label || "").toLowerCase();
      if (SOCIAL_ICONS[key]) {
        // 아이콘이 있으면 로고 버튼으로 렌더링
        a.className = "social-icon";
        a.setAttribute("aria-label", s.label);
        a.title = s.label;
        a.appendChild(svgIcon(SOCIAL_ICONS[key]));
      } else {
        a.textContent = s.label || s.url;
      }

      li.appendChild(a);
      ul.appendChild(li);
    });
    return ul.children.length ? ul : null;
  }

  // ---------- 앱 카드 ----------
  function renderApps() {
    var list = document.getElementById("app-list");
    if (!list) return;
    list.innerHTML = "";
    chartSpecs = []; // 카드 다시 그릴 때 차트 스펙 초기화

    if (APPS.length === 0) {
      var empty = el("li");
      empty.appendChild(el("div", "empty", "More apps coming soon."));
      list.appendChild(empty);
      return;
    }

    APPS.forEach(function (app) {
      if (!app) return;
      list.appendChild(buildCard(app));
    });

    // 카드가 DOM에 붙은 뒤 차트 생성(반응형 사이즈 계산을 위해)
    renderCharts();
  }

  function buildCard(app) {
    var li = el("li");
    var card = el("a", "card");
    if (app.status === "discontinued") card.className += " card--discontinued";
    if (app.url) {
      card.href = app.url;
      card.target = "_blank";
      card.rel = "noopener";
    } else {
      card.href = "#";
    }
    card.setAttribute("aria-label", (app.name || "App") + " — opens in a new tab");

    // 상단 행: 로고 · 본문 · 수익 배지
    var main = el("div", "card__main");

    // 로고
    if (app.logo) {
      var logo = el("img", "card__logo");
      logo.src = app.logo;
      logo.alt = (app.name || "App") + " logo";
      logo.loading = "lazy";
      main.appendChild(logo);
    }

    // 본문
    var body = el("div", "card__body");

    var titleRow = el("div", "card__title-row");
    titleRow.appendChild(el("h2", "card__name", app.name || "Untitled"));
    if (app.category) {
      titleRow.appendChild(el("span", "pill", app.category));
    }
    body.appendChild(titleRow);

    if (app.description) {
      body.appendChild(el("p", "card__desc", app.description));
    }

    body.appendChild(buildStatus(app));
    main.appendChild(body);

    // 수익 배지
    var mrrWrap = el("div", "card__mrr");
    mrrWrap.appendChild(el("span", "card__mrr-value", formatMrr(app.mrr) + "/mo"));
    main.appendChild(mrrWrap);

    card.appendChild(main);

    // 월별 수익 그래프
    var chart = buildChart(app.revenue);
    if (chart) card.appendChild(chart);

    li.appendChild(card);
    return li;
  }

  // "2026-06" → "Jun" 라벨
  function monthLabel(m) {
    var names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                 "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    var parts = String(m).split("-");
    var idx = parseInt(parts[1], 10) - 1;
    return (idx >= 0 && idx < 12) ? names[idx] : String(m);
  }

  // ---------- 월별 수익 차트 (Chart.js) ----------
  // 차트 스펙을 모아뒀다가 DOM에 붙은 뒤 한 번에 인스턴스를 생성한다.
  // 테마 토글 시에는 destroy 후 현재 CSS 변수 색으로 다시 그린다.
  var chartSpecs = [];
  var chartInstances = [];

  // "#2F7D43" + alpha → "rgba(...)"
  function hexToRgba(hex, alpha) {
    var h = String(hex).trim().replace("#", "");
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var r = parseInt(h.substring(0, 2), 16);
    var g = parseInt(h.substring(2, 4), 16);
    var b = parseInt(h.substring(4, 6), 16);
    if (!isFinite(r) || !isFinite(g) || !isFinite(b)) return hex;
    return "rgba(" + r + "," + g + "," + b + "," + alpha + ")";
  }

  // 캔버스를 만들고 스펙을 등록(인스턴스 생성은 DOM 부착 후)
  function buildChart(revenue) {
    var data = Array.isArray(revenue) ? revenue.filter(Boolean) : [];
    if (data.length === 0) return null;
    if (typeof Chart === "undefined") return null; // 라이브러리 미로딩 시 그래프 생략

    var labels = data.map(function (d) { return monthLabel(d.month); });
    var values = data.map(function (d) {
      var v = Number(d && d.value);
      return (isFinite(v) && v > 0) ? v : 0;
    });

    var wrap = el("div", "card__chart");
    var canvas = document.createElement("canvas");
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label",
      "Monthly revenue over the last " + values.length + " months; latest " +
      formatMrr(values[values.length - 1]) + "/mo");
    wrap.appendChild(canvas);

    chartSpecs.push({ canvas: canvas, labels: labels, values: values });
    return wrap;
  }

  // 등록된 스펙으로 Chart.js 인스턴스 생성/재생성
  function renderCharts() {
    if (typeof Chart === "undefined") return;

    // 기존 인스턴스 정리
    chartInstances.forEach(function (c) { try { c.destroy(); } catch (e) {} });
    chartInstances = [];

    var css = getComputedStyle(document.documentElement);
    var accent = css.getPropertyValue("--accent").trim() || "#2F7D43";
    var muted = css.getPropertyValue("--text-muted").trim() || "#6E6F68";
    var reduce = window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    chartSpecs.forEach(function (spec) {
      var chart = new Chart(spec.canvas, {
        type: "line",
        data: {
          labels: spec.labels,
          datasets: [{
            data: spec.values,
            borderColor: accent,
            backgroundColor: hexToRgba(accent, 0.12),
            borderWidth: 2,
            tension: 0.35,
            fill: true,
            pointBackgroundColor: accent,
            pointBorderWidth: 0,
            pointRadius: 2.5,
            pointHoverRadius: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: reduce ? false : { duration: 500 },
          plugins: {
            legend: { display: false },
            tooltip: {
              displayColors: false,
              callbacks: {
                label: function (ctx) { return formatMrr(ctx.parsed.y) + "/mo"; }
              }
            }
          },
          scales: {
            x: {
              grid: { display: false },
              border: { display: false },
              ticks: { color: muted, font: { size: 10, family: "JetBrains Mono, monospace" } }
            },
            y: {
              display: false,
              beginAtZero: true,
              suggestedMax: 10 // 전부 0이어도 바닥에 평평하게 보이도록 여유 상한
            }
          }
        }
      });
      chartInstances.push(chart);
    });
  }

  function buildStatus(app) {
    var status = el("span", "status");
    var s = app.status || "live";

    if (s === "acquired") {
      var txt = "💰 Acquired";
      if (isFinite(Number(app.soldFor)) && Number(app.soldFor) > 0) {
        txt += " · Sold for " + formatMrr(app.soldFor);
      }
      status.appendChild(el("span", null, txt));
    } else if (s === "discontinued") {
      status.appendChild(el("span", null, "Discontinued"));
    } else {
      // live
      status.appendChild(el("span", "status__dot"));
      status.appendChild(el("span", null, "Live"));
    }
    return status;
  }

  // ---------- 테마 토글 ----------
  function buildThemeToggle() {
    var btn = el("button", "theme-toggle");
    btn.type = "button";
    syncToggle(btn);

    btn.addEventListener("click", function () {
      var current = document.documentElement.getAttribute("data-theme");
      var next = current === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      try { localStorage.setItem("theme", next); } catch (e) {}
      syncToggle(btn);
      renderCharts(); // 새 테마 색으로 차트 다시 그림
    });

    return btn;
  }

  function syncToggle(btn) {
    var isDark = document.documentElement.getAttribute("data-theme") === "dark";
    btn.textContent = isDark ? "☀️" : "🌙";
    btn.setAttribute("aria-pressed", String(isDark));
    btn.setAttribute("aria-label", isDark ? "Switch to light mode" : "Switch to dark mode");
    btn.title = btn.getAttribute("aria-label");
  }

  // ---------- 부트스트랩 ----------
  function init() {
    // 테마 토글: 페이지 우상단에 고정(고정 위치는 CSS). 중복 생성 방지.
    if (!document.querySelector(".theme-toggle")) {
      document.body.appendChild(buildThemeToggle());
    }
    renderHeader();
    renderApps();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
