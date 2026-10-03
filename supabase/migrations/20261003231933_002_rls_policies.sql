/*
# SchoolSafe Schema — Part 2: RLS Policies

Adds all Row Level Security policies for the 23 tables created in migration 001.
Each policy enforces:
1. Tenant isolation: users can only access rows belonging to their school
2. Role-based access: different roles have different CRUD permissions
3. Relationship-based access: teachers see only assigned classes/students, parents see only their children

## Role summary
- admin_principal: Full CRUD on school data, users, staff, audit log
- direction: CRUD on students, families, classes, subjects, assignments, attendance, grades
- enseignant: CRUD on own homework/grades/attendance; read assigned classes/subjects/students
- parent_tuteur: Read own children's data; manage authorized persons for own children
- gardien: Read students/classes; manage entries/exits and QR codes
- caisse: CRUD on fees, payments, receipts
*/

-- ============================================================
-- SCHOOLS
-- ============================================================
DROP POLICY IF EXISTS "schools_select_own" ON public.schools;
CREATE POLICY "schools_select_own" ON public.schools FOR SELECT
TO authenticated USING (id = public.get_current_school_id());

DROP POLICY IF EXISTS "schools_update_own" ON public.schools;
CREATE POLICY "schools_update_own" ON public.schools FOR UPDATE
TO authenticated
USING (id = public.get_current_school_id())
WITH CHECK (id = public.get_current_school_id() AND public.get_current_role() = 'admin_principal');

-- ============================================================
-- SCHOOL YEARS
-- ============================================================
DROP POLICY IF EXISTS "school_years_select_own" ON public.school_years;
CREATE POLICY "school_years_select_own" ON public.school_years FOR SELECT
TO authenticated USING (school_id = public.get_current_school_id());

DROP POLICY IF EXISTS "school_years_insert_own" ON public.school_years;
CREATE POLICY "school_years_insert_own" ON public.school_years FOR INSERT
TO authenticated
WITH CHECK (school_id = public.get_current_school_id() AND public.get_current_role() IN ('admin_principal', 'direction'));

DROP POLICY IF EXISTS "school_years_update_own" ON public.school_years;
CREATE POLICY "school_years_update_own" ON public.school_years FOR UPDATE
TO authenticated
USING (school_id = public.get_current_school_id())
WITH CHECK (school_id = public.get_current_school_id() AND public.get_current_role() IN ('admin_principal', 'direction'));

DROP POLICY IF EXISTS "school_years_delete_own" ON public.school_years;
CREATE POLICY "school_years_delete_own" ON public.school_years FOR DELETE
TO authenticated
USING (school_id = public.get_current_school_id() AND public.get_current_role() IN ('admin_principal', 'direction'));

-- ============================================================
-- PROFILES
-- ============================================================
DROP POLICY IF EXISTS "profiles_select_own_school" ON public.profiles;
CREATE POLICY "profiles_select_own_school" ON public.profiles FOR SELECT
TO authenticated USING (school_id = public.get_current_school_id());

DROP POLICY IF EXISTS "profiles_insert_own_school" ON public.profiles;
CREATE POLICY "profiles_insert_own_school" ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (school_id = public.get_current_school_id() AND public.get_current_role() = 'admin_principal');

DROP POLICY IF EXISTS "profiles_update_own_school" ON public.profiles;
CREATE POLICY "profiles_update_own_school" ON public.profiles FOR UPDATE
TO authenticated
USING (school_id = public.get_current_school_id() AND (public.get_current_role() = 'admin_principal' OR id = auth.uid()))
WITH CHECK (school_id = public.get_current_school_id());

DROP POLICY IF EXISTS "profiles_delete_own_school" ON public.profiles;
CREATE POLICY "profiles_delete_own_school" ON public.profiles FOR DELETE
TO authenticated
USING (school_id = public.get_current_school_id() AND public.get_current_role() = 'admin_principal');

-- Column-level: protect role and school_id from direct client writes
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (first_name, last_name, phone) ON public.profiles TO authenticated;

