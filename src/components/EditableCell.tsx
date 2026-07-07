"use client";

import { useId, useRef, useState, useTransition } from "react";
import { updateOrderField } from "@/lib/actions";

type Option = { value: string; label: string };
type ComboOption = { id: number; name: string };

type Common = {
  orderId: number;
  field: string;
  label?: string; // подпись-плейсхолдер над/в пустом поле
  className?: string;
};

type Props =
  | (Common & { type: "text" | "number" | "date"; value: string | number | null })
  | (Common & { type: "boolean"; value: boolean | null; boolLabel?: string })
  | (Common & { type: "select"; value: string | number | null; options: Option[] })
  | (Common & { type: "combo"; value: number | null; options: ComboOption[]; display: string | null });

// Инлайн-редактор одного поля заказа. Пишет через updateOrderField (оптимистично).
export function EditableCell(props: Props) {
  const { orderId, field, className } = props;
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState(false);
  const listId = useId();
  const ref = useRef<HTMLInputElement>(null);

  function save(value: unknown, revert?: () => void) {
    setErr(false);
    startTransition(async () => {
      const res = await updateOrderField(orderId, field, value);
      if (!res.ok) {
        setErr(true);
        revert?.();
      }
    });
  }

  const base =
    "w-full bg-transparent rounded px-1 py-0.5 text-sm outline-none border border-transparent hover:border-zinc-200 focus:border-blue-400 focus:bg-white transition";
  const ring = err ? " border-red-400" : pending ? " opacity-60" : "";

  // --- boolean: компактный переключатель ---
  if (props.type === "boolean") {
    const on = !!props.value;
    return (
      <button
        type="button"
        disabled={pending}
        onClick={() => save(!on)}
        title={props.boolLabel ?? props.field}
        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset transition ${
          on
            ? "bg-emerald-100 text-emerald-700 ring-emerald-200"
            : "bg-zinc-100 text-zinc-400 ring-zinc-200 hover:bg-zinc-200"
        } ${className ?? ""}`}
      >
        {props.boolLabel ?? (on ? "Да" : "Нет")}
      </button>
    );
  }

  // --- select: справочник (материал, менеджер) ---
  if (props.type === "select") {
    return (
      <select
        disabled={pending}
        defaultValue={props.value == null ? "" : String(props.value)}
        onChange={(e) => save(e.target.value || null)}
        className={`${base}${ring} cursor-pointer ${className ?? ""}`}
      >
        <option value="">{props.label ?? "—"}</option>
        {props.options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    );
  }

  // --- combo: клиент (автодополнение по имени → id) ---
  if (props.type === "combo") {
    const nameToId = new Map(props.options.map((o) => [o.name, o.id]));
    return (
      <>
        <input
          list={listId}
          disabled={pending}
          defaultValue={props.display ?? ""}
          placeholder={props.label ?? "Клиент"}
          onBlur={(e) => {
            const name = e.target.value.trim();
            const id = name ? nameToId.get(name) : null;
            if (name && id == null) {
              // Неизвестное имя — откат к текущему значению.
              e.target.value = props.display ?? "";
              return;
            }
            if (id !== props.value) save(id ?? null);
          }}
          className={`${base}${ring} ${className ?? ""}`}
        />
        <datalist id={listId}>
          {props.options.map((o) => (
            <option key={o.id} value={o.name} />
          ))}
        </datalist>
      </>
    );
  }

  // --- text / number / date ---
  return (
    <input
      ref={ref}
      type={props.type === "number" ? "number" : props.type === "date" ? "date" : "text"}
      disabled={pending}
      defaultValue={props.value == null ? "" : String(props.value)}
      placeholder={props.label}
      onKeyDown={(e) => {
        if (e.key === "Enter") ref.current?.blur();
        if (e.key === "Escape" && ref.current) {
          ref.current.value = props.value == null ? "" : String(props.value);
          ref.current.blur();
        }
      }}
      onBlur={(e) => {
        const raw = e.target.value;
        if (String(props.value ?? "") === raw) return;
        save(raw === "" ? null : raw);
      }}
      className={`${base}${ring} ${className ?? ""}`}
    />
  );
}
