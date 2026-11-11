-- 회원가입 약관 동의 기록 (/signup)
alter table profiles add column if not exists agreed_at timestamptz;
alter table profiles add column if not exists marketing_opt_in boolean not null default false;