-- ============================================================
-- STAFF
-- ============================================================
DROP POLICY IF EXISTS "staff_select_own_school" ON public.staff;
CREATE POLICY "staff_select_own_school" ON public.staff FOR SELECT
TO authenticated USING (school_id = public.get_current_school_id());

DROP POLICY IF EXISTS "staff_insert_own_school" ON public.staff;
CREATE POLICY "staff_insert_own_school" ON public.staff FOR INSERT
TO authenticated
WITH CHECK (school_id = public.get_current_school_id() AND public.get_current_role() IN ('admin_principal', 'direction'));

DROP POLICY IF EXISTS "staff_update_own_school" ON public.staff;
CREATE POLICY "staff_update_own_school" ON public.staff FOR UPDATE
TO authenticated
USING (school_id = public.get_current_school_id())
WITH CHECK (school_id = public.get_current_school_id() AND public.get_current_role() IN ('admin_principal', 'direction'));

DROP POLICY IF EXISTS "staff_delete_own_school" ON public.staff;
CREATE POLICY "staff_delete_own_school" ON public.staff FOR DELETE
TO authenticated
USING (school_id = public.get_current_school_id() AND public.get_current_role() IN ('admin_principal', 'direction'));

-- ============================================================
-- STUDENTS
-- ============================================================
DROP POLICY IF EXISTS "students_select_own_school" ON public.students;
CREATE POLICY "students_select_own_school" ON public.students FOR SELECT
TO authenticated
USING (
  school_id = public.get_current_school_id() AND (
    public.get_current_role() IN ('admin_principal', 'direction', 'gardien', 'caisse')
    OR (public.get_current_role() = 'enseignant' AND EXISTS (
      SELECT 1 FROM public.teacher_assignments ta
      WHERE ta.teacher_id = auth.uid()
      AND ta.class_id IN (SELECT cs.class_id FROM public.class_students cs WHERE cs.student_id = students.id)
    ))
    OR (public.get_current_role() = 'parent_tuteur' AND EXISTS (
      SELECT 1 FROM public.student_guardians sg WHERE sg.student_id = students.id AND sg.guardian_id = auth.uid()
    ))
  )
);

DROP POLICY IF EXISTS "students_insert_own_school" ON public.students;
CREATE POLICY "students_insert_own_school" ON public.students FOR INSERT
TO authenticated
WITH CHECK (school_id = public.get_current_school_id() AND public.get_current_role() IN ('admin_principal', 'direction'));

DROP POLICY IF EXISTS "students_update_own_school" ON public.students;
CREATE POLICY "students_update_own_school" ON public.students FOR UPDATE
TO authenticated
USING (school_id = public.get_current_school_id())
WITH CHECK (school_id = public.get_current_school_id() AND public.get_current_role() IN ('admin_principal', 'direction'));

DROP POLICY IF EXISTS "students_delete_own_school" ON public.students;
CREATE POLICY "students_delete_own_school" ON public.students FOR DELETE
TO authenticated
USING (school_id = public.get_current_school_id() AND public.get_current_role() IN ('admin_principal', 'direction'));

-- ============================================================
-- GUARDIANS
-- ============================================================
DROP POLICY IF EXISTS "guardians_select_own_school" ON public.guardians;
CREATE POLICY "guardians_select_own_school" ON public.guardians FOR SELECT
TO authenticated
USING (school_id = public.get_current_school_id() AND (
  public.get_current_role() IN ('admin_principal', 'direction', 'gardien') OR id = auth.uid()
));

DROP POLICY IF EXISTS "guardians_insert_own_school" ON public.guardians;
CREATE POLICY "guardians_insert_own_school" ON public.guardians FOR INSERT
TO authenticated
WITH CHECK (school_id = public.get_current_school_id() AND public.get_current_role() IN ('admin_principal', 'direction'));

DROP POLICY IF EXISTS "guardians_update_own_school" ON public.guardians;
CREATE POLICY "guardians_update_own_school" ON public.guardians FOR UPDATE
TO authenticated
USING (school_id = public.get_current_school_id())
WITH CHECK (school_id = public.get_current_school_id() AND public.get_current_role() IN ('admin_principal', 'direction', 'parent_tuteur'));

