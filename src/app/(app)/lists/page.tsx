import { redirect } from "next/navigation";

import { CreateListForm } from "@/components/lists/create-list-form";
import { ListCard } from "@/components/lists/list-card";
import { auth } from "@/lib/auth";
import { getUserListsWithCounts } from "@/lib/lists";

export const metadata = { title: "Minhas listas" };

export default async function ListsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userLists = await getUserListsWithCounts(session.user.id);
  const username = session.user.username ?? "";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Minhas listas</h1>
        <p className="text-sm text-muted-foreground">
          Crie coleções de títulos e compartilhe. Cada lista pode ser privada, só por link ou pública (indexada no
          Google).
        </p>
      </div>

      <CreateListForm />

      <div className="grid gap-4 sm:grid-cols-2">
        {userLists.map((list) => (
          <ListCard key={list.id} list={list} username={username} />
        ))}
      </div>
    </div>
  );
}
