-- REVIEW AND RUN MANUALLY in the Supabase SQL editor. NOT run by Claude.
--
-- Moves participant reviews from the static src/content/reviews.ts file
-- (removed in this same branch) to a real table the owner can manage from
-- a new /admin/reviews page: add/edit text, approve, and upload/swap
-- participant photos, with no developer or deploy involved going forward.
--
-- Sections:
--   A. public.reviews table + RLS (public reads approved rows only, admin
--      reads/writes everything - same is_admin() used by every other admin
--      table in this project).
--   B. admin_delete_record() gets a 'review' case, so the existing
--      AdminDeleteButton component (kind="review") works unchanged - this
--      project already funnels every admin delete through that one RPC,
--      including non-financial records like classes/sessions, so reviews
--      follow the same single pathway rather than a bespoke direct delete.
--   C. Seed inserts for the 7 reviews already in src/content/reviews.ts in
--      this worktree right now - copied verbatim (dollar-quoted so none of
--      review 7's English apostrophes need manual escaping), not retyped.
--      All seeded with approved = false, same as the file's current state -
--      the owner approves each one from the new admin page going forward.
--   D. Read-only verification select.
--
-- NO new Storage bucket or policy is needed. Review photos reuse the
-- existing public product-images bucket under a reviews/ prefix, uploaded
-- through a new API route using the service-role admin client - exactly
-- how course cover images already reuse the same bucket under courses/
-- (see src/app/(admin)/admin/courses/upload-cover/route.ts). The
-- service-role client bypasses RLS/storage policies entirely, so nothing
-- else needs granting for the upload path; the bucket is already public,
-- which is what lets the uploaded photo render on the public home page.

begin;

-- =============================================================================
-- A. Table + RLS
-- =============================================================================

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  display_order integer,
  name text,
  body text not null,
  lang text not null default 'ar' check (lang in ('ar', 'en')),
  approved boolean not null default false,
  sensitive boolean not null default false,
  photo_url text,
  created_at timestamptz not null default now()
);

alter table public.reviews enable row level security;

drop policy if exists "Public can view approved reviews" on public.reviews;
create policy "Public can view approved reviews" on public.reviews
  for select to anon, authenticated using (approved = true);

drop policy if exists "Admins can view all reviews" on public.reviews;
create policy "Admins can view all reviews" on public.reviews
  for select to authenticated using (public.is_admin());

drop policy if exists "Admins can insert reviews" on public.reviews;
create policy "Admins can insert reviews" on public.reviews
  for insert to authenticated with check (public.is_admin());

drop policy if exists "Admins can update reviews" on public.reviews;
create policy "Admins can update reviews" on public.reviews
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- No direct delete policy, on purpose - matches classes/courses/sessions:
-- deletes only ever go through admin_delete_record() below, a SECURITY
-- DEFINER function that doesn't need (and isn't subject to) a separate
-- RLS delete policy.

-- =============================================================================
-- B. admin_delete_record(): add a 'review' case
-- =============================================================================
-- Full function body, copied from admin-delete-record.sql with one new
-- case added - CREATE OR REPLACE requires the whole body, not a diff.
-- Every other case is byte-for-byte unchanged from the current function.

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

    when 'review' then
      -- No financial protection needed - a review is just text, a name,
      -- and an optional photo, never referenced by any other table.
      perform r.id from public.reviews r where r.id = p_id for update;
      if not found then raise exception 'RECORD_NOT_FOUND'; end if;
      delete from public.reviews where id = p_id;

    else
      raise exception 'INVALID_KIND';
  end case;

  return p_id;
end;
$$;

revoke all on function public.admin_delete_record(text, uuid) from public, anon;
grant execute on function public.admin_delete_record(text, uuid) to authenticated;

-- =============================================================================
-- C. Seed data - the 7 reviews already in src/content/reviews.ts, verbatim
-- =============================================================================

