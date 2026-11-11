begin;
alter table public.ifund_demo_events add column if not exists delivery_count integer not null default 1 check(delivery_count>0);
alter table public.ifund_demo_events add column if not exists last_verified_at timestamptz not null default now();
create or replace function public.ifund_demo_event_replay(p_event text,p_hash text)
returns integer language plpgsql security invoker set search_path='' as $$
declare n integer;
begin
 update public.ifund_demo_events set delivery_count=delivery_count+1,last_verified_at=now()
 where event_id=p_event and payload_hash=p_hash returning delivery_count into n;
 if not found then raise exception 'Verified event replay mismatch'; end if;
 return n;
end $$;
revoke all on function public.ifund_demo_event_replay(text,text) from public,anon,authenticated;
grant execute on function public.ifund_demo_event_replay(text,text) to service_role;
commit;
