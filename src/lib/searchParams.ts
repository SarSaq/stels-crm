// Сборка query-строки с сохранением текущих фильтров.
// Пустые значения и page=1 опускаем, чтобы URL были чистыми.

export type Params = {
  q?: string;
  status?: string;
  manager?: string;
  page?: string | number;
};

export function buildQuery(current: Params, patch: Params): string {
  const merged: Params = { ...current, ...patch };
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(merged)) {
    if (value == null || value === "") continue;
    if (key === "page" && String(value) === "1") continue;
    sp.set(key, String(value));
  }
  const s = sp.toString();
  return s ? `/?${s}` : "/";
}
