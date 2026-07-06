import Link from "next/link";
import { ORDER_STATUSES } from "@/lib/status";
import { buildQuery, type Params } from "@/lib/searchParams";

// Панель фильтров: поиск + менеджер (GET-форма) и чипы статусов (ссылки).
export function Filters({
  current,
  counts,
  managers,
}: {
  current: Params;
  counts: Record<string, number>;
  managers: { id: number; full_name: string }[];
}) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  const chip = (label: string, count: number, href: string, on: boolean) => (
    <Link
      key={label}
      href={href}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition ${
        on
          ? "bg-zinc-900 text-white"
          : "bg-white text-zinc-600 ring-1 ring-inset ring-zinc-200 hover:bg-zinc-50"
      }`}
    >
      {label}
      <span className={on ? "text-zinc-300" : "text-zinc-400"}>{count}</span>
    </Link>
  );

  return (
    <div className="space-y-3">
      {/* Поиск + менеджер: GET-форма, сбрасывает страницу на 1 */}
      <form method="GET" action="/" className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          name="q"
          defaultValue={current.q ?? ""}
          placeholder="Поиск: клиент, описание, файл, №…"
          className="h-9 w-72 rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"
        />
        <select
          name="manager"
          defaultValue={current.manager ?? ""}
          className="h-9 rounded-md border border-zinc-300 bg-white px-2 text-sm outline-none focus:border-zinc-400"
        >
          <option value="">Все менеджеры</option>
          {managers.map((m) => (
            <option key={m.id} value={m.id}>
              {m.full_name}
            </option>
          ))}
        </select>
        {current.status && (
          <input type="hidden" name="status" value={current.status} />
        )}
        <button
          type="submit"
          className="h-9 rounded-md bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800"
        >
          Найти
        </button>
        {(current.q || current.manager || current.status) && (
          <Link
            href="/"
            className="h-9 rounded-md px-3 text-sm leading-9 text-zinc-500 hover:text-zinc-800"
          >
            Сбросить
          </Link>
        )}
      </form>

      {/* Статусы: ссылки, сохраняют q и manager, сбрасывают page */}
      <div className="flex flex-wrap gap-2">
        {chip(
          "Все",
          total,
          buildQuery(current, { status: undefined, page: undefined }),
          !current.status,
        )}
        {ORDER_STATUSES.filter((s) => counts[s]).map((s) =>
          chip(
            s,
            counts[s] ?? 0,
            buildQuery(current, { status: s, page: undefined }),
            current.status === s,
          ),
        )}
      </div>
    </div>
  );
}
