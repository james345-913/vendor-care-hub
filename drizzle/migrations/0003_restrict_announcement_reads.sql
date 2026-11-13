DROP POLICY IF EXISTS "Members read announcements" ON public.announcements;
CREATE POLICY "Members read announcements" ON public.announcements
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.membership_status = 'active'::membership_status)
);