import { TmdbAttribution } from "@/components/layout/tmdb-attribution";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col bg-muted/30">
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-sm">{children}</div>
      </div>
      <footer className="p-6 pt-0">
        <div className="mx-auto max-w-sm">
          <TmdbAttribution />
        </div>
      </footer>
    </div>
  );
}
