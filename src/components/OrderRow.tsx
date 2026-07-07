import { EditableCell } from "./EditableCell";
import { PreviewThumb } from "./PreviewThumb";
import { StageSequence } from "./StageSequence";
import { OrderStatusControl } from "./OrderStatusControl";
import { formatDateShort } from "@/lib/status";
import type { OrderRowData } from "@/lib/queries";

// Подпись + контрол в компактной ячейке. Ширина задаётся снаружи.
function Cell({
  label,
  children,
  width,
}: {
  label: string;
  children: React.ReactNode;
  width?: string;
}) {
  return (
    <div className={`flex flex-col ${width ?? ""}`}>
      <span className="px-1 text-[10px] uppercase tracking-wide text-zinc-400">
        {label}
      </span>
      {children}
    </div>
  );
}

export function OrderRow({
  order,
  managers,
  materials,
  clients,
}: {
  order: OrderRowData;
  managers: { id: number; full_name: string }[];
  materials: { id: number; name: string }[];
  clients: { id: number; name: string }[];
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2 shadow-sm">
      {/* СТРОКА 1: № · приоритет · превью · заказчик · добавил · даты · статус */}
      <div className="flex items-center gap-3">
        <div className="flex w-14 shrink-0 flex-col items-center">
          <span className="font-mono text-sm font-semibold text-zinc-700">
            {order.legacy_num ?? order.id}
          </span>
          <div className="mt-0.5 flex gap-0.5">
            <EditableCell
              orderId={order.id}
              field="is_fire"
              type="boolean"
              value={order.is_fire}
              boolLabel="🔥"
            />
          </div>
        </div>

        <PreviewThumb url={order.preview_url} alt={`Превью №${order.legacy_num ?? order.id}`} />

        <Cell label="Заказчик" width="w-52">
          <EditableCell
            orderId={order.id}
            field="client_id"
            type="combo"
            value={order.client_id}
            display={order.client?.name ?? null}
            options={clients.map((c) => ({ id: c.id, name: c.name }))}
          />
        </Cell>

        <Cell label="Добавил" width="w-32">
          <EditableCell
            orderId={order.id}
            field="manager_id"
            type="select"
            value={order.manager_id}
            options={managers.map((m) => ({ value: String(m.id), label: m.full_name }))}
          />
        </Cell>

        <Cell label="Создан" width="w-20">
          <span className="px-1 py-0.5 text-sm text-zinc-500">
            {formatDateShort(order.created_at)}
          </span>
        </Cell>

        <Cell label="Сдача" width="w-32">
          <EditableCell
            orderId={order.id}
            field="due_date"
            type="date"
            value={order.due_date}
          />
        </Cell>

        <Cell label="Срочно" width="w-16">
          <EditableCell
            orderId={order.id}
            field="is_urgent"
            type="boolean"
            value={order.is_urgent}
            boolLabel={order.is_urgent ? "Срочно" : "—"}
          />
        </Cell>

        <div className="ml-auto flex flex-col items-end">
          <span className="px-1 text-[10px] uppercase tracking-wide text-zinc-400">
            Статус
          </span>
          <OrderStatusControl orderId={order.id} status={order.status} />
        </div>
      </div>

      {/* СТРОКА 2: описание · материал · наличие · печать · размеры · этапы */}
      <div className="mt-1.5 flex flex-wrap items-start gap-x-3 gap-y-1 border-t border-zinc-100 pt-1.5">
        <Cell label="Описание" width="w-64">
          <EditableCell
            orderId={order.id}
            field="description"
            type="text"
            value={order.description}
            label="—"
          />
        </Cell>

        <Cell label="Материал" width="w-40">
          <EditableCell
            orderId={order.id}
            field="material_id"
            type="select"
            value={order.material_id}
            options={materials.map((m) => ({ value: String(m.id), label: m.name }))}
          />
        </Cell>

        <Cell label="Наличие" width="w-16">
          <EditableCell
            orderId={order.id}
            field="material_available"
            type="boolean"
            value={order.material_available}
            boolLabel={
              order.material_available == null
                ? "?"
                : order.material_available
                  ? "Да"
                  : "Нет"
            }
          />
        </Cell>

        <Cell label="Печать" width="w-28">
          <EditableCell
            orderId={order.id}
            field="print_method"
            type="text"
            value={order.print_method}
            label="—"
          />
        </Cell>

        <Cell label="Кол-во" width="w-16">
          <EditableCell
            orderId={order.id}
            field="quantity"
            type="number"
            value={order.quantity}
          />
        </Cell>

        <Cell label="Ширина" width="w-16">
          <EditableCell
            orderId={order.id}
            field="width_mm"
            type="number"
            value={order.width_mm}
          />
        </Cell>

        <Cell label="Высота" width="w-16">
          <EditableCell
            orderId={order.id}
            field="height_mm"
            type="number"
            value={order.height_mm}
          />
        </Cell>

        <Cell label="Площадь м²" width="w-20">
          <span className="px-1 py-0.5 text-sm tabular-nums text-zinc-500">
            {order.print_area_m2 ?? "—"}
          </span>
        </Cell>

        <Cell label="Стор." width="w-12">
          <EditableCell
            orderId={order.id}
            field="sides"
            type="number"
            value={order.sides}
          />
        </Cell>

        <Cell label="Цвет" width="w-24">
          <EditableCell
            orderId={order.id}
            field="color"
            type="text"
            value={order.color}
            label="—"
          />
        </Cell>

        <Cell label="Файл" width="w-32">
          <EditableCell
            orderId={order.id}
            field="file_name"
            type="text"
            value={order.file_name}
            label="—"
          />
        </Cell>

        <Cell label="Этапы (перетащить · клик — статус)">
          <div className="pt-0.5">
            <StageSequence orderId={order.id} stages={order.stages} />
          </div>
        </Cell>
      </div>
    </div>
  );
}
