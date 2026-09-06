import { Link } from "react-router-dom";
import { QrCode, Activity, BarChart3, FileText, ShieldCheck, ArrowRight } from "lucide-react";

const FEATURES = [
  { icon: QrCode, title: "QR Attendance", desc: "Signed, time-boxed QR tokens — no static codes, no guesswork." },
  { icon: Activity, title: "Real-time Monitoring", desc: "Teachers watch check-ins land live during the session." },
  { icon: BarChart3, title: "Attendance Analytics", desc: "Rates, trends, and per-class breakdowns at a glance." },
  { icon: FileText, title: "Digital Reports", desc: "Filter by date, class, or status and export to CSV." },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="max-w-6xl mx-auto flex items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-brand-600/20 text-brand-400">
            <ShieldCheck size={20} />
          </div>
          <span className="font-extrabold tracking-wide">SKAGATA</span>
        </div>
        <Link to="/login" className="btn-secondary text-sm">Login</Link>
      </header>

      <section className="max-w-4xl mx-auto text-center px-6 pt-16 pb-20">
        <span className="badge bg-brand-500/10 text-brand-300 border border-brand-500/30 mb-5">
          Educational Demo Project
        </span>
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight">
          SKAGATA <span className="text-brand-400">ATTENDANCE</span>
        </h1>
        <p className="mt-4 text-lg text-slate-400">Smart Attendance System for School</p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link to="/login" className="btn-primary">
            Login <ArrowRight size={16} />
          </Link>
          <Link to="/login" className="btn-secondary">
            View Demo
          </Link>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-24 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {FEATURES.map((f) => (
          <div key={f.title} className="glass-card p-5">
            <div className="p-2.5 rounded-xl bg-brand-500/10 text-brand-400 w-fit mb-4">
              <f.icon size={20} />
            </div>
            <h3 className="font-semibold text-white">{f.title}</h3>
            <p className="text-sm text-slate-400 mt-1">{f.desc}</p>
          </div>
        ))}
      </section>

      <section className="max-w-5xl mx-auto px-6 pb-24">
        <div className="glass-card p-2 sm:p-3">
          <div className="rounded-xl bg-slate-950 border border-slate-800 p-6 sm:p-10 text-center">
            <p className="text-slate-500 text-sm">Dashboard preview</p>
            <p className="text-slate-300 mt-2">Log in with a demo account to see the Student, Teacher, and Admin dashboards.</p>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-800 py-6 text-center text-xs text-slate-500">
        Educational Demo • Use with authorized school data only
      </footer>
    </div>
  );
}
