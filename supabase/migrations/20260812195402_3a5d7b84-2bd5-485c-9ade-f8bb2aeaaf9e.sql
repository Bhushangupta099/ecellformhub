
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text,
  email text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)), NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Untitled form',
  description text NOT NULL DEFAULT '',
  slug text NOT NULL UNIQUE,
  accepting_responses boolean NOT NULL DEFAULT true,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX forms_user_id_idx ON public.forms(user_id);
CREATE INDEX forms_slug_idx ON public.forms(slug);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.forms TO authenticated;
GRANT SELECT ON public.forms TO anon;
GRANT ALL ON public.forms TO service_role;
ALTER TABLE public.forms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "forms_owner_all" ON public.forms FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "forms_public_read" ON public.forms FOR SELECT TO anon, authenticated USING (true);

CREATE OR REPLACE FUNCTION public.owns_form(_form_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.forms f WHERE f.id = _form_id AND f.user_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.form_accepting(_form_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.forms f WHERE f.id = _form_id AND f.accepting_responses);
$$;

CREATE TABLE public.questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id uuid NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
  question_type text NOT NULL,
  question_text text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  required boolean NOT NULL DEFAULT false,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX questions_form_id_idx ON public.questions(form_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.questions TO authenticated;
GRANT SELECT ON public.questions TO anon;
GRANT ALL ON public.questions TO service_role;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "questions_owner_all" ON public.questions FOR ALL TO authenticated USING (public.owns_form(form_id)) WITH CHECK (public.owns_form(form_id));
CREATE POLICY "questions_public_read" ON public.questions FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id uuid NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
  respondent_email text,
  submitted_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX responses_form_id_idx ON public.responses(form_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.responses TO authenticated;
GRANT INSERT ON public.responses TO anon;
GRANT ALL ON public.responses TO service_role;
ALTER TABLE public.responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "responses_owner_read" ON public.responses FOR SELECT TO authenticated USING (public.owns_form(form_id));
CREATE POLICY "responses_owner_delete" ON public.responses FOR DELETE TO authenticated USING (public.owns_form(form_id));
CREATE POLICY "responses_public_insert" ON public.responses FOR INSERT TO anon, authenticated WITH CHECK (public.form_accepting(form_id));

CREATE TABLE public.response_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id uuid NOT NULL REFERENCES public.responses(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  answer text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX response_answers_response_id_idx ON public.response_answers(response_id);
CREATE INDEX response_answers_question_id_idx ON public.response_answers(question_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.response_answers TO authenticated;
GRANT INSERT ON public.response_answers TO anon;
GRANT ALL ON public.response_answers TO service_role;
ALTER TABLE public.response_answers ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.owns_response(_response_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.responses r
    JOIN public.forms f ON f.id = r.form_id
    WHERE r.id = _response_id AND f.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.response_form_accepting(_response_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.responses r
    JOIN public.forms f ON f.id = r.form_id
    WHERE r.id = _response_id AND f.accepting_responses
  );
$$;

CREATE POLICY "answers_owner_read" ON public.response_answers FOR SELECT TO authenticated USING (public.owns_response(response_id));
CREATE POLICY "answers_owner_delete" ON public.response_answers FOR DELETE TO authenticated USING (public.owns_response(response_id));
CREATE POLICY "answers_public_insert" ON public.response_answers FOR INSERT TO anon, authenticated WITH CHECK (public.response_form_accepting(response_id));

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER forms_touch_updated_at BEFORE UPDATE ON public.forms
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE POLICY "form_uploads_insert" ON storage.objects FOR INSERT TO anon, authenticated
WITH CHECK (bucket_id = 'form-uploads');
CREATE POLICY "form_uploads_owner_read" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'form-uploads' AND public.owns_form(((storage.foldername(name))[1])::uuid));
