/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "@/components/common/useToast";
import { ROUTES } from "@/data/site";
import { DEFAULT_CONTENT, type PageContent } from "@/data/siteContent";
import { esc, FRAME_CSS, PREVIEWS, type PvCtx } from "./previews";
import { EDITOR_KEYS, PAGES, type EditorPageKey, type Field } from "./schemas";

/*
 * 디자인 모드(페이지 관리) — 고객용 8개 페이지(메인·클래스 목록·상세·소개·대표 인사·마이페이지·결제·로그인)의 문구·사진·영역 순서/노출을 편집한다.
 * 화면 구성 (프로토타입 11.12): 큰 미리보기 + 오른쪽 편집 서랍(모바일은 아래에서 올라오는 시트).
 * 미리보기는 실제 고객 페이지와 같은 마크업·클래스를 iframe 안에서 실제 사이트 CSS로 그린다 (PC 1280px / 모바일 390px 뷰포트).
 * 초안(draft) → 게시(publish) → 버전 기록/복구 흐름. 지금은 게시본·버전 기록을 이 브라우저(localStorage)에 저장한다.
 * 백엔드 연동 시: 게시 = PUT /api/content/:page, 버전 = GET /api/content/:page/versions
 * 바로가기: /admin/design?page=<페이지>&sec=<영역>(&view=mobile) 으로 특정 페이지·영역 편집을 바로 연다.
 */

interface Version { id: number; time: string; note: string; data: string }
interface PageState { D: PageContent; saved: string; hist: Version[]; next: number }
type Modal = { kind: "publish" } | { kind: "reset" } | { kind: "history" } | { kind: "restore"; id: number } | null;

/*
 * 콘텐츠 구조가 바뀌면 v 숫자를 올린다 — 예전 구조로 저장된 초안은 읽지 않음
 * (v2: 환불 규정 → 푸터 팝업, v3: 메인 강사 슬라이더·푸터 사업자 정보 목록,
 *  v4(11.12): 메뉴 3개·푸터 링크 개편·온라인/살롱/후기 필드, 소개 연혁 삭제·강사 탭은 메인 데이터 사용, 대표 인사 추가, 수강 안내 편집 제거)
 */
const LS = (k: EditorPageKey) => `va-design:v4:${k}`;
const TSK = ["fs", "ls", "lh", "fw", "al"] as const;
/** 미리보기 뷰포트 폭 — 실제 페이지 CSS의 @media 가 그대로 적용된다 */
const VIEW_W = { pc: 1280, mobile: 390 };

const fmt = (d: Date) => d.toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "numeric", minute: "2-digit" });
const clone = <T,>(o: T): T => JSON.parse(JSON.stringify(o));
const isKey = (k: unknown): k is EditorPageKey => typeof k === "string" && (EDITOR_KEYS as string[]).includes(k);

function loadState(k: EditorPageKey): PageState {
  const def = clone(DEFAULT_CONTENT[k]);
  const fresh: PageState = { D: def, saved: JSON.stringify(def), hist: [{ id: 1, time: fmt(new Date()), note: "최초 상태", data: JSON.stringify(def) }], next: 2 };
  try {
    const raw = localStorage.getItem(LS(k));
    if (!raw) return fresh;
    const p = JSON.parse(raw) as { saved: string; hist: Version[]; next: number };
    return { D: JSON.parse(p.saved), saved: p.saved, hist: p.hist, next: p.next };
  } catch {
    return fresh;
  }
}

/** 주소의 ?page=&sec= (바로가기) */
function readQuery(): { page: EditorPageKey; sec: string | null; mobile: boolean } {
  try {
    const q = new URLSearchParams(window.location.search);
    const page = q.get("page");
    const k = isKey(page) ? page : "main";
    const sec = q.get("sec");
    return { page: k, sec: sec && PAGES[k].sec[sec] ? sec : null, mobile: q.get("view") === "mobile" };
  } catch {
    return { page: "main", sec: null, mobile: false };
  }
}

function getAt(o: any, path: string) {
  return path.split(".").reduce((x, k) => (x == null ? x : x[k]), o);
}
function setAt(o: any, path: string, val: unknown) {
  const ks = path.split(".");
  let cur = o;
  for (let i = 0; i < ks.length - 1; i++) cur = cur[ks[i]];
  cur[ks[ks.length - 1]] = val;
}
function clearDeep(o: any): any {
  if (Array.isArray(o)) {
    const f = o[0];
    o.length = 0;
    if (f !== undefined) o.push(clearDeep(clone(f)));
    return o;
  }
  for (const k of Object.keys(o)) {
    if (typeof o[k] === "string") { if (k !== "link") o[k] = ""; }
    else if (o[k] && typeof o[k] === "object") clearDeep(o[k]);
  }
  return o;
}
function diffCount(a: any, b: any): number {
  if (typeof a === "object" && a && typeof b === "object" && b) {
    const ks = new Set([...Object.keys(a), ...Object.keys(b)]);
    let n = 0;
    ks.forEach((k) => { n += diffCount(a[k], b[k]); });
    return n;
  }
  return a === b ? 0 : 1;
}

