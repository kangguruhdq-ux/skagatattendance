import React, { useState } from "react";
import clsx from "clsx";
import { Eye, EyeOff } from "lucide-react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  showPasswordToggle?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      helperText,
      error,
      leftIcon,
      rightIcon,
      showPasswordToggle = true,
      className,
      id,
      type,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    const isPassword = type === "password";
    const effectiveType = isPassword && showPasswordToggle ? (showPassword ? "text" : "password") : type;

    // Determine right icon / toggle button
    const effectiveRightIcon = rightIcon ? (
      rightIcon
    ) : isPassword && showPasswordToggle ? (
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setShowPassword((prev) => !prev)}
        aria-label={showPassword ? "Sembunyikan kata sandi" : "Lihat kata sandi"}
        title={showPassword ? "Sembunyikan kata sandi" : "Lihat kata sandi"}
        className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/40 pointer-events-auto cursor-pointer"
      >
        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    ) : null;

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3.5 text-slate-400 dark:text-slate-500 pointer-events-none shrink-0">
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            type={effectiveType}
            className={clsx(
              "w-full rounded-xl bg-white dark:bg-slate-900/80 border text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500",
              "transition-colors duration-150 py-2.5",
              leftIcon ? "pl-10" : "pl-3.5",
              effectiveRightIcon ? "pr-10" : "pr-3.5",
              error
                ? "border-rose-500/80 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                : "border-slate-300 dark:border-slate-700/80 hover:border-slate-400 dark:hover:border-slate-600 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20",
              "focus:outline-none",
              className
            )}
            {...props}
          />
          {effectiveRightIcon && (
            <div className="absolute right-3 text-slate-400 dark:text-slate-500 flex items-center shrink-0">
              {effectiveRightIcon}
            </div>
          )}
        </div>
        {error ? (
          <p className="text-xs text-rose-500 dark:text-rose-400 flex items-center gap-1 font-medium">{error}</p>
        ) : helperText ? (
          <p className="text-xs text-slate-500 dark:text-slate-400">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = "Input";

