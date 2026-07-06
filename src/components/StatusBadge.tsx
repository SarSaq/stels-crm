import { ORDER_STATUS_META } from "@/lib/status";
import type { OrderStatus } from "@/lib/database.types";

export function StatusBadge({ status }: { status: OrderStatus }) {
  const meta = ORDER_STATUS_META[status] ?? {
    label: status,
    className: "bg-zinc-100 text-zinc-600 ring-zinc-200",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${meta.className}`}
    >
      {meta.label}
    </span>
  );
}
