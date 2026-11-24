ALTER TABLE "entregas" ADD COLUMN "observacao_confirmacao" TEXT;

ALTER TABLE "notificacoes" ADD COLUMN "entrega_id" UUID;
CREATE INDEX "notificacoes_entrega_id_idx" ON "notificacoes"("entrega_id");
ALTER TABLE "notificacoes" ADD CONSTRAINT "notificacoes_entrega_id_fkey"
  FOREIGN KEY ("entrega_id") REFERENCES "entregas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
