/*
# SchoolSafe Schema — Part 1: All Tables

Creates all 23 tables with RLS enabled but no policies yet.
Policies are added in migration 002 once all tables exist.
This avoids circular dependency issues in RLS policy predicates.

## Tables
schools, school_years, profiles, staff, students, guardians,
student_guardians, authorized_persons, classes, subjects,
class_students, teacher_assignments, attendance, staff_attendance,
homework, grades, fee_structures, student_fees, payments, receipts,
entries_exits, qr_codes, audit_log
*/

-- Helper functions (referenced by policies in part 2)
CREATE OR REPLACE FUNCTION public.get_current_school_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER SET search_path = public
AS $$
  SELECT NULLIF(auth.jwt() -> 'app_metadata' ->> 'school_id', '')::uuid;
$$;

CREATE OR REPLACE FUNCTION public.get_current_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER SET search_path = public
AS $$
  SELECT auth.jwt() -> 'app_metadata' ->> 'role';
$$;

-- 1. SCHOOLS
CREATE TABLE IF NOT EXISTS public.schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text UNIQUE NOT NULL,
  address text,
  city text,
  phone text,
  email text,
  logo_url text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;

-- 2. SCHOOL YEARS
CREATE TABLE IF NOT EXISTS public.school_years (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  is_current boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.school_years ENABLE ROW LEVEL SECURITY;

-- 3. PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE,
  email text NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  phone text,
  role text NOT NULL DEFAULT 'parent_tuteur'
    CHECK (role IN ('admin_principal', 'direction', 'enseignant', 'parent_tuteur', 'gardien', 'caisse')),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. STAFF
CREATE TABLE IF NOT EXISTS public.staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text,
  phone text,
  role text NOT NULL DEFAULT 'enseignant'
    CHECK (role IN ('direction', 'enseignant', 'gardien', 'caisse', 'administration')),
  hire_date date,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;

-- 5. STUDENTS
CREATE TABLE IF NOT EXISTS public.students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  birth_date date,
  gender text CHECK (gender IN ('M', 'F')),
  address text,
  city text,
  phone text,
  email text,
  photo_url text,
  enrollment_number text,
  enrollment_date date DEFAULT CURRENT_DATE,
  is_active boolean DEFAULT true,
  qr_token text UNIQUE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- 6. GUARDIANS
CREATE TABLE IF NOT EXISTS public.guardians (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  relationship text,
  phone text,
  email text,
  address text,
  city text,
  profession text,
  is_emergency_contact boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.guardians ENABLE ROW LEVEL SECURITY;

-- 7. STUDENT_GUARDIANS
CREATE TABLE IF NOT EXISTS public.student_guardians (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  guardian_id uuid NOT NULL REFERENCES public.guardians(id) ON DELETE CASCADE,
  relationship_type text NOT NULL DEFAULT 'parent'
    CHECK (relationship_type IN ('parent', 'tuteur_legal', 'grand_parent', 'autre')),
  is_primary boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE (student_id, guardian_id)
);
ALTER TABLE public.student_guardians ENABLE ROW LEVEL SECURITY;

-- 8. AUTHORIZED_PERSONS
CREATE TABLE IF NOT EXISTS public.authorized_persons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  relationship text NOT NULL,
  phone text,
  id_number text,
  photo_url text,
  qr_code text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.authorized_persons ENABLE ROW LEVEL SECURITY;

-- 9. CLASSES
CREATE TABLE IF NOT EXISTS public.classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  school_year_id uuid REFERENCES public.school_years(id) ON DELETE SET NULL,
  name text NOT NULL,
  level text,
  capacity integer DEFAULT 30,
  room text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

-- 10. SUBJECTS
CREATE TABLE IF NOT EXISTS public.subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text,
  coefficient numeric DEFAULT 1.0,
  description text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

-- 11. CLASS_STUDENTS
CREATE TABLE IF NOT EXISTS public.class_students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  enrolled_at date DEFAULT CURRENT_DATE,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE (class_id, student_id)
);
ALTER TABLE public.class_students ENABLE ROW LEVEL SECURITY;

-- 12. TEACHER_ASSIGNMENTS
CREATE TABLE IF NOT EXISTS public.teacher_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
  school_year_id uuid REFERENCES public.school_years(id) ON DELETE SET NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE (teacher_id, class_id, subject_id, school_year_id)
);
ALTER TABLE public.teacher_assignments ENABLE ROW LEVEL SECURITY;

-- 13. ATTENDANCE
CREATE TABLE IF NOT EXISTS public.attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  date date NOT NULL,
  status text NOT NULL DEFAULT 'present'
    CHECK (status IN ('present', 'absent', 'late', 'excused')),
  notes text,
  recorded_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- 14. STAFF_ATTENDANCE
CREATE TABLE IF NOT EXISTS public.staff_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  date date NOT NULL,
  check_in_time timestamptz,
  check_out_time timestamptz,
  status text NOT NULL DEFAULT 'present'
    CHECK (status IN ('present', 'absent', 'late', 'leave')),
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.staff_attendance ENABLE ROW LEVEL SECURITY;

