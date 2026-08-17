ALTER TABLE "showradar"."seasons" ADD COLUMN "episodes_synced_at" timestamp;--> statement-breakpoint
-- Backfill: temporadas cujos episódios já estavam em cache herdam o carimbo
-- do próprio episódio mais recente, para o novo gate não disparar um re-sync
-- de todas as temporadas do banco de uma vez. As demais ficam NULL e são
-- buscadas na próxima visita — que é o comportamento correto: até aqui elas
-- nunca chegaram a ter episódio nenhum.
UPDATE "showradar"."seasons" s
SET "episodes_synced_at" = sub.max_synced
FROM (
  SELECT "season_id", MAX("last_synced_at") AS max_synced
  FROM "showradar"."episodes"
  GROUP BY "season_id"
) sub
WHERE sub."season_id" = s."id" AND s."episodes_synced_at" IS NULL;