/** iframe 문서 준비 — 부모 문서의 스타일시트(실제 사이트 CSS)를 그대로 복사하고 미리보기 루트를 만든다 */
function ensureFrame(f: HTMLIFrameElement | null, bind: (doc: Document) => void): HTMLElement | null {
  const doc = f?.contentDocument;
  if (!doc) return null;
  const ex = doc.getElementById("pv-mount");
  if (ex) return ex;
  const styles = [...document.querySelectorAll('link[rel="stylesheet"], style')].map((n) => n.outerHTML).join("");
  doc.open();
  doc.write(
    `<!doctype html><html lang="ko"><head><meta charset="utf-8"><base href="${esc(location.origin)}/">${styles}` +
      `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Marcellus&display=swap"><style>${FRAME_CSS}</style></head>` +
      `<body><div id="pv-mount"></div></body></html>`,
  );
  doc.close();
  bind(doc);
  return doc.getElementById("pv-mount");
}

export default function DesignMode() {
  const [init] = useState(readQuery);
  const [cur, setCur] = useState<EditorPageKey>(init.page);
  const [states, setStates] = useState<Record<EditorPageKey, PageState>>(
    () => Object.fromEntries(EDITOR_KEYS.map((k) => [k, loadState(k)])) as Record<EditorPageKey, PageState>,
  );
  /** 편집 서랍: 열림 여부 + 편집 중인 영역 (null = 영역 목록) */
  const [drawer, setDrawer] = useState(!!init.sec);
  const [openSec, setOpenSec] = useState<string | null>(init.sec);
  const [mode, setMode] = useState<"draft" | "live">("draft");
  const [previewVer, setPreviewVer] = useState<number | null>(null);
  const [mobile, setMobile] = useState(init.mobile);
  const [modal, setModal] = useState<Modal>(null);
  const [pubNote, setPubNote] = useState("");
  const [tsOpen, setTsOpen] = useState<Set<string>>(new Set());
  const [stage, setStage] = useState({ w: 0, h: 0 });
  const { toast, showToast } = useToast(2600);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const drBodyRef = useRef<HTMLDivElement>(null);
  /** 다음 미리보기 렌더 후 스크롤할 영역 */
  const pendingScroll = useRef<string | null>(init.sec);
  const handlers = useRef<{ click: (e: MouseEvent) => void; key: (e: KeyboardEvent) => void }>({ click: () => {}, key: () => {} });

  const meta = PAGES[cur];
  const st = states[cur];
  const D = st.D;
  const savedObj = useMemo(() => JSON.parse(st.saved), [st.saved]);
  const dirty = diffCount(savedObj, D);
  const readOnly = mode === "live" || previewVer !== null;
  const editSec = drawer && openSec && meta.sec[openSec] ? openSec : null;

  const viewData: any = useMemo(() => {
    if (previewVer !== null) return JSON.parse(st.hist.find((h) => h.id === previewVer)?.data ?? st.saved);
    return mode === "live" ? savedObj : D;
  }, [previewVer, mode, savedObj, D, st.hist, st.saved]);
  /** 공통 헤더·푸터·강사 목록은 메인 페이지 데이터 (사이트 화면 보기면 게시본) */
  const mainView: any = useMemo(() => {
    if (cur === "main") return viewData;
    return mode === "live" ? JSON.parse(states.main.saved) : states.main.D;
  }, [cur, viewData, mode, states.main]);

  /* 저장되지 않은 초안이 있으면 이탈 경고 */
  const anyDirty = EDITOR_KEYS.some((k) => states[k].saved !== JSON.stringify(states[k].D));
  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => { if (anyDirty) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [anyDirty]);

  /* 바로가기 주소 동기화 (?page=) */
  useEffect(() => {
    try {
      const u = new URL(window.location.href);
      u.searchParams.set("page", cur);
      u.searchParams.delete("sec");
      window.history.replaceState(window.history.state, "", u);
    } catch { /* noop */ }
  }, [cur]);

  /* 미리보기 영역 크기 */
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setStage({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const patchState = useCallback((fn: (s: PageState) => PageState) => {
    setStates((all) => ({ ...all, [cur]: fn(all[cur]) }));
  }, [cur]);

  /** 초안 데이터 변경 — 보기 모드였으면 초안 편집으로 돌아온다 */
  const editD = (fn: (d: any) => void) => {
    patchState((s) => { const d = clone(s.D); fn(d); return { ...s, D: d }; });
    setMode("draft");
    setPreviewVer(null);
  };
  const setPath = (path: string, val: unknown) => editD((d) => setAt(d, path, val));

  const persist = (s: PageState) => {
    try {
      localStorage.setItem(LS(cur), JSON.stringify({ saved: s.saved, hist: s.hist, next: s.next }));
      return true;
    } catch {
      showToast("브라우저 저장 공간이 부족해요 · 사진 크기를 줄여주세요");
      return false;
    }
  };

  const scrollPv = useCallback((id: string) => {
    const f = frameRef.current;
    const win = f?.contentWindow;
    const el = f?.contentDocument?.querySelector<HTMLElement>(`[data-s="${id}"]`);
    if (win && el) win.scrollTo({ top: Math.max(0, el.getBoundingClientRect().top + win.scrollY - 16), behavior: "smooth" });
  }, []);

  /* ── 서랍 ── */
  const selectSec = (id: string) => {
    setOpenSec(id);
    setDrawer(true);
    pendingScroll.current = id;
    drBodyRef.current?.scrollTo({ top: 0 });
  };
  const openList = () => { setOpenSec(null); setDrawer(true); };
  const closeDrawer = () => { setOpenSec(null); setDrawer(false); };
  const switchPage = (k: EditorPageKey, sec: string | null = null) => {
    if (k !== cur) {
      setCur(k);
      setMode("draft");
      setPreviewVer(null);
      frameRef.current?.contentWindow?.scrollTo({ top: 0 });
    }
    setOpenSec(sec);
    setDrawer(!!sec);
    pendingScroll.current = sec;
  };
  /** "page:sec" 형식 바로가기 (공통 헤더·푸터 클릭, 안내 문구 링크) */
  const goto = (target: string) => {
    const [p, s] = target.split(":");
    if (isKey(p)) switchPage(p, s && PAGES[p].sec[s] ? s : null);
  };

  /* Esc → 서랍 닫기 */
  useEffect(() => {
    const h = (e: KeyboardEvent) => handlers.current.key(e);
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  /* iframe 안 클릭·키 처리 (최신 상태를 쓰도록 매 렌더 갱신) */
  useEffect(() => {
    handlers.current = {
      click: (e) => {
        e.preventDefault();
        if (readOnly) return;
        const t = e.target as HTMLElement;
        const g = t.closest<HTMLElement>("[data-goto]");
        if (g?.dataset.goto) { goto(g.dataset.goto); return; }
        const s = t.closest<HTMLElement>(".pvs");
        if (s?.dataset.s) selectSec(s.dataset.s);
      },
      key: (e) => { if (e.key === "Escape" && drawer && !modal) closeDrawer(); },
    };
  });

  /* ── 미리보기 HTML ── */
  const html = useMemo(() => {
    const pv = PREVIEWS[cur];
    const ctx: PvCtx = { main: mainView, mobile };
    const act = readOnly ? null : editSec;
    const parts = (viewData.order as string[]).map((id) => {
      const on = act === id;
      const nm = meta.sec[id]?.name ?? id;
      const chip = `<span class="pv-chip ${on ? "edit" : "hov"}">${esc(nm)}</span>`;
      if (!viewData.visible[id]) return { id, html: `<div class="pvs off${on ? " act" : ""}" data-s="${id}">${chip}숨김 영역 — ${esc(nm)}${readOnly ? "" : " (클릭해서 수정)"}</div>` };
      let inner = "";
      try {
        inner = pv.sec[id] ? pv.sec[id](viewData[id] ?? {}, viewData, ctx) : "";
      } catch {
        inner = `<div class="pvs off">미리보기를 그리지 못했어요 — ${esc(nm)}</div>`;
      }
      return { id, html: `<div class="pvs${on ? " act" : ""}" data-s="${id}">${chip}${inner}</div>` };
    });
    let body = "";
    try {
      body = (pv.before?.(viewData, ctx) ?? "") + (pv.compose ? pv.compose(parts, viewData, ctx) : parts.map((p) => p.html).join("")) + (pv.after?.(viewData, ctx) ?? "");
    } catch {
      body = parts.map((p) => p.html).join("");
    }
    return `<div class="pv-root ${pv.root}${act ? " has-active" : ""}${readOnly ? " viewonly" : ""}">${body}</div>`;
  }, [cur, viewData, mainView, mobile, readOnly, editSec, meta]);

  /* iframe에 그리기 + 'Aa 글자 스타일' 적용 (프로토타입 applyTS) + 대기 중인 스크롤 */
  useEffect(() => {
    const mount = ensureFrame(frameRef.current, (doc) => {
      doc.addEventListener("click", (e) => handlers.current.click(e));
      doc.addEventListener("submit", (e) => e.preventDefault());
      doc.addEventListener("keydown", (e) => handlers.current.key(e));
    });
    if (!mount) return;
    mount.innerHTML = html;
    const win = frameRef.current?.contentWindow;
    if (meta.tstyle && win) {
      const norm = (t: string) => String(t).replace(/\*\*/g, "").replace(/\s+/g, "");
      for (const id of viewData.order as string[]) {
        if (!viewData.visible[id]) continue;
        const root = mount.querySelector(`[data-s="${id}"]`);
        if (!root) continue;
        const els = [...root.querySelectorAll<HTMLElement>("*")].filter((e) => !e.closest(".pv-chip"));
        const used = new Set<HTMLElement>();
        const walk = (o: any) => {
          if (!o || typeof o !== "object") return;
          for (const key of Object.keys(o)) {
            if (key.endsWith("_st") && o[key] && typeof o[key.slice(0, -3)] === "string") {
              const s = o[key];
              const t = norm(o[key.slice(0, -3)]);
              if (!t || !TSK.some((x) => s[x])) continue;
              const m = els.filter((e) => !used.has(e) && norm(e.textContent ?? "") === t);
              const el = m.length ? m[m.length - 1] : null;
              if (!el) continue;
              used.add(el);
              if (s.fs) el.style.fontSize = (parseFloat(win.getComputedStyle(el).fontSize) * s.fs) / 100 + "px";
              if (s.ls !== undefined && s.ls !== "") el.style.letterSpacing = s.ls / 100 + "em";
              if (s.lh) el.style.lineHeight = String(s.lh / 100);
              if (s.fw) el.style.fontWeight = s.fw;
              if (s.al) { const b = win.getComputedStyle(el).display === "inline" ? el.parentElement! : el; b.style.textAlign = s.al; }
            } else walk(o[key]);
          }
        };
        walk(viewData[id]);
      }
    }
    const ps = pendingScroll.current;
    if (ps) {
      pendingScroll.current = null;
      requestAnimationFrame(() => scrollPv(ps));
      /* 처음 열 때는 iframe CSS·사진이 늦게 들어와 위치가 바뀌므로 한 번 더 */
      setTimeout(() => scrollPv(ps), 600);
    }
  }, [html, meta.tstyle, viewData, scrollPv]);

  /* ── 영역 순서·노출 ── */
  const moveSec = (id: string, d: number) => {
    editD((x) => {
      const i = x.order.indexOf(id), j = i + d;
      if (j < 0 || j >= x.order.length) return;
      [x.order[i], x.order[j]] = [x.order[j], x.order[i]];
    });
    pendingScroll.current = id;
  };
  const toggleVis = (id: string) => editD((x) => { x.visible[id] = !x.visible[id]; });

  /* ── 리스트 항목 ── */
  const addItem = (p: string) => editD((x) => { const arr = getAt(x, p); arr.push(clearDeep(clone(arr[arr.length - 1]))); });
  const delItem = (p: string, i: number) => editD((x) => { const arr = getAt(x, p); if (arr.length > 1) arr.splice(i, 1); });
  const moveItem = (p: string, i: number, d: number) => editD((x) => {
    const a = getAt(x, p), j = i + d;
    if (j < 0 || j >= a.length) return;
    [a[i], a[j]] = [a[j], a[i]];
  });

  /* ── 사진 업로드: 권장 가로폭으로 줄여 JPEG 저장 ── */
  const onImg = (file: File | undefined, p: string, rw: number, rh: number) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { showToast("5MB 이하 사진만 올릴 수 있어요"); return; }
    const r = new FileReader();
    r.onload = () => {
      const im = new Image();
      im.onload = () => {
        const warn: string[] = [];
        if (im.width < rw / 2) warn.push(`사진이 작아 흐리게 보일 수 있어요 (${im.width}px)`);
        const want = rw / rh;
        if (Math.abs(im.width / im.height - want) / want > 0.15) warn.push("권장 비율과 달라 일부가 잘릴 수 있어요");
        const sc = Math.min(1, rw / im.width);
        const c = document.createElement("canvas");
        c.width = Math.round(im.width * sc);
        c.height = Math.round(im.height * sc);
        c.getContext("2d")!.drawImage(im, 0, 0, c.width, c.height);
        /* 투명 배경이 필요한 PNG(서명 등)는 PNG 그대로 */
        setPath(p, file.type === "image/png" ? c.toDataURL("image/png") : c.toDataURL("image/jpeg", 0.85));
        showToast(warn.length ? warn.join(" · ") : "사진을 등록했어요");
      };
      im.src = String(r.result);
    };
    r.readAsDataURL(file);
  };

  /* ── 글자 스타일 ── */
  const tsToggle = (p: string) => setTsOpen((s) => { const n = new Set(s); if (n.has(p)) n.delete(p); else n.add(p); return n; });
  const tsSet = (p: string, key: string, val: string) => editD((x) => {
    const ks = p.split("."), k = ks.pop()!;
    const o = getAt(x, ks.join("."));
    o[k + "_st"] = { ...(o[k + "_st"] || {}), [key]: val };
  });
  const tsReset = (p: string) => editD((x) => { const ks = p.split("."), k = ks.pop()!; delete getAt(x, ks.join("."))[k + "_st"]; });

  /* ── 게시 · 버전 ── */
  const changedSecs = () => {
    const a = savedObj, out: string[] = [];
    for (const id of D.order) if (JSON.stringify(a[id]) !== JSON.stringify(D[id]) || a.visible[id] !== D.visible[id]) out.push(meta.sec[id]?.name ?? id);
    if (JSON.stringify(a.order) !== JSON.stringify(D.order)) out.push("영역 순서");
    return out;
  };
  const doPublish = () => {
    const ch = changedSecs();
    const saved = JSON.stringify(D);
    const s: PageState = { ...st, saved, hist: [...st.hist, { id: st.next, time: fmt(new Date()), note: pubNote.trim() || ch.join("·") + " 수정", data: saved }], next: st.next + 1 };
    if (!persist(s)) return;
    patchState(() => s);
    setModal(null);
    setMode("draft");
    setPreviewVer(null);
    showToast(`${meta.name} 게시 완료 · v${st.next} 으로 기록됨`);
  };
  const doReset = () => { patchState((s) => ({ ...s, D: JSON.parse(s.saved) })); setModal(null); showToast("지금 사이트 상태로 되돌렸어요"); };
  const doRestore = (id: number) => {
    const h = st.hist.find((x) => x.id === id)!;
    patchState((s) => ({ ...s, D: JSON.parse(h.data) }));
    setPreviewVer(null);
    setMode("draft");
    setModal(null);
    showToast(`v${id} 을 초안으로 불러왔어요 · 게시하면 사이트에 적용돼요`);
  };
  const askRestore = (id: number) => (dirty ? setModal({ kind: "restore", id }) : doRestore(id));
  const curVer = st.hist[st.hist.length - 1].id;

  /* ── 미리보기 크기: 실제 뷰포트 폭으로 그리고 영역에 맞게 축소 ── */
  const vw = mobile ? VIEW_W.mobile : VIEW_W.pc;
  const zoom = stage.w
    ? mobile
      ? Math.min((stage.w - 16) / vw, Math.max(0.8, Math.min(1.25, stage.h / 820)))
      : Math.max(0.25, Math.min(1.25, stage.w / vw))
    : 1;
  const frameH = stage.h ? stage.h / zoom : 600;

  /* ── 폼 렌더 ── */
  const renderField = (f: Field, path: string, val: any, key: string): React.ReactNode => {
    if ("note" in f) return <div key={key} className="note" dangerouslySetInnerHTML={{ __html: f.note }} />;
    if ("sub" in f) return <p key={key} className="sub">{f.sub}</p>;
    const p = `${path}.${f.k}`;
    const v = val?.[f.k];
    const lab = <label>{f.l}{f.hint && <span className="hint">{f.hint}</span>}</label>;

    if (f.t === "text" || f.t === "textarea") {
      const stObj = val?.[f.k + "_st"] || {};
      const hasSt = TSK.some((x) => stObj[x]);
      const open = tsOpen.has(p);
      const rg = (k: string, l: string, min: number, max: number, step: number, def: number, show: (v: number) => string) => {
        const set = stObj[k] !== undefined && stObj[k] !== "";
        const cv = set ? Number(stObj[k]) : def;
        return (
          <div className="r">
            <span>{l}</span>
            <input type="range" min={min} max={max} step={step} value={cv} onChange={(e) => tsSet(p, k, e.target.value)} />
            <output>{set ? show(cv) : "기본"}</output>
          </div>
        );
      };
      return (
        <div key={key} className="fld">
          {lab}
          {meta.tstyle && (
            <button type="button" className={`aa${open ? " open" : hasSt ? " on" : ""}`} title="글자 크기·자간 조절" onClick={() => tsToggle(p)}>Aa 글자 스타일</button>
          )}
          {f.t === "text" ? (
            <input type="text" value={v ?? ""} onChange={(e) => setPath(p, e.target.value)} />
          ) : (
            <textarea rows={2} value={v ?? ""} onChange={(e) => setPath(p, e.target.value)} />
          )}
          {meta.tstyle && open && (
            <div className="tsp">
              {rg("fs", "크기", 60, 220, 5, 100, (x) => x + "%")}
              {rg("ls", "자간", -5, 30, 1, 0, (x) => (x / 100).toFixed(2) + "em")}
              {rg("lh", "줄 간격", 100, 260, 5, 150, (x) => (x / 100).toFixed(2))}
              <div className="r">
                <span>굵기</span>
                <select value={stObj.fw || ""} onChange={(e) => tsSet(p, "fw", e.target.value)}>
                  {[["", "기본"], ["400", "보통"], ["500", "중간"], ["700", "굵게"], ["800", "아주 굵게"]].map(([o, t]) => <option key={o} value={o}>{t}</option>)}
                </select>
              </div>
              <div className="r">
                <span>정렬</span>
                <div className="seg2">
                  {[["", "기본"], ["left", "왼쪽"], ["center", "가운데"], ["right", "오른쪽"]].map(([a, t]) => (
                    <button key={a} type="button" className={(stObj.al || "") === a ? "on" : undefined} onClick={() => tsSet(p, "al", a)}>{t}</button>
                  ))}
                </div>
              </div>
              <div className="tsr"><span>크기는 원래 크기 대비 %로 적용돼요</span><button type="button" onClick={() => tsReset(p)}>기본값으로</button></div>
            </div>
          )}
        </div>
      );
    }
    if (f.t === "select") {
      return (
        <div key={key} className="fld">
          {lab}
          <select value={String(v ?? "")} onChange={(e) => setPath(p, e.target.value)}>
            {f.o.map(([o, t]) => <option key={o} value={o}>{t}</option>)}
          </select>
        </div>
      );
    }
    if (f.t === "image") {
      const [rw, rh, ratio] = f.rec;
      return (
        <div key={key} className="fld">
          {lab}
          <div className="imgfield">
            <div className={`thumb${rw >= rh * 1.2 ? " wide" : ""}`} style={v ? { backgroundImage: `url("${String(v).replace(/["\\\n]/g, "")}")` } : undefined}>{v ? "" : "없음"}</div>
            <div>
              <div className="rec">권장 <b>{rw} × {rh}px</b> · {ratio}</div>
              <div className="meta">JPG·PNG · 5MB 이하 · 가로 최소 {Math.round(rw / 2)}px 이상<br />{v ? "등록됨" : "아직 등록된 사진이 없어요"}</div>
              <div className="btns">
                <label className="btn btn-ghost sm filebtn">
                  {v ? "교체" : "올리기"}
                  <input type="file" accept="image/*" onChange={(e) => { onImg(e.target.files?.[0], p, rw, rh); e.target.value = ""; }} />
                </label>
                {v && <button type="button" className="btn btn-ghost sm" onClick={() => setPath(p, "")}>삭제</button>}
              </div>
            </div>
          </div>
        </div>
      );
    }
    if (f.t !== "list") return null;
    const arr: any[] = v || [];
    const canAdd = !f.fixed && arr.length < (f.max || 12);
    return (
      <div key={key} className="fld">
        {lab}
        <div className="items">
          {arr.map((it, i) => (
            <div key={i} className="item">
              <div className="item-head">
                <b>{f.item} {i + 1}</b>
                {!f.fixed && (
                  <div className="tools">
                    <button type="button" className="ib" title="위로" disabled={i === 0} onClick={() => moveItem(p, i, -1)}>▲</button>
                    <button type="button" className="ib" title="아래로" disabled={i === arr.length - 1} onClick={() => moveItem(p, i, 1)}>▼</button>
                    <button type="button" className="ib" title="삭제" disabled={arr.length <= 1} onClick={() => delItem(p, i)}>✕</button>
                  </div>
                )}
              </div>
              {f.f.map((sf, j) => renderField(sf, `${p}.${i}`, it, `${i}-${j}`))}
            </div>
          ))}
        </div>
        {canAdd && <button type="button" className="addbtn" onClick={() => addItem(p)}>+ {f.item} 추가</button>}
      </div>
    );
  };

  /** 안내 문구 속 data-goto 링크 (예: 메인 페이지 → 강사 소개) */
  const onDrawerClick = (e: React.MouseEvent) => {
    const a = (e.target as HTMLElement).closest<HTMLElement>("a[data-goto]");
    if (a?.dataset.goto) { e.preventDefault(); goto(a.dataset.goto); }
  };

  const sch = editSec ? meta.sec[editSec] : null;

  return (
    <>
      <div className="dm-topbar">
        <div className="wrap topbar-inner">
          <div className="logo" style={{ color: "#fff" }}><span className="dot" />비주얼아카데미 <span className="dm-sub">· 디자인 모드</span></div>
          <div style={{ flex: 1 }} />
          <Link
            className="exit-dm"
            href={ROUTES.admin}
            onClick={(e) => { if (anyDirty && !window.confirm("게시하지 않은 초안이 있어요. 나가면 초안이 사라져요. 나갈까요?")) e.preventDefault(); }}
          >
            ← 대시보드로 나가기
          </Link>
        </div>
      </div>

      <div className={`wrap dm-main${drawer ? " dr-open" : ""}`}>
        <div className="page-head">
          <div>
            <h1>{meta.h1}</h1>
            <p>{meta.sub}</p>
          </div>
          <div className="actions">
            <span className="dirty">
              {dirty ? <><span className="draft-dot" />초안 <b>{dirty}</b>개 수정 · 아직 사이트에 적용 안 됨</> : "게시된 내용과 같아요"}
            </span>
            <button type="button" className="btn btn-ghost" onClick={() => setModal({ kind: "history" })}>버전 기록</button>
            <button type="button" className="btn btn-ghost" disabled={!dirty} onClick={() => setModal({ kind: "reset" })}>변경 취소</button>
            <button type="button" className="btn btn-mint" disabled={!dirty} onClick={() => { setPubNote(""); setModal({ kind: "publish" }); }}>게시하기</button>
          </div>
        </div>

        <div className="pagechips">
          {EDITOR_KEYS.map((k) => {
            const d = states[k].saved !== JSON.stringify(states[k].D);
            return (
              <button key={k} type="button" className={`pg${k === cur ? " on" : ""}`} onClick={() => switchPage(k)}>
                {PAGES[k].name}
                {d && <span className="soon draft">초안</span>}
              </button>
            );
          })}
        </div>

        <div className="layout">
          <section className="preview-col">
            <div className="pv-head">
              <p>{meta.pv}</p>
              <div className="pv-tools">
                <button type="button" className={`btn btn-ghost sm${drawer && !editSec ? " on" : ""}`} onClick={openList}>☰ 영역 목록 · 순서 · 숨기기</button>
                <div className="pv-tabs">
                  <button type="button" className={!mobile ? "on" : undefined} onClick={() => setMobile(false)}>PC</button>
                  <button type="button" className={mobile ? "on" : undefined} onClick={() => setMobile(true)}>모바일</button>
                </div>
              </div>
            </div>
            <div className="modebar">
              <div className="pv-tabs" style={{ opacity: previewVer !== null ? 0.4 : 1 }}>
                <button type="button" className={mode === "draft" && previewVer === null ? "on" : undefined} onClick={() => { setMode("draft"); setPreviewVer(null); }}>수정 중 (초안)</button>
                <button type="button" className={mode === "live" && previewVer === null ? "on" : undefined} onClick={() => { setMode("live"); setPreviewVer(null); }}>지금 사이트 화면</button>
              </div>
              {!readOnly && <span className="modehint">고치고 싶은 곳을 클릭</span>}
            </div>
            {previewVer !== null ? (
              <div className="banner">
                <span>v{previewVer} · {st.hist.find((h) => h.id === previewVer)?.time} 버전을 보는 중이에요 (보기만 가능)</span>
                <span className="bb">
                  <button type="button" className="pr" onClick={() => askRestore(previewVer)}>이 버전으로 복구</button>
                  <button type="button" onClick={() => setPreviewVer(null)}>닫기</button>
                </span>
              </div>
            ) : mode === "live" ? (
              <div className="banner">
                <span>지금 사이트에 보이는 화면이에요 (보기만 가능)</span>
                <span className="bb"><button type="button" onClick={() => setMode("draft")}>수정으로 돌아가기</button></span>
              </div>
            ) : null}
            <div className="pv-frame">
              <div className="pv-bar"><i /><i /><i /><span>{meta.url}{mobile ? " · 모바일 390px" : ""}</span></div>
              <div className={`pv-stage${mobile ? " mob" : ""}`} ref={stageRef}>
                <div className="pv-box" style={{ width: mobile ? vw * zoom : "100%", height: stage.h || undefined }}>
                  <iframe
                    ref={frameRef}
                    title={`${meta.name} 미리보기`}
                    className="pv-iframe"
                    style={{ width: mobile ? vw : Math.max(vw, stage.w / zoom), height: frameH, transform: `scale(${zoom})` }}
                  />
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* 편집 서랍 — PC: 오른쪽, 1000px 이하: 아래에서 올라오는 시트 */}
      <aside className={`drawer${drawer ? " open" : ""}`} aria-label="편집 패널" aria-hidden={!drawer}>
        <div className="dr-head">
          {sch && editSec ? (
            <>
              <h3>{sch.name}<small>{sch.sub}</small></h3>
              <button type="button" className="btn btn-ghost" onClick={openList}>☰ 목록</button>
              <button type="button" className="btn btn-mint" onClick={closeDrawer}>완료</button>
            </>
          ) : (
            <>
              <h3>영역 목록<small>{meta.fixed ? "이 페이지는 구성이 고정이에요" : "▲▼ 순서 · 스위치로 숨기기"}</small></h3>
              <button type="button" className="btn btn-mint" onClick={closeDrawer}>닫기</button>
            </>
          )}
        </div>
        <div className="dr-body" ref={drBodyRef} onClick={onDrawerClick}>
          {sch && editSec ? (
            <>
              {!meta.fixed && (
                <div className="dr-vis">
                  <span>{D.visible[editSec] ? "이 영역이 사이트에 보여요" : "숨김 — 사이트에 보이지 않아요"}</span>
                  <button type="button" className={`sw${D.visible[editSec] ? " on" : ""}`} aria-label="노출" onClick={() => toggleVis(editSec)} />
                </div>
              )}
              <section className="sec edit" id={`sec-${editSec}`}>
                <div className="sec-body">{D[editSec] ? sch.fields.map((f, j) => renderField(f, editSec, D[editSec], String(j))) : null}</div>
              </section>
            </>
          ) : (
            <>
              <p className="dr-hint">고칠 영역을 누르세요. 화면에서 직접 클릭해도 돼요.</p>
              {meta.common && (
                <div className="note" style={{ margin: "0 0 12px" }}>
                  <b>상단 메뉴 · 푸터</b>는 모든 페이지 공통이에요.{" "}
                  <a href="#" data-goto="main:nav">메인 페이지에서 수정</a>하면 이 페이지에도 똑같이 적용돼요.
                </div>
              )}
              <div className="secs">
                {D.order.map((id, i) => {
                  const s = meta.sec[id];
                  if (!s) return null;
                  const on = D.visible[id];
                  return (
                    <section key={id} className={`sec lrow${on ? "" : " hidden-sec"}`}>
                      <div className="sec-head" onClick={() => selectSec(id)}>
                        <span className="sec-num">{i + 1}</span>
                        <h3 className="sec-title">{s.name}<small>{on ? s.sub : "숨김"}</small></h3>
                        {!meta.fixed && (
                          <div className="sec-tools" onClick={(e) => e.stopPropagation()}>
                            <button type="button" className="ib" title="위로" disabled={i === 0} onClick={() => moveSec(id, -1)}>▲</button>
                            <button type="button" className="ib" title="아래로" disabled={i === D.order.length - 1} onClick={() => moveSec(id, 1)}>▼</button>
                            <button type="button" className={`sw${on ? " on" : ""}`} title={on ? "보이는 중" : "숨김"} aria-label="노출" onClick={() => toggleVis(id)} />
                          </div>
                        )}
                        <span className="chev">›</span>
                      </div>
                    </section>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </aside>

      {modal && (
        <div className="ov" onClick={(e) => e.target === e.currentTarget && setModal(null)}>
          <div className="md" role="dialog" aria-modal="true">
            {modal.kind === "publish" && (
              <>
                <div className="md-h">
                  <h3>{meta.name}에 게시할까요?</h3>
                  <p>게시하면 지금 수정한 내용이 실제 사이트의 {meta.name}에 바로 적용돼요. 이전 버전은 기록에 남아서 언제든 되돌릴 수 있어요.</p>
                </div>
                <div className="md-b">
                  <div className="chg">{changedSecs().map((c) => <span key={c}>{c}</span>)}</div>
                  <div className="fld">
                    <label htmlFor="pubNote">변경 메모 <span className="hint">선택 · 나중에 버전을 찾을 때 도움돼요</span></label>
                    <input id="pubNote" type="text" autoFocus placeholder="예) 가을 기수 문구 수정" value={pubNote} onChange={(e) => setPubNote(e.target.value)} />
                  </div>
                </div>
                <div className="md-f">
                  <button type="button" className="btn btn-ghost" onClick={() => setModal(null)}>취소</button>
                  <button type="button" className="btn btn-mint" onClick={doPublish}>게시하기</button>
                </div>
              </>
            )}
            {modal.kind === "reset" && (
              <>
                <div className="md-h"><h3>수정한 내용을 취소할까요?</h3><p>게시 전 초안이 지금 사이트 상태로 돌아가요. 되돌릴 수 없어요.</p></div>
                <div className="md-f">
                  <button type="button" className="btn btn-ghost" onClick={() => setModal(null)}>계속 수정</button>
                  <button type="button" className="btn btn-mint" onClick={doReset}>변경 취소</button>
                </div>
              </>
            )}
            {modal.kind === "history" && (
              <>
                <div className="md-h"><h3>{meta.name} 버전 기록</h3><p>게시할 때마다 한 버전씩 쌓여요. 복구하면 그 버전이 초안으로 열리고, 게시를 눌러야 사이트에 적용돼요.</p></div>
                <div className="md-b">
                  <div className="vlist">
                    {[...st.hist].reverse().map((h) => (
                      <div key={h.id} className={`vit${h.id === curVer ? " cur" : ""}`}>
                        <div>
                          <b>v{h.id}{h.id === curVer && <span className="tag">현재 게시 중</span>}</b>
                          <small>{h.time} · {h.note}</small>
                        </div>
                        <div className="vb">
                          <button type="button" className="btn btn-ghost sm" onClick={() => { setModal(null); setPreviewVer(h.id); }}>보기</button>
                          {h.id !== curVer && <button type="button" className="btn btn-ghost sm" onClick={() => askRestore(h.id)}>복구</button>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="md-f"><button type="button" className="btn btn-ghost" onClick={() => setModal(null)}>닫기</button></div>
              </>
            )}
            {modal.kind === "restore" && (
              <>
                <div className="md-h"><h3>v{modal.id} 으로 복구할까요?</h3><p>지금 수정 중인 초안은 사라져요. 사이트는 게시하기 전까지 그대로예요.</p></div>
                <div className="md-f">
                  <button type="button" className="btn btn-ghost" onClick={() => setModal(null)}>취소</button>
                  <button type="button" className="btn btn-mint" onClick={() => doRestore(modal.id)}>복구하기</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      {toast}
    </>
  );
}
