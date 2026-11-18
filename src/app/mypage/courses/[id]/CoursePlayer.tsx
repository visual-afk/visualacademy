"use client";

import Player from "@vimeo/player";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Course, LessonProgress } from "@/lib/vod";

const DONE_RATIO = 0.9;
const SAVE_EVERY_SEC = 15;

const mmss = (s: number | null | undefined) => (s ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}` : "");

export default function CoursePlayer({ course }: { course: Course }) {
  const { videos } = course;
  const firstUndone = videos.find((v) => !course.progress[v.id]?.done)?.id;
  const [currentId, setCurrentId] = useState(
    (course.lastVideoId && videos.some((v) => v.id === course.lastVideoId) ? course.lastVideoId : firstUndone) ?? videos[0]?.id ?? null,
  );
  const [progress, setProgress] = useState<LessonProgress>(course.progress);
  const [error, setError] = useState("");
  const box = useRef<HTMLDivElement>(null);
  const current = videos.find((v) => v.id === currentId) ?? null;
  // 이어보기 위치는 강의를 고를 때의 값만 쓴다 (재생 중 저장으로 플레이어를 다시 만들지 않게)
  const startAt = useRef(0);

  useEffect(() => {
    if (!box.current || !current) return;
    const p = progress[current.id];
    startAt.current = p && !p.done ? p.sec : 0;
    const player = new Player(box.current, {
      url: `https://vimeo.com/${current.vimeoId}${current.vimeoHash ? `/${current.vimeoHash}` : ""}`,
      responsive: true,
      dnt: true,
    });
    let lastSaved = -SAVE_EVERY_SEC;
    let last = { sec: 0, dur: 0 };

    const save = async (sec: number, dur: number) => {
      lastSaved = sec;
      const res = await fetch(`/api/me/courses/${course.classId}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId: current.id, sec, dur }),
        keepalive: true,
      }).catch(() => null);
      if (res?.ok) {
        setProgress((pr) => ({ ...pr, [current.id]: { sec: Math.floor(sec), dur: Math.floor(dur), done: Boolean(pr[current.id]?.done) || sec >= dur * DONE_RATIO } }));
      }
    };

    player.on("loaded", () => {
      if (startAt.current > 5) player.setCurrentTime(startAt.current).catch(() => {});
    });
    player.on("timeupdate", ({ seconds, duration }) => {
      last = { sec: seconds, dur: duration };
      if (Math.abs(seconds - lastSaved) >= SAVE_EVERY_SEC) save(seconds, duration);
    });
    player.on("pause", ({ seconds, duration }) => save(seconds, duration));
    player.on("ended", ({ duration }) => save(duration, duration));
    player.on("error", () => setError("영상을 불러오지 못했어요. 잠시 후 다시 시도하거나 카카오채널로 문의해주세요."));

    return () => {
      if (last.dur > 0) save(last.sec, last.dur);
      player.destroy().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 강의를 바꿀 때만 플레이어를 새로 만든다
  }, [currentId]);

  const doneCount = videos.filter((v) => progress[v.id]?.done).length;
  const pct = videos.length ? Math.round((doneCount / videos.length) * 100) : 0;

  return (
    <div className="wrap course-wrap">
      <p className="crumb"><Link href="/mypage?tab=online">마이페이지</Link> › 온라인 강의</p>
      <div className="course-head">
        <h1>{course.name}</h1>
        <p>
          {doneCount}/{videos.length}강 완료 · {pct}%
          {course.expiresAt && <> · 수강기한 {course.expiresAt.slice(0, 10).replaceAll("-", ".")}까지</>}
        </p>
      </div>

      {videos.length === 0 ? (
        <p className="course-empty">강의 영상을 준비하고 있어요. 등록되면 이곳에서 바로 볼 수 있어요.</p>
      ) : (
        <div className="course-layout">
          <div className="course-stage">
            <div ref={box} key={currentId} className="course-video" />
            {error && <p className="course-error">{error}</p>}
            {current && <p className="course-now">{current.title}</p>}
          </div>
          <ol className="course-list">
            {videos.map((v, i) => {
              const p = progress[v.id];
              return (
                <li key={v.id}>
                  <button type="button" className={v.id === currentId ? "on" : undefined} onClick={() => { setError(""); setCurrentId(v.id); }}>
                    <span className="cl-no">{i + 1}</span>
                    <span className="cl-title">{v.title}</span>
                    <span className="cl-meta">{p?.done ? "완료" : p?.sec ? `${mmss(p.sec)} 시청` : mmss(v.durationSec)}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </div>
  );
}
