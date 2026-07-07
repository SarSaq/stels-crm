import { createClient } from "./supabase/server";
import type {
  OrderStatus,
  OrderStage,
  OrderWithRelations,
  StageType,
} from "./database.types";

export type OrderStageWithType = OrderStage & {
  stage_type: Pick<StageType, "id" | "name" | "kind"> | null;
};

// Заказ со связями + этапами — единица строки списка.
export type OrderRowData = OrderWithRelations & {
  stages: OrderStageWithType[];
};

// Выборка для списка: связи + этапы (для инлайн-очереди и статусов).
const ORDER_SELECT = `
  *,
  client:clients(id, name),
  manager:manager_id(id, full_name),
  material:materials(id, name),
  stages:order_stages(*, stage_type:stage_types(id, name, kind))
` as const;

export interface OrdersQuery {
  status?: OrderStatus;
  managerId?: number;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface OrdersPage {
  orders: OrderRowData[];
  total: number;
  page: number;
  pageSize: number;
}

// Этапы приходят в произвольном порядке — сортируем по sequence на клиенте выборки.
function sortStages(order: OrderRowData): OrderRowData {
  order.stages = (order.stages ?? []).sort((a, b) => a.sequence - b.sequence);
  return order;
}

export async function getOrders(params: OrdersQuery = {}): Promise<OrdersPage> {
  const supabase = await createClient();
  const pageSize = params.pageSize ?? 50;
  const page = Math.max(1, params.page ?? 1);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("orders")
    .select(ORDER_SELECT, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (params.status) query = query.eq("status", params.status);
  if (params.managerId) query = query.eq("manager_id", params.managerId);

  if (params.search) {
    const term = params.search.trim();
    // PostgREST or(): подстановочный знак — «*», не «%».
    const like = `*${term.replace(/[*(),]/g, " ")}*`;
    const parts = [`description.ilike.${like}`, `file_name.ilike.${like}`];

    if (/^\d+$/.test(term)) parts.push(`legacy_num.eq.${term}`);

    const { data: cl } = await supabase
      .from("clients")
      .select("id")
      .ilike("name", `%${term}%`)
      .limit(500);
    const ids = (cl ?? []).map((c) => (c as { id: number }).id);
    if (ids.length) parts.push(`client_id.in.(${ids.join(",")})`);

    query = query.or(parts.join(","));
  }

  const { data, count, error } = await query;
  if (error) throw new Error(`getOrders: ${error.message}`);
  const orders = ((data ?? []) as unknown as OrderRowData[]).map(sortStages);
  return { orders, total: count ?? 0, page, pageSize };
}

// --- Справочники для инлайн-редактирования ---

export async function getManagers(): Promise<
  { id: number; full_name: string }[]
> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("users")
    .select("id, full_name")
    .eq("role", "manager")
    .order("full_name");
  if (error) throw new Error(`getManagers: ${error.message}`);
  return (data ?? []) as { id: number; full_name: string }[];
}

export async function getMaterials(): Promise<{ id: number; name: string }[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("materials")
    .select("id, name")
    .order("name");
  if (error) throw new Error(`getMaterials: ${error.message}`);
  return (data ?? []) as { id: number; name: string }[];
}

export async function getClients(): Promise<{ id: number; name: string }[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .select("id, name")
    .order("name");
  if (error) throw new Error(`getClients: ${error.message}`);
  return (data ?? []) as { id: number; name: string }[];
}

// Счётчики по статусам — для чипов-фильтров.
export async function getStatusCounts(): Promise<Record<string, number>> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("orders").select("status");
  if (error) throw new Error(`getStatusCounts: ${error.message}`);

  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    const s = (row as { status: string }).status;
    counts[s] = (counts[s] ?? 0) + 1;
  }
  return counts;
}
