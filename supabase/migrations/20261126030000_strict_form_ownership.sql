-- Strict form ownership with Admin approval capabilities
-- Only the user who created the form (user_id = auth.uid()) can access, edit, or delete it.
-- Admin (ecellniet@niet.co.in) has permission to view and approve forms submitted by team members.

-- 1. Helper function to check if current user is SuperAdmin
CREATE OR REPLACE FUNCTION private.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT (auth.jwt() ->> 'email' = 'ecellniet@niet.co.in');
$$;

-- 2. Restore private.owns_form to check strict user ownership (or Admin)
CREATE OR REPLACE FUNCTION private.owns_form(_form_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.forms f 
    WHERE f.id = _form_id 
    AND (f.user_id = auth.uid() OR private.is_admin())
  );
$$;

-- 3. Restore private.owns_response to check strict user ownership (or Admin)
CREATE OR REPLACE FUNCTION private.owns_response(_response_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.responses r
    JOIN public.forms f ON f.id = r.form_id
    WHERE r.id = _response_id 
    AND (f.user_id = auth.uid() OR private.is_admin())
  );
$$;

-- 4. Drop permissive team policies
DROP POLICY IF EXISTS "forms_team_all" ON public.forms;
DROP POLICY IF EXISTS "forms_owner_all" ON public.forms;

-- 5. Create creator-only policy on forms (with Admin approval capability)
CREATE POLICY "forms_owner_all" ON public.forms
FOR ALL TO authenticated
USING (auth.uid() = user_id OR private.is_admin())
WITH CHECK (auth.uid() = user_id OR private.is_admin());

-- 6. Lock down questions
DROP POLICY IF EXISTS "questions_owner_all" ON public.questions;
CREATE POLICY "questions_owner_all" ON public.questions
FOR ALL TO authenticated
USING (private.owns_form(form_id))
WITH CHECK (private.owns_form(form_id));

-- 7. Lock down responses
DROP POLICY IF EXISTS "responses_owner_read" ON public.responses;
CREATE POLICY "responses_owner_read" ON public.responses
FOR SELECT TO authenticated
USING (private.owns_form(form_id));

DROP POLICY IF EXISTS "responses_owner_delete" ON public.responses;
CREATE POLICY "responses_owner_delete" ON public.responses
FOR DELETE TO authenticated
USING (private.owns_form(form_id));

-- 8. Lock down response answers
DROP POLICY IF EXISTS "answers_owner_read" ON public.response_answers;
CREATE POLICY "answers_owner_read" ON public.response_answers
FOR SELECT TO authenticated
USING (private.owns_response(response_id));

DROP POLICY IF EXISTS "answers_owner_delete" ON public.response_answers;
CREATE POLICY "answers_owner_delete" ON public.response_answers
FOR DELETE TO authenticated
USING (private.owns_response(response_id));
