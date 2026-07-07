"use client";

import { useState } from "react";

// Cloudinary: вставляем трансформацию для лёгкой миниатюры (экономия трафика).
function cloudinaryThumb(url: string, size: number): string {
  if (!url.includes("res.cloudinary.com") || !url.includes("/upload/")) {
    return url;
  }
  return url.replace(
    "/upload/",
    `/upload/w_${size},h_${size},c_fill,q_auto,f_auto/`,
  );
}

export function PreviewThumb({
  url,
  alt,
}: {
  url: string | null;
  alt: string;
}) {
  const [open, setOpen] = useState(false);

  if (!url) {
    return (
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-dashed border-zinc-200 text-[9px] text-zinc-300">
        нет
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="h-11 w-11 shrink-0 overflow-hidden rounded-md border border-zinc-200 bg-zinc-50 hover:ring-2 hover:ring-blue-300"
        title="Увеличить"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={cloudinaryThumb(url, 88)}
          alt={alt}
          loading="lazy"
          className="h-full w-full object-cover"
        />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6"
          onClick={() => setOpen(false)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={cloudinaryThumb(url, 900)}
            alt={alt}
            className="max-h-full max-w-full rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
