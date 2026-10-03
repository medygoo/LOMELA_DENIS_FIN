/*
# Fix infinite recursion: add school_id to junction tables

## Problem
The students SELECT policy references student_guardians, which references students back,
creating infinite recursion. The same issue exists with class_students and authorized_persons.

## Fix
Add school_id column to student_guardians, class_students, and authorized_persons.
This allows their RLS policies to check school_id directly without referencing the parent table.
Then update the policies to use the local school_id instead of subquerying the parent table.
*/

-- Add school_id to student_guardians
ALTER TABLE public.student_guardians ADD COLUMN IF NOT EXISTS school_id uuid;

-- Add school_id to class_students  
ALTER TABLE public.class_students ADD COLUMN IF NOT EXISTS school_id uuid;

-- Add school_id to authorized_persons
ALTER TABLE public.authorized_persons ADD COLUMN IF NOT EXISTS school_id uuid;

-- Backfill: populate school_id from parent tables
UPDATE public.student_guardians sg
SET school_id = s.school_id
FROM public.students s
WHERE sg.student_id = s.id AND sg.school_id IS NULL;

UPDATE public.class_students cs
SET school_id = c.school_id
FROM public.classes c
WHERE cs.class_id = c.id AND cs.school_id IS NULL;

UPDATE public.authorized_persons ap
SET school_id = s.school_id
FROM public.students s
WHERE ap.student_id = s.id AND ap.school_id IS NULL;

-- Set NOT NULL after backfill
ALTER TABLE public.student_guardians ALTER COLUMN school_id SET NOT NULL;
ALTER TABLE public.class_students ALTER COLUMN school_id SET NOT NULL;
ALTER TABLE public.authorized_persons ALTER COLUMN school_id SET NOT NULL;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_sg_school_id ON public.student_guardians(school_id);
CREATE INDEX IF NOT EXISTS idx_cs_school_id ON public.class_students(school_id);
CREATE INDEX IF NOT EXISTS idx_ap_school_id ON public.authorized_persons(school_id);

-- ============================================================
-- Update policies to use local school_id (no recursion)
-- ============================================================

-- STUDENT_GUARDIANS: use local school_id
DROP POLICY IF EXISTS "sg_select_own" ON public.student_guardians;
CREATE POLICY "sg_select_own" ON public.student_guardians FOR SELECT
TO authenticated
USING (
  school_id = public.get_current_school_id()
  AND (public.get_current_role() IN ('admin_principal', 'direction', 'gardien') OR guardian_id = auth.uid())
);

DROP POLICY IF EXISTS "sg_insert_own" ON public.student_guardians;
CREATE POLICY "sg_insert_own" ON public.student_guardians FOR INSERT
TO authenticated
WITH CHECK (
  school_id = public.get_current_school_id()
  AND public.get_current_role() IN ('admin_principal', 'direction')
);

DROP POLICY IF EXISTS "sg_update_own" ON public.student_guardians;
CREATE POLICY "sg_update_own" ON public.student_guardians FOR UPDATE
TO authenticated
USING (school_id = public.get_current_school_id() AND public.get_current_role() IN ('admin_principal', 'direction'))
WITH CHECK (school_id = public.get_current_school_id() AND public.get_current_role() IN ('admin_principal', 'direction'));

DROP POLICY IF EXISTS "sg_delete_own" ON public.student_guardians;
CREATE POLICY "sg_delete_own" ON public.student_guardians FOR DELETE
TO authenticated
USING (school_id = public.get_current_school_id() AND public.get_current_role() IN ('admin_principal', 'direction'));

