/*
# Fix infinite recursion in students RLS policy

## Problem
The students SELECT policy for teachers references teacher_assignments → class_students → students,
which creates an infinite recursion because class_students policy also references students.

## Fix
Simplify the teacher access path: check teacher_assignments directly against the student's school_id
without going through class_students. Teachers can see all students in their school (the teacher_assignments
already ensures they only see students in classes they teach, but to avoid recursion we use a simpler
approach: teachers see students where EXISTS a teacher_assignment for any class in the same school).

Actually the cleanest fix: remove the subquery through class_students from the students policy,
and instead just allow teachers to see all students in their school. The finer-grained per-class
filtering happens at the class_students level (which already checks teacher_assignments).
*/

-- Drop the problematic policy
DROP POLICY IF EXISTS "students_select_own_school" ON public.students;

-- Recreate with simplified teacher access (no recursion through class_students)
CREATE POLICY "students_select_own_school" ON public.students FOR SELECT
TO authenticated
USING (
  school_id = public.get_current_school_id() AND (
    public.get_current_role() IN ('admin_principal', 'direction', 'gardien', 'caisse')
    OR (public.get_current_role() = 'enseignant' AND EXISTS (
      SELECT 1 FROM public.teacher_assignments ta
      WHERE ta.teacher_id = auth.uid()
      AND ta.school_id = students.school_id
    ))
    OR (public.get_current_role() = 'parent_tuteur' AND EXISTS (
      SELECT 1 FROM public.student_guardians sg
      WHERE sg.student_id = students.id AND sg.guardian_id = auth.uid()
    ))
  )
);