DROP POLICY IF EXISTS "guardians_delete_own_school" ON public.guardians;
CREATE POLICY "guardians_delete_own_school" ON public.guardians FOR DELETE
TO authenticated
USING (school_id = public.get_current_school_id() AND public.get_current_role() IN ('admin_principal', 'direction'));

-- ============================================================
-- STUDENT_GUARDIANS
-- ============================================================
DROP POLICY IF EXISTS "sg_select_own" ON public.student_guardians;
CREATE POLICY "sg_select_own" ON public.student_guardians FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.school_id = public.get_current_school_id())
  AND (public.get_current_role() IN ('admin_principal', 'direction', 'gardien') OR guardian_id = auth.uid())
);

DROP POLICY IF EXISTS "sg_insert_own" ON public.student_guardians;
CREATE POLICY "sg_insert_own" ON public.student_guardians FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.school_id = public.get_current_school_id())
  AND public.get_current_role() IN ('admin_principal', 'direction')
);

DROP POLICY IF EXISTS "sg_update_own" ON public.student_guardians;
CREATE POLICY "sg_update_own" ON public.student_guardians FOR UPDATE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.school_id = public.get_current_school_id())
  AND public.get_current_role() IN ('admin_principal', 'direction')
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.school_id = public.get_current_school_id())
  AND public.get_current_role() IN ('admin_principal', 'direction')
);

DROP POLICY IF EXISTS "sg_delete_own" ON public.student_guardians;
CREATE POLICY "sg_delete_own" ON public.student_guardians FOR DELETE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.school_id = public.get_current_school_id())
  AND public.get_current_role() IN ('admin_principal', 'direction')
);

-- ============================================================
-- AUTHORIZED_PERSONS
-- ============================================================
DROP POLICY IF EXISTS "ap_select_own" ON public.authorized_persons;
CREATE POLICY "ap_select_own" ON public.authorized_persons FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.school_id = public.get_current_school_id())
  AND public.get_current_role() IN ('admin_principal', 'direction', 'gardien', 'parent_tuteur')
);

DROP POLICY IF EXISTS "ap_insert_own" ON public.authorized_persons;
CREATE POLICY "ap_insert_own" ON public.authorized_persons FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.school_id = public.get_current_school_id())
  AND public.get_current_role() IN ('admin_principal', 'direction', 'parent_tuteur')
);

DROP POLICY IF EXISTS "ap_update_own" ON public.authorized_persons;
CREATE POLICY "ap_update_own" ON public.authorized_persons FOR UPDATE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.school_id = public.get_current_school_id())
  AND public.get_current_role() IN ('admin_principal', 'direction', 'parent_tuteur')
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.school_id = public.get_current_school_id())
  AND public.get_current_role() IN ('admin_principal', 'direction', 'parent_tuteur')
);

DROP POLICY IF EXISTS "ap_delete_own" ON public.authorized_persons;
CREATE POLICY "ap_delete_own" ON public.authorized_persons FOR DELETE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.school_id = public.get_current_school_id())
  AND public.get_current_role() IN ('admin_principal', 'direction', 'parent_tuteur')
);

-- ============================================================
-- CLASSES
-- ============================================================
DROP POLICY IF EXISTS "classes_select_own" ON public.classes;
CREATE POLICY "classes_select_own" ON public.classes FOR SELECT
TO authenticated
USING (school_id = public.get_current_school_id() AND (
  public.get_current_role() IN ('admin_principal', 'direction', 'gardien', 'caisse', 'parent_tuteur')
  OR (public.get_current_role() = 'enseignant' AND EXISTS (
    SELECT 1 FROM public.teacher_assignments ta WHERE ta.class_id = classes.id AND ta.teacher_id = auth.uid()
  ))
));

DROP POLICY IF EXISTS "classes_insert_own" ON public.classes;
CREATE POLICY "classes_insert_own" ON public.classes FOR INSERT
TO authenticated
WITH CHECK (school_id = public.get_current_school_id() AND public.get_current_role() IN ('admin_principal', 'direction'));

