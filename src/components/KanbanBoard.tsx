"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { setOrderStatus } from "@/lib/actions";
import { ORDER_STATUS_META } from "@/lib/status";
import type { OrderStatus, OrderWithRelations } from "@/lib/database.types";

// Колонки доски — производственная линия (без «Отгружено»/«Отмена»).
const BOARD_COLUMNS: OrderStatus[] = [
  "Ожидание",
  "Проверка",
  "Инженер",
  "В работе",
  "В процессе",
  "Постпресс",
  "Макетка",
  "ОТК",
  "Готово",
  "Монтаж",
];

function Card({
  order,
  onDragStart,
  dragging,
}: {
  order: OrderWithRelations;
  onDragStart: (id: number) => void;
  dragging: boolean;
}) {
  return (
    <Link href={`/orders/${order.id}`}>
      <div
        draggable
        onDragStart={() => onDragStart(order.id)}
        className={`cursor-grab rounded-md border border-zinc-200 bg-white p-2.5 text-sm shadow-sm transition hover:border-zinc-300 hover:shadow active:cursor-grabbing ${
          dragging ? "opacity-40" : ""
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-xs text-zinc-400">
            №{order.legacy_num ?? order.id}
          </span>
          <span className="flex items-center gap-1">
            {order.is_fire && <span title="Огонь">🔥</span>}
            {order.is_urgent && !order.is_fire && (
              <span className="text-[10px] font-semibold text-red-500">
                СРОЧНО
              </span>
            )}
          </span>
        </div>
        <div className="mt-1 font-medium text-zinc-800">
          {order.client?.name ?? "—"}
        </div>
        {order.description && (
          <div className="mt-0.5 line-clamp-2 text-xs text-zinc-500">
            {order.description}
          </div>
        )}
      </div>
    </Link>
  );
}

export function KanbanBoard({ orders }: { orders: OrderWithRelations[] }) {
  const [items, setItems] = useState(orders);
  const [dragId, setDragId] = useState<number | null>(null);
  const [overCol, setOverCol] = useState<OrderStatus | null>(null);
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const byStatus = (status: OrderStatus) =>
    items.filter((o) => o.status === status);

  function drop(status: OrderStatus) {
    setOverCol(null);
    const id = dragId;
    setDragId(null);
    if (id == null) return;
    const order = items.find((o) => o.id === id);
    if (!order || order.status === status) return;

    const prev = order.status;
    // Оптимистично двигаем карточку.
    setItems((list) =>
      list.map((o) => (o.id === id ? { ...o, status } : o)),
    );
    setError(null);
    startTransition(async () => {
      const res = await setOrderStatus(id, status);
      if (!res.ok) {
        setError(`№${order.legacy_num ?? id}: ${res.error}`);
        // Откат при ошибке.
        setItems((list) =>
          list.map((o) => (o.id === id ? { ...o, status: prev } : o)),
        );
      }
    });
  }

  return (
    <div>
      {error && (
        <div className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </div>
      )}
      <div className="flex gap-3 overflow-x-auto pb-4">
        {BOARD_COLUMNS.map((status) => {
          const meta = ORDER_STATUS_META[status];
          const cards = byStatus(status);
          return (
            <div
              key={status}
              onDragOver={(e) => {
                e.preventDefault();
                setOverCol(status);
              }}
              onDragLeave={() => setOverCol((c) => (c === status ? null : c))}
              onDrop={() => drop(status)}
              className={`flex w-64 shrink-0 flex-col rounded-lg border bg-zinc-50/70 ${
                overCol === status
                  ? "border-zinc-400 ring-2 ring-zinc-300"
                  : "border-zinc-200"
              }`}
            >
              <div className="flex items-center justify-between border-b border-zinc-200 px-3 py-2">
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${meta.className}`}
                >
                  {status}
                </span>
                <span className="text-xs text-zinc-400">{cards.length}</span>
              </div>
              <div className="flex min-h-[60px] flex-col gap-2 p-2">
                {cards.map((o) => (
                  <Card
                    key={o.id}
                    order={o}
                    dragging={dragId === o.id}
                    onDragStart={setDragId}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
