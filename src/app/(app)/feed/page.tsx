import { redirect } from "next/navigation";

// "Atividade" virou a aba "Amigos" de /social — mantido só para não quebrar
// links salvos/favoritos que ainda apontam pra cá.
export default function FeedPage() {
  redirect("/social?tab=amigos");
}
