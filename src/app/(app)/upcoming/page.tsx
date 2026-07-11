import { UpcomingRow } from "@/components/library/upcoming-row";
import { auth } from "@/lib/auth";
import { getUpcomingItems } from "@/lib/upcoming";

export default async function UpcomingPage() {
  const session = await auth();
  if (!session?.user) return null;

  const items = await getUpcomingItems(session.user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Em breve</h1>
        <p className="text-muted-foreground">
          Lançamentos e novos episódios da sua grade, do mais próximo ao mais distante.
        </p>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nada previsto por enquanto. Assim que a TMDb anunciar uma data para algo da sua grade, aparece aqui.
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <UpcomingRow key={item.key} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
