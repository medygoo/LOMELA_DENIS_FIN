export type UserRole = 'admin_principal' | 'direction' | 'enseignant' | 'parent_tuteur'

export interface School {
  id: string
  name: string
  code: string
  address: string | null
  city: string | null
  phone: string | null
  email: string | null
  logo_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface SchoolYear {
  id: string
  school_id: string
  name: string
  start_date: string
  end_date: string
  is_current: boolean
  created_at: string
}

export interface Profile {
  id: string
  school_id: string
  email: string
  first_name: string
  last_name: string
  phone: string | null
  role: UserRole
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Staff {
  id: string
  school_id: string
  user_id: string | null
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  role: string
  hire_date: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Student {
  id: string
  school_id: string
  first_name: string
  last_name: string
  birth_date: string | null
  gender: string | null
  address: string | null
  city: string | null
  phone: string | null
  email: string | null
  photo_url: string | null
  enrollment_number: string | null
  enrollment_date: string
  is_active: boolean
  qr_token: string | null
  created_at: string
  updated_at: string
}

export interface Guardian {
  id: string
  school_id: string
  user_id: string | null
  first_name: string
  last_name: string
  relationship: string | null
  phone: string | null
  email: string | null
  address: string | null
  city: string | null
  profession: string | null
  is_emergency_contact: boolean
  created_at: string
  updated_at: string
}

export interface StudentGuardian {
  id: string
  student_id: string
  guardian_id: string
  relationship_type: string
  is_primary: boolean
  created_at: string
  school_id: string
}

export interface ClassRoom {
  id: string
  school_id: string
  school_year_id: string
  name: string
  level: string | null
  capacity: number
  room: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ClassStudent {
  id: string
  class_id: string
  student_id: string
  enrolled_at: string
  is_active: boolean
  created_at: string
  school_id: string
}

export interface Subject {
  id: string
  school_id: string
  name: string
  code: string | null
  coefficient: number
  description: string | null
  created_at: string
}

export interface TeacherAssignment {
  id: string
  school_id: string
  teacher_id: string
  class_id: string
  subject_id: string
  school_year_id: string
  is_active: boolean
  created_at: string
}

export interface Attendance {
  id: string
  school_id: string
  student_id: string
  class_id: string
  date: string
  status: string
  notes: string | null
  recorded_by: string | null
  created_at: string
}

export interface Grade {
  id: string
  school_id: string
  student_id: string
  subject_id: string
  class_id: string
  teacher_id: string | null
  grade_type: string
  title: string | null
  score: number
  max_score: number
  grade_date: string
  term: string | null
  comments: string | null
  created_at: string
  updated_at: string
}

export interface Homework {
  id: string
  school_id: string
  class_id: string
  subject_id: string
  teacher_id: string | null
  title: string
  description: string | null
  due_date: string
  created_at: string
  updated_at: string
}

export interface FeeStructure {
  id: string
  school_id: string
  school_year_id: string
  name: string
  description: string | null
  amount: number
  fee_type: string
  due_date: string | null
  is_recurring: boolean
  recurring_period: string | null
  is_active: boolean
  created_at: string
}

export interface StudentFee {
  id: string
  school_id: string
  student_id: string
  fee_structure_id: string
  school_year_id: string
  amount: number
  amount_paid: number
  due_date: string | null
  status: string
  created_at: string
  updated_at: string
}

export interface Payment {
  id: string
  school_id: string
  student_fee_id: string
  student_id: string
  amount: number
  payment_method: string
  payment_date: string
  reference: string | null
  received_by: string | null
  notes: string | null
  created_at: string
}

export interface Receipt {
  id: string
  school_id: string
  payment_id: string
  receipt_number: string
  issued_at: string
  issued_by: string | null
}

export interface EntryExit {
  id: string
  school_id: string
  student_id: string
  type: string
  timestamp: string
  recorded_by: string | null
  authorized_person_id: string | null
  method: string
  notes: string | null
  created_at: string
}

export interface AuthorizedPerson {
  id: string
  student_id: string
  first_name: string
  last_name: string
  relationship: string | null
  phone: string | null
  id_number: string | null
  photo_url: string | null
  qr_code: string | null
  is_active: boolean
  created_at: string
  school_id: string
}

export interface QrCode {
  id: string
  school_id: string
  student_id: string
  token: string
  is_active: boolean
  expires_at: string | null
  created_at: string
}

export interface StaffAttendance {
  id: string
  school_id: string
  staff_id: string
  date: string
  check_in_time: string | null
  check_out_time: string | null
  status: string
  notes: string | null
  created_at: string
}

export interface AuditLog {
  id: string
  school_id: string
  actor_id: string | null
  action: string
  entity_type: string | null
  entity_id: string | null
  details: Record<string, unknown> | null
  ip_address: string | null
  created_at: string
}