insert into public.reviews (display_order, name, body, lang, approved, sensitive, photo_url)
values (
  1,
  null,
  $r1$احلام، يا حلوة الروح والقلب
مش عارفة كيف أوصف قديش وجودك وجلساتك تركوا أثر حلو فيّ.. معك ما كانت مجرد رياضة، كانت فسحة إلي من ضغوط الحياة، وفرصة أرجع أسمع حالي، أحس بجسمي، أنتبه لتنفّسي، وألاقي هدوئي وراحتي من جديد.
أثّرتِ فيّ بطريقة حلوة، خلّتيني أكون أوعى بحالي، أقرب لجسمي، أحنّ على نفسي. صرت أشوف تفاصيل الحياة بعيون أجمل، وأعيش لحظات بتتنفّس الروح قبل الجسد. والأحلى إنو بعد كل جلسة معك برجع أخفّ، أروق، ومليانة طاقة حلوة.
أحلام، إنتِ مش بس مدرّبة بتدرّب الجسم، إنتِ إنسانة بتترك أثر بالقلب، وبتزرع فينا شعور حلو بضل معنا حتى ما بعد ما تخلص الجلسة. شكرًا لأنك كنتِ جزءًا من هالتغيير الحلو فيّ، ولأنك بتخلّيني أحب حالي وحياتي أكثر.$r1$,
  'ar', false, false, null
);

insert into public.reviews (display_order, name, body, lang, approved, sensitive, photo_url)
values (
  2,
  null,
  $r2$من ٣ سنين قررت ارجع للحركة وبما اني ما بحب الرياضات القوية توجهت لممارسة اليوغا بأحلى مساحة ومع أحلى مدربة أحلام
بس اللي استفادته من اليوغا كان أكتر بكتير من تحسين مرونتي وتقوية عضلاتي، صرت أحس بالراحة والهدوء والتوازن بين جسمي وروحي
علمتني أحلام مع تمارين التنفس بعمق يخفف التوتر و يوصل للسلام الداخلي. وبالالتزام بحس بأني أقرب من حالي وبعيش اللحظة بكل وعي. صارت اليوغا بالنسبة لي أسلوب حياة بيعطيني الطاقة الإيجابية والسعادة والطمأنينة
مع أحلام مش بس بستنى اللقاءات بشوق إلا كمان الفعاليات والجلسات والورشات و المشاوير الرائعة مع مجموعات صبايا و أرواح حلوة دايماً بتكون بيننا أشياء مشتركة وراحة رهيبة$r2$,
  'ar', false, false, null
);

insert into public.reviews (display_order, name, body, lang, approved, sensitive, photo_url)
values (
  3,
  null,
  $r3$مع أحلام عشت كتير رحل من اول ما بدينا لليوم
رحلة كبيرة في آني ارجع لحالي
سلمى الحلوة الذكية الي ربنا أعطاها كتير هدايا ومميزات نسيت منها وتخبى منها ومع أحلام بنرجع شوي شوي
من 3 سنين كانت بالضبط أول جلسة فردية وكملنا بكتير شغل الي كان مع مجموعة او لحالي او حتى متابعة على الواتس
واليوم الي بشوفي في 2026 بسدقش انوانا الي بأول جلسة مع احلام والي كانت جلسة مع احلام بشهر 11/ 2023
ممتنة كتير لربنا الي عرفنا على بعض وحظك في طريقي
حبيبتي انتي$r3$,
  'ar', false, false, null
);

insert into public.reviews (display_order, name, body, lang, approved, sensitive, photo_url)
values (
  4,
  'تيماء',
  $r4$اول اشي صباحك كلشي حلو وخير وبركة
احلام حابة احكيلك اكم شغلة ببالي
اول اشي بتشكرك ع كلشي اولا ع الوعي الي دخلتيه ع حياتي وع كمية الادراك الي صارت معي من يوم ما عرفتك حسيت كانو كنت مغمضة وصححت
حرفيا خليتيني اطلع ع الدنيا بطريقة تانية خليني اشوف كتير تفاصيل عيوني وقلبي ما كان شايفهم
بحب كل اللقاءات الي بينا
سواء مع الجروبات او اللقاءات الخاصة
في شعور مريح وغريب بحسو بس اكون بالمكان عندك بحس طاقتك هي الي بتعطيني الشعور
بحب اهتمامك وفهمك للتفاصيل وللشعور الي بحاول أوصلك اياها
صراحة كمية الراحة والشعور بالندم وفهم هالدنيا وكلشي فيها وإيماني بربي حتى كلو اتغير من لما عرفت
ربنا باركلك ويزيدك نور وصحة وخير وبركة$r4$,
  'ar', false, false, null
);

