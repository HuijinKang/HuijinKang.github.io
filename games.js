// games.js — 게임 갤러리 데이터. 유지보수 시 이 파일만 수정한다.
// games.app.js가 이 배열을 읽어 좌측 상세 패널 + 우측 타이틀 리스트를 렌더한다.
// 게임 추가 = apps처럼 객체 하나를 배열에 append 하면 끝(빌드 불필요).

const games = [
  {
    title: "Yonaki",
    genre: "Horror",
    platform: "Web",
    url: "https://yonaki.rkd8527.workers.dev/",  // ▶ PLAY 버튼 링크
    logo: "./assets/yonaki/logo.png",   // 우측 리스트에서 제목 왼쪽에 표시되는 작은 로고
    dev: true,                          // 개발중 표시 (메타에 "IN DEVELOPMENT" 태그)
    description: "Collect 5 talismans and escape from the ghost.",
    // 스크린샷 배열 — 상세 패널 화면에서 ◀ ▶ 로 좌우로 넘겨본다.
    // 여러 장 넣으면 자동으로 캐러셀 + 도트 인디케이터가 생긴다.
    screenshots: [
      "./assets/yonaki/screen-01.png",
      "./assets/yonaki/screen-02.png",
      "./assets/yonaki/screen-03.png"
    ]
  },

  // ─────────────────────────────────────────────────────────────
  // 아래 두 항목은 리스트 내비게이션을 보여주기 위한 '자리표시(placeholder)'.
  // 실제 게임이 생기면 위 형식으로 교체하거나, 필요 없으면 통째로 지우면 된다.
  // status: "coming-soon" 이면 대표 화면에 "COMING SOON" 레트로 화면이 뜬다.
  // ─────────────────────────────────────────────────────────────
  {
    title: "Untitled Project 02",
    genre: "Puzzle",
    status: "coming-soon",
    description: "In development. Inserting cartridge...",
    screenshots: []
  },
  {
    title: "Untitled Project 03",
    genre: "Adventure",
    status: "coming-soon",
    description: "In development. Loading next world...",
    screenshots: []
  }
];
