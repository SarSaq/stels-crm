"use client";

import { useState, useTransition } from "react";
import { setOrderStatus } from "@/lib/actions";
import { StatusBadge } from "./StatusBadge";
import { MANUAL_STATUS_FLOW } from "@/lib/state-machine";
import { ORDER_STATUSES } from "@/lib/status";
import type { OrderStatus } from "@/lib/database.types";

export function OrderStatusControl({
  orderId,
  status,
}: {
  orderId: number;
  status: OrderStatus;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Предлагаемые переходы + возможность выбрать любой статус вручную.
  const suggested = MANUAL_STATUS_FLOW[status] ?? [];
  const rest = ORDER_STATUSES.filter(
    (s) => s !== status && !suggested.includes(s),
  );

  function change(next: OrderStatus) {
    setError(null);
    setOpen(false);
    startTransition(async () => {
      const res = await setOrderStatus(orderId, next);
      if (!res.ok) setError(res.error);
    });
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={pending}
        className="flex items-center gap-2 rounded-md ring-1 ring-inset ring-zinc-200 bg-white px-2 py-1 hover:bg-zinc-50 disabled:opacity-50"
      >
        <StatusBadge status={status} />
        <span className="text-xs text-zinc-400">{pending ? "…" : "▾"}</span>
      </button>

      {open && (
        <div className="absolute right-0 z-10 mt-1 w-52 rounded-lg border border-zinc-200 bg-white p-1 shadow-lg">
          {suggested.length > 0 && (
            <div className="px-2 py-1 text-[10px] uppercase tracking-wide text-zinc-400">
              Переходы
            </div>
          )}
          {suggested.map((s) => (
            <button
              key={s}
              onClick={() => change(s)}
              className="flex w-full items-center rounded-md px-2 py-1.5 text-left text-sm hover:bg-zinc-100"
            >
              <StatusBadge status={s} />
            </button>
          ))}
          <div className="px-2 py-1 text-[10px] uppercase tracking-wide text-zinc-400">
            Другой статус
          </div>
          <div className="max-h-48 overflow-y-auto">
            {rest.map((s) => (
              <button
                key={s}
                onClick={() => change(s)}
                className="flex w-full items-center rounded-md px-2 py-1.5 text-left text-sm hover:bg-zinc-100"
              >
                <StatusBadge status={s} />
              </button>
            ))}
          </div>
        </div>
      )}

      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