DROP POLICY IF EXISTS "classes_update_own" ON public.classes;
CREATE POLICY "classes_update_own" ON public.classes FOR UPDATE
TO authenticated
USING (school_id = public.get_current_school_id())
WITH CHECK (school_id = public.get_current_school_id() AND public.get_current_role() IN ('admin_principal', 'direction'));

DROP POLICY IF EXISTS "classes_delete_own" ON public.classes;
CREATE POLICY "classes_delete_own" ON public.classes FOR DELETE
TO authenticated
USING (school_id = public.get_current_school_id() AND public.get_current_role() IN ('admin_principal', 'direction'));

-- ============================================================
-- SUBJECTS
-- ============================================================
DROP POLICY IF EXISTS "subjects_select_own" ON public.subjects;
CREATE POLICY "subjects_select_own" ON public.subjects FOR SELECT
TO authenticated
USING (school_id = public.get_current_school_id() AND (
  public.get_current_role() IN ('admin_principal', 'direction', 'caisse', 'parent_tuteur')
  OR (public.get_current_role() = 'enseignant' AND EXISTS (
    SELECT 1 FROM public.teacher_assignments ta WHERE ta.subject_id = subjects.id AND ta.teacher_id = auth.uid()
  ))
));

DROP POLICY IF EXISTS "subjects_insert_own" ON public.subjects;
CREATE POLICY "subjects_insert_own" ON public.subjects FOR INSERT
TO authenticated
WITH CHECK (school_id = public.get_current_school_id() AND public.get_current_role() IN ('admin_principal', 'direction'));

DROP POLICY IF EXISTS "subjects_update_own" ON public.subjects;
CREATE POLICY "subjects_update_own" ON public.subjects FOR UPDATE
TO authenticated
USING (school_id = public.get_current_school_id())
WITH CHECK (school_id = public.get_current_school_id() AND public.get_current_role() IN ('admin_principal', 'direction'));

DROP POLICY IF EXISTS "subjects_delete_own" ON public.subjects;
CREATE POLICY "subjects_delete_own" ON public.subjects FOR DELETE
TO authenticated
USING (school_id = public.get_current_school_id() AND public.get_current_role() IN ('admin_principal', 'direction'));

-- ============================================================
-- CLASS_STUDENTS
-- ============================================================
DROP POLICY IF EXISTS "cs_select_own" ON public.class_students;
CREATE POLICY "cs_select_own" ON public.class_students FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.classes c WHERE c.id = class_id AND c.school_id = public.get_current_school_id())
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
  EXISTS (SELECT 1 FROM public.classes c WHERE c.id = class_id AND c.school_id = public.get_current_school_id())
  AND public.get_current_role() IN ('admin_principal', 'direction')
);

DROP POLICY IF EXISTS "cs_update_own" ON public.class_students;
CREATE POLICY "cs_update_own" ON public.class_students FOR UPDATE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.classes c WHERE c.id = class_id AND c.school_id = public.get_current_school_id())
  AND public.get_current_role() IN ('admin_principal', 'direction')
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.classes c WHERE c.id = class_id AND c.school_id = public.get_current_school_id())
  AND public.get_current_role() IN ('admin_principal', 'direction')
);

DROP POLICY IF EXISTS "cs_delete_own" ON public.class_students;
CREATE POLICY "cs_delete_own" ON public.class_students FOR DELETE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.classes c WHERE c.id = class_id AND c.school_id = public.get_current_school_id())
  AND public.get_current_role() IN ('admin_principal', 'direction')
);

-- ============================================================
-- TEACHER_ASSIGNMENTS
-- ============================================================
DROP POLICY IF EXISTS "ta_select_own" ON public.teacher_assignments;
CREATE POLICY "ta_select_own" ON public.teacher_assignments FOR SELECT
TO authenticated
USING (school_id = public.get_current_school_id() AND (
  public.get_current_role() IN ('admin_principal', 'direction', 'caisse', 'parent_tuteur')
  OR teacher_id = auth.uid()
));

