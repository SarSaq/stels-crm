"use client";

import { useTransition } from "react";
import { setStageStatus } from "@/lib/actions";
import { STAGE_STATUS_META } from "@/lib/status";
import type { StageStatus } from "@/lib/database.types";

// Цикл статусов этапа: не начат → В работе → В процессе → Выполнено → (сброс).
const CYCLE: (StageStatus | null)[] = [
  null,
  "В работе",
  "В процессе",
  "Выполнено",
];

function nextStatus(current: StageStatus | null): StageStatus | null {
  const idx = CYCLE.indexOf(current);
  return CYCLE[(idx + 1) % CYCLE.length];
}

export function StageControl({
  stageId,
  status,
}: {
  stageId: number;
  status: StageStatus | null;
}) {
  const [pending, startTransition] = useTransition();

  function cycle() {
    const next = nextStatus(status);
    startTransition(async () => {
      await setStageStatus(stageId, next);
    });
  }

  const meta = status ? STAGE_STATUS_META[status] : null;

  return (
    <button
      onClick={cycle}
      disabled={pending}
      title="Клик — следующий статус этапа"
      className={`inline-flex min-w-[92px] items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset transition disabled:opacity-50 ${
        status
          ? meta?.className
          : "bg-zinc-50 text-zinc-400 ring-zinc-200 hover:bg-zinc-100"
      }`}
    >
      {pending ? "…" : (status ?? "не начат")}
    </button>
  );
}
