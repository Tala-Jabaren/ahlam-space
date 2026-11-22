begin;

alter table public.private_session_services
  drop constraint private_session_services_image_check,
  add constraint private_session_services_image_check check (
    image in ('/images/about2.png', '/member/yoga-class.png', '/member/fitness-class.png')
    or image ~ '^private-sessions/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$'
  );

commit;
