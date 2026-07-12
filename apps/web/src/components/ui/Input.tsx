import type { InputHTMLAttributes, SelectHTMLAttributes } from "react";

const fieldClasses =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-slate-500";

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "children">;

export function Input({ className = "", ...props }: InputProps) {
  return <input className={`${fieldClasses} ${className}`} {...props} />;
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "children"> {
  children?: React.ReactNode;
}

export function Select({ className = "", children, ...rest }: SelectProps) {
  return (
    <select className={`${fieldClasses} ${className}`} {...rest}>
      {children}
    </select>
  );
}

export function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">{children}</label>
  );
}
