"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

import { trackEvent } from "@/lib/gtag";

// Dispara a conversão de cadastro (evento "sign_up" do gtag) quando o
// dashboard é alcançado pelo redirect pós-cadastro (?signup=credentials, do
// formulário de e-mail/senha, ou ?signup=google, do fim do onboarding) e
// limpa a querystring na sequência — um reload da página não conta duas vezes.
export function SignupConversion() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const fired = useRef(false);

  const method = searchParams.get("signup");

  useEffect(() => {
    if (!method || fired.current) return;
    fired.current = true;
    trackEvent("sign_up", { method });
    router.replace(pathname, { scroll: false });
  }, [method, pathname, router]);

  return null;
}
