export type NotificationType = "new_episode" | "new_season" | "new_movie_release";

export interface ReleaseNotificationInput {
  name: string;
  notificationType: NotificationType;
  episodeLabel: string | null;
  episodeName: string | null;
}

// O título da notificação some truncado na barra de status do Android até o
// usuário expandi-la — o nome da série precisa vir primeiro pra aparecer
// mesmo sem expandir, em vez de ficar escondido no fim da frase.
export const NEW_EPISODE_BODY_PHRASES = [
  "divirta-se!",
  "bora maratonar?",
  "já pode dar o play",
  "prepara a pipoca",
  "sofá reservado",
  "não perca esse",
  "play liberado",
  "hora de descobrir o que rola",
];

export function randomEpisodePhrase(): string {
  return NEW_EPISODE_BODY_PHRASES[Math.floor(Math.random() * NEW_EPISODE_BODY_PHRASES.length)];
}

export function buildNotificationContent(
  event: ReleaseNotificationInput,
  pickPhrase: () => string = randomEpisodePhrase,
): { title: string; body: string } {
  const episodeSuffix = event.episodeName ? `${event.episodeLabel} - ${event.episodeName}` : event.episodeLabel;
  const title =
    event.notificationType === "new_movie_release"
      ? `${event.name} já está disponível`
      : event.notificationType === "new_season"
        ? `${event.name}: nova temporada hoje!`
        : `${event.name}: novo episódio hoje!`;
  const body =
    event.notificationType === "new_movie_release" ? "Já disponível para assistir" : `${episodeSuffix}: ${pickPhrase()}`;

  return { title, body };
}
