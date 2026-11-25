-- 온라인 강의 시청 추적 · 순서 잠금 — SQL Editor 에서 0007 다음에 한 번 실행한다.

alter table enrollments add column if not exists started_at timestamptz;       -- 첫 재생
alter table enrollments add column if not exists last_watched_at timestamptz;  -- 마지막 시청 (안 보는 사람 알림 기준)
alter table enrollments add column if not exists completed_at timestamptz;     -- 완강
-- 순서 잠금 해제 (아임웹에서 이미 듣던 수강생 등) — 관리자가 켠다
alter table enrollments add column if not exists unlock_all boolean not null default false;
create index if not exists enrollments_last_watched_idx on enrollments(last_watched_at);
