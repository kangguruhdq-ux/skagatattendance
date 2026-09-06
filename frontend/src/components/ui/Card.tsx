import React from "react";
import clsx from "clsx";

export function Card({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx(
        "rounded-2xl bg-white/95 dark:bg-slate-900/70 border border-slate-200/90 dark:border-slate-800/80 backdrop-blur-xl shadow-lg shadow-slate-200/50 dark:shadow-xl dark:shadow-black/20 text-slate-800 dark:text-slate-100 transition-all",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx("p-5 sm:p-6 pb-2 sm:pb-3 border-b border-slate-100 dark:border-slate-800/60", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardTitle({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={clsx("text-lg font-bold text-slate-900 dark:text-white tracking-tight leading-snug", className)}
      {...props}
    >
      {children}
    </h3>
  );
}

export function CardDescription({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={clsx("text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed", className)}
      {...props}
    >
      {children}
    </p>
  );
}

export function CardContent({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={clsx("p-5 sm:p-6", className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx(
        "p-5 sm:p-6 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between flex-wrap gap-3",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

