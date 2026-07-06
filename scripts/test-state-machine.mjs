// Быстрый тест чистой логики машины состояний (без БД, без фреймворка).
// Запуск: node scripts/test-state-machine.mjs
// Дублирует логику src/lib/state-machine.ts — держать в синхроне (это дымовой тест правил).

const BOTTOM_UP_LOCKED = new Set(["Ожидание", "Готово", "Отгружено"]);

function applyTopDown(newStatus, stages) {
  const changes = [];
  if (newStatus === "В работе") {
    for (const s of stages)
      if (s.is_active && !s.status) changes.push({ id: s.id, to: "В работе" });
  } else if (newStatus === "Готово" || newStatus === "Отгружено") {
    for (const s of stages)
      if (s.is_active && s.status !== "Выполнено")
        changes.push({ id: s.id, to: "Выполнено" });
  }
  return changes;
}

function computeOrderStatusFromStages(current, stages) {
  if (BOTTOM_UP_LOCKED.has(current)) return null;
  const active = stages.filter((s) => s.is_active);
  if (active.length === 0) return null;
  let allDone = true, anyDone = false, anyInProcess = false, anyInWork = false;
  for (const s of active) {
    if (s.status !== "Выполнено") allDone = false;
    if (s.status === "Выполнено") anyDone = true;
    if (s.status === "В процессе") anyInProcess = true;
    if (s.status === "В работе") anyInWork = true;
  }
  if (allDone) return current === "ОТК" ? null : "ОТК";
  if (anyInProcess || anyDone)
    return current === "ОТК" || current === "В процессе" ? null : "В процессе";
  if (anyInWork) return current === "В работе" ? null : "В работе";
  return null;
}

let pass = 0, fail = 0;
function eq(actual, expected, name) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) { pass++; }
  else { fail++; console.error(`✗ ${name}\n   ожидалось ${e}\n   получено  ${a}`); }
}

const S = (id, is_active, status = null) => ({ id, is_active, status });

// --- СВЕРХУ ВНИЗ ---
eq(
  applyTopDown("В работе", [S(1, true), S(2, true, "Выполнено"), S(3, false)]).map(c => c.id),
  [1],
  "В работе: запускает только активные с пустым статусом",
);
eq(
  applyTopDown("Готово", [S(1, true, "В работе"), S(2, true, "Выполнено"), S(3, false)]).map(c => c.id),
  [1],
  "Готово: закрывает активные незакрытые",
);
eq(applyTopDown("Проверка", [S(1, true)]), [], "Проверка: этапы не трогает");

// --- СНИЗУ ВВЕРХ ---
eq(computeOrderStatusFromStages("В работе", [S(1, true, "Выполнено"), S(2, true, "Выполнено")]), "ОТК",
  "все активные Выполнено → ОТК");
eq(computeOrderStatusFromStages("В работе", [S(1, true, "В процессе"), S(2, true, "В работе")]), "В процессе",
  "хотя бы один В процессе → В процессе");
eq(computeOrderStatusFromStages("Проверка", [S(1, true, "В работе")]), "В работе",
  "хотя бы один В работе → В работе");
eq(computeOrderStatusFromStages("Ожидание", [S(1, true, "Выполнено")]), null,
  "защита: из Ожидание не пересчитываем");
eq(computeOrderStatusFromStages("Готово", [S(1, true, "В работе")]), null,
  "защита: Готово не откатываем");
eq(computeOrderStatusFromStages("ОТК", [S(1, true, "В процессе"), S(2, true, "Выполнено")]), null,
  "ОТК не откатывается в В процессе");
eq(computeOrderStatusFromStages("В работе", [S(1, false, "Выполнено")]), null,
  "неактивные этапы игнорируются");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
