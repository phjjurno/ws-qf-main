-- ============================================================
-- wsQf 지원금(jiwon) · 물가(mulga) 스키마
-- Supabase 프로젝트: eumocvkejlbfsemmkmwr (shutress와 공용)
-- 읽기: anon 허용(RLS) / 쓰기: service_role(Edge Function)만
-- ============================================================

-- ---------- 지원금 (보조금24) ----------
create table if not exists public.jiwon_programs (
  service_id     text primary key,          -- 보조금24 서비스ID
  name           text not null,             -- 서비스명
  summary        text,                      -- 서비스목적요약
  ministry       text,                      -- 소관기관명
  region_code    text not null default '00',-- 00=전국, 11=서울, 26=부산 ...
  region_name    text not null default '전국',
  category       text,                      -- 주거/취업/출산/창업/노후/기타
  age_min        int,
  age_max        int,
  benefit_type   text,                      -- 현금/현물/이용권/감면 ...
  amount_text    text,                      -- 지원내용 요약
  apply_method   text,                      -- 신청방법
  apply_url      text,                      -- 온라인신청사이트URL 또는 상세조회URL
  deadline_text  text,                      -- 신청기한
  target_summary text,                      -- 지원대상 요약
  keywords       text,                      -- 검색용 (name+summary+category+...)
  raw            jsonb,                     -- 원본 응답 (매핑 검증용)
  updated_at     timestamptz not null default now()
);

create index if not exists jiwon_programs_region_idx   on public.jiwon_programs (region_code);
create index if not exists jiwon_programs_category_idx on public.jiwon_programs (category);

alter table public.jiwon_programs enable row level security;

drop policy if exists "jiwon_read_all" on public.jiwon_programs;
create policy "jiwon_read_all" on public.jiwon_programs
  for select to anon, authenticated using (true);

-- ---------- 물가 (참가격) ----------
create table if not exists public.mulga_prices (
  id          bigint generated always as identity primary key,
  good_id     text not null,               -- 상품아이디
  good_name   text not null,               -- 상품명
  category    text,                        -- 품목 분류
  unit        text,                        -- 용량/단위 (예: 500g)
  price       int  not null,               -- 판매가격(원)
  entp_name   text,                        -- 판매업소명
  entp_type   text,                        -- 대형마트/백화점/SSM/전통시장/편의점
  region      text,                        -- 지역
  inspect_day date,                        -- 조사일
  raw         jsonb,
  updated_at  timestamptz not null default now(),
  unique (good_id, entp_name, inspect_day)
);

create index if not exists mulga_prices_good_idx on public.mulga_prices (good_name);
create index if not exists mulga_prices_day_idx  on public.mulga_prices (inspect_day desc);

alter table public.mulga_prices enable row level security;

drop policy if exists "mulga_read_all" on public.mulga_prices;
create policy "mulga_read_all" on public.mulga_prices
  for select to anon, authenticated using (true);

-- 최신 조사일 기준 상품별 요약 (평균/최저/최고가)
create or replace view public.mulga_latest
  with (security_invoker = true) as
select
  good_id,
  good_name,
  max(category)    as category,
  max(unit)        as unit,
  round(avg(price))::int as avg_price,
  min(price)       as min_price,
  max(price)       as max_price,
  count(*)         as store_count,
  max(inspect_day) as inspect_day
from public.mulga_prices p
where inspect_day = (
  select max(inspect_day) from public.mulga_prices p2 where p2.good_id = p.good_id
)
group by good_id, good_name;

grant select on public.mulga_latest to anon, authenticated;
