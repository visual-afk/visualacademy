/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "@/components/common/useToast";
import { ROUTES } from "@/data/site";
import { DEFAULT_CONTENT, type ContentPageKey, type PageContent } from "@/data/siteContent";
import { esc, PREVIEWS } from "./previews";
import { PAGES, type Field } from "./schemas";

/*
 * 디자인 모드(페이지 관리) — 고객용 7개 페이지의 문구·사진·영역 순서/노출을 편집한다.
 * 초안(draft) → 게시(publish) → 버전 기록/복구 흐름.
 * 지금은 게시본·버전 기록을 이 브라우저(localStorage)에 저장한다.
 * 백엔드 연동 시: 게시 = PUT /api/content/:page, 버전 = GET /api/content/:page/versions
 */

interface Version { id: number; time: string; note: string; data: string }
interface PageState { D: PageContent; saved: string; hist: Version[]; next: number; openSec: string | null }
type Modal = { kind: "publish" } | { kind: "reset" } | { kind: "history" } | { kind: "restore"; id: number } | null;

const KEYS = Object.keys(PAGES) as ContentPageKey[];
const LS = (k: ContentPageKey) => `va-design:${k}`;
const TSK = ["fs", "ls", "lh", "fw", "al"] as const;

const fmt = (d: Date) => d.toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "numeric", minute: "2-digit" });
const clone = <T,>(o: T): T => JSON.parse(JSON.stringify(o));

