/*
# Auto-populate app_metadata on signup

When a user signs up via Supabase Auth, their `raw_user_meta_data` contains
the data passed in `options.data`. This trigger copies `school_id` and `role`
from `raw_user_meta_data` into `app_metadata` (which is user-immutable and
used by RLS policies via `auth.jwt() -> 'app_metadata'`).

This allows the client-side signUp to pass school_id and role in user_metadata,
and have them automatically promoted to app_metadata for RLS.

## Security
- The trigger runs AFTER INSERT on auth.users
- It reads from raw_user_meta_data (set by the client at signup)
- It writes to raw_app_meta_data (immutable by the user)
- Only copies school_id and role fields — no other data is touched
*/

CREATE OR REPLACE FUNCTION public.handle_new_user_meta()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Copy school_id and role from user_meta_data to app_meta_data
  IF NEW.raw_user_meta_data->>'school_id' IS NOT NULL THEN
    NEW.raw_app_meta_data = COALESCE(NEW.raw_app_meta_data, '{}'::jsonb) || jsonb_build_object(
      'school_id', NEW.raw_user_meta_data->>'school_id'
    );
  END IF;
  
  IF NEW.raw_user_meta_data->>'role' IS NOT NULL THEN
    NEW.raw_app_meta_data = COALESCE(NEW.raw_app_meta_data, '{}'::jsonb) || jsonb_build_object(
      'role', NEW.raw_user_meta_data->>'role'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_meta ON auth.users;
CREATE TRIGGER on_auth_user_created_meta
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_meta();
