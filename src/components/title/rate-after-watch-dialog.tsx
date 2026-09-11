"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RatingStars } from "@/components/title/rating-stars";
import { withTimeout } from "@/lib/with-timeout";

// Shown right after the user marks a specific episode or movie as watched —
// entirely optional, closing without picking a star just skips rating (the
// normal rating form on the title/episode page is still there for later).
export function RateAfterWatchDialog({
  open,
  onOpenChange,
  label,
  onRate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  label: string;
  onRate: (rating: number) => Promise<void>;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleRate(rating: number) {
    setIsSubmitting(true);
    try {
      await withTimeout(onRate(rating));
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to submit rating", error);
      toast.error("Não foi possível salvar sua avaliação.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !isSubmitting && onOpenChange(next)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>O que você achou?</DialogTitle>
          <DialogDescription>{label}</DialogDescription>
        </DialogHeader>
        <div className="flex justify-center py-2">
          <RatingStars value={0} onChange={handleRate} disabled={isSubmitting} />
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Agora não
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
