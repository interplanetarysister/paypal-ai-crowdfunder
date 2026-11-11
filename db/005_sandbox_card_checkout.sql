-- Sandbox-only checkout provenance; never stores PAN, expiry, CVV, or billing details.
begin;
alter table public.ifund_demo_orders
  add column if not exists checkout_method text not null default 'paypal';
do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname='ifund_demo_orders_checkout_method_check'
      and conrelid='public.ifund_demo_orders'::regclass
  ) then
    alter table public.ifund_demo_orders
      add constraint ifund_demo_orders_checkout_method_check
      check (checkout_method in ('paypal','card'));
  end if;
end $$;
commit;
