"use client";

import { Share2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export function ShareListButton({ url, title }: { url: string; title: string }) {
  const [isBusy, setIsBusy] = useState(false);

  async function handleShare() {
    setIsBusy(true);
    try {
      if (navigator.share) {
        await navigator.share({ title, text: `${title} — confira essa lista no ShowRadar!`, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copiado");
      }
    } catch {
      // Cancelamento do share nativo pelo usuário não é um erro a reportar.
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={handleShare} disabled={isBusy}>
      <Share2 /> Compartilhar
    </Button>
  );
}