-- 15. HOMEWORK
CREATE TABLE IF NOT EXISTS public.homework (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
  teacher_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  due_date date NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.homework ENABLE ROW LEVEL SECURITY;

-- 16. GRADES
CREATE TABLE IF NOT EXISTS public.grades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL,
  teacher_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  grade_type text DEFAULT 'devoir'
    CHECK (grade_type IN ('devoir', 'examen', 'controle', 'participation')),
  title text,
  score numeric,
  max_score numeric DEFAULT 20,
  grade_date date DEFAULT CURRENT_DATE,
  term text,
  comments text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;

-- 17. FEE_STRUCTURES
CREATE TABLE IF NOT EXISTS public.fee_structures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  school_year_id uuid REFERENCES public.school_years(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  amount numeric NOT NULL DEFAULT 0,
  fee_type text NOT NULL DEFAULT 'scolarite'
    CHECK (fee_type IN ('scolarite', 'inscription', 'cantine', 'transport', 'activite', 'autre')),
  due_date date,
  is_recurring boolean DEFAULT false,
  recurring_period text CHECK (recurring_period IN ('monthly', 'quarterly', 'annual')),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.fee_structures ENABLE ROW LEVEL SECURITY;

-- 18. STUDENT_FEES
CREATE TABLE IF NOT EXISTS public.student_fees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  fee_structure_id uuid REFERENCES public.fee_structures(id) ON DELETE SET NULL,
  school_year_id uuid REFERENCES public.school_years(id) ON DELETE SET NULL,
  amount numeric NOT NULL DEFAULT 0,
  amount_paid numeric NOT NULL DEFAULT 0,
  due_date date,
  status text NOT NULL DEFAULT 'unpaid'
    CHECK (status IN ('unpaid', 'partial', 'paid', 'overdue')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.student_fees ENABLE ROW LEVEL SECURITY;

-- 19. PAYMENTS
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_fee_id uuid REFERENCES public.student_fees(id) ON DELETE SET NULL,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0,
  payment_method text DEFAULT 'cash'
    CHECK (payment_method IN ('cash', 'check', 'transfer', 'card', 'mobile')),
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  reference text,
  received_by uuid REFERENCES auth.users(id),
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- 20. RECEIPTS
CREATE TABLE IF NOT EXISTS public.receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  payment_id uuid NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  receipt_number text NOT NULL,
  issued_at timestamptz DEFAULT now(),
  issued_by uuid REFERENCES auth.users(id)
);
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;

-- 21. ENTRIES_EXITS
CREATE TABLE IF NOT EXISTS public.entries_exits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('entry', 'exit')),
  timestamp timestamptz NOT NULL DEFAULT now(),
  recorded_by uuid REFERENCES auth.users(id),
  authorized_person_id uuid REFERENCES public.authorized_persons(id) ON DELETE SET NULL,
  method text DEFAULT 'manual' CHECK (method IN ('qr', 'manual')),
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.entries_exits ENABLE ROW LEVEL SECURITY;

-- 22. QR_CODES
CREATE TABLE IF NOT EXISTS public.qr_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  token text UNIQUE NOT NULL,
  is_active boolean DEFAULT true,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.qr_codes ENABLE ROW LEVEL SECURITY;

-- 23. AUDIT_LOG (append-only)
CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  details jsonb,
  ip_address text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_profiles_school_id ON public.profiles(school_id);
CREATE INDEX IF NOT EXISTS idx_staff_school_id ON public.staff(school_id);
CREATE INDEX IF NOT EXISTS idx_students_school_id ON public.students(school_id);
CREATE INDEX IF NOT EXISTS idx_guardians_school_id ON public.guardians(school_id);
CREATE INDEX IF NOT EXISTS idx_classes_school_id ON public.classes(school_id);
CREATE INDEX IF NOT EXISTS idx_classes_year_id ON public.classes(school_year_id);
CREATE INDEX IF NOT EXISTS idx_subjects_school_id ON public.subjects(school_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON public.attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_class_date ON public.attendance(class_id, date);
CREATE INDEX IF NOT EXISTS idx_grades_student_id ON public.grades(student_id);
CREATE INDEX IF NOT EXISTS idx_grades_subject_id ON public.grades(subject_id);
CREATE INDEX IF NOT EXISTS idx_student_fees_student_id ON public.student_fees(student_id);
CREATE INDEX IF NOT EXISTS idx_payments_student_id ON public.payments(student_id);
CREATE INDEX IF NOT EXISTS idx_payments_fee_id ON public.payments(student_fee_id);
CREATE INDEX IF NOT EXISTS idx_entries_exits_student_id ON public.entries_exits(student_id);
CREATE INDEX IF NOT EXISTS idx_entries_exits_school_date ON public.entries_exits(school_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_teacher ON public.teacher_assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_class ON public.teacher_assignments(class_id);
CREATE INDEX IF NOT EXISTS idx_class_students_class ON public.class_students(class_id);
CREATE INDEX IF NOT EXISTS idx_class_students_student ON public.class_students(student_id);
CREATE INDEX IF NOT EXISTS idx_student_guardians_student ON public.student_guardians(student_id);
CREATE INDEX IF NOT EXISTS idx_student_guardians_guardian ON public.student_guardians(guardian_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_school_id ON public.audit_log(school_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON public.audit_log(created_at DESC);
