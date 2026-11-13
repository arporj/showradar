CREATE TABLE "showradar"."ajustes_data_lancamento" (
	"title_id" uuid PRIMARY KEY NOT NULL,
	"dias" smallint NOT NULL,
	"motivo" text NOT NULL,
	"atualizado_por" uuid,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ajustes_data_lancamento_dias_check" CHECK ("showradar"."ajustes_data_lancamento"."dias" between -7 and 7 and "showradar"."ajustes_data_lancamento"."dias" <> 0)
);
--> statement-breakpoint
ALTER TABLE "showradar"."ajustes_data_lancamento" ADD CONSTRAINT "ajustes_data_lancamento_title_id_titles_id_fk" FOREIGN KEY ("title_id") REFERENCES "showradar"."titles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "showradar"."ajustes_data_lancamento" ADD CONSTRAINT "ajustes_data_lancamento_atualizado_por_users_id_fk" FOREIGN KEY ("atualizado_por") REFERENCES "showradar"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ajustes_data_lancamento_atualizado_por_idx" ON "showradar"."ajustes_data_lancamento" USING btree ("atualizado_por");--> statement-breakpoint
-- RLS ligado e sem política: o app acessa pelo servidor (conexão direta), e a
-- API pública do Supabase (anon/authenticated) não lê nem grava esta tabela.
ALTER TABLE "showradar"."ajustes_data_lancamento" ENABLE ROW LEVEL SECURITY;
