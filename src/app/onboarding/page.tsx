import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";

import { OnboardingForm } from "./onboarding-form";

export default async function OnboardingPage() {
  const session = await auth();
  const name = session?.user?.name ?? "";

  return (
    <div className="flex min-h-svh flex-1 items-center justify-center bg-muted/30 p-6">
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader className="items-center text-center">
            <Avatar className="mb-2 size-16">
              <AvatarImage src={session?.user?.avatarUrl ?? undefined} alt={name} />
              <AvatarFallback>{name.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <CardTitle>Falta pouco{name ? `, ${name}` : ""}!</CardTitle>
            <CardDescription>Escolha um nome de usuário para finalizar seu cadastro.</CardDescription>
          </CardHeader>
          <CardContent>
            <OnboardingForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
