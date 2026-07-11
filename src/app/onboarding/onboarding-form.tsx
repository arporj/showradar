"use client";

import { useActionState } from "react";

import { setUsernameAction } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function OnboardingForm() {
  const [state, formAction, isPending] = useActionState(setUsernameAction, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="username">Nome de usuário</Label>
        <Input
          id="username"
          name="username"
          autoComplete="username"
          placeholder="digite aqui o seu nome de usuário"
          required
          autoFocus
        />
        <p className="text-xs text-muted-foreground">
          Letras minúsculas, números e underscore. É como outras pessoas vão te encontrar.
        </p>
      </div>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Salvando..." : "Continuar"}
      </Button>
    </form>
  );
}