DROP POLICY IF EXISTS "ta_insert_own" ON public.teacher_assignments;
CREATE POLICY "ta_insert_own" ON public.teacher_assignments FOR INSERT
TO authenticated
WITH CHECK (school_id = public.get_current_school_id() AND public.get_current_role() IN ('admin_principal', 'direction'));

DROP POLICY IF EXISTS "ta_update_own" ON public.teacher_assignments;
CREATE POLICY "ta_update_own" ON public.teacher_assignments FOR UPDATE
TO authenticated
USING (school_id = public.get_current_school_id())
WITH CHECK (school_id = public.get_current_school_id() AND public.get_current_role() IN ('admin_principal', 'direction'));

DROP POLICY IF EXISTS "ta_delete_own" ON public.teacher_assignments;
CREATE POLICY "ta_delete_own" ON public.teacher_assignments FOR DELETE
TO authenticated
USING (school_id = public.get_current_school_id() AND public.get_current_role() IN ('admin_principal', 'direction'));

-- ============================================================
-- ATTENDANCE
-- ============================================================
DROP POLICY IF EXISTS "att_select_own" ON public.attendance;
CREATE POLICY "att_select_own" ON public.attendance FOR SELECT
TO authenticated
USING (school_id = public.get_current_school_id() AND (
  public.get_current_role() IN ('admin_principal', 'direction')
  OR (public.get_current_role() = 'enseignant' AND EXISTS (
    SELECT 1 FROM public.teacher_assignments ta WHERE ta.class_id = attendance.class_id AND ta.teacher_id = auth.uid()
  ))
  OR (public.get_current_role() = 'parent_tuteur' AND EXISTS (
    SELECT 1 FROM public.student_guardians sg WHERE sg.student_id = attendance.student_id AND sg.guardian_id = auth.uid()
  ))
));

DROP POLICY IF EXISTS "att_insert_own" ON public.attendance;
CREATE POLICY "att_insert_own" ON public.attendance FOR INSERT
TO authenticated
WITH CHECK (school_id = public.get_current_school_id() AND public.get_current_role() IN ('admin_principal', 'direction', 'enseignant'));

DROP POLICY IF EXISTS "att_update_own" ON public.attendance;
CREATE POLICY "att_update_own" ON public.attendance FOR UPDATE
TO authenticated
USING (school_id = public.get_current_school_id())
WITH CHECK (school_id = public.get_current_school_id() AND public.get_current_role() IN ('admin_principal', 'direction', 'enseignant'));

DROP POLICY IF EXISTS "att_delete_own" ON public.attendance;
CREATE POLICY "att_delete_own" ON public.attendance FOR DELETE
TO authenticated
USING (school_id = public.get_current_school_id() AND public.get_current_role() IN ('admin_principal', 'direction', 'enseignant'));

-- ============================================================
-- STAFF_ATTENDANCE
-- ============================================================
DROP POLICY IF EXISTS "sa_select_own" ON public.staff_attendance;
CREATE POLICY "sa_select_own" ON public.staff_attendance FOR SELECT
TO authenticated USING (school_id = public.get_current_school_id());

DROP POLICY IF EXISTS "sa_insert_own" ON public.staff_attendance;
CREATE POLICY "sa_insert_own" ON public.staff_attendance FOR INSERT
TO authenticated
WITH CHECK (school_id = public.get_current_school_id() AND public.get_current_role() IN ('admin_principal', 'direction'));

DROP POLICY IF EXISTS "sa_update_own" ON public.staff_attendance;
CREATE POLICY "sa_update_own" ON public.staff_attendance FOR UPDATE
TO authenticated
USING (school_id = public.get_current_school_id())
WITH CHECK (school_id = public.get_current_school_id() AND public.get_current_role() IN ('admin_principal', 'direction'));

DROP POLICY IF EXISTS "sa_delete_own" ON public.staff_attendance;
CREATE POLICY "sa_delete_own" ON public.staff_attendance FOR DELETE
TO authenticated
USING (school_id = public.get_current_school_id() AND public.get_current_role() IN ('admin_principal', 'direction'));

