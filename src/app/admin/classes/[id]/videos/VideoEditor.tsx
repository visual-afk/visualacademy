"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/components/common/useToast";
import { ROUTES } from "@/data/site";

type Row = { id?: string; title: string; url: string };

export default function VideoEditor({ classId, name, initial }: { classId: number; name: string; initial: Row[] }) {
  const [rows, setRows] = useState<Row[]>(initial.length ? initial : [{ title: "", url: "" }]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { toast, showToast } = useToast();
  const router = useRouter();

  const set = (i: number, change: Partial<Row>) => {
    setError("");
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...change } : r)));
  };
  const move = (i: number, d: -1 | 1) =>
    setRows((rs) => {
      const next = [...rs];
      [next[i], next[i + d]] = [next[i + d], next[i]];
      return next;
    });

  const save = async () => {
    const filled = rows.filter((r) => r.title.trim() || r.url.trim());
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/classes/${classId}/videos`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videos: filled }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) return setError(d.error ?? "저장하지 못했어요");
      showToast("저장했어요 · 수강생 강의 화면에 바로 반영돼요");
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="wrap">
      <div className="page-head">
        <div>
          <p className="crumb"><Link href={ROUTES.admin}>관리자</Link> &nbsp;›&nbsp; 강의 영상</p>
          <h1>{name}</h1>
          <p>Vimeo 영상 주소를 강의 순서대로 넣어주세요. 비공개 링크(vimeo.com/123456/abcdef)도 그대로 붙여 넣으면 돼요.</p>
        </div>
        <button type="button" className="btn btn-mint" onClick={save} disabled={busy}>{busy ? "저장 중…" : "저장하기"}</button>
      </div>

      <div className="table-card">
        <div className="table-scroll">
          <table>
            <thead><tr><th style={{ width: 48 }}>순서</th><th>강의 제목</th><th>Vimeo 주소</th><th style={{ width: 150 }} /></tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id ?? `new-${i}`}>
                  <td className="cell-order">{i + 1}강</td>
                  <td><input className="search" style={{ width: "100%" }} placeholder="예) 1강 모발의 구조" value={r.title} onChange={(e) => set(i, { title: e.target.value })} /></td>
                  <td><input className="search" style={{ width: "100%" }} placeholder="https://vimeo.com/123456789" value={r.url} onChange={(e) => set(i, { url: e.target.value })} /></td>
                  <td>
                    <div className="row-actions">
                      <button type="button" className="ca-btn" disabled={i === 0} onClick={() => move(i, -1)} aria-label="위로">↑</button>
                      <button type="button" className="ca-btn" disabled={i === rows.length - 1} onClick={() => move(i, 1)} aria-label="아래로">↓</button>
                      <button type="button" className="ca-btn danger" onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))}>삭제</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ padding: 16 }}>
          <button type="button" className="ca-btn" onClick={() => setRows((rs) => [...rs, { title: "", url: "" }])}>+ 강의 추가</button>
          {error && <p className="err" style={{ color: "var(--red-d)", fontSize: 13, margin: "12px 0 0" }}>{error}</p>}
        </div>
      </div>
      <p className="cell-tax">
        Vimeo에서 영상마다 공개 범위를 &lsquo;숨김&rsquo;이나 &lsquo;비공개 링크&rsquo;로 두고, 임베드 허용 도메인에 아카데미 주소를 넣어주세요. 강의를 지우면 그 강의의 수강 진도도 함께 사라져요.
      </p>
      {toast}
    </div>
  );
}
