-- 가격 옵션 (예: 4회 350,000원 / 10회 875,000원) · 클래스 판매 상태 — SQL Editor 에서 0004 다음에 한 번 실행한다.
-- 옵션이 있으면 classes.price 는 가장 싼 옵션 가격(목록·정렬용)이고, 실제 결제 금액은 고른 옵션으로 정한다.
alter table classes add column if not exists price_options jsonb not null default '[]'::jsonb;
alter table orders add column if not exists option_label text;

-- 판매 상태: on(판매중) / soldout(품절 — 보이지만 신청 불가) / hidden(숨김 — 고객 화면에서 빠짐)
alter table classes add column if not exists sale_status text not null default 'on';
alter table classes drop constraint if exists classes_sale_status_check;
alter table classes add constraint classes_sale_status_check check (sale_status in ('on','soldout','hidden'));

-- view 의 c.* 는 만들 때 컬럼이 고정되므로 새 컬럼이 보이게 다시 만든다 (내용은 0002 와 같음)
drop view if exists class_with_counts;
create view class_with_counts as
select c.*,
  c.applied_base
  + coalesce((select count(*) from orders o where o.class_id = c.id and o.status in ('승인중','입금대기','수강확정','수강완료','취소신청')), 0)::int
  + case when c.type in ('waitlist','upcoming')
      then coalesce((select count(*) from waitlist_alerts w where w.class_id = c.id), 0)::int else 0 end
  as applied,
  cc.detail, cc.thumbnail_url, cc.banner_url, cc.detail_image_url
from classes c
left join class_contents cc on cc.class_id = c.id;
