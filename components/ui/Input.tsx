import React from 'react';
import clsx from 'clsx';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, className = '', ...props }) => {
  return (
    <div className="flex flex-col gap-2">
      {label && <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">{label}</label>}
      <input
        className={clsx(
          "flex h-10 w-full rounded-lg border bg-white px-3 py-2 text-sm transition-all duration-200",
          "placeholder:text-zinc-400 dark:bg-zinc-900 dark:text-zinc-100",
          "focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500",
          error 
            ? "border-red-300 focus:ring-red-200 focus:border-red-500 dark:border-red-800" 
            : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700",
          className
        )}
        {...props}
      />
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
};