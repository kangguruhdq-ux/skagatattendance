import React from "react";
import clsx from "clsx";

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx(
        "rounded-xl bg-slate-200 dark:bg-slate-800/70 border border-slate-300/30 dark:border-slate-700/30",
        "bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 dark:from-slate-800/70 dark:via-slate-700/50 dark:to-slate-800/70",
        "bg-[length:200%_100%] animate-shimmer",
        className
      )}
      {...props}
    />
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-11 w-36 hidden sm:block" />
      </div>

      <Skeleton className="h-28 sm:h-36 w-full" />

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-20 sm:h-24 w-full" />
        ))}
      </div>

      <Skeleton className="h-48 w-full" />
    </div>
  );
}
