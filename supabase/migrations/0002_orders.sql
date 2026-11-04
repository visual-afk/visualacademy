-- 신청·결제 (토스 결제위젯) — SQL Editor 에서 0001 다음에 한 번 실행한다.

-- '승인중' = 토스 승인 API 를 부르는 동안 자리를 잡아 둔 상태 (정원 초과 방지)
alter table orders drop constraint if exists orders_status_check;
alter table orders add constraint orders_status_check
  check (status in ('결제대기','승인중','입금대기','수강확정','수강완료','취소신청','신청취소'));

alter table orders add column if not exists cancel_request jsonb;
alter table payments add column if not exists toss_secret text;  -- 가상계좌 입금 웹훅 검증용
alter table payments add column if not exists order_name text;
create unique index if not exists payments_order_unique on payments(order_id);

-- 신청 인원에 '승인중'·'취소신청'(환불 전이라 아직 자리 차지)도 센다
create or replace view class_with_counts as
select c.*,
  c.applied_base
  + coalesce((select count(*) from orders o where o.class_id = c.id and o.status in ('승인중','입금대기','수강확정','수강완료','취소신청')), 0)::int
  + case when c.type in ('waitlist','upcoming')
      then coalesce((select count(*) from waitlist_alerts w where w.class_id = c.id), 0)::int else 0 end
  as applied,
  cc.detail, cc.thumbnail_url, cc.banner_url, cc.detail_image_url
from classes c
left join class_contents cc on cc.class_id = c.id;

-- 결제 승인 직전 자리 잡기: 클래스 행을 잠그고 정원을 확인한 뒤 '승인중'으로 바꾼다.
-- 반환: 'ok' | 'full' | 'not_pending'(이미 처리된 주문)
create or replace function hold_seat(p_order uuid) returns text language plpgsql security definer as $$
declare
  v_class bigint;
  v_status text;
  v_cap int;
  v_base int;
  v_taken int;
begin
  select class_id, status into v_class, v_status from orders where id = p_order for update;
  if v_status is distinct from '결제대기' then return 'not_pending'; end if;

  select capacity, applied_base into v_cap, v_base from classes where id = v_class for update;
  if v_cap is not null then
    select count(*) into v_taken from orders
      where class_id = v_class and status in ('승인중','입금대기','수강확정','수강완료','취소신청');
    if v_base + v_taken >= v_cap then return 'full'; end if;
  end if;

  update orders set status = '승인중', updated_at = now() where id = p_order;
  return 'ok';
end;
$$;
revoke execute on function hold_seat(uuid) from public, anon, authenticated;

-- 승인 실패 시 자리 돌려놓기
create or replace function release_seat(p_order uuid) returns void language sql security definer as $$
  update orders set status = '결제대기', updated_at = now() where id = p_order and status = '승인중';
$$;
revoke execute on function release_seat(uuid) from public, anon, authenticated;

revoke execute on function next_order_no() from public, anon, authenticated;