-- ============================================================
-- HOMEWORK
-- ============================================================
DROP POLICY IF EXISTS "hw_select_own" ON public.homework;
CREATE POLICY "hw_select_own" ON public.homework FOR SELECT
TO authenticated
USING (school_id = public.get_current_school_id() AND (
  public.get_current_role() IN ('admin_principal', 'direction')
  OR (public.get_current_role() = 'enseignant' AND teacher_id = auth.uid())
  OR (public.get_current_role() = 'parent_tuteur' AND EXISTS (
    SELECT 1 FROM public.class_students cs
    JOIN public.student_guardians sg ON sg.student_id = cs.student_id
    WHERE cs.class_id = homework.class_id AND sg.guardian_id = auth.uid()
  ))
));

DROP POLICY IF EXISTS "hw_insert_own" ON public.homework;
CREATE POLICY "hw_insert_own" ON public.homework FOR INSERT
TO authenticated
WITH CHECK (school_id = public.get_current_school_id() AND public.get_current_role() = 'enseignant' AND teacher_id = auth.uid());

DROP POLICY IF EXISTS "hw_update_own" ON public.homework;
CREATE POLICY "hw_update_own" ON public.homework FOR UPDATE
TO authenticated
USING (school_id = public.get_current_school_id() AND teacher_id = auth.uid())
WITH CHECK (school_id = public.get_current_school_id() AND public.get_current_role() = 'enseignant' AND teacher_id = auth.uid());

DROP POLICY IF EXISTS "hw_delete_own" ON public.homework;
CREATE POLICY "hw_delete_own" ON public.homework FOR DELETE
TO authenticated
USING (school_id = public.get_current_school_id() AND teacher_id = auth.uid());

-- ============================================================
-- GRADES
-- ============================================================
DROP POLICY IF EXISTS "gr_select_own" ON public.grades;
CREATE POLICY "gr_select_own" ON public.grades FOR SELECT
TO authenticated
USING (school_id = public.get_current_school_id() AND (
  public.get_current_role() IN ('admin_principal', 'direction')
  OR (public.get_current_role() = 'enseignant' AND (
    teacher_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.teacher_assignments ta WHERE ta.subject_id = grades.subject_id AND ta.teacher_id = auth.uid())
  ))
  OR (public.get_current_role() = 'parent_tuteur' AND EXISTS (
    SELECT 1 FROM public.student_guardians sg WHERE sg.student_id = grades.student_id AND sg.guardian_id = auth.uid()
  ))
));

DROP POLICY IF EXISTS "gr_insert_own" ON public.grades;
CREATE POLICY "gr_insert_own" ON public.grades FOR INSERT
TO authenticated
WITH CHECK (school_id = public.get_current_school_id() AND public.get_current_role() IN ('admin_principal', 'direction', 'enseignant'));

DROP POLICY IF EXISTS "gr_update_own" ON public.grades;
CREATE POLICY "gr_update_own" ON public.grades FOR UPDATE
TO authenticated
USING (school_id = public.get_current_school_id())
WITH CHECK (school_id = public.get_current_school_id() AND public.get_current_role() IN ('admin_principal', 'direction', 'enseignant'));

DROP POLICY IF EXISTS "gr_delete_own" ON public.grades;
CREATE POLICY "gr_delete_own" ON public.grades FOR DELETE
TO authenticated
USING (school_id = public.get_current_school_id() AND public.get_current_role() IN ('admin_principal', 'direction', 'enseignant'));

-- ============================================================
-- FEE_STRUCTURES
-- ============================================================
DROP POLICY IF EXISTS "fs_select_own" ON public.fee_structures;
CREATE POLICY "fs_select_own" ON public.fee_structures FOR SELECT
TO authenticated
USING (school_id = public.get_current_school_id() AND public.get_current_role() IN ('admin_principal', 'direction', 'caisse'));

DROP POLICY IF EXISTS "fs_insert_own" ON public.fee_structures;
CREATE POLICY "fs_insert_own" ON public.fee_structures FOR INSERT
TO authenticated
WITH CHECK (school_id = public.get_current_school_id() AND public.get_current_role() IN ('admin_principal', 'direction', 'caisse'));

