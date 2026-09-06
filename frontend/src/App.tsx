import { Routes, Route, Navigate } from "react-router-dom";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import DashboardLayout from "./layouts/DashboardLayout";
import ProtectedRoute from "./components/ProtectedRoute";

import StudentDashboard from "./pages/student/StudentDashboard";
import StudentScan from "./pages/student/StudentScan";
import StudentPhotoAttendance from "./pages/student/StudentPhotoAttendance";
import StudentSchedule from "./pages/student/StudentSchedule";
import StudentHistory from "./pages/student/StudentHistory";
import StudentBiometricSetup from "./pages/student/StudentBiometricSetup";

import TeacherDashboard from "./pages/teacher/TeacherDashboard";
import TeacherCreateSession from "./pages/teacher/TeacherCreateSession";
import TeacherSessions from "./pages/teacher/TeacherSessions";
import TeacherSessionMonitor from "./pages/teacher/TeacherSessionMonitor";

import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminStudents from "./pages/admin/AdminStudents";
import AdminTeachers from "./pages/admin/AdminTeachers";
import AdminClasses from "./pages/admin/AdminClasses";
import AdminReports from "./pages/admin/AdminReports";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />

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
        <Route path="schedule" element={<StudentSchedule />} />
        <Route path="history" element={<StudentHistory />} />
        <Route path="biometric" element={<StudentBiometricSetup />} />
      </Route>

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
      </Route>

      <Route
        path="/admin"
        element={
          <ProtectedRoute allow={["admin"]}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="students" element={<AdminStudents />} />
        <Route path="teachers" element={<AdminTeachers />} />
        <Route path="classes" element={<AdminClasses />} />
        <Route path="reports" element={<AdminReports />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
