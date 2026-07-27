"use client";

import confetti from "canvas-confetti";
import { Download, Share2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format-date";
import type { YearStats } from "@/lib/stats";

function fireConfetti() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  confetti({ particleCount: 140, spread: 100, origin: { y: 0.3 }, startVelocity: 45, colors: ["#22D3EE", "#14B8A6", "#64748B"] });
}

export function RetrospectivaReveal({ year, stats }: { year: number; stats: YearStats }) {
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    fireConfetti();
  }, []);

  const hours = Math.floor(stats.minutesWatched / 60);
  const minutes = stats.minutesWatched % 60;
  const watchedHoursLabel = minutes > 0 ? `${hours}h ${minutes}min` : `${hours}h`;
  const imageUrl = `/api/stats/retrospectiva/image?year=${year}`;

  async function fetchImageFile() {
    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error("Falha ao gerar a imagem da retrospectiva");
    const blob = await response.blob();
    return new File([blob], `showradar-retrospectiva-${year}.png`, { type: "image/png" });
  }

  async function downloadFile(file: File) {
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = file.name;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function handleDownload() {
    setIsBusy(true);
    try {
      const file = await fetchImageFile();
      await downloadFile(file);
    } finally {
      setIsBusy(false);
    }
  }

  async function handleShare() {
    setIsBusy(true);
    try {
      const file = await fetchImageFile();
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Minha retrospectiva ${year} no ShowRadar`,
          // O link vai embutido no texto (não só no campo `url`) porque boa
          // parte dos alvos de share — WhatsApp, Instagram — ignoram `url`
          // quando `files` está presente e só repassam o `text` como legenda.
          text: `Assisti ${watchedHoursLabel} em ${year} — confira minha retrospectiva no ShowRadar! https://www.showradar.com.br`,
          url: "https://www.showradar.com.br",
        });
      } else {
        await downloadFile(file);
      }
    } catch (error) {
      // Usuário cancelou o share sheet — não é um erro real.
      if ((error as { name?: string })?.name !== "AbortError") throw error;
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm space-y-6">
      <div className="animate-in zoom-in-95 fade-in overflow-hidden rounded-3xl border bg-[#0F172A] p-8 text-center text-white shadow-2xl duration-500">
        <p className="text-xs font-medium uppercase tracking-widest text-cyan-300/70">Retrospectiva {year}</p>
        <p className="mt-8 text-6xl font-bold tracking-tight text-cyan-400">{watchedHoursLabel}</p>
        <p className="mt-2 text-sm text-slate-300/70">assistidas em {year}</p>

        <div className="mt-10 grid grid-cols-3 gap-2">
          <MiniStat value={stats.episodesWatchedCount} label="episódios" />
          <MiniStat value={stats.moviesWatchedCount} label="filmes" />
          <MiniStat value={stats.seriesCompleted.length} label="séries" />
        </div>

        {stats.topGenres.length > 0 && (
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            {stats.topGenres.slice(0, 3).map((genre, index) => (
              <span
                key={genre.name}
                className={
                  index === 0
                    ? "rounded-full border border-cyan-400/25 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-300"
                    : "rounded-full border border-slate-400/20 bg-slate-400/10 px-4 py-2 text-sm text-slate-300/80"
                }
              >
                {genre.name}
              </span>
            ))}
          </div>
        )}
        {stats.topSeries[0] && (
          <p className="mt-4 text-sm text-slate-300/80">Maratona do ano: {stats.topSeries[0].name}</p>
        )}
        {stats.busiestDay && (
          <p className="mt-2 text-xs text-slate-400">
            Maior maratona em um dia só: {stats.busiestDay.episodesWatched} episódios em{" "}
            {formatDate(stats.busiestDay.date)}
          </p>
        )}
      </div>

      <div className="flex gap-3">
        <Button variant="outline" className="flex-1" disabled={isBusy} onClick={handleDownload}>
          <Download className="h-4 w-4" />
          Baixar imagem
        </Button>
        <Button className="flex-1" disabled={isBusy} onClick={handleShare}>
          <Share2 className="h-4 w-4" />
          Compartilhar
        </Button>
      </div>
    </div>
  );
}

function MiniStat({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <p className="text-xl font-semibold">{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-slate-400">{label}</p>
    </div>
  );
}
