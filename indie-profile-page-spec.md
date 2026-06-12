# 인디 프로필 페이지 — 구현 명세서 (for Claude Code)

> 이 문서를 Claude Code에 그대로 전달해 정적 프로필 페이지를 구현한다.
> 레퍼런스: marclou.com (Indie Page) — "한 페이지에 내 앱들과 월 수익을 카드로 전시하는 인디 해커 프로필".

---

## 1. 개요

- **목적**: 내가 만든 앱/서비스를 한 페이지에 리스트로 보여주고, 각 앱의 **월 수익(MRR)**을 투명하게 공개한다. "빌드 인 퍼블릭(build in public)" 스타일의 개인 프로필.
- **결과물**: 빌드 도구 없는 순수 정적 1페이지. GitHub Pages에 무료 배포.
- **핵심 가치**: ① 데이터-코드 분리(숫자 한 줄만 고치면 갱신) ② 총 수익 자동 합산 ③ 밝고 미니멀 + 다크모드.

---

## 2. 목표 & 비기능 요구사항

- 정적 페이지(서버/빌드 없음). 파일을 그대로 GitHub Pages에 올려 동작.
- 외부 런타임 의존성 최소화 — Google Fonts 외 프레임워크/라이브러리 금지(바닐라 JS).
- **앱 데이터는 `data.js` 한 파일에만 존재**한다. 디자인/렌더링 코드는 데이터를 건드리지 않는다.
- 반응형(모바일 우선). 다크모드 토글 + 사용자 선택 기억.
- 접근성 기본기(키보드 포커스, 의미있는 HTML, 충분한 대비, `prefers-reduced-motion` 존중).

---

## 3. 기술 스택 & 제약

- **HTML / CSS / 바닐라 JS**. 빌드 단계 없음.
- 빌드 도구·번들러·프레임워크 사용 금지(React/Vue/Tailwind CLI 등 ✕).
- CSS는 CSS 변수(custom properties) 기반 토큰 시스템으로 작성. 라이트/다크는 `:root`와 `[data-theme="dark"]`로 전환.
- **수익 자동 연동(Stripe 등)은 하지 않는다.** 이유: GitHub Pages는 서버가 없어 결제 API를 부르려면 별도 서버리스 함수 + 키 관리가 필요 → 정적 페이지 취지에 어긋나고 오버스펙. 수익은 `data.js`에서 **수동 갱신**한다(매달 숫자 한 줄).
- **경로는 반드시 상대경로**(`./assets/...`, `./data.js`)로 작성한다. GitHub Pages 프로젝트 페이지(`username.github.io/repo/`)에서 절대경로(`/assets/...`)는 깨진다.

---

## 4. 파일 구조

```
/
├─ index.html        뼈대: 헤더 컨테이너 · 앱 리스트 컨테이너 · 푸터 · 테마 토글 버튼
├─ style.css         디자인 토큰 + 전체 스타일
├─ data.js           ← 유지보수 시 여기만 수정 (프로필 + 앱 목록). 전역 변수로 노출
├─ app.js            data.js를 읽어 DOM 렌더링 + 총합 계산 + 테마 토글 로직
├─ assets/
│  ├─ avatar.png            프로필 사진(선택, 없으면 이니셜 모노그램 폴백)
│  ├─ bb-ballistics.png     앱 아이콘 (부록 A URL에서 내려받아 로컬 저장)
│  └─ dont-eat-too-much.png 앱 아이콘 (부록 A URL에서 내려받아 로컬 저장)
└─ README.md         배포 방법 메모(선택)
```

- `data.js`, `app.js`는 `index.html`에서 일반 `<script>`로 로드(모듈/번들 불필요). `data.js`를 먼저, `app.js`를 나중에 로드.

---

## 5. 데이터 모델 (`data.js`)

`data.js`는 두 개의 전역 객체/배열을 정의한다: `profile`, `apps`.

```js
// data.js — 유지보수 시 이 파일만 수정한다.

const profile = {
  name: "Huijin Kang",
  tagline: "Building small, useful apps in public.", // 한 줄 소개 (자유롭게 수정 가능)
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
    mrr: 0,             // 월 수익(숫자). 총합 자동 계산에 사용
    downloads: 100,     // 선택. Play Store "100+" → 100 저장, UI에서 "100+"로 표기
    status: "live"      // "live" | "acquired" | "discontinued"
    // soldFor: 35000,  // status가 "acquired"일 때만. 매각액
  },
  {
    name: "Don't Eat Too Much",
    logo: "./assets/dont-eat-too-much.png",
    url: "https://play.google.com/store/apps/details?id=io.hj.dont_eat_too_much",
    description: "A fast-paced vertical runner — avoid obstacles, eat smart, survive the longest run.",
    category: "Arcade",
    mrr: 0,
    downloads: 5,       // Play Store "5+"
    status: "live"
  }
  // 앱이 늘면 여기에 객체를 추가한다.
];
```

