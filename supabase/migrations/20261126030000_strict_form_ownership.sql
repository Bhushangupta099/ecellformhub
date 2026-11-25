-- Revert team-wide forms access and enforce strict owner-only access.
-- Only the user who created the form (user_id = auth.uid()) can access, edit, or delete it,
-- and only the form creator can manage its questions, view its responses, and delete its data.

-- 1. Restore private.owns_form to check strict user ownership
CREATE OR REPLACE FUNCTION private.owns_form(_form_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.forms f 
    WHERE f.id = _form_id 
    AND f.user_id = auth.uid()
  );
$$;

-- 2. Restore private.owns_response to check strict user ownership
CREATE OR REPLACE FUNCTION private.owns_response(_response_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.responses r
    JOIN public.forms f ON f.id = r.form_id
    WHERE r.id = _response_id 
    AND f.user_id = auth.uid()
  );
$$;

-- 3. Drop any permissive team policies on public.forms
DROP POLICY IF EXISTS "forms_team_all" ON public.forms;
DROP POLICY IF EXISTS "forms_owner_all" ON public.forms;

-- 4. Create strict owner-only policy on public.forms
-- Only the user whose id matches forms.user_id can select, insert, update, or delete
CREATE POLICY "forms_owner_all" ON public.forms
FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 5. Ensure questions owner policy strictly uses private.owns_form
DROP POLICY IF EXISTS "questions_owner_all" ON public.questions;
CREATE POLICY "questions_owner_all" ON public.questions
FOR ALL TO authenticated
USING (private.owns_form(form_id))
WITH CHECK (private.owns_form(form_id));

-- 6. Ensure responses owner policies strictly use private.owns_form
DROP POLICY IF EXISTS "responses_owner_read" ON public.responses;
CREATE POLICY "responses_owner_read" ON public.responses
FOR SELECT TO authenticated
USING (private.owns_form(form_id));

DROP POLICY IF EXISTS "responses_owner_delete" ON public.responses;
CREATE POLICY "responses_owner_delete" ON public.responses
FOR DELETE TO authenticated
USING (private.owns_form(form_id));

-- 7. Ensure response_answers owner policies strictly use private.owns_response
DROP POLICY IF EXISTS "answers_owner_read" ON public.response_answers;
CREATE POLICY "answers_owner_read" ON public.response_answers
FOR SELECT TO authenticated
USING (private.owns_response(response_id));

DROP POLICY IF EXISTS "answers_owner_delete" ON public.response_answers;
CREATE POLICY "answers_owner_delete" ON public.response_answers
FOR DELETE TO authenticated
USING (private.owns_response(response_id));
