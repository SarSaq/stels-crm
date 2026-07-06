import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrderById } from "@/lib/queries";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDateShort, STAGE_STATUS_META } from "@/lib/status";
import type { OrderStageWithType } from "@/lib/queries";

export const dynamic = "force-dynamic";

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-zinc-400">{label}</dt>
      <dd className="mt-0.5 text-sm text-zinc-800">{value ?? "—"}</dd>
    </div>
  );
}

function StageRow({ stage }: { stage: OrderStageWithType }) {
  const meta = stage.status ? STAGE_STATUS_META[stage.status] : null;
  return (
    <li className="flex items-center justify-between gap-3 border-b border-zinc-100 py-2 last:border-0">
      <div className="flex items-center gap-3">
        <span className="w-6 text-right font-mono text-xs text-zinc-400">
          {stage.sequence}
        </span>
        <span className="text-sm font-medium text-zinc-800">
          {stage.stage_type?.name ?? "?"}
        </span>
        {stage.detail && (
          <span className="text-xs text-zinc-500">({stage.detail})</span>
        )}
      </div>
      {stage.status ? (
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${meta?.className}`}
        >
          {stage.status}
        </span>
      ) : (
        <span className="text-xs text-zinc-400">не начат</span>
      )}
    </li>
  );
}

export default async function OrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const numId = Number(id);
  if (!Number.isInteger(numId)) notFound();

  const detail = await getOrderById(numId);
  if (!detail) notFound();
  const { order, stages } = detail;

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <Link
        href="/"
        className="text-sm text-zinc-500 hover:text-zinc-800"
      >
        ← Все заказы
      </Link>

      <header className="mt-3 flex items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            Заказ №{order.legacy_num ?? order.id}
            {order.is_fire && <span title="Огонь">🔥</span>}
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {order.client?.name ?? "Без клиента"}
          </p>
        </div>
        <StatusBadge status={order.status} />
      </header>

      <section className="mt-6 grid grid-cols-2 gap-x-8 gap-y-4 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm sm:grid-cols-3">
        <Field label="Менеджер" value={order.manager?.full_name} />
        <Field label="Материал" value={order.material?.name} />
        <Field label="Способ печати" value={order.print_method} />
        <Field
          label="Размер"
          value={
            order.width_mm && order.height_mm
              ? `${order.width_mm}×${order.height_mm} мм`
              : null
          }
        />
        <Field label="Кол-во" value={order.quantity} />
        <Field
          label="Площадь"
          value={order.print_area_m2 ? `${order.print_area_m2} м²` : null}
        />
        <Field label="Цветность" value={order.color} />
        <Field label="Стороны" value={order.sides} />
        <Field
          label="Материал на складе"
          value={
            order.material_available == null
              ? null
              : order.material_available
                ? "Да"
                : "Нет"
          }
        />
        <Field label="Создан" value={formatDateShort(order.created_at)} />
        <Field label="Дата сдачи" value={formatDateShort(order.due_date)} />
        <Field label="Файл" value={order.file_name} />
      </section>

      {order.description && (
        <section className="mt-4 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-xs uppercase tracking-wide text-zinc-400">
            Описание
          </h2>
          <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-700">
            {order.description}
          </p>
        </section>
      )}

      <section className="mt-4 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="mb-2 text-sm font-semibold text-zinc-800">
          Этапы производства
        </h2>
        {stages.length === 0 ? (
          <p className="text-sm text-zinc-400">Этапы не заданы.</p>
        ) : (
          <ul>
            {stages.map((s) => (
              <StageRow key={s.id} stage={s} />
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
