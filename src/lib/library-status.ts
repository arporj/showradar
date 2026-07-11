export const LIBRARY_STATUSES = ["plan_to_watch", "watching", "completed", "dropped"] as const;
export type LibraryStatus = (typeof LIBRARY_STATUSES)[number];

export const LIBRARY_STATUS_LABEL: Record<LibraryStatus, string> = {
  plan_to_watch: "Quero assistir",
  watching: "Assistindo",
  completed: "Assistido",
  dropped: "Abandonei",
};

export function isLibraryStatus(value: string | undefined): value is LibraryStatus {
  return !!value && (LIBRARY_STATUSES as readonly string[]).includes(value);
}
