import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { IosInstallPrompt } from "@/components/pwa/ios-install-prompt";
import { RegisterServiceWorker } from "@/components/pwa/register-service-worker";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ShowRadar",
  description: "Controle o que você já assistiu, está assistindo e vai assistir.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ShowRadar",
  },
};

export const viewport: Viewport = {
  themeColor: "#0F172A",
  // Sem "cover", env(safe-area-inset-*) é sempre 0 e a BottomNav ficaria
  // atrás da barra de gestos no app instalado (PWA/TWA).
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          {children}
          <Toaster />
          <RegisterServiceWorker />
          <IosInstallPrompt />
        </ThemeProvider>
      </body>
    </html>
  );
}
