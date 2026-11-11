-- Demo-only, explicitly simulated agent-attention allocations. No production agent work is claimed.
begin;
create table if not exists public.ifund_demo_agent_focus (
  campaign_id uuid not null references public.ifund_demo_campaigns(id) on delete cascade,
  agent_role text not null check (agent_role in ('Story coach','Discovery guide','Outreach assistant','Safety reviewer')),
  focus_units integer not null check (focus_units between 1 and 9),
  is_simulated boolean not null default true check (is_simulated),
  updated_at timestamptz not null default now(),
  primary key (campaign_id, agent_role)
);
alter table public.ifund_demo_agent_focus enable row level security;
revoke all on public.ifund_demo_agent_focus from public, anon, authenticated;
grant select, insert, update, delete on public.ifund_demo_agent_focus to service_role;

create or replace function public.ifund_demo_seed_focus_for_campaign()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if new.status = 'published' and new.fictional then
    insert into public.ifund_demo_agent_focus (campaign_id, agent_role, focus_units)
    select new.id, role_name,
      1 + ((('x' || substr(md5(new.id::text || ':' || role_name), 1, 7))::bit(28)::int) % 9)
    from (values ('Story coach'),('Discovery guide'),('Outreach assistant'),('Safety reviewer')) roles(role_name)
    on conflict (campaign_id, agent_role) do nothing;
  end if;
  return new;
end $;
-- Trigger-only helper: do not leave PostgreSQL's default PUBLIC EXECUTE grant.
revoke all on function public.ifund_demo_seed_focus_for_campaign() from public, anon, authenticated;
grant execute on function public.ifund_demo_seed_focus_for_campaign() to service_role;
drop trigger if exists ifund_demo_focus_seed on public.ifund_demo_campaigns;
create trigger ifund_demo_focus_seed
after insert or update of status on public.ifund_demo_campaigns
for each row execute function public.ifund_demo_seed_focus_for_campaign();

insert into public.ifund_demo_agent_focus(campaign_id,agent_role,focus_units)
select c.id, role_name,
  1 + ((('x' || substr(md5(c.id::text || ':' || role_name), 1, 7))::bit(28)::int) % 9)
from public.ifund_demo_campaigns c
cross join (values ('Story coach'),('Discovery guide'),('Outreach assistant'),('Safety reviewer')) roles(role_name)
where c.status='published' and c.fictional
on conflict (campaign_id, agent_role) do nothing;

create or replace function public.ifund_demo_campaign_focus(p_campaign uuid)
returns jsonb language sql security invoker set search_path = '' as $$
select coalesce((
  select jsonb_build_object(
    'simulated', true,
    'campaign_units', coalesce((select sum(f.focus_units) from public.ifund_demo_agent_focus f where f.campaign_id=c.id),0),
    'platform_units', coalesce((select sum(f.focus_units) from public.ifund_demo_agent_focus f),0),
    'roles', coalesce((
       select jsonb_agg(jsonb_build_object('role',f.agent_role,'units',f.focus_units) order by f.agent_role)
       from public.ifund_demo_agent_focus f where f.campaign_id=c.id
    ),'[]'::jsonb)
  )
  from public.ifund_demo_campaigns c where c.id=p_campaign and c.status='published' and c.fictional
), '{"simulated":true,"campaign_units":0,"platform_units":0,"roles":[]}'::jsonb);
$$;
revoke all on function public.ifund_demo_campaign_focus(uuid) from public, anon, authenticated;
grant execute on function public.ifund_demo_campaign_focus(uuid) to service_role;
commit;
