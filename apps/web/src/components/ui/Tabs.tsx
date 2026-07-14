"use client";

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

export function Tabs({
  items,
  value,
  onChange,
}: {
  items: TabItem[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900">
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => onChange(item.id)}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors ${
            value === item.id
              ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
              : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          }`}
        >
          {item.icon}
          {item.label}
        </button>
      ))}
    </div>
  );
}
