CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.owns_form(_form_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.forms f WHERE f.id = _form_id AND f.user_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION private.owns_response(_response_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.responses r
    JOIN public.forms f ON f.id = r.form_id
    WHERE r.id = _response_id AND f.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION private.form_accepting(_form_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.forms f WHERE f.id = _form_id AND f.accepting_responses);
$$;

CREATE OR REPLACE FUNCTION private.response_form_accepting(_response_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.responses r
    JOIN public.forms f ON f.id = r.form_id
    WHERE r.id = _response_id AND f.accepting_responses
  );
$$;

GRANT USAGE ON SCHEMA private TO anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA private TO anon, authenticated, service_role;

-- Recreate policies against the private helpers
DROP POLICY IF EXISTS questions_owner_all ON public.questions;
CREATE POLICY questions_owner_all ON public.questions FOR ALL TO authenticated
  USING (private.owns_form(form_id)) WITH CHECK (private.owns_form(form_id));

DROP POLICY IF EXISTS responses_owner_read ON public.responses;
CREATE POLICY responses_owner_read ON public.responses FOR SELECT TO authenticated
  USING (private.owns_form(form_id));
DROP POLICY IF EXISTS responses_owner_delete ON public.responses;
CREATE POLICY responses_owner_delete ON public.responses FOR DELETE TO authenticated
  USING (private.owns_form(form_id));
DROP POLICY IF EXISTS responses_public_insert ON public.responses;
CREATE POLICY responses_public_insert ON public.responses FOR INSERT TO anon, authenticated
  WITH CHECK (private.form_accepting(form_id));

DROP POLICY IF EXISTS answers_owner_read ON public.response_answers;
CREATE POLICY answers_owner_read ON public.response_answers FOR SELECT TO authenticated
  USING (private.owns_response(response_id));
DROP POLICY IF EXISTS answers_owner_delete ON public.response_answers;
CREATE POLICY answers_owner_delete ON public.response_answers FOR DELETE TO authenticated
  USING (private.owns_response(response_id));
DROP POLICY IF EXISTS answers_public_insert ON public.response_answers;
CREATE POLICY answers_public_insert ON public.response_answers FOR INSERT TO anon, authenticated
  WITH CHECK (private.response_form_accepting(response_id));

-- Restrict public form visibility to forms currently accepting responses
DROP POLICY IF EXISTS forms_public_read ON public.forms;
CREATE POLICY forms_public_read ON public.forms FOR SELECT TO anon, authenticated
  USING (accepting_responses);

-- Restrict public question reads to questions of accepting forms
DROP POLICY IF EXISTS questions_public_read ON public.questions;
CREATE POLICY questions_public_read ON public.questions FOR SELECT TO anon, authenticated
  USING (private.form_accepting(form_id));

-- Storage: only allow uploads into a folder belonging to an accepting form
DROP POLICY IF EXISTS form_uploads_insert ON storage.objects;
CREATE POLICY form_uploads_insert ON storage.objects FOR INSERT TO anon, authenticated
  WITH CHECK (
    bucket_id = 'form-uploads'
    AND (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
    AND private.form_accepting(((storage.foldername(name))[1])::uuid)
  );

DROP POLICY IF EXISTS form_uploads_owner_read ON storage.objects;
CREATE POLICY form_uploads_owner_read ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'form-uploads'
    AND (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
    AND private.owns_form(((storage.foldername(name))[1])::uuid)
  );

-- Remove the publicly callable copies in the exposed API schema
DROP FUNCTION IF EXISTS public.owns_form(uuid);
DROP FUNCTION IF EXISTS public.owns_response(uuid);
DROP FUNCTION IF EXISTS public.form_accepting(uuid);
DROP FUNCTION IF EXISTS public.response_form_accepting(uuid);

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;