DROP POLICY IF EXISTS "fs_update_own" ON public.fee_structures;
CREATE POLICY "fs_update_own" ON public.fee_structures FOR UPDATE
TO authenticated
USING (school_id = public.get_current_school_id())
WITH CHECK (school_id = public.get_current_school_id() AND public.get_current_role() IN ('admin_principal', 'direction', 'caisse'));

DROP POLICY IF EXISTS "fs_delete_own" ON public.fee_structures;
CREATE POLICY "fs_delete_own" ON public.fee_structures FOR DELETE
TO authenticated
USING (school_id = public.get_current_school_id() AND public.get_current_role() IN ('admin_principal', 'direction', 'caisse'));

-- ============================================================
-- STUDENT_FEES
-- ============================================================
DROP POLICY IF EXISTS "sf_select_own" ON public.student_fees;
CREATE POLICY "sf_select_own" ON public.student_fees FOR SELECT
TO authenticated
USING (school_id = public.get_current_school_id() AND (
  public.get_current_role() IN ('admin_principal', 'direction', 'caisse')
  OR (public.get_current_role() = 'parent_tuteur' AND EXISTS (
    SELECT 1 FROM public.student_guardians sg WHERE sg.student_id = student_fees.student_id AND sg.guardian_id = auth.uid()
  ))
));

DROP POLICY IF EXISTS "sf_insert_own" ON public.student_fees;
CREATE POLICY "sf_insert_own" ON public.student_fees FOR INSERT
TO authenticated
WITH CHECK (school_id = public.get_current_school_id() AND public.get_current_role() IN ('admin_principal', 'direction', 'caisse'));

DROP POLICY IF EXISTS "sf_update_own" ON public.student_fees;
CREATE POLICY "sf_update_own" ON public.student_fees FOR UPDATE
TO authenticated
USING (school_id = public.get_current_school_id())
WITH CHECK (school_id = public.get_current_school_id() AND public.get_current_role() IN ('admin_principal', 'direction', 'caisse'));

DROP POLICY IF EXISTS "sf_delete_own" ON public.student_fees;
CREATE POLICY "sf_delete_own" ON public.student_fees FOR DELETE
TO authenticated
USING (school_id = public.get_current_school_id() AND public.get_current_role() IN ('admin_principal', 'direction', 'caisse'));

-- ============================================================
-- PAYMENTS
-- ============================================================
DROP POLICY IF EXISTS "pay_select_own" ON public.payments;
CREATE POLICY "pay_select_own" ON public.payments FOR SELECT
TO authenticated
USING (school_id = public.get_current_school_id() AND (
  public.get_current_role() IN ('admin_principal', 'direction', 'caisse')
  OR (public.get_current_role() = 'parent_tuteur' AND EXISTS (
    SELECT 1 FROM public.student_guardians sg WHERE sg.student_id = payments.student_id AND sg.guardian_id = auth.uid()
  ))
));

DROP POLICY IF EXISTS "pay_insert_own" ON public.payments;
CREATE POLICY "pay_insert_own" ON public.payments FOR INSERT
TO authenticated
WITH CHECK (school_id = public.get_current_school_id() AND public.get_current_role() IN ('admin_principal', 'caisse'));

DROP POLICY IF EXISTS "pay_update_own" ON public.payments;
CREATE POLICY "pay_update_own" ON public.payments FOR UPDATE
TO authenticated
USING (school_id = public.get_current_school_id())
WITH CHECK (school_id = public.get_current_school_id() AND public.get_current_role() IN ('admin_principal', 'caisse'));

DROP POLICY IF EXISTS "pay_delete_own" ON public.payments;
CREATE POLICY "pay_delete_own" ON public.payments FOR DELETE
TO authenticated
USING (school_id = public.get_current_school_id() AND public.get_current_role() IN ('admin_principal', 'caisse'));

