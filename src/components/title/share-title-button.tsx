"use client";

import { Check, Link2, Send, Share2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { shareTitleWithFriends } from "@/lib/actions/share";
import type { Friend } from "@/lib/friends";
import type { TmdbMediaType } from "@/lib/tmdb";
import { cn } from "@/lib/utils";

// Compartilhar é a única ação da página que o visitante anônimo pode fazer
// inteira — ele chegou aqui por um link, então passar o link adiante não
// exige conta. Só o envio para um amigo do ShowRadar depende de sessão.
export function ShareTitleButton({
  url,
  name,
  titleId,
  mediaType,
  tmdbId,
  friends,
  signedIn,
}: {
  url: string;
  name: string;
  titleId: string;
  mediaType: TmdbMediaType;
  tmdbId: number;
  friends: Friend[];
  signedIn: boolean;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isSending, startSending] = useTransition();

  async function handleExternalShare() {
    const text = `${name} — no ShowRadar`;
    try {
      // navigator.share só existe em contexto seguro e (no desktop) em poucos
      // navegadores; copiar o link é o fallback universal.
      if (navigator.share) {
        await navigator.share({ title: name, text, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copiado");
      }
    } catch {
      // Cancelar o share nativo não é erro a reportar.
    }
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copiado");
    } catch {
      toast.error("Não foi possível copiar o link.");
    }
  }

  function toggleFriend(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleSendToFriends() {
    const recipientIds = [...selected];
    if (recipientIds.length === 0) return;
    setSelected(new Set());
    startSending(async () => {
      try {
        const { sentTo } = await shareTitleWithFriends({ titleId, mediaType, tmdbId, recipientIds });
        if (sentTo === 0) toast.error("Não foi possível enviar. Tente novamente.");
        else toast.success(sentTo === 1 ? "Recomendação enviada" : `Recomendação enviada para ${sentTo} amigos`);
      } catch {
        toast.error("Não foi possível enviar. Tente novamente.");
      }
    });
  }

  // Sem sessão (ou sem amigos) não há o que escolher: o botão faz direto o
  // compartilhamento externo, sem abrir um menu de uma opção só.
  if (!signedIn || friends.length === 0) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={handleExternalShare}>
        <Share2 className="size-4" /> Compartilhar
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button type="button" variant="outline" size="sm" />}>
        <Share2 className="size-4" /> Compartilhar
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-64">
        <DropdownMenuItem onClick={handleExternalShare}>
          <Share2 /> Enviar link
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleCopyLink}>
          <Link2 /> Copiar link
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Label e itens no mesmo Group: o GroupLabel do Base UI precisa
            estar dentro de um Group, senão o menu inteiro quebra. */}
        <DropdownMenuGroup className="max-h-56 overflow-y-auto">
          <DropdownMenuLabel>Recomendar para um amigo</DropdownMenuLabel>
          {friends.map((friend) => {
            const displayName = friend.name ?? (friend.username ? `@${friend.username}` : "");
            const isSelected = selected.has(friend.id);
            return (
              <DropdownMenuItem
                key={friend.id}
                closeOnClick={false}
                onClick={() => toggleFriend(friend.id)}
                className={cn(isSelected && "bg-accent")}
              >
                <Avatar className="size-6 shrink-0">
                  <AvatarImage src={friend.avatarUrl ?? undefined} alt={displayName} />
                  <AvatarFallback>{displayName.replace("@", "").slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <span className="min-w-0 flex-1 truncate">{displayName}</span>
                {isSelected && <Check className="size-4 shrink-0" />}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuGroup>

        <div className="p-1">
          <Button
            type="button"
            size="sm"
            className="w-full"
            disabled={selected.size === 0 || isSending}
            onClick={handleSendToFriends}
          >
            <Send className="size-4" />
            {isSending ? "Enviando..." : selected.size > 0 ? `Enviar para ${selected.size}` : "Enviar"}
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
