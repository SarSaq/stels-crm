"use client";

import { useState, useTransition } from "react";
import { setStageStatus, reorderStages } from "@/lib/actions";
import { STAGE_STATUS_META } from "@/lib/status";
import type { StageStatus } from "@/lib/database.types";
import type { OrderStageWithType } from "@/lib/queries";

// Цикл статусов этапа по клику: не начат → В работе → В процессе → Выполнено → сброс.
const CYCLE: (StageStatus | null)[] = [null, "В работе", "В процессе", "Выполнено"];
function nextStatus(cur: StageStatus | null): StageStatus | null {
  return CYCLE[(CYCLE.indexOf(cur) + 1) % CYCLE.length];
}

export function StageSequence({
  orderId,
  stages,
}: {
  orderId: number;
  stages: OrderStageWithType[];
}) {
  const [items, setItems] = useState(stages);
  const [dragId, setDragId] = useState<number | null>(null);
  const [, startTransition] = useTransition();

  // Показываем только активные этапы, в текущем порядке.
  const active = items.filter((s) => s.is_active);
  if (active.length === 0) {
    return <span className="text-xs text-zinc-300">нет этапов</span>;
  }

  function cycleStatus(id: number, cur: StageStatus | null) {
    const next = nextStatus(cur);
    setItems((list) =>
      list.map((s) => (s.id === id ? { ...s, status: next } : s)),
    );
    startTransition(async () => {
      await setStageStatus(id, next);
    });
  }

  function onDrop(targetId: number) {
    const from = dragId;
    setDragId(null);
    if (from == null || from === targetId) return;

    const cur = items.filter((s) => s.is_active);
    const fromIdx = cur.findIndex((s) => s.id === from);
    const toIdx = cur.findIndex((s) => s.id === targetId);
    if (fromIdx < 0 || toIdx < 0) return;

    const reordered = [...cur];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);

    // Оптимистично меняем порядок (неактивные оставляем как есть, в конце).
    const inactive = items.filter((s) => !s.is_active);
    setItems([...reordered, ...inactive]);

    const orderedIds = reordered.map((s) => s.id);
    startTransition(async () => {
      await reorderStages(orderId, orderedIds);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      {active.map((s, i) => {
        const meta = s.status ? STAGE_STATUS_META[s.status] : null;
        return (
          <div
            key={s.id}
            draggable
            onDragStart={() => setDragId(s.id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onDrop(s.id)}
            className={`flex cursor-grab items-center gap-1 rounded-full py-0.5 pl-1.5 pr-2 text-xs ring-1 ring-inset active:cursor-grabbing ${
              s.status
                ? meta?.className
                : "bg-white text-zinc-500 ring-zinc-200"
            } ${dragId === s.id ? "opacity-40" : ""}`}
            title="Перетащите для смены порядка · клик — статус"
          >
            <span className="font-mono text-[10px] text-zinc-400">{i + 1}</span>
            <button
              type="button"
              onClick={() => cycleStatus(s.id, s.status)}
              className="font-medium"
            >
              {s.stage_type?.name ?? "?"}
              {s.detail ? ` · ${s.detail}` : ""}
            </button>
          </div>
        );
      })}
    </div>
  );
}