-- ============================================================
-- RECEIPTS
-- ============================================================
DROP POLICY IF EXISTS "rc_select_own" ON public.receipts;
CREATE POLICY "rc_select_own" ON public.receipts FOR SELECT
TO authenticated
USING (school_id = public.get_current_school_id() AND (
  public.get_current_role() IN ('admin_principal', 'direction', 'caisse')
  OR (public.get_current_role() = 'parent_tuteur' AND EXISTS (
    SELECT 1 FROM public.payments p
    JOIN public.student_guardians sg ON sg.student_id = p.student_id
    WHERE p.id = receipts.payment_id AND sg.guardian_id = auth.uid()
  ))
));

DROP POLICY IF EXISTS "rc_insert_own" ON public.receipts;
CREATE POLICY "rc_insert_own" ON public.receipts FOR INSERT
TO authenticated
WITH CHECK (school_id = public.get_current_school_id() AND public.get_current_role() IN ('admin_principal', 'caisse'));

-- ============================================================
-- ENTRIES_EXITS
-- ============================================================
DROP POLICY IF EXISTS "ee_select_own" ON public.entries_exits;
CREATE POLICY "ee_select_own" ON public.entries_exits FOR SELECT
TO authenticated
USING (school_id = public.get_current_school_id() AND (
  public.get_current_role() IN ('admin_principal', 'direction', 'gardien')
  OR (public.get_current_role() = 'parent_tuteur' AND EXISTS (
    SELECT 1 FROM public.student_guardians sg WHERE sg.student_id = entries_exits.student_id AND sg.guardian_id = auth.uid()
  ))
));

DROP POLICY IF EXISTS "ee_insert_own" ON public.entries_exits;
CREATE POLICY "ee_insert_own" ON public.entries_exits FOR INSERT
TO authenticated
WITH CHECK (school_id = public.get_current_school_id() AND public.get_current_role() IN ('admin_principal', 'direction', 'gardien'));

-- ============================================================
-- QR_CODES
-- ============================================================
DROP POLICY IF EXISTS "qr_select_own" ON public.qr_codes;
CREATE POLICY "qr_select_own" ON public.qr_codes FOR SELECT
TO authenticated
USING (school_id = public.get_current_school_id() AND (
  public.get_current_role() IN ('admin_principal', 'direction', 'gardien')
  OR (public.get_current_role() = 'parent_tuteur' AND EXISTS (
    SELECT 1 FROM public.student_guardians sg WHERE sg.student_id = qr_codes.student_id AND sg.guardian_id = auth.uid()
  ))
));

DROP POLICY IF EXISTS "qr_insert_own" ON public.qr_codes;
CREATE POLICY "qr_insert_own" ON public.qr_codes FOR INSERT
TO authenticated
WITH CHECK (school_id = public.get_current_school_id() AND public.get_current_role() IN ('admin_principal', 'direction', 'gardien'));

DROP POLICY IF EXISTS "qr_update_own" ON public.qr_codes;
CREATE POLICY "qr_update_own" ON public.qr_codes FOR UPDATE
TO authenticated
USING (school_id = public.get_current_school_id())
WITH CHECK (school_id = public.get_current_school_id() AND public.get_current_role() IN ('admin_principal', 'direction', 'gardien'));

DROP POLICY IF EXISTS "qr_delete_own" ON public.qr_codes;
CREATE POLICY "qr_delete_own" ON public.qr_codes FOR DELETE
TO authenticated
USING (school_id = public.get_current_school_id() AND public.get_current_role() IN ('admin_principal', 'direction'));

-- ============================================================
-- AUDIT_LOG (append-only: SELECT + INSERT only)
-- ============================================================
DROP POLICY IF EXISTS "audit_select_own" ON public.audit_log;
CREATE POLICY "audit_select_own" ON public.audit_log FOR SELECT
TO authenticated
USING (school_id = public.get_current_school_id() AND public.get_current_role() = 'admin_principal');

DROP POLICY IF EXISTS "audit_insert_own" ON public.audit_log;
CREATE POLICY "audit_insert_own" ON public.audit_log FOR INSERT
TO authenticated
WITH CHECK (school_id = public.get_current_school_id());