-- CLASS_STUDENTS: use local school_id
DROP POLICY IF EXISTS "cs_select_own" ON public.class_students;
CREATE POLICY "cs_select_own" ON public.class_students FOR SELECT
TO authenticated
USING (
  school_id = public.get_current_school_id()
  AND (
    public.get_current_role() IN ('admin_principal', 'direction', 'gardien', 'caisse')
    OR (public.get_current_role() = 'enseignant' AND EXISTS (
      SELECT 1 FROM public.teacher_assignments ta WHERE ta.class_id = class_id AND ta.teacher_id = auth.uid()
    ))
    OR (public.get_current_role() = 'parent_tuteur' AND EXISTS (
      SELECT 1 FROM public.student_guardians sg WHERE sg.student_id = class_students.student_id AND sg.guardian_id = auth.uid()
    ))
  )
);

DROP POLICY IF EXISTS "cs_insert_own" ON public.class_students;
CREATE POLICY "cs_insert_own" ON public.class_students FOR INSERT
TO authenticated
WITH CHECK (
  school_id = public.get_current_school_id()
  AND public.get_current_role() IN ('admin_principal', 'direction')
);

DROP POLICY IF EXISTS "cs_update_own" ON public.class_students;
CREATE POLICY "cs_update_own" ON public.class_students FOR UPDATE
TO authenticated
USING (school_id = public.get_current_school_id() AND public.get_current_role() IN ('admin_principal', 'direction'))
WITH CHECK (school_id = public.get_current_school_id() AND public.get_current_role() IN ('admin_principal', 'direction'));

DROP POLICY IF EXISTS "cs_delete_own" ON public.class_students;
CREATE POLICY "cs_delete_own" ON public.class_students FOR DELETE
TO authenticated
USING (school_id = public.get_current_school_id() AND public.get_current_role() IN ('admin_principal', 'direction'));

-- AUTHORIZED_PERSONS: use local school_id
DROP POLICY IF EXISTS "ap_select_own" ON public.authorized_persons;
CREATE POLICY "ap_select_own" ON public.authorized_persons FOR SELECT
TO authenticated
USING (
  school_id = public.get_current_school_id()
  AND public.get_current_role() IN ('admin_principal', 'direction', 'gardien', 'parent_tuteur')
);

DROP POLICY IF EXISTS "ap_insert_own" ON public.authorized_persons;
CREATE POLICY "ap_insert_own" ON public.authorized_persons FOR INSERT
TO authenticated
WITH CHECK (
  school_id = public.get_current_school_id()
  AND public.get_current_role() IN ('admin_principal', 'direction', 'parent_tuteur')
);

DROP POLICY IF EXISTS "ap_update_own" ON public.authorized_persons;
CREATE POLICY "ap_update_own" ON public.authorized_persons FOR UPDATE
TO authenticated
USING (school_id = public.get_current_school_id() AND public.get_current_role() IN ('admin_principal', 'direction', 'parent_tuteur'))
WITH CHECK (school_id = public.get_current_school_id() AND public.get_current_role() IN ('admin_principal', 'direction', 'parent_tuteur'));

DROP POLICY IF EXISTS "ap_delete_own" ON public.authorized_persons;
CREATE POLICY "ap_delete_own" ON public.authorized_persons FOR DELETE
TO authenticated
USING (school_id = public.get_current_school_id() AND public.get_current_role() IN ('admin_principal', 'direction', 'parent_tuteur'));

-- Fix the students SELECT policy to avoid recursion through student_guardians
-- student_guardians now has school_id, so we don't need to reference students.school_id in the subquery
DROP POLICY IF EXISTS "students_select_own_school" ON public.students;
CREATE POLICY "students_select_own_school" ON public.students FOR SELECT
TO authenticated
USING (
  school_id = public.get_current_school_id() AND (
    public.get_current_role() IN ('admin_principal', 'direction', 'gardien', 'caisse')
    OR (public.get_current_role() = 'enseignant' AND EXISTS (
      SELECT 1 FROM public.teacher_assignments ta
      WHERE ta.teacher_id = auth.uid() AND ta.school_id = students.school_id
    ))
    OR (public.get_current_role() = 'parent_tuteur' AND EXISTS (
      SELECT 1 FROM public.student_guardians sg
      WHERE sg.student_id = students.id AND sg.guardian_id = auth.uid()
    ))
  )
);
