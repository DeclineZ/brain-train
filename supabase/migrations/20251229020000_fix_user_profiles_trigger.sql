-- Make dob and gender nullable to support LINE login (where these might be missing initially)
ALTER TABLE IF EXISTS public.user_profiles ALTER COLUMN dob DROP NOT NULL;
ALTER TABLE IF EXISTS public.user_profiles ALTER COLUMN gender DROP NOT NULL;

-- Update the handle_new_user function to match the actual schema of user_profiles
-- Removing the game stats columns (coins, global_*) from the INSERT as they do not exist in the table.
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
    dob,
    gender,
    last_updated
  )
  VALUES (
    new.id,
    new.email, -- using email from auth.users
    new.raw_user_meta_data->>'full_name',
    CASE
        WHEN new.raw_user_meta_data->>'dob' = '' THEN NULL
        ELSE (new.raw_user_meta_data->>'dob')::date
    END,
    new.raw_user_meta_data->>'gender',
    now()
  );
  RETURN new;
END;
$$;
