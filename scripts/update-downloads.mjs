// scripts/update-downloads.mjs
// Play Store 공개 페이지에서 각 앱의 다운로드 버킷("100+")을 읽어
// data.js의 downloads 값을 갱신한다. (GitHub Actions에서 매일 실행)
//
// 사용: node scripts/update-downloads.mjs
// - 외부 의존성 없음 (Node 20+ 내장 fetch)
// - 파싱 실패 시 exit 1 → 워크플로가 실패로 표시되어 바로 알 수 있다.
import { readFileSync, writeFileSync } from "node:fs";

const DATA_PATH = new URL("../data.js", import.meta.url);

// "100+" / "1,000+" / "10K+" / "1M+" → 숫자
function bucketToNumber(text) {
  const m = String(text).trim().match(/^([\d.,]+)\s*([KMB])?\+?$/i);
  if (!m) return null;
  const base = parseFloat(m[1].replace(/,/g, ""));
  if (!isFinite(base)) return null;
  const mult = { K: 1e3, M: 1e6, B: 1e9 }[(m[2] || "").toUpperCase()] || 1;
  return Math.round(base * mult);
}

async function fetchDownloads(packageId) {
  const url = `https://play.google.com/store/apps/details?id=${packageId}&hl=en`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (stats updater for huijinkang.github.io)" },
  });
  if (!res.ok) throw new Error(`${packageId}: HTTP ${res.status}`);
  const html = await res.text();

  // "<div>100+</div><div ...>Downloads</div>" 패턴 (hl=en 고정이라 라벨은 항상 영어)
  const m = html.match(/>([\d.,]+\s*[KMB]?\+?)<\/div><div[^>]*>Downloads/i);
  if (!m) throw new Error(`${packageId}: download bucket not found in page HTML`);

  const n = bucketToNumber(m[1]);
  if (n === null) throw new Error(`${packageId}: cannot parse bucket "${m[1]}"`);
  return n;
}

// data.js 안에서 해당 패키지 앱 객체의 downloads 숫자만 교체
function patchDownloads(source, packageId, value) {
  const re = new RegExp(
    `(url:\\s*"[^"]*${packageId.replace(/\./g, "\\.")}[^"]*"[\\s\\S]*?downloads:\\s*)(\\d+)`
  );
  if (!re.test(source)) {
    throw new Error(`${packageId}: downloads field not found in data.js`);
  }
  return source.replace(re, `$1${value}`);
}

const source = readFileSync(DATA_PATH, "utf8");

// data.js에서 Play Store 패키지 ID 자동 수집 → 앱이 늘어도 스크립트 수정 불필요
const packageIds = [...source.matchAll(/play\.google\.com\/store\/apps\/details\?id=([\w.]+)/g)]
  .map((m) => m[1]);

if (packageIds.length === 0) {
  console.error("No Play Store URLs found in data.js");
  process.exit(1);
}

let updated = source;
let changed = false;

for (const id of packageIds) {
  const downloads = await fetchDownloads(id);
  const before = updated;
  updated = patchDownloads(updated, id, downloads);
  const didChange = before !== updated;
  if (didChange) changed = true;
  console.log(`${id}: ${downloads}${didChange ? " (updated)" : " (unchanged)"}`);
}

if (changed) {
  writeFileSync(DATA_PATH, updated);
  console.log("data.js updated.");
} else {
  console.log("No changes.");
}
