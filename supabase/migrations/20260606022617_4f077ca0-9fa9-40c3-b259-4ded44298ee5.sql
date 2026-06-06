
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.seed_demo_data(UUID) FROM PUBLIC, anon;
-- seed_demo_data keeps EXECUTE for `authenticated` so the app can call it for the signed-in user.
GRANT EXECUTE ON FUNCTION public.seed_demo_data(UUID) TO authenticated;
