import Link from "next/link";

// Menus dentro da aba "Séries" do admin.
const SERIES_SUB_TABS = [
  { href: "/admin/titles", label: "Mais adicionados" },
  { href: "/admin/titles/datas", label: "Data de lançamento" },
] as const;

export function AdminSeriesSubTabs({ active }: { active: (typeof SERIES_SUB_TABS)[number]["href"] }) {
  return (
    <nav aria-label="Menus de séries" className="flex flex-wrap gap-2">
      {SERIES_SUB_TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          aria-current={active === tab.href ? "page" : undefined}
          className={`inline-flex min-h-9 items-center rounded-full border px-3 text-sm font-medium transition-colors ${
            active === tab.href
              ? "border-foreground bg-foreground text-background"
              : "border-border text-muted-foreground hover:text-foreground"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
