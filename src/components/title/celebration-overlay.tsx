"use client";

import confetti from "canvas-confetti";
import { PartyPopper, X } from "lucide-react";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";

const AUTO_DISMISS_MS = 7000;

function fireConfetti() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const colors = ["#f43f5e", "#f59e0b", "#22c55e", "#3b82f6", "#a855f7"];
  const end = Date.now() + 1800;

  (function frame() {
    confetti({ particleCount: 3, angle: 60, spread: 60, origin: { x: 0 }, colors });
    confetti({ particleCount: 3, angle: 120, spread: 60, origin: { x: 1 }, colors });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();

  confetti({ particleCount: 120, spread: 100, origin: { y: 0.4 }, startVelocity: 45, colors });
}

export function CelebrationOverlay({
  show,
  title,
  description,
  onClose,
}: {
  show: boolean;
  title: string;
  description: string;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!show) return;

    fireConfetti();
    const timeout = setTimeout(onClose, AUTO_DISMISS_MS);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show]);

  if (!show) return null;

  return (
    <div
      className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm duration-300"
      onClick={onClose}
    >
      <div
        className="animate-in zoom-in-95 fade-in relative max-w-sm space-y-4 rounded-3xl border bg-card p-8 text-center shadow-2xl duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="absolute right-3 top-3"
          onClick={onClose}
          aria-label="Fechar"
        >
          <X className="size-4" />
        </Button>

        <div className="animate-celebration-float mx-auto flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
          <PartyPopper className="size-8" />
        </div>

        <div className="space-y-1">
          <h2 className="text-xl font-bold tracking-tight">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>

        <Button type="button" className="w-full" onClick={onClose}>
          Continuar
        </Button>
      </div>
    </div>
  );
}
