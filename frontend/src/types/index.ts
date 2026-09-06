export type Role = "student" | "teacher" | "admin";

export interface ApiError {
  code: string;
  message: string;
}

export interface ApiEnvelope<T> {
  success: boolean;
  data: T | null;
  error: ApiError | null;
}

export interface AuthUser {
  role: Role;
  full_name: string;
}

export interface StudentDashboard {
  full_name: string;
  student_code?: string;
  class_id?: number | null;
  class_name?: string | null;
  today_status: string | null;
  attendance_rate: number;
  present: number;
  late: number;
  absent: number;
  excused: number;
  sick: number;
  active_sessions_count?: number;
  today_schedule: { subject: string; start_time: string; end_time: string; room: string | null }[];
}

export interface ActiveSessionItem {
  id: number;
  subject_name: string | null;
  class_name: string | null;
  teacher_name: string | null;
  date: string;
  start_time: string;
  end_time: string;
  late_threshold_minutes: number;
  require_gps: boolean;
  require_photo: boolean;
  require_biometric: boolean;
  status: "not_started" | "active" | "expired";
  has_checked_in: boolean;
  checked_in_at: string | null;
  checked_in_status: string | null;
}

export interface AttendanceHistoryItem {
  id: number;
  date: string;
  subject: string;
  class_name: string;
  check_in_time: string;
  status: string;
  method?: string;
}

export interface ScheduleItem {
  day_of_week: number;
  day_name: string;
  subject: string;
  start_time: string;
  end_time: string;
  room: string | null;
  teacher: string;
}

export interface TeacherDashboard {
  full_name: string;
  today_sessions: number;
  active_sessions: number;
  total_students_taught: number;
  attendance_rate_today: number;
  recent_sessions: {
    id: number;
    subject: string;
    class_name: string;
    start_time: string;
    end_time: string;
    status: string;
  }[];
}

export interface SessionOut {
  id: number;
  subject_id: number;
  subject_name: string;
  class_id: number;
  class_name: string;
  teacher_id: number;
  date: string;
  start_time: string;
  end_time: string;
  late_threshold_minutes: number;
  require_gps: boolean;
  require_photo: boolean;
  require_biometric: boolean;
  status: "not_started" | "active" | "expired";
  present_count: number;
  total_students: number;
}

export interface AttendanceRecordOut {
  id: number;
  student_id: number;
  student_name: string;
  session_id: number;
  checked_in_at: string;
  status: string;
  location_verified: boolean | null;
  distance_meters: number | null;
  biometric_verified: boolean;
  has_photo: boolean;
}

export interface AdminDashboard {
  total_students: number;
  total_teachers: number;
  total_classes: number;
  today_attendance_rate: number;
  weekly_attendance: { date: string; rate: number }[];
  attendance_by_class: { class_name: string; rate: number }[];
}

export interface StudentRow {
  id: number;
  student_code: string;
  full_name: string;
  class_id: number | null;
  class_name: string | null;
  is_active: boolean;
  username: string;
}

export interface TeacherRow {
  id: number;
  teacher_code: string;
  full_name: string;
  subject_specialty: string | null;
  is_active: boolean;
  username: string;
}

export interface ClassRow {
  id: number;
  name: string;
  major: string | null;
  grade: string | null;
  academic_year: string | null;
  student_count: number;
}

export interface SubjectRow {
  id: number;
  name: string;
  code: string | null;
}