### 필드 정의

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `name` | string | ✓ | 앱 이름 |
| `logo` | string | ✓ | 로컬 아이콘 경로(상대경로) |
| `url` | string | ✓ | 클릭 시 이동할 링크(스토어 공개 URL) |
| `description` | string | ✓ | 한 줄 설명 |
| `category` | string | – | 스토어 카테고리(Tools/Arcade 등). 있으면 카드에 작은 태그로 표시 |
| `mrr` | number | ✓ | 월 수익. 0 허용. 총합 계산에 포함 |
| `downloads` | number | – | 누적 다운로드. 헤더 보조 지표 합산용 |
| `status` | enum | ✓ | `live` / `acquired` / `discontinued` |
| `soldFor` | number | – | `acquired`일 때 매각액 |

> **주의**: Play Console(개발자 관리) URL은 로그인 전용 비공개 페이지이므로 `url`에 쓰지 않는다. 공개용은 위 스토어 URL을 사용한다.

---

## 6. 페이지 구성 (섹션별 상세)

### 6.1 헤더 (프로필)

- 프로필 사진(원형). `avatar`가 없으면 이니셜 모노그램(예: "HK")을 accent 배경 원으로 폴백 생성.
- 이름(`name`) — 디스플레이 폰트.
- 위치(`location`) — 있을 때만, 작게 muted.
- **총 월 수익 헤드라인**: `apps`의 `mrr`를 모두 합산해 `$X/mo` 형태로 크게 표시(시그니처 — 8장 참고). 합산은 코드가 자동 처리, 데이터엔 총합을 적지 않는다.
- 보조 지표(선택, `showDownloads: true`일 때): 총 다운로드 합을 `105+ downloads`처럼 작게 표시(현재 100+ · 5+ = 약 105). 지금은 수익이 $0이라 보조 지표가 페이지에 긍정 신호를 준다.
- 태그라인(`tagline`).
- SNS 링크(`socials`) — 텍스트 링크 또는 미니멀 아이콘. 새 탭(`target="_blank" rel="noopener"`).

### 6.2 앱 리스트

- `apps`를 순회해 카드 렌더링. 카드는 `<a>`로 감싸 전체가 클릭 가능(`url`로 이동, 새 탭).
- 카드 구성: **로고(좌) · 본문(이름 + 카테고리 태그 + 설명) · 수익 배지(우, `$X/mo`)**.
- **카테고리 태그**: `category`가 있으면 이름 옆 또는 설명 위에 작은 태그(pill)로 표시(예: `Tools`, `Arcade`). 스타일은 `--accent-weak` 배경 + muted 텍스트의 옅은 칩. 유틸 앱과 게임을 한눈에 구분시켜 준다. 값이 없으면 생략.
- `mrr === 0`이면 `$0/mo`로 그대로 정직하게 표기(빌드 인 퍼블릭 톤). 음수·undefined는 방어 처리.
- **상태 뱃지**:
    - `live`: 작은 점(accent) + "Live" (또는 뱃지 생략하고 점만).
    - `acquired`: `💰 Acquired` + `soldFor` 있으면 `· Sold for $35K`.
    - `discontinued`: muted 톤 + 카드 살짝 흐리게(투명도↓), "Discontinued".
- 정렬: 기본은 `data.js` 배열 순서 유지. (선택 개선: `live` → `acquired` → `discontinued` 순, 그 안에서 mrr 내림차순. 구현하면 README에 명시.)

### 6.3 푸터

- SNS 링크 1회 반복.
- 작은 크레딧 한 줄(예: "Made by Huijin Kang"). 연도 자동(`new Date().getFullYear()`).

---

## 7. 기능 요구사항

### 7.1 총 수익 자동 합산
- 페이지 로드 시 `apps`의 `mrr` 합 → 통화 포맷(`Intl.NumberFormat`, `profile.currency`)으로 헤더에 출력.
- 1,000 이상은 `$1.2k/mo`처럼 축약 표기 옵션(marclou 스타일). 0~999는 그대로.

