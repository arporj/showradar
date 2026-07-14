import Link from "next/link";

const ADMIN_TABS = [
  { href: "/admin", label: "Usuários" },
  { href: "/admin/titles", label: "Séries" },
] as const;

export function AdminTabs({ active }: { active: (typeof ADMIN_TABS)[number]["href"] }) {
  return (
    <div className="flex gap-4 border-b">
      {ADMIN_TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={`border-b-2 px-1 pb-2 text-sm font-medium transition-colors ${
            active === tab.href
              ? "border-foreground text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
