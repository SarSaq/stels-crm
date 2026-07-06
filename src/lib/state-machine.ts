// Машина состояний Stels CRM — перенос логики из docs/reference/apps-script-original.gs.
// Чистые функции без БД: легко тестировать, вызываются из Server Actions.
//
// Правила (docs/domain.md §3):
//  Сверху вниз (изменён статус заказа):
//   • → «В работе»: активным этапам с пустым статусом проставить «В работе».
//   • → «Готово»/«Отгружено»: все активные этапы принудительно «Выполнено».
//  Снизу вверх (изменён статус этапа):
//   • Защита: если статус заказа пуст/«Ожидание»/«Готово»/«Отгружено» — не пересчитывать.
//   • Все активные «Выполнено» → «ОТК».
//   • Хотя бы один «В процессе»/«Выполнено» → «В процессе» (но не откатывать «ОТК»).
//   • Хотя бы один «В работе» → «В работе».

import type { OrderStatus, StageStatus } from "./database.types";

export interface StageLike {
  id: number;
  is_active: boolean;
  status: StageStatus | null;
}

export interface StageChange {
  id: number;
  from: StageStatus | null;
  to: StageStatus;
}

// Статусы заказа, при которых логика «снизу вверх» не срабатывает (защита финальных/начальных).
const BOTTOM_UP_LOCKED: ReadonlySet<OrderStatus> = new Set<OrderStatus>([
  "Ожидание",
  "Готово",
  "Отгружено",
]);

// СВЕРХУ ВНИЗ: какие этапы поменять при заданном новом статусе заказа.
export function applyTopDown(
  newОrderStatus: OrderStatus,
  stages: StageLike[],
): StageChange[] {
  const changes: StageChange[] = [];

  if (newОrderStatus === "В работе") {
    for (const s of stages) {
      if (s.is_active && (s.status === null || (s.status as string) === "")) {
        changes.push({ id: s.id, from: s.status, to: "В работе" });
      }
    }
  } else if (newОrderStatus === "Готово" || newОrderStatus === "Отгружено") {
    for (const s of stages) {
      if (s.is_active && s.status !== "Выполнено") {
        changes.push({ id: s.id, from: s.status, to: "Выполнено" });
      }
    }
  }

  return changes;
}

// СНИЗУ ВВЕРХ: новый статус заказа исходя из статусов этапов.
// Возвращает null, если статус менять не нужно (или сработала защита).
export function computeOrderStatusFromStages(
  currentOrderStatus: OrderStatus,
  stages: StageLike[],
): OrderStatus | null {
  if (BOTTOM_UP_LOCKED.has(currentOrderStatus)) return null;

  const active = stages.filter((s) => s.is_active);
  if (active.length === 0) return null;

  let allDone = true;
  let anyDone = false;
  let anyInProcess = false;
  let anyInWork = false;

  for (const s of active) {
    if (s.status !== "Выполнено") allDone = false;
    if (s.status === "Выполнено") anyDone = true;
    if (s.status === "В процессе") anyInProcess = true;
    if (s.status === "В работе") anyInWork = true;
  }

  if (allDone) {
    return currentOrderStatus === "ОТК" ? null : "ОТК";
  }
  if (anyInProcess || anyDone) {
    // «ОТК» назад в «В процессе» не откатываем.
    if (currentOrderStatus === "ОТК" || currentOrderStatus === "В процессе") {
      return null;
    }
    return "В процессе";
  }
  if (anyInWork) {
    return currentOrderStatus === "В работе" ? null : "В работе";
  }
  return null;
}

// Разрешённые ручные переходы статуса заказа (для UI/канбана).
// Основная линия + ветки; авто-статусы (В процессе/ОТК) сюда не входят как ручные цели,
// но пропускаем всё — строгие права ролей включим вместе с Auth.
export const MANUAL_STATUS_FLOW: Record<OrderStatus, OrderStatus[]> = {
  Ожидание: ["Проверка", "Отмена"],
  Проверка: ["В работе", "Инженер", "Отмена"],
  Инженер: ["В работе", "Отмена"],
  "В работе": ["Постпресс", "ОТК", "Отмена"],
  "В процессе": ["Постпресс", "ОТК", "Отмена"],
  Постпресс: ["ОТК", "Отмена"],
  ОТК: ["Готово", "Отмена"],
  Готово: ["Отгружено", "Монтаж"],
  Монтаж: ["Отгружено"],
  Макетка: ["В работе"],
  Отгружено: [],
  Отмена: ["Ожидание"],
};
