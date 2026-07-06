import { getOrders, getStatusCounts, getManagers } from "@/lib/queries";
import { OrdersTable } from "@/components/OrdersTable";
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

  const [{ orders, total }, counts, managers] = await Promise.all([
    getOrders({
      status: sp.status as OrderStatus | undefined,
      managerId: Number.isFinite(managerId) ? managerId : undefined,
      search: sp.q,
      page,
      pageSize: PAGE_SIZE,
    }),
    getStatusCounts(),
    getManagers(),
  ]);

  return (
    <main className="mx-auto max-w-[1400px] px-6 py-8">
      <header className="mb-6 flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Заказы</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Stels CRM — производство широкоформатной печати
          </p>
        </div>
        <span className="text-sm text-zinc-400">всего: {total}</span>
      </header>

      <div className="mb-5">
        <Filters current={current} counts={counts} managers={managers} />
      </div>

      <OrdersTable orders={orders} />

      <Pagination
        current={current}
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
      />
    </main>
  );
}
