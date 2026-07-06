import type { OrderStatus, StageStatus } from "./database.types";

// Цвета бейджей статуса заказа. Порядок — как в производственной линии.
export const ORDER_STATUS_META: Record<
  OrderStatus,
  { label: string; className: string; order: number }
> = {
  Ожидание: { label: "Ожидание", className: "bg-zinc-100 text-zinc-600 ring-zinc-200", order: 10 },
  Проверка: { label: "Проверка", className: "bg-amber-100 text-amber-700 ring-amber-200", order: 20 },
  "В работе": { label: "В работе", className: "bg-blue-100 text-blue-700 ring-blue-200", order: 30 },
  "В процессе": { label: "В процессе", className: "bg-indigo-100 text-indigo-700 ring-indigo-200", order: 40 },
  Постпресс: { label: "Постпресс", className: "bg-cyan-100 text-cyan-700 ring-cyan-200", order: 50 },
  Инженер: { label: "Инженер", className: "bg-purple-100 text-purple-700 ring-purple-200", order: 55 },
  Макетка: { label: "Макетка", className: "bg-fuchsia-100 text-fuchsia-700 ring-fuchsia-200", order: 58 },
  ОТК: { label: "ОТК", className: "bg-orange-100 text-orange-700 ring-orange-200", order: 60 },
  Готово: { label: "Готово", className: "bg-emerald-100 text-emerald-700 ring-emerald-200", order: 70 },
  Монтаж: { label: "Монтаж", className: "bg-teal-100 text-teal-700 ring-teal-200", order: 75 },
  Отгружено: { label: "Отгружено", className: "bg-green-200 text-green-800 ring-green-300", order: 80 },
  Отмена: { label: "Отмена", className: "bg-red-100 text-red-700 ring-red-200", order: 90 },
};

export const ORDER_STATUSES: OrderStatus[] = Object.keys(ORDER_STATUS_META) as OrderStatus[];

export const STAGE_STATUS_META: Record<
  StageStatus,
  { className: string }
> = {
  "В работе": { className: "bg-blue-100 text-blue-700 ring-blue-200" },
  "В процессе": { className: "bg-indigo-100 text-indigo-700 ring-indigo-200" },
  Выполнено: { className: "bg-emerald-100 text-emerald-700 ring-emerald-200" },
};

const MONTHS_SHORT = [
  "янв", "фев", "мар", "апр", "май", "июн",
  "июл", "авг", "сен", "окт", "ноя", "дек",
];

// timestamp → «06 июл» для отображения (как договорено в domain.md).
export function formatDateShort(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return `${String(d.getDate()).padStart(2, "0")} ${MONTHS_SHORT[d.getMonth()]}`;
}