insert into public.reviews (display_order, name, body, lang, approved, sensitive, photo_url)
values (
  5,
  'مريم',
  $r5$انا مريم صرلي مشتركه مع مساحة احلام سنه تقريبا اخذ معها كنت باخد معها حصص يوغا وكثير غيرت مني ومن نفسيتي وجديد
بلشت معها حصص مكس طبعا هاي الحصص الها فادتني كثير وغيرت كثير من حياتي تقريبا انا كان عندي زي تشنج بكتفي
اليمين وما كنت بقدر أحركو طبعا بعد التزامي بحصص المكس كتفي اتحسن كثير ومش بس كتفي تقريبا كل جسمي
وصرت احس حالي اقوى وجسمي اقوى وطبعا بشكر احلام ومساحتها على هاد الاشي وعلى كلشي بتقدمو$r5$,
  'ar', false, false, null
);

insert into public.reviews (display_order, name, body, lang, approved, sensitive, photo_url)
values (
  6,
  null,
  $r6$في أشخاص بيفوتوا حياتنا، ويتركوا أثر أكبر بكتير من اللي ممكن الكلمات توصفه، وإنتِ بالنسبة إلي من هالأشخاص.
مش عارفة من وين أبلّش، ولا كيف ممكن أوفيكي حقك بالكلام، لأنك كنتِ جزء من رحلة كتير مهمة بحياتي، ورافقتيني بأوقات كانت من أصعب الأوقات عليّ. كنتِ موجودة لما كنت بحاجة لحدا يسمعني، يفهمني، يطمّنّي، ويرشدني للطريق لما كنت أحس حالي تايهة. كنتِ دعم، وسند، وأمان، ووجودك كان يفرق معي أكتر مما بتتخيلي.
أكتر إشي بقدّره فيكي إنك مش بس بتقدّمي جلسات أو بتعطي أدوات ونصائح، إنتِ فعلًا بتحطي من روحك وقلبك بكل إشي بتعمليه. اهتمامك، احتواؤك، طريقتك بالحكي، وقدرتك إنك تسمعي من قلبك، كلهم أشياء بتخلّي الواحد يحس إنه مش لحاله، وإنه في حدا شايفه وفاهمه ومؤمن فيه، حتى بالأوقات اللي هو نفسه مش قادر يؤمن بحاله. وحتى لما كنت مشغولة، كنت تحاولي تكوني موجودة وترّدي عليّ بقدر ما تقدري، وهالشي بالنسبة إلي كان إله قيمة كبيرة جدًا.
الجلسات الفردية معك كانت مساحة آمنة إلي، مساحة أقدر فيها أكون على طبيعتي، أحكي، أعبّر، وأشوف الأمور من منظور مختلف. علّمتيني إنه التغيير مش لازم يصير بيوم وليلة، وإنه مش مطلوب مني أعمل كل إشي مرة وحدة، وإنه كل خطوة صغيرة، مهما كانت بسيطة، إلها قيمة، ونحاول، وأحيانًا مجرد إننا نكمّل، ونكون أحنّ على حالنا، هو بحد ذاته إنجاز كبير.
ومن أكتر الأشياء اللي بحبها بحصص اليوجا معك! عنجد تجربة بتاخدني لعالم تاني فيه هدوء وسلام وراحة، وبحس فيه إني برجع لحالي، بعيدًا عن ضجيج الحياة وكثرة التفكير والضغط. طاقتك، صوتك، حضورك، وطريقتك بتوجيهنا خلال التمارين والتنفس، كلهم يخلقوا جو مميز وصعب يتوصف. بتخلّينا ننتبه لأنفاسنا، نسمح لحالنا نرتاح، ناخد نفس عميق، ونرجع نحسّه ونشعله.
علّمتينا إنه النفس مش مجرد شهيق وزفير، وإنه الهدوء مش ضعف، وإنه مش لازم نضل نركض طول الوقت عشان نتقدّم. أحيانًا أكبر خطوة ممكن نعملها لأنفسنا هي إننا نوقف شوي، ناخد نفس عميق، ونحسّ لحالنا رحمة بدل ما نظل عالقين بكل إشي براسنا.
علّمتينا كمان إنه النمو الحقيقي بيصير خطوة صغيرة ورا خطوة صغيرة، وإنه مش لازم نكون أحسن ولا أكمل من حالنا، نتقبّل أيامنا الحلوة والصعبة، ونفهم إنه كل إشي إله وقته، وإنه مسموح إله يكون على طبيعته. أما عن طاقتك وروحك الحلوة، فهاي لحالها حكاية، فيكي إشي مريح، دافي، وقريب للقلب. بتحسّي إنك بتنشري السلام والراحة بالمكان اللي بتكوني فيه.
والأجمل من كل هاد إنك من خلال المجتمع الأنثوي اللي بنيتيه، عم تخلقي مساحة بتجمّع النساء على الدعم والوعي والحب، والنمو. مساحة بتذكّر كل وحدة فينا إنها مش لحالها، وإننا فينا نتعلّم من بعض، ونقوّي بعض، ونكبر مع بعض، إله أثر حقيقي كبير جدًا، ووجود مجتمعات بهالروح، فيها احتواء حقيقي وتشجيع ووعي، وإنتِ من الناس اللي بيعرفوا كيف يحوّلوا هالفكرة إشي ملموس ونعيشه.
بشكرك من قلبي على كل جلسة، وكل كلمة، وكل مرة ساعديتيني أشوف إشي ما كنت قادرة أشوفه، وكل مرة ذكّرتيني إنه الطريق مش لازم يكون كامل عشان يكون معنى. بشكرك لأنك جزء من رحلتي، ولأنك ساعديتني أتعامل مع حالي بطريقة أكتر وعي، وأفهم مشاعري. أتذكّر إنه حتى بأصعب المراحل فينا نلاقي طريقنا شوي شوي.
يمكن ما بتعرفي قديش التفاصيل الصغيرة اللي بتعمليها بتترك أثر كبير، بس بالنسبة إلنا هي جزء من شغلك الحلوة اللي صارت جزء من رحلتي ورسالتك. يمكن يكون من خلال حصة، أو جلسة، أو نفس عميق خلال حصة يوجا، أو كلمة منك كانت بالضبط الإشي اللي كنا بحاجة إله بهداك اليوم. وهاد من أجمل الأشياء الممكن إنسان يقدّمها لإنسان تاني.
بتمنالك من كل قلبي إنه كل الحب والطاقة الحلوة اللي بتعطيها للناس يرجعولك أضعاف، وإنك تضلّي دايمًا بهالروح الجميلة، وبهالقلب اللي بيعرف يحتوي، ويوصل للقلب قبل أي إشي تاني. بتمنالك بكل امرأة بتساعديها، وبكل روح بتلمسيها، وبكل خطوة صغيرة بتكوني سبب إنها تصير.
شكرًا لأنك مش بس بتعلّمينا مساحة نتنفّس، بل بتذكّرينا نهدأ، نتعلّم، ونرجع نبلّش من جديد. شكرًا لأنك بتذكّرينا إنه مش مطلوب منّا نكون أقوياء طول الوقت، وإنه عادي نتعب، وعادي نمشي ببطء.
إنتِ مش بس سيكولوجية، إنتِ إنسانة بترافق الناس برحلتهم وبتساعدهم يرجعوا يلاقوا أرواحهم، وبتترك أثر حلو برحلتهم. وأنا ممتنة من كل قلبي لكل هالدعم والاحتواء. كل الحب والتقدير إلك، ولروحك، ولرسالتك، ولكل إشي حلو فيكي، ولكل إشي حلو بتقدّميه للعالم.$r6$,
  'ar', false, true, null
);

