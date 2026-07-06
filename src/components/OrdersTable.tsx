import Link from "next/link";
import { StatusBadge } from "./StatusBadge";
import { formatDateShort } from "@/lib/status";
import type { OrderWithRelations } from "@/lib/database.types";

function dimensions(o: OrderWithRelations): string {
  if (o.width_mm && o.height_mm) return `${o.width_mm}×${o.height_mm} мм`;
  return "—";
}

export function OrdersTable({ orders }: { orders: OrderWithRelations[] }) {
  if (orders.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-10 text-center text-sm text-zinc-500">
        Заказы не найдены.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500">
            <th className="px-3 py-2.5 font-medium">№</th>
            <th className="px-3 py-2.5 font-medium">Клиент</th>
            <th className="px-3 py-2.5 font-medium">Статус</th>
            <th className="px-3 py-2.5 font-medium">Описание</th>
            <th className="px-3 py-2.5 font-medium">Материал</th>
            <th className="px-3 py-2.5 font-medium">Размер</th>
            <th className="px-3 py-2.5 font-medium text-right">Кол-во</th>
            <th className="px-3 py-2.5 font-medium">Менеджер</th>
            <th className="px-3 py-2.5 font-medium">Создан</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {orders.map((o) => (
            <tr key={o.id} className="group hover:bg-zinc-50">
              <td className="whitespace-nowrap px-3 py-2.5 font-mono text-zinc-500">
                <Link href={`/orders/${o.id}`} className="hover:text-blue-600">
                  {o.legacy_num ?? o.id}
                </Link>
                {o.is_fire && <span title="Огонь">&nbsp;🔥</span>}
                {o.is_urgent && !o.is_fire && (
                  <span className="ml-1 text-[10px] font-semibold text-red-500">
                    СРОЧНО
                  </span>
                )}
              </td>
              <td className="px-3 py-2.5 font-medium text-zinc-800">
                {o.client?.name ?? "—"}
              </td>
              <td className="px-3 py-2.5">
                <StatusBadge status={o.status} />
              </td>
              <td className="max-w-xs truncate px-3 py-2.5 text-zinc-600">
                {o.description ?? "—"}
              </td>
              <td className="px-3 py-2.5 text-zinc-600">
                {o.material?.name ?? "—"}
              </td>
              <td className="whitespace-nowrap px-3 py-2.5 text-zinc-600">
                {dimensions(o)}
              </td>
              <td className="px-3 py-2.5 text-right tabular-nums text-zinc-600">
                {o.quantity ?? "—"}
              </td>
              <td className="whitespace-nowrap px-3 py-2.5 text-zinc-600">
                {o.manager?.full_name ?? "—"}
              </td>
              <td className="whitespace-nowrap px-3 py-2.5 text-zinc-500">
                {formatDateShort(o.created_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
