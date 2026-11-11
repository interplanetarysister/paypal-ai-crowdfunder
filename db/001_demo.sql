-- Additive isolation boundary: this migration references ONLY ifund_demo_* objects.
-- No production campaign, financial, auth.users or storage records are accessed.
begin;
create table public.ifund_demo_users (
 id uuid primary key default gen_random_uuid(), handle text not null unique check (handle ~ '^[a-z0-9_]{3,30}$'),
 password_hash text not null, salt text not null, role text not null default 'member' check (role in ('member','admin')),
 created_at timestamptz not null default now()
);
create table public.ifund_demo_sessions (
 token_hash text primary key, user_id uuid not null references public.ifund_demo_users(id) on delete cascade,
 expires_at timestamptz not null, created_at timestamptz not null default now()
);
create index on public.ifund_demo_sessions(user_id);
create table public.ifund_demo_campaigns (
 id uuid primary key default gen_random_uuid(), owner_id uuid references public.ifund_demo_users(id),
 title text not null check (length(title) between 5 and 120), summary text not null check (length(summary) between 10 and 600),
 story jsonb not null check (jsonb_typeof(story) = 'array'), category text not null check (category in ('emergency','medical','education','disaster_relief','community','animals','environment','creative','science')),
 goal_cents integer not null check (goal_cents between 100 and 100000000), status text not null check (status in ('draft','published')),
 organizer text not null check (length(organizer) between 3 and 80), location text not null default 'Synthetic location',
 latitude double precision not null default 0 check (latitude between -90 and 90), longitude double precision not null default 0 check (longitude between -180 and 180),
 image_path text, ai_request_ids jsonb not null default '[]', fictional boolean not null default true check (fictional),
 version integer not null default 1, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index on public.ifund_demo_campaigns(owner_id);
create index on public.ifund_demo_campaigns(status, created_at desc);
create table public.ifund_demo_orders (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.ifund_demo_users(id),
 campaign_id uuid references public.ifund_demo_campaigns(id), purpose text not null check (purpose in ('campaign','platform_support')),
 amount_cents integer not null check (amount_cents between 100 and 10000), currency text not null default 'USD' check (currency='USD'),
 create_key uuid not null, paypal_order_id text unique, paypal_capture_id text unique, merchant_id text,
 status text not null default 'creating' check (status in ('creating','created','pending','captured','cancelled','failed')),
 reconciliation text not null default 'not_verified' check (reconciliation in ('not_verified','provider_verified','retry_required')),
 approval_url text, failure_code text, captured_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(user_id,create_key), check ((purpose='campaign' and campaign_id is not null) or (purpose='platform_support' and campaign_id is null)),
 check (status <> 'captured' or (paypal_order_id is not null and paypal_capture_id is not null and captured_at is not null and reconciliation='provider_verified'))
);
create index on public.ifund_demo_orders(campaign_id);
create index on public.ifund_demo_orders(status,created_at);
create table public.ifund_demo_captures (
 capture_id text primary key, order_id uuid not null unique references public.ifund_demo_orders(id),
 amount_cents integer not null check (amount_cents between 100 and 10000), currency text not null check (currency='USD'),
 verified_at timestamptz not null default now(), provider_status text not null check (provider_status='COMPLETED')
);
create table public.ifund_demo_ledger (
 id uuid primary key default gen_random_uuid(), capture_id text not null references public.ifund_demo_captures(capture_id),
 account text not null check (account in ('sandbox_clearing','campaign_support','platform_support')),
 amount_cents integer not null check (amount_cents<>0), currency text not null check (currency='USD'),
 created_at timestamptz not null default now(), unique(capture_id,account)
);
create table public.ifund_demo_receipts (
 id uuid primary key default gen_random_uuid(), capture_id text not null unique references public.ifund_demo_captures(capture_id),
 issued_at timestamptz not null default now(), disclosure text not null default 'PAYPAL SANDBOX — NO REAL FUNDS TRANSFERRED' check (disclosure='PAYPAL SANDBOX — NO REAL FUNDS TRANSFERRED')
);
create table public.ifund_demo_events (
 event_id text primary key, event_type text not null, payload_hash text not null,
 order_id uuid references public.ifund_demo_orders(id), verified_at timestamptz not null default now()
);
create table public.ifund_demo_ai_runs (
 id uuid primary key, user_id uuid not null references public.ifund_demo_users(id), kind text not null,
 model text not null, status text not null check (status in ('started','succeeded','failed')),
 outcome text, started_at timestamptz not null default now(), completed_at timestamptz
);
create index on public.ifund_demo_ai_runs(user_id);
create table public.ifund_demo_media (
 id uuid primary key, owner_id uuid not null references public.ifund_demo_users(id), object_key text not null unique,
 content_type text not null check(content_type in ('image/jpeg','image/png','image/webp')), ai_run_id uuid references public.ifund_demo_ai_runs(id),
 created_at timestamptz not null default now()
);
create index on public.ifund_demo_media(owner_id);
create table public.ifund_demo_tracker (
 gate text primary key, status text not null check (status in ('PASS','FAIL','BLOCKED','NOT VERIFIED')),
 result text not null default '', evidence_url text, commit_sha text, updated_by uuid references public.ifund_demo_users(id),
 updated_at timestamptz not null default now(), version integer not null default 1
);
create table public.ifund_demo_rate_limits (
 key text primary key, count integer not null check (count>0), expires_at timestamptz not null
);

-- Atomic server-only finalization. No partial receipt or unbalanced ledger can commit.
create function public.ifund_demo_finalize(p_order uuid,p_capture text,p_amount integer,p_currency text)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare o public.ifund_demo_orders; c public.ifund_demo_captures; r public.ifund_demo_receipts;
begin
 select * into strict o from public.ifund_demo_orders where id=p_order for update;
 if o.paypal_order_id is null or o.amount_cents<>p_amount or p_currency<>'USD' or length(p_capture)<8 then raise exception 'Verified capture mismatch'; end if;
 if o.paypal_capture_id is not null and o.paypal_capture_id<>p_capture then raise exception 'Conflicting capture'; end if;
 select * into c from public.ifund_demo_captures where capture_id=p_capture;
 if found and (c.order_id<>p_order or c.amount_cents<>p_amount) then raise exception 'Capture already assigned'; end if;
 insert into public.ifund_demo_captures(capture_id,order_id,amount_cents,currency,provider_status)
 values(p_capture,p_order,p_amount,p_currency,'COMPLETED') on conflict(capture_id) do nothing;
 insert into public.ifund_demo_ledger(capture_id,account,amount_cents,currency) values
 (p_capture,'sandbox_clearing',-p_amount,'USD'),
 (p_capture,case when o.purpose='campaign' then 'campaign_support' else 'platform_support' end,p_amount,'USD')
 on conflict(capture_id,account) do nothing;
 insert into public.ifund_demo_receipts(capture_id) values(p_capture) on conflict(capture_id) do nothing;
 update public.ifund_demo_orders set status='captured',paypal_capture_id=p_capture,reconciliation='provider_verified',captured_at=coalesce(captured_at,now()),updated_at=now() where id=p_order;
 select * into strict r from public.ifund_demo_receipts where capture_id=p_capture;
 return jsonb_build_object('receipt_id',r.id,'capture_id',p_capture,'order_id',o.paypal_order_id,'amount_cents',p_amount,'purpose',o.purpose,'currency','USD','status','captured','disclosure',r.disclosure);
end $$;

create function public.ifund_demo_rate(p_key text,p_limit integer,p_seconds integer)
returns boolean language plpgsql security invoker set search_path='' as $$
declare n integer;
begin
 if p_limit<1 or p_seconds<1 then raise exception 'Invalid limit'; end if;
 insert into public.ifund_demo_rate_limits as r(key,count,expires_at) values(p_key,1,now()+make_interval(secs=>p_seconds))
 on conflict(key) do update set count=case when r.expires_at<now() then 1 else r.count+1 end,
 expires_at=case when r.expires_at<now() then now()+make_interval(secs=>p_seconds) else r.expires_at end returning count into n;
 return n<=p_limit;
end $$;

-- Full-history totals, independent of dashboard pagination. Never accepts a client role claim.
create function public.ifund_demo_finance(p_user uuid,p_view text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare result jsonb;
begin
 if p_view not in ('donor','organizer','admin') then raise exception 'Invalid view'; end if;
 if p_view='admin' and not exists(select 1 from public.ifund_demo_users where id=p_user and role='admin') then raise exception 'Admin required'; end if;
 with scoped as (
  select o.* from public.ifund_demo_orders o where
  (p_view='donor' and o.user_id=p_user) or p_view='admin' or
  (p_view='organizer' and o.purpose='campaign' and exists(select 1 from public.ifund_demo_campaigns c where c.id=o.campaign_id and c.owner_id=p_user))
 ), verified as (
  select o.* from scoped o join public.ifund_demo_captures c on c.order_id=o.id and c.capture_id=o.paypal_capture_id and c.amount_cents=o.amount_cents
  where o.status='captured' and o.reconciliation='provider_verified'
 ), recent as (
  select id,campaign_id,purpose,amount_cents,currency,status,reconciliation,paypal_order_id,paypal_capture_id,created_at,captured_at from scoped order by created_at desc limit 200
 ) select jsonb_build_object(
 'orders',coalesce((select jsonb_agg(to_jsonb(r) order by r.created_at desc) from recent r),'[]'::jsonb),
 'receipts',coalesce((select jsonb_agg(to_jsonb(r)) from public.ifund_demo_receipts r where r.capture_id in (select paypal_capture_id from recent)),'[]'::jsonb),
 'captured_cents',coalesce((select sum(amount_cents) from verified where purpose='campaign'),0),
 'platform_support_cents',coalesce((select sum(amount_cents) from verified where purpose='platform_support'),0),
 'pending_count',(select count(*) from scoped where status in ('creating','created','pending')),
 'record_count',(select count(*) from scoped),'limited_to_latest',200) into result;
 return result;
end $$;

create function public.ifund_demo_totals(p_ids uuid[])
returns jsonb language sql security invoker set search_path='' as $$
 select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from (
  select o.campaign_id,sum(c.amount_cents) as raised_cents,count(distinct o.user_id) as donor_count
  from public.ifund_demo_orders o join public.ifund_demo_captures c on c.order_id=o.id and c.capture_id=o.paypal_capture_id
  where o.campaign_id=any(p_ids) and o.purpose='campaign' and o.status='captured' and o.reconciliation='provider_verified'
  group by o.campaign_id
 ) t;
$$;

-- Immutability for provider-backed accounting records.
create function public.ifund_demo_immutable() returns trigger language plpgsql set search_path='' as $$
begin raise exception 'Demo financial records are append-only'; end $$;
create trigger immutable before update or delete on public.ifund_demo_captures for each row execute function public.ifund_demo_immutable();
create trigger immutable before update or delete on public.ifund_demo_ledger for each row execute function public.ifund_demo_immutable();
create trigger immutable before update or delete on public.ifund_demo_receipts for each row execute function public.ifund_demo_immutable();

do $$ declare t text; begin
 foreach t in array array['users','sessions','campaigns','orders','captures','ledger','receipts','events','ai_runs','media','tracker','rate_limits'] loop
 execute format('alter table public.ifund_demo_%I enable row level security',t);
 execute format('revoke all on table public.ifund_demo_%I from public, anon, authenticated',t);
 execute format('grant select,insert,update,delete on table public.ifund_demo_%I to service_role',t);
 end loop;
end $$;
revoke all on function public.ifund_demo_finalize(uuid,text,integer,text) from public,anon,authenticated;
grant execute on function public.ifund_demo_finalize(uuid,text,integer,text) to service_role;
revoke all on function public.ifund_demo_rate(text,integer,integer) from public,anon,authenticated;
grant execute on function public.ifund_demo_rate(text,integer,integer) to service_role;
revoke all on function public.ifund_demo_finance(uuid,text) from public,anon,authenticated;
grant execute on function public.ifund_demo_finance(uuid,text) to service_role;
revoke all on function public.ifund_demo_totals(uuid[]) from public,anon,authenticated;
grant execute on function public.ifund_demo_totals(uuid[]) to service_role;
revoke all on function public.ifund_demo_immutable() from public,anon,authenticated;
insert into public.ifund_demo_tracker(gate,status,result) select x,'NOT VERIFIED','No provider-backed acceptance evidence recorded.' from unnest(array[
 'ai_titles','ai_descriptions','ai_story','ai_sections','ai_images','paypal_order','paypal_capture','buyer_approval','webhook_signature','webhook_replay','ledger_reconciliation','receipts','discovery','dashboards','authorization','accessibility','mobile','deployment','video','judge_readiness']) as x;
commit;
