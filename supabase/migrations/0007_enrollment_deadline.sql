-- 온라인 수강기한 개인별 관리 — SQL Editor 에서 0006 다음에 한 번 실행한다.

-- 수강권이 어디서 왔는지 (결제 · 관리자 직접 부여 · 아임웹 이관) 와 내부 메모
alter table enrollments add column if not exists source text not null default 'order' check (source in ('order','admin','imweb'));
alter table enrollments add column if not exists note text;

-- 기한 변경 이력 — 결제 발급·재결제 연장·관리자 변경·회수를 전부 남긴다 (서버 전용)
create table if not exists enrollment_changes (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references enrollments(id) on delete cascade,
  kind text not null check (kind in ('grant','repurchase','change','revoke')),
  prev_expires_at timestamptz,
  new_expires_at timestamptz,  -- null = 무제한
  order_id uuid references orders(id) on delete set null,  -- 결제로 생긴 변경 (재결제가 취소되면 이걸로 되돌린다)
  reason text,
  actor text not null,         -- 관리자 이름 · 'system'
  created_at timestamptz not null default now()
);
create index if not exists enrollment_changes_enrollment_idx on enrollment_changes(enrollment_id, created_at desc);
alter table enrollment_changes enable row level security;
