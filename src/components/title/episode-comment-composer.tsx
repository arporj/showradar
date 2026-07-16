"use client";

import { X } from "lucide-react";
import { useRef, useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RatingStars } from "@/components/title/rating-stars";
import type { EpisodeComment } from "@/lib/episode-comments";
import type { Friend } from "@/lib/friends";

// Looks for an unfinished "@fragment" ending exactly at the caret — used to
// decide whether to show the mention dropdown and what to filter it by.
function mentionFragmentAt(text: string, caret: number) {
  const upToCaret = text.slice(0, caret);
  const match = upToCaret.match(/@([a-z0-9_]*)$/i);
  return match ? { start: caret - match[0].length, query: match[1].toLowerCase() } : null;
}

export function EpisodeCommentComposer({
  friends,
  replyTarget,
  onCancelReply,
  onSubmit,
}: {
  friends: Friend[];
  replyTarget: EpisodeComment | null;
  onCancelReply: () => void;
  onSubmit: (input: { body: string; rating: number | null; replyToId: string | null }) => void;
}) {
  const [body, setBody] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [mention, setMention] = useState<{ start: number; query: string } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const matches = mention
    ? friends.filter((f) => f.username?.toLowerCase().startsWith(mention.query)).slice(0, 5)
    : [];

  function handleChange(value: string) {
    setBody(value);
    const caret = textareaRef.current?.selectionStart ?? value.length;
    setMention(mentionFragmentAt(value, caret));
  }

  function pickMention(friend: Friend) {
    if (!mention || !friend.username) return;
    const caret = textareaRef.current?.selectionStart ?? body.length;
    const next = `${body.slice(0, mention.start)}@${friend.username} ${body.slice(caret)}`;
    setBody(next);
    setMention(null);
    textareaRef.current?.focus();
  }

  function handleSubmit() {
    const trimmed = body.trim();
    if (!trimmed) return;
    onSubmit({ body: trimmed, rating, replyToId: replyTarget?.id ?? null });
    setBody("");
    setRating(null);
  }

  return (
    <div className="space-y-2 rounded-lg border p-3">
      {replyTarget && (
        <div className="flex items-center justify-between rounded-md bg-muted/50 px-2 py-1 text-xs text-muted-foreground">
          <span>
            Respondendo a <span className="font-medium">{replyTarget.name ?? replyTarget.username}</span>
          </span>
          <button type="button" onClick={onCancelReply} aria-label="Cancelar resposta">
            <X className="size-3.5" />
          </button>
        </div>
      )}

      <RatingStars value={rating ?? 0} onChange={setRating} size="sm" />

      <div className="relative">
        <Textarea
          ref={textareaRef}
          placeholder="Escreva um comentário… use @ para mencionar um amigo"
          value={body}
          onChange={(e) => handleChange(e.target.value)}
        />
        {mention && matches.length > 0 && (
          <div className="absolute z-10 mt-1 w-full rounded-md border bg-popover p-1 shadow-md">
            {matches.map((friend) => (
              <button
                key={friend.id}
                type="button"
                onClick={() => pickMention(friend)}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-muted"
              >
                <Avatar className="size-6">
                  <AvatarImage src={friend.avatarUrl ?? undefined} alt="" />
                  <AvatarFallback>{(friend.name ?? friend.username ?? "").slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <span>{friend.name ?? friend.username}</span>
                <span className="text-muted-foreground">@{friend.username}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <Button type="button" size="sm" disabled={!body.trim()} onClick={handleSubmit}>
        Comentar
      </Button>
    </div>
  );
}
