import { useEffect, useState } from "react";
import { GraduationCap, Users, BookOpen, TrendingUp } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line,
} from "recharts";
import { getAdminDashboard } from "../../api/adminService";
import type { AdminDashboard as AdminDashboardType } from "../../types";
import LoadingState, { ErrorState } from "../../components/LoadingState";
import StatCard from "../../components/StatCard";
import { ApiRequestError } from "../../api/client";

export default function AdminDashboard() {
  const [data, setData] = useState<AdminDashboardType | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAdminDashboard()
      .then(setData)
      .catch((e) => setError(e instanceof ApiRequestError ? e.message : "Failed to load dashboard."));
  }, []);

  if (error) return <ErrorState message={error} />;
  if (!data) return <LoadingState label="Loading dashboard..." />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Students" value={data.total_students} icon={GraduationCap} />
        <StatCard label="Total Teachers" value={data.total_teachers} icon={Users} />
        <StatCard label="Total Classes" value={data.total_classes} icon={BookOpen} />
        <StatCard label="Today's Attendance" value={`${data.today_attendance_rate}%`} icon={TrendingUp} accent="emerald" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-5">
          <h2 className="font-semibold text-white mb-4">Weekly Attendance Rate</h2>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data.weekly_attendance}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 11 }} />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} domain={[0, 100]} />
              <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8 }} />
              <Line type="monotone" dataKey="rate" stroke="#2f8fff" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card p-5">
          <h2 className="font-semibold text-white mb-4">Attendance by Class</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.attendance_by_class}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="class_name" tick={{ fill: "#94a3b8", fontSize: 11 }} />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} domain={[0, 100]} />
              <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8 }} />
              <Bar dataKey="rate" fill="#2f8fff" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
