import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { getReportsJson, downloadReportCsv, listClasses } from "../../api/adminService";
import type { ClassRow } from "../../types";
import LoadingState, { EmptyState, ErrorState } from "../../components/LoadingState";
import StatusBadge from "../../components/StatusBadge";
import { ApiRequestError } from "../../api/client";

function isoDaysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export default function AdminReports() {
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [filters, setFilters] = useState({
    start_date: isoDaysAgo(14),
    end_date: isoDaysAgo(0),
    class_id: "",
    status: "",
  });
  const [rows, setRows] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    listClasses().then((res) => setClasses(res.classes)).catch(() => {});
  }, []);

  async function runReport() {
    setLoading(true);
    setError(null);
    try {
      const res = await getReportsJson({
        start_date: filters.start_date,
        end_date: filters.end_date,
        class_id: filters.class_id ? Number(filters.class_id) : undefined,
        status: filters.status || undefined,
      });
      setRows(res.rows);
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : "Failed to load report.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { runReport(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleExport() {
    await downloadReportCsv({
      start_date: filters.start_date,
      end_date: filters.end_date,
      class_id: filters.class_id ? Number(filters.class_id) : undefined,
      status: filters.status || undefined,
    });
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Attendance Reports</h1>

      <div className="glass-card p-5 grid grid-cols-2 sm:grid-cols-5 gap-3 items-end">
        <div>
          <label className="text-xs text-slate-500 mb-1 block">From</label>
          <input type="date" className="input-field" value={filters.start_date} onChange={(e) => setFilters({ ...filters, start_date: e.target.value })} />
        </div>
        <div>
          <label className="text-xs text-slate-500 mb-1 block">To</label>
          <input type="date" className="input-field" value={filters.end_date} onChange={(e) => setFilters({ ...filters, end_date: e.target.value })} />
        </div>
        <div>
          <label className="text-xs text-slate-500 mb-1 block">Class</label>
          <select className="input-field" value={filters.class_id} onChange={(e) => setFilters({ ...filters, class_id: e.target.value })}>
            <option value="">All classes</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-500 mb-1 block">Status</label>
          <select className="input-field" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
            <option value="">All</option>
            <option value="present">Present</option>
            <option value="late">Late</option>
            <option value="absent">Absent</option>
            <option value="excused">Excused</option>
            <option value="sick">Sick</option>
          </select>
        </div>
        <div className="flex gap-2">
          <button onClick={runReport} className="btn-secondary flex-1">Filter</button>
          <button onClick={handleExport} className="btn-primary">
            <Download size={16} />
          </button>
        </div>
      </div>

      {error && <ErrorState message={error} />}
      {loading || rows === null ? (
        <LoadingState />
      ) : rows.length === 0 ? (
        <EmptyState label="No records match these filters." />
      ) : (
        <div className="glass-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-800">
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Class</th>
                <th className="px-4 py-3 font-medium">Subject</th>
                <th className="px-4 py-3 font-medium">Student</th>
                <th className="px-4 py-3 font-medium">Time</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-b border-slate-800/60 last:border-0">
                  <td className="px-4 py-3 text-slate-300 whitespace-nowrap">{r.date}</td>
                  <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{r.class_name}</td>
                  <td className="px-4 py-3 text-white whitespace-nowrap">{r.subject}</td>
                  <td className="px-4 py-3 text-slate-300 whitespace-nowrap">{r.student_name} <span className="text-slate-600 font-mono text-xs">{r.student_code}</span></td>
                  <td className="px-4 py-3 text-slate-400 font-mono whitespace-nowrap">{r.check_in_time}</td>
                  <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
