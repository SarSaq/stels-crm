"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "./supabase/server";
import {
  applyTopDown,
  computeOrderStatusFromStages,
  type StageLike,
} from "./state-machine";
import type { OrderStatus, StageStatus } from "./database.types";

type ActionResult = { ok: true } | { ok: false; error: string };

// Запись в историю изменений. user_id пока null (Auth включим позже).
async function logHistory(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orderId: number,
  field: string,
  oldValue: string | null,
  newValue: string | null,
) {
  await supabase.from("order_history").insert({
    order_id: orderId,
    user_id: null,
    field,
    old_value: oldValue,
    new_value: newValue,
  });
}

// СМЕНА СТАТУСА ЗАКАЗА + авто-логика «сверху вниз».
export async function setOrderStatus(
  orderId: number,
  newStatus: OrderStatus,
): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: order, error: oErr } = await supabase
    .from("orders")
    .select("id, status")
    .eq("id", orderId)
    .maybeSingle();
  if (oErr) return { ok: false, error: oErr.message };
  if (!order) return { ok: false, error: "Заказ не найден" };

  const oldStatus = order.status as OrderStatus;
  if (oldStatus === newStatus) return { ok: true };

  const { data: stages, error: sErr } = await supabase
    .from("order_stages")
    .select("id, is_active, status")
    .eq("order_id", orderId);
  if (sErr) return { ok: false, error: sErr.message };

  // 1. Обновляем статус заказа.
  const { error: upErr } = await supabase
    .from("orders")
    .update({ status: newStatus })
    .eq("id", orderId);
  if (upErr) return { ok: false, error: upErr.message };
  await logHistory(supabase, orderId, "order.status", oldStatus, newStatus);

  // 2. Каскад на этапы (сверху вниз).
  const changes = applyTopDown(newStatus, (stages ?? []) as StageLike[]);
  for (const ch of changes) {
    const patch: Record<string, unknown> = { status: ch.to };
    if (ch.to === "В работе") patch.started_at = new Date().toISOString();
    if (ch.to === "Выполнено") patch.done_at = new Date().toISOString();
    await supabase.from("order_stages").update(patch).eq("id", ch.id);
    await logHistory(
      supabase,
      orderId,
      "stage.status",
      ch.from,
      ch.to,
    );
  }

  revalidatePath("/");
  revalidatePath("/board");
  revalidatePath(`/orders/${orderId}`);
  return { ok: true };
}

// СМЕНА СТАТУСА ЭТАПА + авто-пересчёт статуса заказа «снизу вверх».
export async function setStageStatus(
  stageId: number,
  newStatus: StageStatus | null,
): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: stage, error: stErr } = await supabase
    .from("order_stages")
    .select("id, order_id, status")
    .eq("id", stageId)
    .maybeSingle();
  if (stErr) return { ok: false, error: stErr.message };
  if (!stage) return { ok: false, error: "Этап не найден" };

  const orderId = stage.order_id as number;
  const oldStageStatus = stage.status as StageStatus | null;

  // 1. Обновляем статус этапа + временные метки.
  const patch: Record<string, unknown> = { status: newStatus };
  if (newStatus === "В работе") patch.started_at = new Date().toISOString();
  if (newStatus === "Выполнено") patch.done_at = new Date().toISOString();
  const { error: upErr } = await supabase
    .from("order_stages")
    .update(patch)
    .eq("id", stageId);
  if (upErr) return { ok: false, error: upErr.message };
  await logHistory(supabase, orderId, "stage.status", oldStageStatus, newStatus);

  // 2. Пересчёт статуса заказа (снизу вверх).
  const { data: order } = await supabase
    .from("orders")
    .select("status")
    .eq("id", orderId)
    .maybeSingle();
  const { data: stages } = await supabase
    .from("order_stages")
    .select("id, is_active, status")
    .eq("order_id", orderId);

  if (order) {
    const currentStatus = order.status as OrderStatus;
    const computed = computeOrderStatusFromStages(
      currentStatus,
      (stages ?? []) as StageLike[],
    );
    if (computed && computed !== currentStatus) {
      await supabase
        .from("orders")
        .update({ status: computed })
        .eq("id", orderId);
      await logHistory(
        supabase,
        orderId,
        "order.status",
        currentStatus,
        computed,
      );
    }
  }

  revalidatePath("/");
  revalidatePath("/board");
  revalidatePath(`/orders/${orderId}`);
  return { ok: true };
}
