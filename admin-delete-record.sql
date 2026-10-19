-- REVIEW ONLY. Run manually after reviewing; not an automatic migration.
-- Requires public.is_admin() and the paid_at columns from admin-payments.sql.
-- Deletes catalog records only when unused. Never deletes paid records.
-- Orders must already be cancelled through admin_cancel_order so stock is restored.
-- Does not change stock, capacity, payment confirmation, or booking functions.

begin;

create or replace function public.admin_delete_record(p_kind text, p_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_parent uuid;
  v_status text;
  v_payment_status text;
  v_paid_at timestamptz;
  v_count integer;
begin
  if auth.uid() is null or not coalesce(public.is_admin(), false) then
    raise exception using errcode = '42501', message = 'FORBIDDEN';
  end if;

  case p_kind
    when 'product' then
      perform p.id from public.products p where p.id = p_id for update;
      if not found then raise exception 'RECORD_NOT_FOUND'; end if;
      perform pv.id from public.product_variants pv
        where pv.product_id = p_id order by pv.id for update;
      if exists (
        select 1 from public.order_items oi
        join public.product_variants pv on pv.id = oi.variant_id
        where pv.product_id = p_id
      ) then raise exception 'PRODUCT_HAS_ORDERS'; end if;
      delete from public.product_variants where product_id = p_id;
      delete from public.products where id = p_id;

    when 'variant' then
      select pv.product_id into v_parent from public.product_variants pv where pv.id = p_id;
      if not found then raise exception 'RECORD_NOT_FOUND'; end if;
      -- Match checkout's product-then-variant lock order.
      perform p.id from public.products p where p.id = v_parent for update;
      if not found then raise exception 'RECORD_NOT_FOUND'; end if;
      perform pv.id from public.product_variants pv
        where pv.id = p_id and pv.product_id = v_parent for update;
      if not found then raise exception 'RECORD_NOT_FOUND'; end if;
      if exists (select 1 from public.order_items oi where oi.variant_id = p_id)
        then raise exception 'RECORD_IN_USE'; end if;
      delete from public.product_variants where id = p_id;

    when 'request' then
      perform r.id from public.session_requests r where r.id = p_id for update;
      if not found then raise exception 'RECORD_NOT_FOUND'; end if;
      delete from public.session_requests where id = p_id;

    when 'class' then
      perform c.id from public.classes c where c.id = p_id for update;
      if not found then raise exception 'RECORD_NOT_FOUND'; end if;
      if exists (select 1 from public.class_sessions s where s.class_id = p_id)
        then raise exception 'RECORD_IN_USE'; end if;
      delete from public.classes where id = p_id;

    when 'session' then
      select s.booked_count into v_count from public.class_sessions s where s.id = p_id for update;
      if not found then raise exception 'RECORD_NOT_FOUND'; end if;
      if v_count is distinct from 0 or exists (select 1 from public.bookings b where b.session_id = p_id)
        then raise exception 'RECORD_IN_USE'; end if;
      delete from public.class_sessions where id = p_id;

    when 'course' then
      perform c.id from public.courses c where c.id = p_id for update;
      if not found then raise exception 'RECORD_NOT_FOUND'; end if;
      if exists (select 1 from public.course_purchases cp where cp.course_id = p_id)
        then raise exception 'RECORD_IN_USE'; end if;
      delete from public.courses where id = p_id;

    when 'booking' then
      select b.status, b.payment_status, b.paid_at
        into v_status, v_payment_status, v_paid_at
        from public.bookings b where b.id = p_id for update;
      if not found then raise exception 'RECORD_NOT_FOUND'; end if;
      if v_payment_status = 'paid' or v_paid_at is not null
        or exists (select 1 from public.payments p where p.booking_id = p_id)
        then raise exception 'PROTECTED_FINANCIAL_RECORD'; end if;
      if v_status is distinct from 'cancelled' then raise exception 'CANCEL_BOOKING_FIRST'; end if;
      delete from public.bookings where id = p_id;

    when 'course_purchase' then
      select cp.status, cp.paid_at into v_status, v_paid_at
        from public.course_purchases cp where cp.id = p_id for update;
      if not found then raise exception 'RECORD_NOT_FOUND'; end if;
      if v_status is distinct from 'pending' or v_paid_at is not null
        then raise exception 'PROTECTED_FINANCIAL_RECORD'; end if;
      delete from public.course_purchases where id = p_id;

    when 'order' then
      select o.status, o.paid_at into v_status, v_paid_at
        from public.orders o where o.id = p_id for update;
      if not found then raise exception 'RECORD_NOT_FOUND'; end if;
      if v_paid_at is not null or v_status in ('paid', 'processing', 'shipped', 'delivered')
        or exists (select 1 from public.payments p where p.order_id = p_id)
        then raise exception 'PROTECTED_FINANCIAL_RECORD'; end if;
      if v_status is distinct from 'cancelled' then raise exception 'CANCEL_ORDER_FIRST'; end if;
      delete from public.order_items where order_id = p_id;
      delete from public.orders where id = p_id;

    else
      raise exception 'INVALID_KIND';
  end case;

  return p_id;
end;
$$;

revoke all on function public.admin_delete_record(text, uuid) from public, anon;
grant execute on function public.admin_delete_record(text, uuid) to authenticated;

commit;
