-- Allow all team members to view, edit and manage forms created by superadmin
CREATE OR REPLACE FUNCTION private.owns_form(_form_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.forms f 
    WHERE f.id = _form_id 
    AND (f.user_id = auth.uid() OR auth.uid() IS NOT NULL)
  );
$$;

CREATE OR REPLACE FUNCTION private.owns_response(_response_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.responses r
    JOIN public.forms f ON f.id = r.form_id
    WHERE r.id = _response_id 
    AND (f.user_id = auth.uid() OR auth.uid() IS NOT NULL)
  );
$$;

-- Allow team members to update/edit forms
DROP POLICY IF EXISTS "forms_owner_all" ON public.forms;
CREATE POLICY "forms_team_all" ON public.forms
FOR ALL TO authenticated
USING (true)
WITH CHECK (true);
