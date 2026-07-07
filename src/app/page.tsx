import {
  getOrders,
  getStatusCounts,
  getManagers,
  getMaterials,
  getClients,
} from "@/lib/queries";
import { OrderRow } from "@/components/OrderRow";
import { Filters } from "@/components/Filters";
import { Pagination } from "@/components/Pagination";
import type { OrderStatus } from "@/lib/database.types";
import type { Params } from "@/lib/searchParams";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    manager?: string;
    page?: string;
  }>;
}) {
  const sp = await searchParams;
  const current: Params = {
    q: sp.q,
    status: sp.status,
    manager: sp.manager,
    page: sp.page,
  };

  const page = Math.max(1, Number(sp.page) || 1);
  const managerId = sp.manager ? Number(sp.manager) : undefined;

  const [{ orders, total }, counts, managers, materials, clients] =
    await Promise.all([
      getOrders({
        status: sp.status as OrderStatus | undefined,
        managerId: Number.isFinite(managerId) ? managerId : undefined,
        search: sp.q,
        page,
        pageSize: PAGE_SIZE,
      }),
      getStatusCounts(),
      getManagers(),
      getMaterials(),
      getClients(),
    ]);

  return (
    <main className="mx-auto max-w-[1600px] px-6 py-6">
      <header className="mb-5 flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Заказы</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Stels CRM — производство широкоформатной печати
          </p>
        </div>
        <span className="text-sm text-zinc-400">всего: {total}</span>
      </header>

      <div className="mb-4">
        <Filters current={current} counts={counts} managers={managers} />
      </div>

      {orders.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-10 text-center text-sm text-zinc-500">
          Заказы не найдены.
        </div>
      ) : (
        <div className="space-y-2">
          {orders.map((o) => (
            <OrderRow
              key={o.id}
              order={o}
              managers={managers}
              materials={materials}
              clients={clients}
            />
          ))}
        </div>
      )}

      <Pagination
        current={current}
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
      />
    </main>
  );
}
