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
  session_id?: number;
  date: string;
  subject: string;
  class_name: string;
  check_in_time: string;
  status: string;
  method?: string;
  has_photo?: boolean;
  photo_status?: "none" | "pending" | "approved" | "rejected";
  photo_rejection_reason?: string | null;
  can_retake_photo?: boolean;
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
  photo_status?: "none" | "pending" | "approved" | "rejected";
  photo_reviewed_by?: number | null;
  photo_reviewed_at?: string | null;
  photo_rejection_reason?: string | null;
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

export interface UserRow {
  id: number;
  username: string;
  role: Role;
  is_active: boolean;
  full_name: string;
  code: string | null;
  class_id: number | null;
  class_name: string | null;
  subject_specialty: string | null;
  created_at: string | null;
}

export interface AdminSessionItem {
  id: number;
  date: string;
  start_time: string;
  end_time: string;
  room?: string;
  late_threshold_minutes: number;
  class_id?: number;
  subject_id?: number;
  teacher_id?: number;
  schedule_id?: number | null;
  subject_name: string | null;
  class_name: string | null;
  teacher_name: string | null;
  status: "not_started" | "active" | "expired";
  require_gps: boolean;
  require_photo: boolean;
  require_biometric: boolean;
  present_count: number;
  total_students: number;
  pending_photos: number;
}

export interface SessionDetailStudent {
  student_id: number;
  student_code: string;
  full_name: string;
  is_active: boolean;
  has_attended: boolean;
  record_id: number | null;
  status: string;
  check_in_time: string;
  method: string;
  photo_path: string | null;
  photo_status: string;
  photo_rejection_reason: string | null;
  manual_override: boolean;
  override_reason: string | null;
  biometric_verified: boolean;
}

export interface SessionDetailStats {
  total_students: number;
  total_enrolled: number;
  unique_attendees: number;
  present_count: number;
  late_count: number;
  excused_count: number;
  sick_count: number;
  absent_count: number;
  pending_photos: number;
  attendance_rate: number;
}

export interface SessionDetailResponse {
  session: AdminSessionItem & { created_at?: string };
  stats: SessionDetailStats;
  students: SessionDetailStudent[];
}

export interface AdminSessionCreatePayload {
  subject_id: number;
  class_id: number;
  teacher_id: number;
  date: string;
  start_time: string;
  end_time: string;
  room?: string;
  late_threshold_minutes?: number;
  require_gps?: boolean;
  require_photo?: boolean;
  require_biometric?: boolean;
  schedule_id?: number;
}

export interface AdminSessionUpdatePayload {
  subject_id?: number;
  class_id?: number;
  teacher_id?: number;
  date?: string;
  start_time?: string;
  end_time?: string;
  room?: string;
  late_threshold_minutes?: number;
  require_gps?: boolean;
  require_photo?: boolean;
  require_biometric?: boolean;
  schedule_id?: number;
}

export interface ReportRow {
  id: number;
  session_id: number;
  date: string;
  class_id: number | null;
  class_name: string;
  subject_id: number | null;
  subject: string;
  teacher_id: number | null;
  teacher_name: string;
  student_id: number;
  student_code: string;
  student_name: string;
  check_in_time: string;
  status: "present" | "late" | "excused" | "sick" | "absent";
  method: "qr" | "photo";
  photo_path: string | null;
  photo_status: string;
  photo_rejection_reason: string | null;
  manual_override: boolean;
  override_reason: string | null;
}

export interface ReportSummary {
  total_records: number;
  unique_students: number;
  present_count: number;
  late_count: number;
  excused_count: number;
  sick_count: number;
  absent_count: number;
  attendance_rate: number;
}

export interface TeacherProfile {
  id: number;
  username: string;
  teacher_code: string;
  full_name: string;
  subject_specialty: string | null;
  role: string;
}

