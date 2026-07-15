import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "ShowRadar — suas séries e filmes sob controle";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
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
          justifyContent: "center",
          gap: 32,
          fontFamily: "sans-serif",
        }}
      >
        {/* Radar decoration rings (aria-hidden equivalent — decorative only) */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {[520, 380, 240].map((size) => (
            <div
              key={size}
              style={{
                position: "absolute",
                width: size,
                height: size,
                borderRadius: "50%",
                border: "1px solid rgba(34,211,238,0.1)",
              }}
            />
          ))}
        </div>

        {/* Logo mark — arte oficial "opção 3" (components/layout/logo.tsx) */}
        <svg width="110" height="110" viewBox="0 0 512 512">
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

        {/* Wordmark */}
        <div
          style={{
            fontSize: 72,
            fontWeight: 700,
            color: "#ffffff",
            letterSpacing: "-0.04em",
            lineHeight: 1,
          }}
        >
          ShowRadar
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 28,
            color: "rgba(219,228,236,0.7)",
            letterSpacing: "-0.01em",
            textAlign: "center",
            maxWidth: 800,
          }}
        >
          Suas séries e filmes sob controle — grátis, feito para o Brasil
        </div>

        {/* Badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "rgba(34,211,238,0.1)",
            border: "1px solid rgba(34,211,238,0.2)",
            borderRadius: 6,
            padding: "8px 20px",
            color: "#22D3EE",
            fontSize: 18,
            fontWeight: 500,
            letterSpacing: "0.08em",
          }}
        >
          GRÁTIS · INSTALE PELO SITE · pt-BR
        </div>
      </div>
    ),
    { ...size }
  );
}
