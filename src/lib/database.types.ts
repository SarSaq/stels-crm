// Типы БД Stels CRM — вручную по docs/reference/schema.sql.
// Держать в синхроне со схемой; при изменении SQL править здесь же.

export type OrderStatus =
  | "Ожидание"
  | "Проверка"
  | "В работе"
  | "В процессе"
  | "Постпресс"
  | "Инженер"
  | "Макетка"
  | "ОТК"
  | "Готово"
  | "Монтаж"
  | "Отгружено"
  | "Отмена";

export type StageStatus = "В работе" | "В процессе" | "Выполнено";

export type UserRole =
  | "manager"
  | "prepress"
  | "production"
  | "qc"
  | "director"
  | "engineer"
  | "installer"
  | "assembler";

export type StageKind = "checkbox" | "text";

export interface Client {
  id: number;
  name: string;
  created_at: string;
}

export interface Material {
  id: number;
  name: string;
  is_active: boolean;
}

export interface User {
  id: number;
  auth_id: string | null;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface StageType {
  id: number;
  name: string;
  kind: StageKind;
  sort_order: number;
}

export interface ReferenceValue {
  id: number;
  category: string;
  value: string;
  sort_order: number;
}

export interface Order {
  id: number;
  legacy_num: number | null;
  client_id: number | null;
  manager_id: number | null;
  owner_id: number | null;
  status: OrderStatus;
  description: string | null;
  source_link: string | null;
  quantity: number | null;
  width_mm: number | null;
  height_mm: number | null;
  print_area_m2: number | null;
  material_id: number | null;
  material_available: boolean | null;
  print_method: string | null;
  print_equipment: string | null;
  sides: number | null;
  color: string | null;
  file_name: string | null;
  print_link: string | null;
  preview_url: string | null;
  is_urgent: boolean;
  is_fire: boolean;
  due_date: string | null;
  flag_scotch: boolean;
  flag_vyborka: boolean;
  flag_mount_film: boolean;
  tech_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderStage {
  id: number;
  order_id: number;
  stage_type_id: number;
  is_active: boolean;
  sequence: number;
  status: StageStatus | null;
  detail: string | null;
  assignee_id: number | null;
  started_at: string | null;
  done_at: string | null;
}

export interface OrderHistory {
  id: number;
  order_id: number;
  user_id: number | null;
  field: string;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
}

// Заказ с присоединёнными справочными именами — для списков/карточек.
export interface OrderWithRelations extends Order {
  client: Pick<Client, "id" | "name"> | null;
  manager: Pick<User, "id" | "full_name"> | null;
  material: Pick<Material, "id" | "name"> | null;
}
