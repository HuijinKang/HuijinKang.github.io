# AdMob 수익 자동화 계획 (2단계 — 보류 중)

> 상태: **계획만 수립, 미구현** (2026-06 기준)
> 1단계(다운로드 수 자동화)는 `.github/workflows/update-stats.yml`로 운영 중.
> 두 앱(BB Ballistics Calculator, Don't Eat Too Much) 모두 AdMob 광고 부착 확인됨.

## 목표

매일 GitHub Actions가 AdMob API에서 앱별 수익을 가져와 `data.js`를 자동 갱신:

- `apps[].mrr` ← 이번 달 예상 수익 (월중에는 진행 중인 달의 누적값)
- `apps[].revenue[]` ← 월별 수익 배열에 지난달 값 확정 추가 (그래프 자동 성장)

`data.js`만 갱신하면 총합·그래프·카운트업은 기존 프런트 코드가 알아서 처리한다.

## 제약 (중요)

1. **서비스 계정 불가** — AdMob API는 OAuth 사용자 인증만 지원한다.
   본인 구글 계정으로 브라우저 동의 1회 → **refresh token** 발급 → GitHub Secrets에 저장.
   이후 Action이 매 실행마다 refresh token으로 access token을 자동 발급받는다.
2. **7일 만료 함정** — GCP OAuth 동의 화면이 "테스트(Testing)" 상태면 refresh token이
   7일마다 만료된다. 반드시 **"프로덕션(In production)"으로 게시**할 것.
   (본인 계정 전용이므로 심사 불필요. 동의 시 "확인되지 않은 앱" 경고 1회만 뜸.)
3. 수익 수치는 AdMob "예상 수익(estimated)" 기준 — 월 마감 후 확정치와 소폭 다를 수 있다.

## 1회 세팅 절차 (~20분)

1. **GCP 콘솔** (console.cloud.google.com)
   - 프로젝트 생성(또는 기존 사용) → API 라이브러리에서 **AdMob API 활성화**
   - OAuth 동의 화면 구성: User Type = External, 범위에 `admob.readonly` 추가 → **게시(In production)**
   - 사용자 인증 정보 → OAuth 클라이언트 ID 생성, 유형 = **데스크톱 앱**
   - `client_id`, `client_secret` 확보
2. **refresh token 발급** (로컬 1회)
   - 헬퍼 스크립트(`scripts/admob-auth.mjs`, 구현 시 작성)를 로컬 실행
   - 브라우저 동의 → 콘솔에 refresh token 출력
   - 스코프: `https://www.googleapis.com/auth/admob.readonly`
3. **GitHub Secrets 등록** (repo Settings → Secrets and variables → Actions)
   - `ADMOB_CLIENT_ID` / `ADMOB_CLIENT_SECRET` / `ADMOB_REFRESH_TOKEN`
   - AdMob 퍼블리셔 ID(`pub-XXXX...`)도 필요 — 시크릿 또는 스크립트 상수로
4. **AdMob 앱 ID 매핑 확인**
   - AdMob 콘솔에서 두 앱의 App ID(`ca-app-pub-...~...`) 확인
   - API의 앱 식별자와 `data.js`의 패키지 ID를 매핑하는 테이블을 스크립트에 둔다
     (AdMob API `accounts.apps.list`로 packageName ↔ appId 자동 매핑 가능)

## API 호출 설계

- 토큰 갱신: `POST https://oauth2.googleapis.com/token`
  (`grant_type=refresh_token` + client_id/secret/refresh_token)
- 수익 조회: `POST https://admob.googleapis.com/v1/accounts/{pub-ID}/networkReport:generate`
  ```json
  {
    "reportSpec": {
      "dateRange": { "startDate": {...이번 달 1일...}, "endDate": {...오늘...} },
      "dimensions": ["APP", "MONTH"],
      "metrics": ["ESTIMATED_EARNINGS"]
    }
  }
  ```
- `ESTIMATED_EARNINGS`는 **마이크로 단위**(1 USD = 1,000,000) → 나누기 1e6
- 통화는 AdMob 계정 설정 통화 — `data.js`의 `currency`와 일치 확인 필요
  (계정이 KRW면 환산하거나 `profile.currency`를 KRW로 변경)

## 갱신 스크립트 설계 (`scripts/update-revenue.mjs`, 구현 시 작성)

1. refresh token → access token
2. 이번 달 수익(앱별) 조회 → `mrr` 값으로 반올림(정수)
3. 매월 1일 실행분에서는 지난달 확정값을 `revenue` 배열에 추가
   - `revenue`에 이미 해당 월이 있으면 값 갱신, 없으면 push (멱등성 보장)
4. `data.js` 텍스트 패치 — 기존 `update-downloads.mjs`의 패턴(정규식 치환) 재사용
5. 실패 시 exit 1 → 워크플로 빨간불 (조용한 실패 금지)

## 워크플로 변경

기존 `update-stats.yml`의 스텝에 추가 (별도 워크플로 분리도 가능):

```yaml
- name: Fetch revenue from AdMob
  env:
    ADMOB_CLIENT_ID: ${{ secrets.ADMOB_CLIENT_ID }}
    ADMOB_CLIENT_SECRET: ${{ secrets.ADMOB_CLIENT_SECRET }}
    ADMOB_REFRESH_TOKEN: ${{ secrets.ADMOB_REFRESH_TOKEN }}
  run: node scripts/update-revenue.mjs
```

커밋 스텝은 기존 것 재사용 (`data.js` diff 있을 때만 커밋).

## 리스크 / 운영 메모

- refresh token이 무효화되면(비밀번호 변경, 보안 이벤트 등) 워크플로가 실패한다
  → 2단계 절차만 다시 수행하면 복구
- AdMob 수익이 $0인 날은 diff가 없어 커밋도 없음 (정상)
- 공개 레포이므로 **시크릿/토큰을 절대 코드·문서에 넣지 말 것** — GitHub Secrets만 사용
- 스케줄 워크플로는 레포 60일 무활동 시 자동 비활성화 → Actions 탭에서 재활성화

## 착수 시점

광고 수익이 실제로 발생하기 시작하면 진행. 이 문서 순서대로 1→4 세팅 후
스크립트 2개(`admob-auth.mjs`, `update-revenue.mjs`) 작성 요청하면 됨.
