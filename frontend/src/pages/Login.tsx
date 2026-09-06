import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, LogIn, Lock, User, Sparkles, AlertCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { ApiRequestError } from "../api/client";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";

const DEMO_ACCOUNTS = [
  { role: "Siswa (Demo)", username: "student01", password: "demo123", class: "XI TKJ 1" },
  { role: "Guru (Demo)", username: "teacher01", password: "demo123", class: "Bpk. Slamet Riyadi" },
  { role: "Admin (Demo)", username: "admin", password: "demo123", class: "Administrator" },
];

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { login, role: currentRole, token } = useAuth();
  const navigate = useNavigate();

  if (token && currentRole) {
    navigate(`/${currentRole}`, { replace: true });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(username, password);
    } catch (err: any) {
      if (err instanceof ApiRequestError) {
        setError(err.friendlyMessage || err.message);
      } else {
        setError("Username atau password salah. Silakan coba lagi.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  function fillDemo(u: string, p: string) {
    setUsername(u);
    setPassword(p);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 px-4 py-8 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-brand-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md space-y-6 relative z-10">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center">
          <div className="p-3.5 rounded-2xl bg-brand-600/20 border border-brand-500/30 text-brand-400 mb-3 shadow-glow">
            <ShieldCheck size={32} />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">SKAGATA ATTENDANCE</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Sistem Presensi Digital SMK Negeri 3 Yogyakarta
          </p>
        </div>

        {/* Login Card */}
        <Card className="p-6 sm:p-7 border-slate-800 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <Input
              label="Username Akun"
              placeholder="Contoh: student01"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              leftIcon={<User size={16} />}
              autoFocus
              required
            />

            <Input
              type="password"
              label="Kata Sandi (Password)"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={<Lock size={16} />}
              required
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              isLoading={submitting}
              loadingText="Memverifikasi Akun..."
              leftIcon={<LogIn size={18} />}
            >
              Masuk ke Aplikasi
            </Button>
          </form>

          {/* Quick Demo Accounts */}
          <div className="mt-6 pt-5 border-t border-slate-800">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Sparkles size={12} className="text-brand-400" /> Akun Demo Cepat
              </span>
              <span className="text-[10px] text-slate-500">Klik untuk isi otomatis</span>
            </div>

            <div className="space-y-2">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.username}
                  type="button"
                  onClick={() => fillDemo(acc.username, acc.password)}
                  className="w-full flex items-center justify-between text-xs bg-slate-950/70 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 rounded-xl px-3.5 py-2.5 transition-all text-left group"
                >
                  <div>
                    <p className="font-semibold text-white group-hover:text-brand-300 transition-colors">
                      {acc.role}
                    </p>
                    <p className="text-[11px] text-slate-400">{acc.class}</p>
                  </div>
                  <span className="font-mono text-[11px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                    {acc.username}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </Card>

        <p className="text-center text-[11px] text-slate-400">
          SKAGATA Presensi Pintar • SMK Negeri 3 Yogyakarta
        </p>
      </div>
    </div>
  );
}
