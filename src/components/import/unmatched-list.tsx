"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { cn } from "@/lib/utils";

export function UnmatchedList({ items }: { items: { id: string; rawTitle: string }[] }) {
  const [open, setOpen] = useState(false);

  if (items.length === 0) return null;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        aria-expanded={open}
      >
        <ChevronDown className={cn("size-3.5 shrink-0 transition-transform", open && "rotate-180")} />
        {open ? "Ocultar não encontrados" : `Ver ${items.length} não encontrados`}
      </button>

      {open && (
        <ul className="mt-2 space-y-1 border-l pl-3">
          {items.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-2 text-sm">
              <span className="truncate">{item.rawTitle}</span>
              <Link
                href={`/search?q=${encodeURIComponent(item.rawTitle)}`}
                className="shrink-0 text-xs underline underline-offset-4"
              >
                Buscar
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
