import Link from "next/link";
import { buildQuery, type Params } from "@/lib/searchParams";

export function Pagination({
  current,
  page,
  pageSize,
  total,
}: {
  current: Params;
  page: number;
  pageSize: number;
  total: number;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  const link = (p: number, label: string, disabled: boolean) =>
    disabled ? (
      <span className="rounded-md px-3 py-1.5 text-sm text-zinc-300">
        {label}
      </span>
    ) : (
      <Link
        href={buildQuery(current, { page: p })}
        className="rounded-md px-3 py-1.5 text-sm text-zinc-600 ring-1 ring-inset ring-zinc-200 hover:bg-zinc-50"
      >
        {label}
      </Link>
    );

  return (
    <div className="mt-4 flex items-center justify-between">
      <span className="text-sm text-zinc-500">
        {from}–{to} из {total}
      </span>
      <div className="flex items-center gap-1.5">
        {link(page - 1, "← Назад", page <= 1)}
        <span className="px-2 text-sm text-zinc-500">
          стр. {page} / {pages}
        </span>
        {link(page + 1, "Вперёд →", page >= pages)}
      </div>
    </div>
  );
}
