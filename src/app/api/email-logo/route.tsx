import { ImageResponse } from "next/og";

export const runtime = "edge";

// Lockup horizontal do logo (ver components/layout/logo.tsx), fundo
// transparente de propósito: fica embutido no cabeçalho escuro do e-mail
// (src/lib/email.ts) via <img>, sem depender de SVG inline no HTML do e-mail
// — a maioria dos clientes de e-mail (Outlook, Gmail) não renderiza SVG.
export async function GET() {
  return new ImageResponse(
    (
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <svg width="48" height="48" viewBox="0 0 512 512">
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
        <div style={{ fontSize: 34, fontWeight: 700, color: "#ffffff", letterSpacing: "-0.03em" }}>ShowRadar</div>
      </div>
    ),
    { width: 320, height: 72 },
  );
}
