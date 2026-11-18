-- 온라인 강의 영상 (Vimeo) · 강의별 진도 — SQL Editor 에서 0003 다음에 한 번 실행한다.

-- 영상 주소는 수강생에게만 내려줘야 해서 공개 읽기인 class_contents 가 아니라 정책 없는(서버 전용) 테이블에 둔다
create table if not exists class_videos (
  id uuid primary key default gen_random_uuid(),
  class_id bigint not null references classes(id) on delete cascade,
  sort_order int not null default 0,
  title text not null,
  vimeo_id text not null,
  vimeo_hash text,            -- 비공개(링크 공유) 영상의 h= 값
  duration_sec int,           -- 처음 재생될 때 플레이어가 알려준 길이로 채운다
  created_at timestamptz not null default now()
);
create index if not exists class_videos_class_idx on class_videos(class_id, sort_order);
alter table class_videos enable row level security;

-- 강의별 진도 { [video_id]: { sec, dur, done } } · 마지막으로 본 강의
alter table enrollments add column if not exists lesson_progress jsonb not null default '{}'::jsonb;
alter table enrollments add column if not exists last_video_id uuid;
