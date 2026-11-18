-- 강사 사진 + 실제 강사진 8명 (아카데미 소개 > 강사 소개)
alter table instructors add column if not exists img text;

insert into instructors (id, initial, name, role, "desc", img, sort_order) values
  ('lee-yukyung', '이', '이유경', '대표원장', '8개 지점을 직접 운영하며 쌓은 경영 노하우로 오토사장반, 월 2000플랜 등 경영 과정을 이끌어요.', '/images/instructors/lee-yukyung.jpg', 1),
  ('sundol', '순', '순돌', '이사 · 원장', '부산 서면전포점을 운영하며, 데이터 기반 모발 진단 프로그램인 시그니처 프로그램을 개발했어요.', '/images/instructors/sundol.jpg', 2),
  ('junmo', '준', '준모', '디자이너', '', '/images/instructors/junmo.jpg', 3),
  ('rihyun', '리', '리현', '실장', '', '/images/instructors/rihyun.jpg', 4),
  ('hoseung', '호', '호승', '원장', '', '/images/instructors/hoseung.jpg', 5),
  ('changmin', '창', '창민', '원장', '', '/images/instructors/changmin.jpg', 6),
  ('jiseong', '지', '지성', '원장', '', '/images/instructors/jiseong.jpg', 7),
  ('seongsil', '성', '성실', '원장', '시니어컷·숏컷 전문. 고객의 이미지와 라이프스타일을 분석해 디자인으로 연결하는 실전 중심 교육을 해요. 비주얼살롱 사가정점 대표원장, 비주얼아카데미 레벨 과정 강사.', '/images/instructors/seongsil.jpg', 8)
on conflict (id) do update set
  initial = excluded.initial, name = excluded.name, role = excluded.role,
  "desc" = excluded."desc", img = excluded.img, sort_order = excluded.sort_order;

-- 예시로 넣어 뒀던 가상 강사 (클래스에 연결돼 있으면 대표로 대신 보여요)
delete from instructors where id in ('kim-jieun', 'park-seoyeon');
