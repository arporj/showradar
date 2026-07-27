import { ImageResponse } from "next/og";
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { formatDate } from "@/lib/format-date";
import { getYearStats } from "@/lib/stats";

// Sem `runtime = "edge"` de propósito: ao contrário de app/opengraph-image.tsx
// (estático, sem banco), esta rota precisa de auth() + Drizzle/postgres
// completos, que não rodam no runtime edge deste projeto (ver proxy.ts — a
// separação "edge-safe" existe justamente porque o resto do auth não é).
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const yearParam = request.nextUrl.searchParams.get("year");
  const year = Number(yearParam) || new Date().getUTCFullYear();

  const stats = await getYearStats(session.user.id, year);

  const hours = Math.floor(stats.minutesWatched / 60);
  const minutes = stats.minutesWatched % 60;
  const watchedHoursLabel = minutes > 0 ? `${hours}h${minutes}min` : `${hours}h`;
  const topGenres = stats.topGenres.slice(0, 3).map((g) => g.name);
  const topSeries = stats.topSeries[0]?.name;
  const busiestDay = stats.busiestDay;

  return new ImageResponse(
    (
      <div
        style={{
          background: "#0F172A",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "80px 64px",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {[900, 650, 420].map((size) => (
            <div
              key={size}
              style={{
                position: "absolute",
                width: size,
                height: size,
                borderRadius: "50%",
                border: "1px solid rgba(34,211,238,0.08)",
              }}
            />
          ))}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            flex: 1,
            justifyContent: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <svg width="56" height="56" viewBox="0 0 512 512">
              <circle
                cx="256"
                cy="256"
                r="200"
                fill="none"
                stroke="#64748B"
                strokeWidth="20"
                strokeLinecap="round"
                strokeDasharray="1029.744 226.893"
                transform="rotate(168 256 256)"
              />
              <circle
                cx="256"
                cy="256"
                r="140"
                fill="none"
                stroke="#14B8A6"
                strokeWidth="20"
                strokeLinecap="round"
                strokeDasharray="720.821 158.825"
                transform="rotate(168 256 256)"
              />
              <circle
                cx="256"
                cy="256"
                r="80"
                fill="none"
                stroke="#22D3EE"
                strokeWidth="20"
                strokeLinecap="round"
                strokeDasharray="411.898 90.757"
                transform="rotate(168 256 256)"
              />
              <polygon
                points="211,171 211,341 356,256"
                fill="#22D3EE"
                stroke="#22D3EE"
                strokeWidth="20"
                strokeLinejoin="round"
                transform="rotate(315 256 256)"
              />
              <circle cx="256" cy="256" r="18" fill="#22D3EE" />
              <line x1="256" y1="256" x2="114" y2="398" stroke="#22D3EE" strokeWidth="20" strokeLinecap="round" />
            </svg>
            <div style={{ fontSize: 36, fontWeight: 700, color: "#ffffff", letterSpacing: "-0.03em" }}>ShowRadar</div>
          </div>

          <div
            style={{
              display: "flex",
              marginTop: 24,
              fontSize: 30,
              color: "rgba(219,228,236,0.7)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            {`Retrospectiva ${year}`}
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 96 }}>
            <div style={{ fontSize: 150, fontWeight: 700, color: "#22D3EE", letterSpacing: "-0.04em", lineHeight: 1 }}>
              {watchedHoursLabel}
            </div>
            <div style={{ display: "flex", fontSize: 32, color: "rgba(219,228,236,0.7)", marginTop: 16 }}>
              {`assistidas em ${year}`}
            </div>
          </div>

          <div style={{ display: "flex", gap: 64, marginTop: 96 }}>
            <StatBlock value={String(stats.episodesWatchedCount)} label="episódios" />
            <StatBlock value={String(stats.moviesWatchedCount)} label="filmes" />
            <StatBlock value={String(stats.seriesCompleted.length)} label="séries concluídas" />
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 32,
              marginTop: 96,
              width: "100%",
            }}
          >
            {topGenres.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 16, maxWidth: 900 }}>
                {topGenres.map((name, index) => (
                  <div
                    key={name}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      background: index === 0 ? "rgba(34,211,238,0.14)" : "rgba(148,163,184,0.1)",
                      border: `1px solid ${index === 0 ? "rgba(34,211,238,0.25)" : "rgba(148,163,184,0.18)"}`,
                      borderRadius: 999,
                      padding: "16px 32px",
                      color: index === 0 ? "#22D3EE" : "rgba(219,228,236,0.75)",
                      fontSize: 28,
                      fontWeight: 500,
                    }}
                  >
                    {name}
                  </div>
                ))}
              </div>
            )}
            {topSeries && (
              <div
                style={{
                  display: "flex",
                  fontSize: 28,
                  color: "rgba(219,228,236,0.85)",
                  textAlign: "center",
                  maxWidth: 800,
                }}
              >
                {`Maratona do ano: ${topSeries}`}
              </div>
            )}
            {busiestDay && (
              <div
                style={{
                  display: "flex",
                  fontSize: 26,
                  color: "rgba(219,228,236,0.6)",
                  textAlign: "center",
                  maxWidth: 800,
                }}
              >
                {`Maior maratona em um dia só: ${busiestDay.episodesWatched} episódios em ${formatDate(busiestDay.date)}`}
              </div>
            )}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 22,
            color: "rgba(219,228,236,0.5)",
            letterSpacing: "0.04em",
          }}
        >
          showradar.com.br
        </div>
      </div>
    ),
    { width: 1080, height: 1920 },
  );
}

function StatBlock({ value, label }: { value: string; label: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ fontSize: 56, fontWeight: 700, color: "#ffffff" }}>{value}</div>
      <div style={{ fontSize: 22, color: "rgba(219,228,236,0.6)", marginTop: 4 }}>{label}</div>
    </div>
  );
}
