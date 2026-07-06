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
  search?: string;
  limit?: number;
}

export async function getOrders(
  params: OrdersQuery = {},
): Promise<OrderWithRelations[]> {
  const supabase = await createClient();
  let query = supabase
    .from("orders")
    .select(ORDER_SELECT)
    .order("created_at", { ascending: false })
    .limit(params.limit ?? 200);

  if (params.status) query = query.eq("status", params.status);
  if (params.search) {
    const term = `%${params.search}%`;
    query = query.or(`description.ilike.${term},file_name.ilike.${term}`);
  }

  const { data, error } = await query;
  if (error) throw new Error(`getOrders: ${error.message}`);
  return (data ?? []) as unknown as OrderWithRelations[];
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
