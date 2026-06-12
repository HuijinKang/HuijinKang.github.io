// data.js — 유지보수 시 이 파일만 수정한다.
// 매달 수익 갱신: 각 앱의 `mrr` 숫자만 고쳐 push 하면 헤더 총합이 자동 갱신된다.

const profile = {
  name: "Huijin Kang",
  tagline: "Building small but useful apps.", // 한 줄 소개 (자유롭게 수정 가능)
  location: "South Korea",        // 선택. 비우면 미표시
  avatar: "./assets/avatar.png",  // 선택. 비우면 이니셜 모노그램(HK) 자동 생성
  currency: "USD",                // 수익 표기 통화
  showDownloads: true,            // 헤더 보조 지표로 총 다운로드 표시 여부
  socials: [
    { label: "GitHub", url: "https://github.com/HuijinKang" }
    // 추후 추가 예: { label: "X", url: "..." }, { label: "Website", url: "..." }
  ]
};

const apps = [
  {
    name: "BB Ballistics Calculator",
    logo: "./assets/bb-ballistics.png",
    url: "https://play.google.com/store/apps/details?id=io.hj.bb_ballistics_calculator",
    description: "Airsoft BB velocity, energy & range calculator with realistic physics.",
    category: "Tools",  // 카드에 작은 태그로 표시
    platform: "Android", // "Android" | "Web" — 플랫폼 구분 태그
    mrr: 0,             // 월 수익(숫자). 총합 자동 계산에 사용
    downloads: 100,     // Play Store "100+" → 100 저장, UI에서 "100+"로 표기
    status: "live",     // "live" | "acquired" | "discontinued"
    // soldFor: 35000,  // status가 "acquired"일 때만. 매각액
    // 월별 수익 추이(카드 그래프용). 매달 끝에 한 줄 추가하면 그래프가 자란다.
    revenue: [
      { month: "2026-01", value: 0 },
      { month: "2026-02", value: 0 },
      { month: "2026-03", value: 0 },
      { month: "2026-04", value: 0 },
      { month: "2026-05", value: 0 },
      { month: "2026-06", value: 0 }
    ]
  },
  {
    name: "Don't Eat Too Much",
    logo: "./assets/dont-eat-too-much.png",
    url: "https://play.google.com/store/apps/details?id=io.hj.dont_eat_too_much",
    description: "A fast-paced vertical runner — avoid obstacles, eat smart, survive the longest run.",
    category: "Arcade",
    platform: "Android",
    mrr: 0,
    downloads: 5,       // Play Store "5+"
    status: "live",
    revenue: [
      { month: "2026-01", value: 0 },
      { month: "2026-02", value: 0 },
      { month: "2026-03", value: 0 },
      { month: "2026-04", value: 0 },
      { month: "2026-05", value: 0 },
      { month: "2026-06", value: 0 }
    ]
  },
  {
    name: "Airsoft Ballistics",
    logo: "./assets/airsoft-ballistics.png",
    url: "https://airsoft-ballistics.com/",
    description: "Airsoft BB velocity, energy & range calculator — right in your browser, no install needed.",
    category: "Tools",
    platform: "Web",
    mrr: 0,
    // 웹 서비스라 downloads 없음 — 헤더 총합/자동 갱신 스크립트 모두 Play Store 앱만 집계
    status: "live",
    revenue: [
      { month: "2026-06", value: 0 }
    ]
  }
  // 앱이 늘면 여기에 객체를 추가한다.
];
