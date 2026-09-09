import React from "react";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import clsx from "clsx";

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export default function ThemeToggle({ className, showLabel = false }: ThemeToggleProps) {
  const { theme, resolvedTheme, toggleTheme } = useTheme();
  const isDark = (resolvedTheme || theme) === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Beralih ke Mode Terang" : "Beralih ke Mode Gelap"}
      title={isDark ? "Mode Terang (Light Mode)" : "Mode Gelap (Dark Mode)"}
      className={clsx(
        "relative group inline-flex items-center gap-2 p-2 rounded-xl border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500/40 select-none active:scale-95",
        isDark
          ? "bg-slate-900/90 hover:bg-slate-800 border-slate-700/80 text-amber-300 hover:text-amber-200 shadow-sm"
          : "bg-white hover:bg-slate-100 border-slate-200 text-slate-700 hover:text-slate-900 shadow-sm",
        className
      )}
    >
      <div className="relative w-5 h-5 flex items-center justify-center overflow-hidden">
        {/* Sun icon for light mode */}
        <Sun
          size={18}
          className={clsx(
            "absolute transition-all duration-300 ease-out transform",
            isDark
              ? "opacity-0 rotate-90 scale-50 pointer-events-none"
              : "opacity-100 rotate-0 scale-100 text-amber-500"
          )}
        />
        {/* Moon icon for dark mode */}
        <Moon
          size={18}
          className={clsx(
            "absolute transition-all duration-300 ease-out transform",
            isDark
              ? "opacity-100 rotate-0 scale-100 text-indigo-400"
              : "opacity-0 -rotate-90 scale-50 pointer-events-none"
          )}
        />
      </div>

      {showLabel && (
        <span className="text-xs font-semibold tracking-wide hidden sm:inline text-slate-700 dark:text-slate-200">
          {isDark ? "Gelap" : "Terang"}
        </span>
      )}
    </button>
  );
}
