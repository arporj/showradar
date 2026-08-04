export const LIBRARY_STATUSES = ["plan_to_watch", "watching", "completed", "dropped", "on_hold"] as const;
export type LibraryStatus = (typeof LIBRARY_STATUSES)[number];

export const LIBRARY_STATUS_LABEL: Record<LibraryStatus, string> = {
  plan_to_watch: "Quero assistir",
  watching: "Assistindo",
  completed: "Assistido",
  dropped: "Abandonei",
  on_hold: "Pausado",
};

export function isLibraryStatus(value: string | undefined): value is LibraryStatus {
  return !!value && (LIBRARY_STATUSES as readonly string[]).includes(value);
}

// Ordem das seções na grade: o que está ativo agora primeiro (assistindo),
// depois o que vem a seguir (quero assistir), depois o que já terminou
// (assistido), e o resto (pausado/abandonei) por último.
export const LIBRARY_STATUS_SECTION_ORDER: LibraryStatus[] = [
  "watching",
  "plan_to_watch",
  "completed",
  "on_hold",
  "dropped",
];

export const LIBRARY_SECTION_LABEL: Record<LibraryStatus, string> = {
  watching: "Estou Assistindo",
  plan_to_watch: "Quero Assistir",
  completed: "Já Assisti",
  on_hold: "Pausado",
  dropped: "Abandonei",
};
