"use client";

import Player from "@vimeo/player";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { reachOf, SAVE_EVERY_SEC, type LessonProgress } from "@/lib/lessons";
import type { Course, CourseVideo } from "@/lib/vod";

/** 이만큼(초)까지는 앞으로 넘겨도 건너뛰기로 보지 않는다 (버퍼링·키보드 →) */
const SEEK_SLACK_SEC = 3;

const mmss = (s: number | null | undefined) => (s ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}` : "");

type SaveResult = { pct: number; done: boolean; reach: number; videos: CourseVideo[] | null };

export default function CoursePlayer({ course }: { course: Course }) {
  const [videos, setVideos] = useState(course.videos);
  const open = videos.filter((v) => !v.locked);
  const firstUndone = open.find((v) => !course.progress[v.id]?.done)?.id;
  const [currentId, setCurrentId] = useState(
    (course.lastVideoId && open.some((v) => v.id === course.lastVideoId) ? course.lastVideoId : firstUndone) ?? open[0]?.id ?? null,
  );
  const [progress, setProgress] = useState<LessonProgress>(course.progress);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const box = useRef<HTMLDivElement>(null);
  const current = videos.find((v) => v.id === currentId && !v.locked) ?? null;
  const currentIdx = current ? videos.indexOf(current) : -1;
  const next = currentIdx >= 0 ? videos[currentIdx + 1] : undefined;
  // 이어보기 위치는 강의를 고를 때의 값만 쓴다 (재생 중 저장으로 플레이어를 다시 만들지 않게)
  const startAt = useRef(0);

  useEffect(() => {
    if (!box.current || !current) return;
    const p = progress[current.id];
    startAt.current = p && !p.done ? p.sec : 0;
    // 아직 완료하지 않은 강의는 본 데까지만 앞으로 갈 수 있다 (완료한 강의는 자유롭게)
    let reach = reachOf(p);
    let done = Boolean(p?.done);
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
      if (!res?.ok) return;
      const r = (await res.json().catch(() => null)) as SaveResult | null;
      if (!r) return;
      reach = Math.max(reach, r.reach);
      if (r.done && !done) {
        done = true;
        setNotice(next ? "이 강의를 완료했어요. 다음 강의가 열렸어요." : "모든 강의를 완료했어요. 수고 많으셨어요!");
      }
      setProgress((pr) => ({ ...pr, [current.id]: { sec: Math.floor(sec), dur: Math.floor(dur), done: Boolean(pr[current.id]?.done) || r.done, reach: r.reach } }));
      if (r.videos) setVideos(r.videos);
    };

    player.on("loaded", () => {
      if (startAt.current > 5) player.setCurrentTime(Math.min(startAt.current, reach)).catch(() => {});
    });
    player.on("timeupdate", ({ seconds, duration }) => {
      last = { sec: seconds, dur: duration };
      if (seconds <= reach + SEEK_SLACK_SEC) reach = Math.max(reach, seconds);
      if (Math.abs(seconds - lastSaved) >= SAVE_EVERY_SEC) save(seconds, duration);
    });
    player.on("seeked", ({ seconds }) => {
      if (done || seconds <= reach + SEEK_SLACK_SEC) return;
      player.setCurrentTime(reach).catch(() => {});
      setNotice("처음 듣는 강의는 아직 안 본 부분으로 건너뛸 수 없어요. 다 들은 뒤에는 자유롭게 돌려볼 수 있어요.");
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

  const pick = (v: CourseVideo) => {
    if (v.locked) return;
    setError("");
    setNotice("");
    setCurrentId(v.id);
  };

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
            <div ref={box} key={currentId ?? ""} className="course-video" />
            {error && <p className="course-error">{error}</p>}
            {current && <p className="course-now">{current.title}</p>}
            {notice && (
              <div className="course-notice">
                <p>{notice}</p>
                {next && !next.locked && progress[current?.id ?? ""]?.done && (
                  <button type="button" className="btn btn-mint" onClick={() => pick(next)}>다음 강의 보기</button>
                )}
              </div>
            )}
          </div>
          <ol className="course-list">
            {videos.map((v, i) => {
              const p = progress[v.id];
              return (
                <li key={v.id}>
                  <button
                    type="button"
                    className={v.id === currentId ? "on" : v.locked ? "locked" : undefined}
                    disabled={v.locked}
                    title={v.locked ? "앞 강의를 끝까지 들으면 열려요" : undefined}
                    onClick={() => pick(v)}
                  >
                    <span className="cl-no">{v.locked ? "🔒" : i + 1}</span>
                    <span className="cl-title">{v.title}</span>
                    <span className="cl-meta">{p?.done ? "완료" : v.locked ? mmss(v.durationSec) : p?.sec ? `${mmss(p.sec)} 시청` : mmss(v.durationSec)}</span>
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
