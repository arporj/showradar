"use client";

import { LogOut } from "lucide-react";
import Link from "next/link";
import { useTransition } from "react";

import { accountLinks } from "@/components/layout/nav-links";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { clearOfflinePageCacheOnSignOut } from "@/lib/offline/page-cache";

// Dropdown do avatar com os itens de conta e o "Sair". O sign-out limpa o
// cache offline antes de submeter, pela mesma razão do SignOutForm.
export function UserMenu({
  name,
  username,
  avatarUrl,
  isAdmin,
  pendingRequests,
  signOutAction,
}: {
  name: string;
  username: string;
  avatarUrl: string | null;
  isAdmin: boolean;
  pendingRequests: number;
  signOutAction: () => Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();

  function handleSignOut() {
    startTransition(async () => {
      await clearOfflinePageCacheOnSignOut();
      await signOutAction();
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            aria-label="Abrir menu da conta"
            className="relative rounded-full outline-none ring-ring focus-visible:ring-2"
          />
        }
      >
        <Avatar className="size-8">
          <AvatarImage src={avatarUrl ?? undefined} alt={name} />
          <AvatarFallback>{name.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        {pendingRequests > 0 && (
          <span
            aria-label={`${pendingRequests} solicitações pendentes`}
            className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] leading-none font-semibold text-white"
          >
            {pendingRequests > 9 ? "9+" : pendingRequests}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-52">
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            <span className="block truncate text-sm text-foreground">{name}</span>
            <span className="block truncate font-normal">@{username}</span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        {accountLinks(isAdmin).map((link) => (
          <DropdownMenuItem key={link.href} render={<Link href={link.href} />}>
            <link.icon /> {link.label}
            {link.href === "/follow-requests" && pendingRequests > 0 && (
              <span className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] leading-none font-semibold text-white">
                {pendingRequests}
              </span>
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" disabled={isPending} onClick={handleSignOut}>
          <LogOut /> Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
