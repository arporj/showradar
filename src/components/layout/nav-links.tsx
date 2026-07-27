import {
  Activity,
  BarChart3,
  CalendarClock,
  History,
  House,
  LayoutGrid,
  ListChecks,
  Search,
  Settings,
  Shield,
  UserPlus,
  Users,
} from "lucide-react";

export type NavLink = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

// Destinos principais, em ordem de prioridade: no desktop todos aparecem no
// header; no mobile os BOTTOM_TAB_COUNT primeiros viram abas da barra
// inferior e o restante entra no menu "Mais".
export const MAIN_LINKS: NavLink[] = [
  { href: "/dashboard", label: "Início", icon: House },
  { href: "/search", label: "Buscar", icon: Search },
  { href: "/library", label: "Minha Grade", icon: LayoutGrid },
  { href: "/feed", label: "Atividade", icon: Activity },
  { href: "/upcoming", label: "Em breve", icon: CalendarClock },
  { href: "/history", label: "Histórico", icon: History },
  { href: "/friends", label: "Amigos", icon: Users },
  { href: "/stats", label: "Estatísticas", icon: BarChart3 },
  { href: "/lists", label: "Listas", icon: ListChecks },
];

export const BOTTOM_TAB_COUNT = 4;

// Itens ligados à conta — vivem no dropdown do avatar em todas as larguras.
export function accountLinks(isAdmin: boolean): NavLink[] {
  return [
    { href: "/follow-requests", label: "Solicitações", icon: UserPlus },
    { href: "/settings", label: "Configurações", icon: Settings },
    ...(isAdmin ? [{ href: "/admin", label: "Admin", icon: Shield }] : []),
  ];
}

export function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}
