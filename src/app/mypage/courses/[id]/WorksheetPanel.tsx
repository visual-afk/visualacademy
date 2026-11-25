"use client";

import { useEffect, useRef, useState } from "react";
import type { WsState } from "@/lib/twokplan";
import type { CourseVideo, WorksheetSync } from "@/lib/vod";

/*
 * 강의 아래 워크시트 — 기존 2000플랜·오토사장반 위젯을 iframe 으로 띄운다 (public/worksheets, scripts/sync-worksheet-widgets.mjs).
 * 채점·결과 메일은 기존 Workers 가 하고, 여기선 제출되면 서버에 다시 확인을 요청해 다음 강의를 연다.
 */

const widgetUrl = (v: CourseVideo, email: string) => {
  const ws = v.ws!;
  const q = new URLSearchParams({ email });
  if (ws.source === "2000plan") {
    q.set("part", String(ws.part));
    q.set("lecture", String(ws.lecture ?? 0));
    return `/worksheets/2000plan.html?${q}`;
  }
  return `/worksheets/autoceo-part${ws.part}.html?${q}`;
};

type Props = {
  classId: number;
  video: CourseVideo;
  watched: boolean;
  email: string | null;
  state: WsState | undefined;
  onSync: (s: WorksheetSync) => void;
};

export default function WorksheetPanel({ classId, video, watched, email, state, onSync }: Props) {
  const [editing, setEditing] = useState(!email);
  const [draft, setDraft] = useState(email ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [rewrite, setRewrite] = useState(false);
  const [height, setHeight] = useState(720);
  const frame = useRef<HTMLIFrameElement>(null);

  const sync = async (body: { email?: string } = {}) => {
    const res = await fetch(`/api/me/courses/${classId}/worksheets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => null);
    const d = await res?.json().catch(() => null);
    if (!res?.ok) throw new Error(d?.error ?? "확인하지 못했어요. 잠시 후 다시 시도해 주세요.");
    onSync(d as WorksheetSync);
    return d as WorksheetSync;
  };

  // 위젯에서 제출 성공 → 서버가 2000플랜 DB 를 다시 보고 다음 강의를 연다
  useEffect(() => {
    const onMessage = async (e: MessageEvent) => {
      if (e.origin !== location.origin || e.source !== frame.current?.contentWindow || e.data?.source !== "va-worksheet") return;
      if (e.data.type === "height") setHeight(Math.max(720, Number(e.data.h) || 0));
      if (e.data.type === "submitted") {
        // 워커는 저장한 뒤에 응답하지만, 혹시 늦으면 한 번 더 본다
        const s = await sync().catch(() => null);
        if (!s?.states[video.id]) setTimeout(() => sync().catch(() => {}), 3000);
        setRewrite(false);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 강의가 바뀔 때만 다시 건다
  }, [video.id]);

  const saveEmail = async () => {
    setError("");
    setBusy(true);
    try {
      await sync({ email: draft });
      setEditing(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="ws-panel">
      <div className="ws-head">
        <h2>워크시트</h2>
        <p>강의 내용을 내 매장에 대입해 써 보세요. 제출하면 AI 첨삭 결과가 이메일로 와요.</p>
      </div>

      {!watched ? (
        <p className="ws-wait">영상을 끝까지 보면 워크시트를 쓸 수 있어요. 워크시트를 내야 다음 강의가 열려요.</p>
      ) : editing || !email ? (
        <div className="ws-email">
          <label htmlFor="ws-email">채점 결과를 받을 이메일</label>
          <p className="ws-sub">아임웹에서 2000플랜·오토사장반 워크시트를 낸 적 있다면 그때 쓴 이메일을 넣어 주세요. 지난 제출이 이어져요.</p>
          <div className="ws-email-row">
            <input id="ws-email" type="email" inputMode="email" placeholder="you@example.com" value={draft} onChange={(e) => setDraft(e.target.value)} />
            <button type="button" className="btn btn-mint" onClick={saveEmail} disabled={busy || !draft.trim()}>{busy ? "확인 중…" : "저장"}</button>
            {email && <button type="button" className="btn btn-ghost" onClick={() => { setEditing(false); setDraft(email); setError(""); }}>취소</button>}
          </div>
          {error && <p className="ws-error">{error}</p>}
        </div>
      ) : (
        <>
          <div className="ws-status">
            {state ? (
              <p>
                <b>✓ 제출했어요</b> · {state.status === "scored" ? `채점 결과를 ${email}로 보냈어요` : `채점 중이에요. 몇 분 안에 ${email}로 결과가 와요`}
              </p>
            ) : (
              <p>채점 결과는 <b>{email}</b>로 보내드려요</p>
            )}
            <div className="ws-actions">
              <button type="button" className="link-btn" onClick={() => setEditing(true)}>이메일 바꾸기</button>
              {state && <button type="button" className="link-btn" onClick={() => setRewrite((r) => !r)}>{rewrite ? "닫기" : "다시 제출하기"}</button>}
            </div>
          </div>
          {(!state || rewrite) && (
            <iframe
              ref={frame}
              key={`${video.id}-${email}`}
              className="ws-frame"
              src={widgetUrl(video, email)}
              title={`${video.title} 워크시트`}
              style={{ height }}
            />
          )}
        </>
      )}
    </section>
  );
}