### 7.2 다크모드 토글
- 헤더 우상단에 토글 버튼(해/달 아이콘 또는 텍스트).
- 우선순위: ① `localStorage`에 저장된 사용자 선택 → ② 없으면 `prefers-color-scheme` → ③ 없으면 라이트.
- 선택은 `localStorage`에 저장해 재방문 시 유지. (GitHub Pages 실제 사이트이므로 `localStorage` 사용 가능.)
- `<html data-theme="dark|light">`로 전환, CSS 변수로 색 스위칭. 깜빡임(FOUC) 방지를 위해 테마 적용 스크립트는 `<head>`에서 인라인으로 가장 먼저 실행.

### 7.3 상태 뱃지 — 6.2 참고.

### 7.4 반응형
- 모바일 우선. 카드는 모바일에서 세로 스택, 데스크톱에서도 1열(중앙 정렬, 최대폭 ~600px 컨테이너)로 marclou처럼 좁고 읽기 쉬운 레이아웃.
- 터치 타깃 최소 44px.

### 7.5 빈/단일 카드 처리
- 현재 앱이 1개뿐이므로 카드가 1개여도 휑하지 않게 여백/정렬을 잡는다.
- `apps`가 비면 "Coming soon" 류의 빈 상태 메시지(인터페이스 톤, 사과체 금지).

---

## 8. 디자인 가이드 — "밝고 미니멀 + 정밀 계측기"

> 브리프: marclou처럼 밝고 미니멀 + 다크모드. 여기에 앱 주제(탄도/속도 계산기 = 정밀 계측 도구)를 살짝 입혀 차별화한다.

### 컨셉 & 시그니처
- 전체는 조용하고 정돈된 미니멀. **시그니처는 "크로노그래프 리드아웃"** — 모든 수치(총 MRR, 각 앱 `$X/mo`, 다운로드)를 **모노스페이스 + tabular-nums**로 계측기 표시창처럼 렌더링. 탄속 측정기(크로노)를 연상시켜 주제와 연결되고, 숫자가 페이지의 주인공이 된다.
- 보너스(선택): 다크모드에서 수치에 아주 미세한 accent 글로우. 과하지 않게.

### 컬러 토큰
라이트(기본):
```
--bg:          #F6F6F2   /* 따뜻한 오프화이트 */
--surface:     #FFFFFF   /* 카드 */
--text:        #1A1B16
--text-muted:  #6E6F68
--border:      #E5E5DE
--accent:      #2F7D43   /* 정밀/계측 느낌의 딥 그린 */
--accent-weak: #E8F2E9   /* 뱃지 배경 틴트 */
```
다크:
```
--bg:          #0F100D
--surface:     #181A15
--text:        #ECEDE6
--text-muted:  #8C8D84
--border:      #2A2C25
--accent:      #4BC468   /* 밝은 리드아웃 그린 */
--accent-weak: #16271A
```
> accent 그린은 취향에 맞게 한 곳(`--accent`)만 바꾸면 전체 반영되게 토큰화.

### 타이포 (Google Fonts)
- **디스플레이/헤딩**: `Space Grotesk` — 약간 기하학적·기술적인 인상.
- **본문**: `Inter` — 가독성 좋은 중립 산세리프.
- **수치/리드아웃**: `JetBrains Mono` (또는 `Space Mono`) — 계측기 톤.
- 타입 스케일은 명확하게(예: 헤딩 큼-볼드, 본문 16px, 캡션 13px muted). 폰트는 3종으로 제한.

### 카드 · 간격 · 모션
- 카드: `--surface` 배경, 1px `--border`, 라운드 12~14px, 호버 시 미세한 상승(translateY -2px) + 보더 accent화. 그림자는 아주 옅게.
- 넉넉한 수직 리듬, 컨테이너 최대폭 ~600px 중앙 정렬.
- 모션은 절제: 호버 마이크로 인터랙션 + 로드 시 카드 가벼운 페이드/스태거 정도. `prefers-reduced-motion: reduce`면 모두 끔.

---

## 9. 접근성 & 품질 기준

- 시맨틱 마크업(`<header> <main> <ul>/<li> <footer>`), 링크는 `<a>`, 토글은 `<button aria-pressed>`.
- 키보드 포커스 가시화(focus-visible 링), 색 대비 WCAG AA 충족(라이트/다크 모두).
- 이미지 `alt`(앱명 + "logo"), 외부 링크 `rel="noopener"`.
- 모노스페이스 수치라도 스크린리더가 자연스럽게 읽도록 마크업(예: `$0/mo`는 텍스트 그대로).
- 콘솔 에러 0. `data.js` 필드 누락 시에도 깨지지 않게 방어적 렌더링.

---

