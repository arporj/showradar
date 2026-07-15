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
          background: "#0c141a",
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
                border: "1px solid rgba(0,240,255,0.08)",
              }}
            />
          ))}
        </div>

        {/* Logo mark */}
        <svg width="96" height="96" viewBox="0 0 512 512">
          <circle cx="256" cy="256" r="164" fill="none" stroke="white" strokeWidth="26" opacity="0.2" />
          <circle cx="256" cy="256" r="116" fill="none" stroke="white" strokeWidth="26" opacity="0.4" />
          <circle cx="256" cy="256" r="68" fill="none" stroke="white" strokeWidth="26" opacity="0.65" />
          <path d="M256 256 L256 92 A164 164 0 0 1 420 256 Z" fill="#00f0ff" opacity="0.9" />
          <circle cx="256" cy="256" r="34" fill="#00f0ff" />
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
            background: "rgba(0,240,255,0.1)",
            border: "1px solid rgba(0,240,255,0.2)",
            borderRadius: 6,
            padding: "8px 20px",
            color: "#00f0ff",
            fontSize: 18,
            fontWeight: 500,
            letterSpacing: "0.08em",
          }}
        >
          GRÁTIS · PWA · pt-BR
        </div>
      </div>
    ),
    { ...size }
  );
}
