
import { AuthedShell } from "@/components/layout/authed-shell";
import { PublicShell } from "@/components/layout/public-shell";
import { auth } from "@/lib/auth";

// Grupo de rotas que um visitante anônimo pode abrir: a página de um título
// é compartilhável por link externo, então quem chega sem sessão vê a página
// com o chrome público, e quem já está logado continua vendo o app inteiro
// (mesma URL para os dois — não existe versão "de convidado" separada).
//
// Só `/title/{movie|tv}/{id}` é liberada no proxy; as sub-rotas que moram
// aqui (comentários, página de episódio) seguem exigindo sessão, então
// caem sempre no AuthedShell.
export default async function SharedLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user) return <PublicShell>{children}</PublicShell>;

  return <AuthedShell user={session.user}>{children}</AuthedShell>;
}