function loadState(k: ContentPageKey): PageState {
  const def = clone(DEFAULT_CONTENT[k]);
  const fresh: PageState = { D: def, saved: JSON.stringify(def), hist: [{ id: 1, time: fmt(new Date()), note: "최초 상태", data: JSON.stringify(def) }], next: 2, openSec: PAGES[k].first };
  try {
    const raw = localStorage.getItem(LS(k));
    if (!raw) return fresh;
    const p = JSON.parse(raw) as { saved: string; hist: Version[]; next: number };
    return { D: JSON.parse(p.saved), saved: p.saved, hist: p.hist, next: p.next, openSec: PAGES[k].first };
  } catch {
    return fresh;
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

export default function DesignMode() {
  const [cur, setCur] = useState<ContentPageKey>("main");
  const [states, setStates] = useState<Record<ContentPageKey, PageState>>(
    () => Object.fromEntries(KEYS.map((k) => [k, loadState(k)])) as Record<ContentPageKey, PageState>,
  );
  const [mode, setMode] = useState<"draft" | "live">("draft");
  const [previewVer, setPreviewVer] = useState<number | null>(null);
  const [mobile, setMobile] = useState(false);
  const [modal, setModal] = useState<Modal>(null);
  const [pubNote, setPubNote] = useState("");
  const [tsOpen, setTsOpen] = useState<Set<string>>(new Set());
  const { toast, showToast } = useToast(2600);
  const pvRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const meta = PAGES[cur];
  const st = states[cur];
  const D = st.D;
  const savedObj = useMemo(() => JSON.parse(st.saved), [st.saved]);
  const dirty = diffCount(savedObj, D);
  const readOnly = mode === "live" || previewVer !== null;

  const viewData: any = useMemo(() => {
    if (previewVer !== null) return JSON.parse(st.hist.find((h) => h.id === previewVer)!.data);
    return mode === "live" ? savedObj : D;
  }, [previewVer, mode, savedObj, D, st.hist]);

  /* 저장되지 않은 초안이 있으면 이탈 경고 */
  const anyDirty = KEYS.some((k) => states[k].saved !== JSON.stringify(states[k].D));
  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => { if (anyDirty) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [anyDirty]);

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

  const scrollPv = (id: string) => {
    requestAnimationFrame(() => {
      const el = pvRef.current?.querySelector<HTMLElement>(`[data-s="${id}"]`);
      const sc = scrollRef.current;
      if (el && sc) sc.scrollTo({ top: Math.max(0, el.offsetTop - 40), behavior: "smooth" });
    });
  };
  const selectSec = (id: string, scrollForm = true) => {
    patchState((s) => ({ ...s, openSec: id }));
    scrollPv(id);
    if (scrollForm) {
      requestAnimationFrame(() => {
        const el = document.getElementById("sec-" + id);
        if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 84, behavior: "smooth" });
      });
    }
  };
  const toggleSec = (id: string) => {
    const next = st.openSec === id ? null : id;
    patchState((s) => ({ ...s, openSec: next }));
    if (next) scrollPv(next);
  };
  const switchPage = (k: ContentPageKey) => {
    if (k === cur) return;
    setCur(k);
    setMode("draft");
    setPreviewVer(null);
    scrollRef.current?.scrollTo({ top: 0 });
  };

  /* ── 미리보기 HTML ── */
  const html = useMemo(() => {
    const pv = PREVIEWS[cur];
    const act = readOnly ? null : st.openSec;
    return viewData.order.map((id: string) => {
      const on = act === id;
      const nm = meta.sec[id]?.name ?? id;
      const chip = `<span class="chip ${on ? "edit" : "hov"}">${esc(nm)}</span>`;
      if (!viewData.visible[id]) return `<div class="pvs off ${on ? "act" : ""}" data-s="${id}">${chip}숨김 영역 — ${esc(nm)}${readOnly ? "" : " (클릭해서 수정)"}</div>`;
      return `<div class="pvs ${on ? "act" : ""}" data-s="${id}">${chip}${pv[id] ? pv[id](viewData[id], viewData) : ""}</div>`;
    }).join("");
  }, [cur, viewData, readOnly, st.openSec, meta]);

  /* 'Aa 글자 스타일' — 미리보기에서 같은 글이 들어간 요소를 찾아 스타일 적용 (프로토타입 applyTS) */
  useEffect(() => {
    if (!meta.tstyle || !pvRef.current) return;
    const norm = (t: string) => String(t).replace(/\*\*/g, "").replace(/\s+/g, "");
    for (const id of viewData.order as string[]) {
      if (!viewData.visible[id]) continue;
      const root = pvRef.current.querySelector(`[data-s="${id}"]`);
      if (!root) continue;
      const els = [...root.querySelectorAll<HTMLElement>("*")].filter((e) => !e.closest(".chip"));
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
            if (s.fs) el.style.fontSize = (parseFloat(getComputedStyle(el).fontSize) * s.fs) / 100 + "px";
            if (s.ls !== undefined && s.ls !== "") el.style.letterSpacing = s.ls / 100 + "em";
            if (s.lh) el.style.lineHeight = String(s.lh / 100);
            if (s.fw) el.style.fontWeight = s.fw;
            if (s.al) { const b = getComputedStyle(el).display === "inline" ? el.parentElement! : el; b.style.textAlign = s.al; }
          } else walk(o[key]);
        }
      };
      walk(viewData[id]);
    }
  }, [html, meta.tstyle, viewData]);

  const onPreviewClick = (e: React.MouseEvent) => {
    if (readOnly) return;
    const s = (e.target as HTMLElement).closest<HTMLElement>(".pvs");
    if (s?.dataset.s) selectSec(s.dataset.s);
  };

  /* ── 영역 순서·노출 ── */
  const moveSec = (id: string, d: number) => editD((x) => {
    const i = x.order.indexOf(id), j = i + d;
    if (j < 0 || j >= x.order.length) return;
    [x.order[i], x.order[j]] = [x.order[j], x.order[i]];
  });
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
        setPath(p, c.toDataURL("image/jpeg", 0.85));
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
            <div className="thumb" style={v ? { backgroundImage: `url(${v})` } : undefined}>{v ? "" : "없음"}</div>
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

  return (
    <>
      <div className="dm-topbar">
        <div className="wrap topbar-inner">
          <div className="logo" style={{ color: "#fff" }}><span className="dot" />비주얼아카데미 <span style={{ fontWeight: 500, opacity: 0.7 }}>· 디자인 모드</span></div>
          <div style={{ flex: 1 }} />
          <Link className="exit-dm" href={ROUTES.admin}>← 대시보드로 나가기</Link>
        </div>
      </div>

      <div className="wrap">
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
          {KEYS.map((k) => {
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
          <aside className="preview-col">
            <div className="pv-head">
              <p>{meta.pv}</p>
              <div className="pv-tabs">
                <button type="button" className={!mobile ? "on" : undefined} onClick={() => setMobile(false)}>PC</button>
                <button type="button" className={mobile ? "on" : undefined} onClick={() => setMobile(true)}>모바일</button>
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
              <div className="pv-bar"><i /><i /><i /><span>{meta.url}</span></div>
              <div className={`pv-scroll${mobile ? " mob" : ""}`} ref={scrollRef}>
                <div
                  ref={pvRef}
                  className={`pv${!readOnly && st.openSec ? " has-active" : ""}${readOnly ? " viewonly" : ""}`}
                  onClick={onPreviewClick}
                  dangerouslySetInnerHTML={{ __html: html }}
                />
              </div>
            </div>
          </aside>

          <main>
            <p className="sec-intro">
              {meta.fixed
                ? "왼쪽 화면에서 고치고 싶은 곳을 클릭하거나, 아래 목록에서 영역을 골라보세요. 이 페이지는 구성이 고정이라 순서 변경·숨기기는 없어요."
                : "왼쪽 화면에서 고치고 싶은 곳을 클릭하거나, 아래 목록에서 영역을 골라보세요. ▲▼로 순서를 바꾸고 스위치로 숨길 수 있어요."}
            </p>
            <div className="secs">
              {meta.common && (
                <div className="note" style={{ margin: "0 0 4px" }}>
                  <b>상단 메뉴 · 푸터</b>는 모든 페이지 공통이에요.{" "}
                  <a href="#" onClick={(e) => { e.preventDefault(); switchPage("main"); setStates((all) => ({ ...all, main: { ...all.main, openSec: "nav" } })); }}>메인 페이지에서 수정</a>하면 이 페이지에도 똑같이 적용돼요.
                </div>
              )}
              {D.order.map((id, i) => {
                const s = meta.sec[id];
                if (!s) return null;
                const on = D.visible[id];
                const open = st.openSec === id;
                return (
                  <section key={id} id={`sec-${id}`} className={`sec${open ? " open focus" : ""}${on ? "" : " hidden-sec"}`}>
                    <div className="sec-head" onClick={() => toggleSec(id)}>
                      <span className="sec-num">{i + 1}</span>
                      <h3 className="sec-title">{s.name}<small>{on ? s.sub : `숨김 — ${meta.name}에 보이지 않아요`}</small></h3>
                      {!meta.fixed && (
                        <div className="sec-tools" onClick={(e) => e.stopPropagation()}>
                          <button type="button" className="ib" title="위로" disabled={i === 0} onClick={() => moveSec(id, -1)}>▲</button>
                          <button type="button" className="ib" title="아래로" disabled={i === D.order.length - 1} onClick={() => moveSec(id, 1)}>▼</button>
                          <button type="button" className={`sw${on ? " on" : ""}`} title={on ? "보이는 중" : "숨김"} aria-label="노출" onClick={() => toggleVis(id)} />
                        </div>
                      )}
                      <span className="chev">▼</span>
                    </div>
                    {open && <div className="sec-body">{s.fields.map((f, j) => renderField(f, id, D[id], String(j)))}</div>}
                  </section>
                );
              })}
            </div>
          </main>
        </div>
      </div>

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
