import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { GoogleIcon } from "@/components/icons/google-icon";
import { signIn } from "@/lib/auth";

import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Entrar</CardTitle>
        <CardDescription>Acesse sua grade de séries e filmes.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: callbackUrl?.startsWith("/") ? callbackUrl : "/dashboard" });
          }}
        >
          <Button type="submit" variant="outline" className="w-full">
            <GoogleIcon className="size-4" />
            Continuar com Google
          </Button>
        </form>

        <div className="flex items-center gap-3">
          <Separator className="flex-1" />
          <span className="text-xs text-muted-foreground">ou</span>
          <Separator className="flex-1" />
        </div>

        <LoginForm callbackUrl={callbackUrl} />
      </CardContent>
    </Card>
  );
}
