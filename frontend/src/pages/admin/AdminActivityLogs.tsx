import React, { useState, useEffect, useCallback } from "react";
import { 
  FileText, Search, Filter, RefreshCw, Shield, 
  Clock, User, Globe, AlertCircle 
} from "lucide-react";
import { getActivityLogs } from "../../api/settingsService";
import type { ActivityLogRow } from "../../types";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";

export const AdminActivityLogs: React.FC = () => {
  const [logs, setLogs] = useState<ActivityLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("ALL");

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getActivityLogs({
        action: actionFilter !== "ALL" ? actionFilter : undefined,
        search: search.trim() || undefined,
        limit: 100,
      });
      setLogs(res.logs || []);
    } catch (err) {
      console.error("Gagal memuat log aktivitas:", err);
    } finally {
      setLoading(false);
    }
  }, [actionFilter, search]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const getActionBadge = (action: string) => {
    const act = action.toUpperCase();
    if (act.includes("LOGIN") || act.includes("AUTH")) {
      return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">{action}</span>;
    }
    if (act.includes("CREATE") || act.includes("ADD")) {
      return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">{action}</span>;
    }
    if (act.includes("DELETE") || act.includes("REMOVE") || act.includes("REJECT")) {
      return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300">{action}</span>;
    }
    if (act.includes("UPDATE") || act.includes("EDIT") || act.includes("REVIEW")) {
      return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">{action}</span>;
    }
    return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">{action}</span>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <FileText className="text-brand-600 dark:text-brand-400" size={28} />
            Log Aktivitas & Audit Trail
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Rekam jejak setiap tindakan login, pembuatan sesi, scan presensi, dan perubahan konfigurasi sistem.
          </p>
        </div>

        <Button
          variant="outline"
          onClick={fetchLogs}
          leftIcon={<RefreshCw size={15} className={loading ? "animate-spin" : ""} />}
        >
          Refresh
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
            <input
              type="text"
              placeholder="Cari user, deskripsi, atau alamat IP..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40"
            />
          </div>

          <div className="w-full sm:w-60">
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              aria-label="Filter Jenis Aksi"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-sm font-medium focus:ring-1 focus:ring-brand-500"
            >
              <option value="ALL">Semua Aksi</option>
              <option value="LOGIN">LOGIN</option>
              <option value="CREATE_SESSION">CREATE_SESSION</option>
              <option value="UPDATE_SESSION">UPDATE_SESSION</option>
              <option value="DELETE_SESSION">DELETE_SESSION</option>
              <option value="ATTENDANCE_SCAN">ATTENDANCE_SCAN</option>
              <option value="REVIEW_PHOTO">REVIEW_PHOTO</option>
              <option value="REVIEW_CORRECTION">REVIEW_CORRECTION</option>
              <option value="CREATE_TICKET">CREATE_TICKET</option>
              <option value="UPDATE_SETTINGS">UPDATE_SETTINGS</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Logs Table */}
      <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <RefreshCw className="animate-spin mx-auto text-brand-600 mb-3" size={32} />
            <p className="text-sm text-slate-500">Memuat log aktivitas...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="mx-auto text-slate-400 mb-3" size={40} />
            <h3 className="text-base font-bold text-slate-800 dark:text-white">Tidak ada log aktivitas</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Tidak ditemukan aktivitas yang cocok dengan kriteria filter saat ini.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/50 text-slate-400 uppercase tracking-wider font-bold">
                  <th className="py-3 px-4 w-40">Waktu</th>
                  <th className="py-3 px-4 w-32">Pengguna</th>
                  <th className="py-3 px-4 w-36">Aksi</th>
                  <th className="py-3 px-4">Deskripsi Aktivitas</th>
                  <th className="py-3 px-4 w-32">Alamat IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-4 font-mono text-slate-500 whitespace-nowrap">
                      {log.created_at ? new Date(log.created_at).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "medium" }) : "-"}
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-slate-800 dark:text-slate-200">
                      {log.username}
                    </td>
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      {getActionBadge(log.action)}
                    </td>
                    <td className="py-2.5 px-4 text-slate-600 dark:text-slate-300">
                      {log.description}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-slate-400">
                      {log.ip_address || "127.0.0.1"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default AdminActivityLogs;
