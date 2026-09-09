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
      <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Admin Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 stagger-children">
        <StatCard label="Total Students" value={data.total_students} icon={GraduationCap} />
        <StatCard label="Total Teachers" value={data.total_teachers} icon={Users} />
        <StatCard label="Total Classes" value={data.total_classes} icon={BookOpen} />
        <StatCard label="Today's Attendance" value={`${data.today_attendance_rate}%`} icon={TrendingUp} accent="emerald" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="glass-card p-4 sm:p-5">
          <h2 className="font-semibold text-slate-900 dark:text-white mb-4 text-sm sm:text-base">Weekly Attendance Rate</h2>
          <div className="overflow-x-auto -mx-2">
            <div className="min-w-[320px]">
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={data.weekly_attendance}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" />
                  <XAxis dataKey="date" tick={{ fill: "var(--color-text-muted)", fontSize: 11 }} />
                  <YAxis tick={{ fill: "var(--color-text-muted)", fontSize: 11 }} domain={[0, 100]} />
                  <Tooltip contentStyle={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-subtle)", borderRadius: 8, color: "var(--color-text-body)" }} />
                  <Line type="monotone" dataKey="rate" stroke="#059669" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="glass-card p-4 sm:p-5">
          <h2 className="font-semibold text-slate-900 dark:text-white mb-4 text-sm sm:text-base">Attendance by Class</h2>
          <div className="overflow-x-auto -mx-2">
            <div className="min-w-[320px]">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data.attendance_by_class}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" />
                  <XAxis dataKey="class_name" tick={{ fill: "var(--color-text-muted)", fontSize: 10 }} interval={0} angle={-25} textAnchor="end" height={50} />
                  <YAxis tick={{ fill: "var(--color-text-muted)", fontSize: 11 }} domain={[0, 100]} />
                  <Tooltip contentStyle={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border-subtle)", borderRadius: 8, color: "var(--color-text-body)" }} />
                  <Bar dataKey="rate" fill="#059669" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
