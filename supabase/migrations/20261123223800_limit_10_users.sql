-- Enforce max 10 users in admin_create_user function
CREATE OR REPLACE FUNCTION public.admin_create_user(
  new_email text,
  new_password text,
  new_name text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  new_id uuid := gen_random_uuid();
  encrypted_pw text;
  clean_email text := lower(trim(new_email));
  clean_name text := trim(new_name);
  current_count int;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Enforce 10 users limit
  SELECT count(*) INTO current_count FROM auth.users;
  IF current_count >= 10 THEN
    RAISE EXCEPTION 'Maximum user limit of 10 reached. Please delete an existing member first.';
  END IF;

  IF clean_email = '' OR new_password = '' THEN
    RAISE EXCEPTION 'Email and password cannot be empty';
  END IF;

  IF length(new_password) < 6 THEN
    RAISE EXCEPTION 'Password must be at least 6 characters long';
  END IF;

  IF EXISTS (SELECT 1 FROM auth.users WHERE email = clean_email) THEN
    RAISE EXCEPTION 'User already exists with this email';
  END IF;

  encrypted_pw := extensions.crypt(new_password, extensions.gen_salt('bf'));

  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    role,
    aud,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change,
    email_change_token_current,
    phone_change,
    phone_change_token,
    reauthentication_token
  ) VALUES (
    new_id,
    '00000000-0000-0000-0000-000000000000'::uuid,
    clean_email,
    encrypted_pw,
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('name', clean_name),
    now(),
    now(),
    'authenticated',
    'authenticated',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    ''
  );

  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    new_id,
    jsonb_build_object('sub', new_id::text, 'email', clean_email),
    'email',
    clean_email,
    now(),
    now(),
    now()
  );

  INSERT INTO public.profiles (id, name, email)
  VALUES (new_id, clean_name, clean_email)
  ON CONFLICT (id) DO UPDATE SET name = clean_name, email = clean_email;

  RETURN new_id;
END;
$$;
