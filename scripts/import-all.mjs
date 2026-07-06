// Полный импорт data/orders.csv → Supabase (все ~6700 заказов).
// Очищает старый seed, засевает clients/materials/users, вставляет orders батчами,
// создаёт order_stages (баг «Макетка→Сварочный цех» исправлен), нормализует даты.
//
// Запуск: node scripts/import-all.mjs
// Требует в .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ACCESS_TOKEN.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const env = fs.readFileSync(path.join(DIR, ".env.local"), "utf8");
const getEnv = (k) => (env.match(new RegExp(`${k}=(.+)`))?.[1] ?? "").trim().replace(/^"|"$/g, "");

const URL = getEnv("NEXT_PUBLIC_SUPABASE_URL");
const SERVICE_KEY = getEnv("SUPABASE_SERVICE_ROLE_KEY");
const ACCESS_TOKEN = getEnv("SUPABASE_ACCESS_TOKEN");
const REF = URL.match(/https:\/\/([^.]+)\./)[1];

const sb = createClient(URL, SERVICE_KEY, { auth: { persistSession: false } });

// --- CSV parser ---
function parse(str) {
  const rows = []; let f = "", row = [], q = false;
  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    if (q) { if (c === '"') { if (str[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else { if (c === '"') q = true; else if (c === ",") { row.push(f); f = ""; } else if (c === "\n") { row.push(f); rows.push(row); row = []; f = ""; } else if (c === "\r") {} else f += c; }
  }
  if (f.length || row.length) { row.push(f); rows.push(row); }
  return rows;
}

// --- нормализация ---
const MONTHS = { янв: "01", фев: "02", мар: "03", апр: "04", май: "05", июн: "06", июл: "07", авг: "08", сен: "09", окт: "10", ноя: "11", дек: "12" };
function parseDate(s) {
  if (!s) return null;
  s = s.trim().replace(/\./g, "");
  const m = s.match(/(\d{1,2})\s*([а-я]+)/i);
  if (!m) return null;
  const day = m[1].padStart(2, "0");
  const mon = MONTHS[m[2].slice(0, 3).toLowerCase()];
  return mon ? `2026-${mon}-${day}` : null;
}
const TRUE = (v) => String(v).trim().toUpperCase() === "TRUE";
function num(v) { if (v == null) return null; v = String(v).replace(",", ".").replace(/[^\d.]/g, ""); return v === "" ? null : parseFloat(v); }
function int(v) { const n = num(v); return n == null ? null : Math.round(n); }

// --- карта этапов (0-based индексы), баг Макетки исправлен (36, было 37) ---
const STAGE_MAP = [
  { name: "Печать", kind: "checkbox", checks: [22], status: 23 },
  { name: "Проварка", kind: "checkbox", checks: [24], status: 25 },
  { name: "Ламинация", kind: "text", checks: [26], status: 27 },
  { name: "Резка", kind: "checkbox", checks: [28, 29], status: 30 },
  { name: "Фрезер", kind: "checkbox", checks: [31], status: 32 },
  { name: "Сварка", kind: "checkbox", checks: [33], status: 34 },
  { name: "Макетка", kind: "checkbox", checks: [35], status: 36 },
];
function stageActive(row, st) {
  if (st.kind === "text") { const v = (row[st.checks[0]] || "").trim(); return v !== "" && v.toUpperCase() !== "FALSE"; }
  return st.checks.some((c) => TRUE(row[c]));
}
const STAGE_STATUSES = new Set(["В работе", "В процессе", "Выполнено"]);
function stageStatus(row, st) { const v = (row[st.status] || "").trim(); return STAGE_STATUSES.has(v) ? v : null; }

const ORDER_STATUSES = new Set(["Ожидание", "Проверка", "В работе", "В процессе", "Постпресс", "Инженер", "Макетка", "ОТК", "Готово", "Монтаж", "Отгружено", "Отмена"]);

async function runSQL(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${ACCESS_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error(`SQL failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function insertAndMap(table, names) {
  // Вставляем уникальные имена, возвращаем Map<name, id>. Батчами по 1000.
  const arr = [...names];
  for (let i = 0; i < arr.length; i += 1000) {
    const chunk = arr.slice(i, i + 1000).map((name) => ({ name }));
    const { error } = await sb.from(table).insert(chunk);
    if (error) throw new Error(`${table} insert: ${error.message}`);
  }
  const { data, error } = await sb.from(table).select("id, name");
  if (error) throw new Error(`${table} select: ${error.message}`);
  return new Map(data.map((r) => [r.name, r.id]));
}

async function main() {
  console.log("Читаю CSV…");
  const rows = parse(fs.readFileSync(path.join(DIR, "data/orders.csv"), "utf8"));
  const data = rows.slice(1).filter((r) => r[1] && r[1].trim() && r[1].trim() !== "ч");
  console.log("Заказов к импорту:", data.length);

  console.log("Очищаю прежние данные…");
  await runSQL("truncate orders, order_stages, order_history, clients, materials, users restart identity cascade;");

  // Справочники
  const clients = new Set(), materials = new Set(), managers = new Set();
  data.forEach((r) => {
    clients.add(r[1].trim());
    if (r[14]?.trim()) materials.add(r[14].trim());
    if (r[2]?.trim()) managers.add(r[2].trim());
  });
  console.log(`Справочники: клиентов ${clients.size}, материалов ${materials.size}, менеджеров ${managers.size}`);

  const clientMap = await insertAndMap("clients", clients);
  const materialMap = await insertAndMap("materials", materials);

  // users: full_name + role='manager'
  const mgrArr = [...managers].map((full_name) => ({ full_name, role: "manager" }));
  if (mgrArr.length) {
    const { error } = await sb.from("users").insert(mgrArr);
    if (error) throw new Error(`users insert: ${error.message}`);
  }
  const { data: usersData } = await sb.from("users").select("id, full_name");
  const managerMap = new Map(usersData.map((u) => [u.full_name, u.id]));

  // stage_types
  const { data: stData } = await sb.from("stage_types").select("id, name");
  const stageTypeMap = new Map(stData.map((s) => [s.name, s.id]));

  // Заказы батчами, с корреляцией по порядку RETURNING
  const BATCH = 500;
  let totalOrders = 0, totalStages = 0;
  for (let i = 0; i < data.length; i += BATCH) {
    const slice = data.slice(i, i + BATCH);
    const orderRows = slice.map((r) => {
      const status = (r[9] || "").trim();
      const created = parseDate(r[3]);
      const rec = {
        legacy_num: int(r[0]),
        client_id: clientMap.get(r[1].trim()) ?? null,
        manager_id: r[2]?.trim() ? managerMap.get(r[2].trim()) ?? null : null,
        status: ORDER_STATUSES.has(status) ? status : "Ожидание",
        description: r[7] || null,
        source_link: r[8] || null,
        quantity: int(r[10]),
        width_mm: int(r[11]),
        height_mm: int(r[12]),
        material_id: r[14]?.trim() ? materialMap.get(r[14].trim()) ?? null : null,
        material_available: r[15]?.trim() ? /да/i.test(r[15]) : null,
        print_method: r[16] || null,
        print_equipment: r[16] || null,
        sides: int(r[17]),
        color: r[18] || null,
        file_name: r[19] || null,
        print_link: r[20] || null,
        preview_url: r[21] || null,
        is_urgent: /сроч/i.test(r[5] || ""),
        is_fire: (r[5] || "").includes("🔥"),
        due_date: parseDate(r[4]),
        flag_scotch: TRUE(r[39]),
        flag_vyborka: TRUE(r[40]),
        flag_mount_film: TRUE(r[41]),
        tech_notes: r[42] || null,
        // created_at ставим всегда (в батче колонки должны совпадать, иначе NULL → not-null violation).
        // Нет даты в CSV → текущее время (реальная дата исторического заказа неизвестна).
        created_at: created ? `${created}T12:00:00Z` : new Date().toISOString(),
      };
      return rec;
    });

    const { data: inserted, error } = await sb
      .from("orders")
      .insert(orderRows)
      .select("id");
    if (error) throw new Error(`orders insert @${i}: ${error.message}`);
    totalOrders += inserted.length;

    // Этапы: inserted[j].id соответствует slice[j] (RETURNING в порядке вставки)
    const stageRows = [];
    slice.forEach((r, j) => {
      const orderId = inserted[j].id;
      STAGE_MAP.forEach((st, idx) => {
        if (!stageActive(r, st)) return;
        stageRows.push({
          order_id: orderId,
          stage_type_id: stageTypeMap.get(st.name),
          is_active: true,
          sequence: (idx + 1) * 10,
          status: stageStatus(r, st),
          detail: st.kind === "text" ? (r[st.checks[0]] || "").trim() || null : null,
        });
      });
    });
    if (stageRows.length) {
      for (let k = 0; k < stageRows.length; k += 1000) {
        const { error: sErr } = await sb.from("order_stages").insert(stageRows.slice(k, k + 1000));
        if (sErr) throw new Error(`stages insert @${i}: ${sErr.message}`);
      }
      totalStages += stageRows.length;
    }
    process.stdout.write(`\r  вставлено заказов: ${totalOrders}/${data.length}, этапов: ${totalStages}`);
  }

  console.log("\nГотово.");
  console.log(`Итог: заказов ${totalOrders}, этапов ${totalStages}, клиентов ${clientMap.size}, материалов ${materialMap.size}, менеджеров ${managerMap.size}`);
}

main().catch((e) => { console.error("\nОШИБКА:", e.message); process.exit(1); });
