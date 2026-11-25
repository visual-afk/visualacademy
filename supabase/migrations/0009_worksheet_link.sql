-- 온라인 강의 ↔ 기존 워크시트(2000플랜 · 오토사장반) 연결 — SQL Editor 에서 0008 다음에 한 번 실행한다.
-- 워크시트 문항·제출·AI 채점·결과 메일은 그대로 2000플랜 Supabase/Workers 에 있다. 여기엔 어느 강의에 어느 워크시트를 붙일지만 둔다.

-- 강의(영상)마다 붙일 워크시트: 2000플랜 = 파트·강, 오토사장반 = 파트
alter table class_videos add column if not exists ws_source text check (ws_source in ('2000plan','autoceo'));
alter table class_videos add column if not exists ws_part int;
alter table class_videos add column if not exists ws_lecture int;

-- 워크시트를 낸 강의 id (2000플랜 DB 에서 확인한 결과를 담아 둔다 — 15초마다 진도 저장할 때 다른 DB 를 안 보려고)
alter table enrollments add column if not exists ws_done jsonb not null default '[]'::jsonb;

-- 워크시트 채점 결과를 받을 이메일 (비우면 profiles.email). 2000플랜·오토사장반은 이메일로 사람을 구분한다
alter table profiles add column if not exists worksheet_email text;
