begin;

create table public.private_session_services (
  id integer generated always as identity primary key,
  title_ar text not null check (char_length(btrim(title_ar)) between 1 and 120),
  title_en text check (char_length(title_en) <= 120),
  description_ar text not null check (char_length(btrim(description_ar)) between 1 and 3000),
  description_en text check (char_length(description_en) <= 3000),
  image text not null check (image in ('/images/about2.png', '/member/yoga-class.png', '/member/fitness-class.png')),
  price numeric(10, 2) check (price >= 0),
  hourly boolean not null default false check (not hourly or price is not null),
  duration_ar text check (char_length(duration_ar) <= 150),
  duration_en text check (char_length(duration_en) <= 150)
);

alter table public.private_session_services enable row level security;
revoke all on public.private_session_services from public, anon, authenticated;
grant select on public.private_session_services to anon, authenticated;
grant insert, update on public.private_session_services to authenticated;

create policy "Everyone can view private session services"
  on public.private_session_services for select to anon, authenticated using (true);
create policy "Admins can insert private session services"
  on public.private_session_services for insert to authenticated with check ((select public.is_admin()));
create policy "Admins can update private session services"
  on public.private_session_services for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

insert into public.private_session_services
  (title_ar, title_en, description_ar, description_en, image, price, hourly, duration_ar, duration_en)
values
  ('رحلة تيسير الشخصية', 'Personal Facilitation Journey', 'برنامج مرافقة شخصية لمدة شهر كامل. خلال هذا البرنامج لن تكوني وحدك في رحلة التغيير، بل سأكون معك خطوة بخطوة، أتابع تقدمك، وأرسل لك يوميًا توجيهات، وتمارين، وتأملات، أو مهام بسيطة تناسب احتياجاتك وأهدافك. نهدف معًا إلى بناء عادات صحية، وتنظيم مختلف جوانب الحياة، وتعزيز الالتزام، حتى يصبح التغيير أسلوب حياة وليس مجرد مرحلة مؤقتة', 'A full month of personal accompaniment. Throughout this program you won’t be alone on your journey of change — I’ll be with you every step, following your progress, sending you daily guidance, exercises, reflections, or simple tasks suited to your needs and goals. Together we aim to build healthy habits, organize different areas of life, and strengthen commitment, so change becomes a way of life rather than a temporary phase.', '/images/about2.png', null, false, null, null),
  ('جلسة العلاج بالصوت', 'Sound Healing Session', 'رحلة استرخاء عميقة باستخدام الطاسات التبتية وأدوات العلاج بالصوت، تساعد على تهدئة الجهاز العصبي، وتخفيف التوتر، وتعزيز الشعور', 'A deep relaxation journey using Tibetan bowls and sound healing tools, helping to calm the nervous system, ease tension, and enhance well-being.', '/member/yoga-class.png', 200, false, 'ساعة ونص', 'One and a half hours'),
  ('الجلسات الفردية', 'Private Sessions', 'جلسات فردية مصممة بما يتناسب مع احتياجاتك، لنستكشف معًا التحديات التي تمرين بها، ونبني خطوات عملية تساعدك على الوصول إلى توازن نفسي وعاطفي أكبر. قد تشمل الجلسات العمل على إدارة الضغوط، تعزيز الثقة بالنفس، تنظيم المشاعر، اكتشاف الأنماط التي تعيقك، ووضع خطة تناسب أهدافك وظروفك.', 'One-on-one sessions designed around your needs, to explore together the challenges you’re going through and build practical steps toward greater emotional and psychological balance. Sessions may include working on stress management, building self-confidence, regulating emotions, discovering patterns holding you back, and creating a plan suited to your goals and circumstances.', '/member/fitness-class.png', 100, true, 'ساعة واحدة، أو حسب احتياجك.', 'One hour, or as needed.');

commit;