## 10. 배포 (GitHub Pages)

> **확정 레포명: `HuijinKang.github.io`** (GitHub "유저 사이트" 전용 이름). 발급 주소는 루트 도메인 `https://huijinkang.github.io/`.

1. GitHub에서 이름이 정확히 **`HuijinKang.github.io`**인 공개 레포를 만들고, 프로젝트 파일 전체를 `main` 브랜치 루트에 push.
    - 이 이름이어야 루트(`https://huijinkang.github.io/`)로 서빙된다. 다른 이름이면 `huijinkang.github.io/<repo>/` 서브경로가 된다.
    - 유저 사이트는 루트 서빙이라 절대경로도 동작하지만, **상대경로(`./assets/...`)를 그대로 유지**한다(향후 서브경로 이전·로컬 미리보기에도 안전).
2. 레포 **Settings → Pages → Build and deployment → Source: Deploy from a branch** → 브랜치 `main` / 폴더 `/ (root)` → Save.
3. 1~2분 뒤 `https://huijinkang.github.io/` 접속해 확인.
4. (선택) 커스텀 도메인: Settings → Pages → Custom domain에서 무료 연결.

> 빌드 과정이 없으므로 push만 하면 배포 끝. 수익 갱신도 `data.js`의 숫자만 고쳐 push.

> 빌드 과정이 없으므로 push만 하면 배포 끝. 수익 갱신도 `data.js`의 숫자만 고쳐 push.

---

## 11. 향후 확장 (지금은 구현 안 함, 메모만)

- **수익 자동 갱신**: GitHub Actions가 하루 1회 결제 API(Stripe 등)를 fetch해 `data.js`/JSON을 갱신·커밋하는 방식. 키는 GitHub Secrets로. 정적 산출물은 그대로 유지.
- 앱 상세 모달, 다운로드/리뷰 수 표시, 정렬·필터, 다국어(ko/en) 토글, OG 이미지 자동 생성 등.

---

## 부록 A. 실제 콘텐츠 데이터(채워서 제공)

- **이름**: Huijin Kang
- **SNS**: GitHub — https://github.com/HuijinKang
- **개발사**: HJ Labs (에이치제이스튜디오)

- **앱 #1: BB Ballistics Calculator**
    - 스토어 URL(공개): `https://play.google.com/store/apps/details?id=io.hj.bb_ballistics_calculator`
    - 설명: Airsoft BB velocity, energy & range calculator with realistic physics.
    - 카테고리: Tools · 다운로드: 100+ · 콘텐츠 등급: 3+
    - **MRR: $0** (현재 수익 없음) · 상태: `live`
    - 아이콘 다운로드 URL(로컬 `assets/bb-ballistics.png`로 저장, 핫링크 금지):
      `https://play-lh.googleusercontent.com/Ra7AK_HNhFns75dqripEwwaSPOCkkCsSnUbMBRFk_51s8jANzndHU5p_N2eYzMcSFLHikuBONel9T71EXFFp=s256`

- **앱 #2: Don't Eat Too Much**
    - 스토어 URL(공개): `https://play.google.com/store/apps/details?id=io.hj.dont_eat_too_much`
    - 설명: A fast-paced vertical runner — avoid obstacles, eat smart, survive the longest run.
    - 카테고리: Arcade(게임) · 다운로드: 5+ · 콘텐츠 등급: 3+
    - **MRR: $0** (값 미제공 → $0으로 가정) · 상태: `live`
    - 아이콘 다운로드 URL(로컬 `assets/dont-eat-too-much.png`로 저장, 핫링크 금지):
      `https://play-lh.googleusercontent.com/mtDTzNqtJrDLNdi7x2C0RL3OtzEqj92h-cvCa18xFTzXHET1Hec2w7LtEvP7QIZ22DjOJrSUqWL5k66Zq6dqnCw=s256`

> Play Console URL(`.../console/...`)은 비공개 관리 페이지라 페이지에 사용하지 않음.

## 부록 B. Claude Code 작업 지시 요약

1. 4장 파일 구조대로 생성.
2. 아이콘 2개를 부록 A의 URL에서 `assets/bb-ballistics.png`, `assets/dont-eat-too-much.png`로 내려받기.
3. `data.js`를 5장 스키마 + 부록 A 데이터로 작성.
4. `index.html` + `style.css` + `app.js`로 6~9장 구현(8장 디자인 토큰 그대로 사용).
5. 라이트/다크 양쪽, 모바일/데스크톱 확인. 콘솔 에러 0.
6. README에 10장 배포 절차 기록.