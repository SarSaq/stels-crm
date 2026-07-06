import Link from "next/link";
import { ORDER_STATUSES } from "@/lib/status";

// Фильтр по статусу как ссылки (?status=...). Серверный, без клиентского состояния.
export function StatusFilter({
  active,
  counts,
}: {
  active?: string;
  counts: Record<string, number>;
}) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  const chip = (href: string, label: string, count: number, on: boolean) => (
    <Link
      href={href}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition ${
        on
          ? "bg-zinc-900 text-white"
          : "bg-white text-zinc-600 ring-1 ring-inset ring-zinc-200 hover:bg-zinc-50"
      }`}
    >
      {label}
      <span className={on ? "text-zinc-300" : "text-zinc-400"}>{count}</span>
    </Link>
  );

  return (
    <div className="flex flex-wrap gap-2">
      {chip("/", "Все", total, !active)}
      {ORDER_STATUSES.filter((s) => counts[s]).map((s) =>
        chip(
          `/?status=${encodeURIComponent(s)}`,
          s,
          counts[s] ?? 0,
          active === s,
        ),
      )}
    </div>
  );
}