insert into public.reviews (display_order, name, body, lang, approved, sensitive, photo_url)
values (
  7,
  null,
  $r7$I'm so grateful to have had you by my side during some of the hardest moments of my life.
You've been so much more than a psychologist to me — you've been a source of support, comfort, guidance, and strength when I needed it most.
Your individual sessions have helped me understand myself better, navigate my emotions, and learn to be kinder and more patient with myself. Your care, dedication, and willingness to listen have made such a meaningful difference in my journey.
Your yoga classes are truly something special. They take you to another world, where you can reconnect with yourself, find peace, breathe, and simply be present. Through your beautiful energy and calming presence, you've taught us the importance of slowing down, trusting the process, and remembering that every big change begins with small steps.
What makes you truly special is your beautiful soul, your genuine care, and the warmth you bring into every space you enter. The women's community you've created is such a safe, inspiring, and empowering place to grow, heal, and connect.
Thank you for being there, for every kind word, every session, every reminder to breathe, and every little step you've helped me take. You have a beautiful gift for making people feel seen, supported, and understood.
You don't just teach people how to heal and grow — you make them feel that they don't have to do it alone. And that is something truly priceless. I'm so lucky our paths crossed. Thank you for being you!$r7$,
  'en', false, true, null
);

commit;

-- =============================================================================
-- D. Read-only verification after installing
-- =============================================================================
-- select display_order, name, lang, approved, sensitive, photo_url, length(body) as body_length
-- from public.reviews
-- order by display_order;
