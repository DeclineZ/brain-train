-- 1. Ensure columns are nullable (Safety check)
ALTER TABLE IF EXISTS public.user_profiles ALTER COLUMN dob DROP NOT NULL;
ALTER TABLE IF EXISTS public.user_profiles ALTER COLUMN gender DROP NOT NULL;

-- 2. Define the robust function with Full Name support
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (
    user_id,
    email,
    full_name,
    avatar_url, -- Assuming this column exists, if not, remove this line
    last_updated
  )
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    now()
  );
  RETURN new;
END;
$$;

-- 3. Re-create the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
