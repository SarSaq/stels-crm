import Link from "next/link";

export function Nav() {
  return (
    <nav className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-[1400px] items-center gap-1 px-6">
        <span className="mr-4 py-3 text-sm font-semibold tracking-tight">
          Stels<span className="text-blue-600">CRM</span>
        </span>
        <Link
          href="/"
          className="rounded-md px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100"
        >
          Список
        </Link>
        <Link
          href="/board"
          className="rounded-md px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100"
        >
          Канбан
        </Link>
      </div>
    </nav>
  );
}
