import { Routes, Route, Navigate } from "react-router-dom";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import DashboardLayout from "./layouts/DashboardLayout";
import ProtectedRoute from "./components/ProtectedRoute";

// Common Shared Pages
import ProfileSettingsPage from "./pages/common/ProfileSettingsPage";
import SupportDesk from "./pages/common/SupportDesk";
import AttendanceCorrections from "./pages/common/AttendanceCorrections";
import AnnouncementsPage from "./pages/common/AnnouncementsPage";
import HelpCenterPage from "./pages/common/HelpCenterPage";

// Student Pages
import StudentDashboard from "./pages/student/StudentDashboard";
import StudentScan from "./pages/student/StudentScan";
import StudentPhotoAttendance from "./pages/student/StudentPhotoAttendance";
import StudentCalendar from "./pages/student/StudentCalendar";
import StudentSchedule from "./pages/student/StudentSchedule";
import StudentHistory from "./pages/student/StudentHistory";
import StudentAnalytics from "./pages/student/StudentAnalytics";
import StudentBiometricSetup from "./pages/student/StudentBiometricSetup";

// Teacher Pages
import TeacherDashboard from "./pages/teacher/TeacherDashboard";
import TeacherCreateSession from "./pages/teacher/TeacherCreateSession";
import TeacherSessions from "./pages/teacher/TeacherSessions";
import TeacherSessionMonitor from "./pages/teacher/TeacherSessionMonitor";
import TeacherLiveMonitor from "./pages/teacher/TeacherLiveMonitor";
import TeacherStudents from "./pages/teacher/TeacherStudents";
import TeacherAnalytics from "./pages/teacher/TeacherAnalytics";

// Admin Pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminStudents from "./pages/admin/AdminStudents";
import AdminTeachers from "./pages/admin/AdminTeachers";
import AdminClasses from "./pages/admin/AdminClasses";
import AdminSchedules from "./pages/admin/AdminSchedules";
import AdminSessions from "./pages/admin/AdminSessions";
import AdminReports from "./pages/admin/AdminReports";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminActivityLogs from "./pages/admin/AdminActivityLogs";
import AdminSecurity from "./pages/admin/AdminSecurity";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />

      {/* STUDENT PORTAL */}
      <Route
        path="/student"
        element={
          <ProtectedRoute allow={["student"]}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<StudentDashboard />} />
        <Route path="scan" element={<StudentScan />} />
        <Route path="photo" element={<StudentPhotoAttendance />} />
        <Route path="calendar" element={<StudentCalendar />} />
        <Route path="schedule" element={<StudentSchedule />} />
        <Route path="history" element={<StudentHistory />} />
        <Route path="analytics" element={<StudentAnalytics />} />
        <Route path="corrections" element={<AttendanceCorrections />} />
        <Route path="biometric" element={<StudentBiometricSetup />} />
        <Route path="announcements" element={<AnnouncementsPage />} />
        <Route path="support" element={<SupportDesk />} />
      </Route>

      {/* TEACHER PORTAL */}
      <Route
        path="/teacher"
        element={
          <ProtectedRoute allow={["teacher"]}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<TeacherDashboard />} />
        <Route path="sessions/new" element={<TeacherCreateSession />} />
        <Route path="sessions" element={<TeacherSessions />} />
        <Route path="sessions/:sessionId" element={<TeacherSessionMonitor />} />
        <Route path="sessions/:sessionId/monitor" element={<TeacherSessionMonitor />} />
        <Route path="live-monitor" element={<TeacherLiveMonitor />} />
        <Route path="students" element={<TeacherStudents />} />
        <Route path="analytics" element={<TeacherAnalytics />} />
        <Route path="corrections" element={<AttendanceCorrections />} />
        <Route path="announcements" element={<AnnouncementsPage />} />
        <Route path="support" element={<SupportDesk />} />
      </Route>

      {/* ADMIN PORTAL */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allow={["admin"]}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="students" element={<AdminStudents />} />
        <Route path="teachers" element={<AdminTeachers />} />
        <Route path="classes" element={<AdminClasses />} />
        <Route path="schedules" element={<AdminSchedules />} />
        <Route path="sessions" element={<AdminSessions />} />
        <Route path="reports" element={<AdminReports />} />
        <Route path="corrections" element={<AttendanceCorrections />} />
        <Route path="settings" element={<AdminSettings />} />
        <Route path="activity-logs" element={<AdminActivityLogs />} />
        <Route path="security" element={<AdminSecurity />} />
        <Route path="announcements" element={<AnnouncementsPage />} />
        <Route path="support" element={<SupportDesk />} />
      </Route>

      {/* SHARED COMMON ROUTES (Accessible to any logged-in user) */}
      <Route
        element={
          <ProtectedRoute allow={["admin", "teacher", "student"]}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/profile" element={<ProfileSettingsPage />} />
        <Route path="/support" element={<SupportDesk />} />
        <Route path="/announcements" element={<AnnouncementsPage />} />
        <Route path="/help" element={<HelpCenterPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
