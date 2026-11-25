#!/usr/bin/env node
/*
 * 기존 워크시트 위젯(아임웹 코드위젯용 HTML 조각)을 강의 플레이어 iframe 용 페이지로 가져온다.
 *   node scripts/sync-worksheet-widgets.mjs [~/Desktop/2000planworksheet]
 * 원본은 2000planworksheet 폴더(아임웹에 붙여넣는 것과 같은 파일). 위젯을 고치면 이 스크립트를 다시 돌려 커밋한다.
 *
 * 위젯 코드는 그대로 두고 앞에 작은 스크립트(SHIM)만 붙인다:
 *  - ?email= 로 이메일 칸을 미리 채움 · 2000플랜은 ?part=&lecture= 강의를 바로 열고 이메일 확인까지
 *  - 제출이 성공하면 부모 창(플레이어)에 알림 → 플레이어가 서버에서 제출 여부를 다시 확인하고 다음 강의를 연다
 *  - 높이를 부모 창에 알려 iframe 크기를 맞춘다
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const root = path.resolve((process.argv[2] ?? "~/Desktop/2000planworksheet").replace(/^~/, os.homedir()));
const out = path.resolve(import.meta.dirname, "../public/worksheets");

const SHIM = `<script>
/* 비주얼아카데미 강의 플레이어 연결 (scripts/sync-worksheet-widgets.mjs 가 붙임) */
(function () {
  var q = new URLSearchParams(location.search);
  var EMAIL = q.get("email") || "", LECTURE = Number(q.get("lecture")) || 0;
  function post(m) { m.source = "va-worksheet"; try { parent.postMessage(m, location.origin); } catch (e) {} }
  var orig = window.fetch;
  window.fetch = function (input) {
    var p = orig.apply(this, arguments);
    var url = String((input && input.url) || input);
    if (/\\/submit$/.test(url)) p.then(function (r) { r.clone().json().then(function (d) { if (r.ok && d && d.success !== false) post({ type: "submitted" }); }).catch(function () {}); }).catch(function () {});
    return p;
  };
  function fill() {
    if (!EMAIL) return;
    ["wsEmail", "f_email"].forEach(function (id) { var el = document.getElementById(id); if (el && !el.value) el.value = EMAIL; });
  }
  var n = 0, t = setInterval(function () { fill(); if (++n > 60) clearInterval(t); }, 500);
  document.addEventListener("focusin", fill);
  function height() { post({ type: "height", h: document.documentElement.scrollHeight }); }
  window.addEventListener("load", function () {
    if (LECTURE && window.wsSelectLecture) {
      window.wsSelectLecture(LECTURE);
      if (EMAIL && window.wsCheckEmail) { document.getElementById("wsEmail").value = EMAIL; window.wsCheckEmail(); }
    }
    height();
    if (window.ResizeObserver) new ResizeObserver(height).observe(document.body);
  });
})();
</script>`;

const page = (title, body) => `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${title}</title>
<style>html,body{margin:0;background:#fff}</style>
${SHIM}
</head>
<body>
${body}
</body>
</html>
`;

function write(name, title, body) {
  fs.writeFileSync(path.join(out, name), page(title, body));
  console.log("  ✓", name);
}

fs.mkdirSync(out, { recursive: true });
console.log("원본:", root);

// 2000플랜 — 파트별 파일은 PART_ONLY 숫자·뱃지만 다르다 → 1파트 파일 하나로 ?part= 를 받는다
const plan = fs.readFileSync(path.join(root, "frontend/widget-part1.html"), "utf8");
const PART_LINE = "var PART_ONLY = 1;";
if (plan.split(PART_LINE).length !== 2) throw new Error("2000플랜 위젯에서 PART_ONLY 줄을 못 찾았어요 — 위젯 구조가 바뀌었는지 확인");
write(
  "2000plan.html",
  "2000플랜 워크시트",
  plan.replace(PART_LINE, "var PART_ONLY = Number(new URLSearchParams(location.search).get('part')) || 1;"),
);

// 오토사장반 — 파트마다 화면이 다르다
for (let n = 0; n <= 9; n++) {
  const f = path.join(root, `autoceo/frontend/widget-part${n}.html`);
  const html = fs.readFileSync(f, "utf8");
  if (!html.includes('id="f_email"')) throw new Error(`오토사장반 ${n}파트 위젯에 이메일 칸(f_email)이 없어요`);
  write(`autoceo-part${n}.html`, `오토사장반 ${n}파트 워크시트`, html);
}
