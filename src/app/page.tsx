import { getOrders, getStatusCounts } from "@/lib/queries";
import { OrdersTable } from "@/components/OrdersTable";
import { StatusFilter } from "@/components/StatusFilter";
import type { OrderStatus } from "@/lib/database.types";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const [orders, counts] = await Promise.all([
    getOrders({ status: status as OrderStatus | undefined }),
    getStatusCounts(),
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
        <span className="text-sm text-zinc-400">
          показано: {orders.length}
        </span>
      </header>

      <div className="mb-5">
        <StatusFilter active={status} counts={counts} />
      </div>

      <OrdersTable orders={orders} />
    </main>
  );
}