export interface StudentProfile {
  id: number;
  username: string;
  student_code: string;
  full_name: string;
  class_id: number | null;
  class_name: string | null;
  major: string | null;
  grade: string | null;
  academic_year: string | null;
  role: string;
}

export interface ScheduleRow {
  id: number;
  class_id: number;
  class_name: string;
  subject_id: number;
  subject_name: string;
  teacher_id: number;
  teacher_name: string;
  day_of_week: number;
  day_name?: string;
  start_time: string;
  end_time: string;
  room: string;
}

export interface StudentRegisterPayload {
  username: string;
  password: string;
  full_name: string;
  student_code: string;
  class_id: number;
}

export interface PublicClass {
  id: number;
  name: string;
  major?: string | null;
  grade?: string | null;
}

// =========================================================================
// UPGRADE TYPES: SUPPORT, CORRECTIONS, ANNOUNCEMENTS, SETTINGS, PROFILE
// =========================================================================

export type TicketStatus = "OPEN" | "IN_PROGRESS" | "WAITING_FOR_USER" | "RESOLVED" | "CLOSED";
export type TicketPriority = "LOW" | "MEDIUM" | "HIGH";

export interface TicketMessage {
  id: number;
  sender_id: number;
  sender_name: string;
  sender_role: string;
  message: string;
  attachment_path: string | null;
  created_at: string;
}

export interface SupportTicket {
  id: number;
  ticket_number: string;
  user_id: number;
  user_name: string;
  user_role: string;
  subject: string;
  category: string;
  priority: TicketPriority;
  status: TicketStatus;
  attachment_path: string | null;
  created_at: string;
  updated_at: string;
  is_deleted?: boolean;
  deleted_at?: string | null;
  message_count?: number;
  messages?: TicketMessage[];
}

export interface TicketStats {
  total: number;
  open: number;
  in_progress: number;
  waiting_for_user: number;
  resolved: number;
  closed: number;
  high_priority: number;
}

export type CorrectionStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface AttendanceCorrection {
  id: number;
  student_id: number;
  student_name?: string | null;
  student_code?: string | null;
  class_name?: string | null;
  session_id?: number | null;
  subject_name?: string | null;
  date: string;
  target_status: string;
  reason: string;
  explanation: string;
  attachment_path?: string | null;
  status: CorrectionStatus;
  reviewed_by?: number | null;
  reviewer_name?: string | null;
  reviewed_at?: string | null;
  review_notes?: string | null;
  created_at?: string | null;
}

export interface Announcement {
  id: number;
  title: string;
  content: string;
  category: string;
  target_role: string;
  author_name?: string;
  published_at?: string | null;
  expires_at?: string | null;
  is_active: boolean;
  created_at?: string | null;
}

export interface NotificationItem {
  id: number;
  title: string;
  message: string;
  type: string;
  link?: string | null;
  is_read: boolean;
  created_at?: string | null;
}

export interface UserProfile {
  id: number;
  username: string;
  role: Role;
  full_name: string;
  email?: string | null;
  avatar_path?: string | null;
  avatar_url?: string | null;
  student_info?: {
    student_id: number;
    student_code: string;
    class_id: number | null;
    class_name: string | null;
    major: string | null;
    grade: string | null;
  } | null;
  teacher_info?: {
    teacher_id: number;
    teacher_code: string;
    subject_specialty: string | null;
  } | null;
  created_at?: string | null;
}

export interface SchoolLocationConfig {
  latitude: number;
  longitude: number;
  radius_meters: number;
  enabled: boolean;
  school_name: string;
  school_address: string;
}

export interface SystemStatusService {
  name: string;
  status: "operational" | "warning" | "error" | "disabled";
  details?: string;
  version?: string;
  total_users?: number;
}

export interface SystemStatusData {
  status: "operational" | "warning" | "error";
  services: Record<string, SystemStatusService>;
}

export interface ActivityLogRow {
  id: number;
  user_id?: number | null;
  username: string;
  action: string;
  description: string;
  ip_address?: string | null;
  created_at?: string | null;
}


