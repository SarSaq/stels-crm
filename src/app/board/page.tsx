import { getBoardOrders } from "@/lib/queries";
import { KanbanBoard } from "@/components/KanbanBoard";

export const dynamic = "force-dynamic";

export default async function BoardPage() {
  const orders = await getBoardOrders();

  return (
    <main className="mx-auto max-w-[1400px] px-6 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Канбан</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Активные заказы ({orders.length}) — перетащите карточку между колонками,
          чтобы сменить статус
        </p>
      </header>
      <KanbanBoard orders={orders} />
    </main>
  );
}
