-- Function to check if an email exists in auth.users for password recovery
CREATE OR REPLACE FUNCTION public.check_user_exists(check_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users 
    WHERE lower(email) = lower(trim(check_email))
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_user_exists(text) TO anon, authenticated, service_role;
