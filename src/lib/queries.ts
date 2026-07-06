import { createClient } from "./supabase/server";
import type {
  OrderStatus,
  OrderStage,
  OrderWithRelations,
  StageType,
} from "./database.types";

// Выборка для списка заказов с присоединёнными именами клиента/менеджера/материала.
const ORDER_SELECT = `
  *,
  client:clients(id, name),
  manager:manager_id(id, full_name),
  material:materials(id, name)
` as const;

export interface OrdersQuery {
  status?: OrderStatus;
  managerId?: number;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface OrdersPage {
  orders: OrderWithRelations[];
  total: number;
  page: number;
  pageSize: number;
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

    // Поиск по номеру заказа.
    if (/^\d+$/.test(term)) parts.push(`legacy_num.eq.${term}`);

    // Поиск по имени клиента — резолвим id и добавляем client_id.in.(...).
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
  return {
    orders: (data ?? []) as unknown as OrderWithRelations[],
    total: count ?? 0,
    page,
    pageSize,
  };
}

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

// Счётчики по статусам — для шапки/будущего канбана.
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

// Заказы для канбана: только активные (без «Отгружено»/«Отмена»).
export async function getBoardOrders(): Promise<OrderWithRelations[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_SELECT)
    .not("status", "in", '("Отгружено","Отмена")')
    .order("is_fire", { ascending: false })
    .order("is_urgent", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1000);
  if (error) throw new Error(`getBoardOrders: ${error.message}`);
  return (data ?? []) as unknown as OrderWithRelations[];
}

export type OrderStageWithType = OrderStage & {
  stage_type: Pick<StageType, "id" | "name" | "kind"> | null;
};

export interface OrderDetail {
  order: OrderWithRelations;
  stages: OrderStageWithType[];
}

export async function getOrderById(id: number): Promise<OrderDetail | null> {
  const supabase = await createClient();

  const { data: order, error } = await supabase
    .from("orders")
    .select(ORDER_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`getOrderById: ${error.message}`);
  if (!order) return null;

  const { data: stages, error: stErr } = await supabase
    .from("order_stages")
    .select(`*, stage_type:stage_types(id, name, kind)`)
    .eq("order_id", id)
    .order("sequence", { ascending: true });

  if (stErr) throw new Error(`getOrderById.stages: ${stErr.message}`);

  return {
    order: order as unknown as OrderWithRelations,
    stages: (stages ?? []) as unknown as OrderStageWithType[],
  };
}
