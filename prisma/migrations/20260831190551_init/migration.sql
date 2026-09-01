-- CreateEnum
CREATE TYPE "papel" AS ENUM ('DESCARTADOR', 'MEMBRO_ONG', 'ADMIN');

-- CreateEnum
CREATE TYPE "tipo_entrega" AS ENUM ('PONTO_COLETA', 'DOMICILIO');

-- CreateEnum
CREATE TYPE "status" AS ENUM ('PENDENTE', 'COLETADO', 'CANCELADO');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" UUID NOT NULL,
    "nome_completo" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha_hash" TEXT NOT NULL,
    "telefone" TEXT,
    "papel" "papel" NOT NULL DEFAULT 'DESCARTADOR',
    "avatar_url" TEXT,
    "token_version" INTEGER NOT NULL DEFAULT 0,
    "data_criacao" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data_atualizacao" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gamificacao_usuarios" (
    "id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "pontos_totais" INTEGER NOT NULL DEFAULT 0,
    "nivel" INTEGER NOT NULL DEFAULT 1,
    "total_entregas" INTEGER NOT NULL DEFAULT 0,
    "data_atualizacao" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "gamificacao_usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "materiais" (
    "id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "icone" TEXT,
    "pontos_por_kg" INTEGER NOT NULL DEFAULT 0,
    "nivel_toxicidade" INTEGER NOT NULL DEFAULT 1,
    "co2_por_kg" DECIMAL(10,3) NOT NULL DEFAULT 0,
    "agua_por_kg" DECIMAL(10,3) NOT NULL DEFAULT 0,
    "energia_por_kg" DECIMAL(10,3) NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "data_criacao" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "materiais_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pontos_coleta" (
    "id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "responsavel" TEXT,
    "telefone_contato" TEXT,
    "email_contato" TEXT,
    "rua" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "bairro" TEXT NOT NULL,
    "cidade" TEXT NOT NULL,
    "estado" TEXT NOT NULL,
    "cep" TEXT NOT NULL,
    "latitude" DECIMAL(10,7) NOT NULL,
    "longitude" DECIMAL(10,7) NOT NULL,
    "horario_funcionamento" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_por" UUID NOT NULL,
    "data_criacao" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data_atualizacao" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "pontos_coleta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ponto_materiais" (
    "id" UUID NOT NULL,
    "ponto_id" UUID NOT NULL,
    "material_id" UUID NOT NULL,

    CONSTRAINT "ponto_materiais_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enderecos" (
    "id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "cep" TEXT NOT NULL,
    "logradouro" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "complemento" TEXT,
    "bairro" TEXT NOT NULL,
    "cidade" TEXT NOT NULL,
    "estado" TEXT NOT NULL,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "data_criacao" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "enderecos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entregas" (
    "id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "ponto_coleta_id" UUID,
    "endereco_entrega_id" UUID,
    "tipo_entrega" "tipo_entrega" NOT NULL,
    "status" "status" NOT NULL DEFAULT 'PENDENTE',
    "observacao" TEXT,
    "foto_url" TEXT,
    "pontos_gerados" INTEGER NOT NULL DEFAULT 0,
    "co2_evitado" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "agua_economizada" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "energia_economizada" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "confirmado_por" UUID,
    "confirmado_em" TIMESTAMPTZ(6),
    "data_entrega" TIMESTAMPTZ(6),
    "data_criacao" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "entregas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entrega_materiais" (
    "id" UUID NOT NULL,
    "entrega_id" UUID NOT NULL,
    "material_id" UUID NOT NULL,
    "quantidade" INTEGER NOT NULL DEFAULT 1,
    "peso_kg" DECIMAL(10,3) NOT NULL,

    CONSTRAINT "entrega_materiais_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historico_pontos" (
    "id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "entrega_id" UUID,
    "descricao" TEXT NOT NULL,
    "pontos" INTEGER NOT NULL,
    "data_registro" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historico_pontos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notificacoes" (
    "id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "titulo" TEXT NOT NULL,
    "mensagem" TEXT NOT NULL,
    "lida" BOOLEAN NOT NULL DEFAULT false,
    "data_criacao" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificacoes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE INDEX "usuarios_email_idx" ON "usuarios"("email");

-- CreateIndex
CREATE INDEX "usuarios_papel_idx" ON "usuarios"("papel");

-- CreateIndex
CREATE UNIQUE INDEX "gamificacao_usuarios_usuario_id_key" ON "gamificacao_usuarios"("usuario_id");

-- CreateIndex
CREATE INDEX "gamificacao_usuarios_pontos_totais_idx" ON "gamificacao_usuarios"("pontos_totais");

-- CreateIndex
CREATE UNIQUE INDEX "materiais_nome_key" ON "materiais"("nome");

-- CreateIndex
CREATE INDEX "materiais_ativo_idx" ON "materiais"("ativo");

-- CreateIndex
CREATE INDEX "pontos_coleta_criado_por_idx" ON "pontos_coleta"("criado_por");

-- CreateIndex
CREATE INDEX "pontos_coleta_ativo_idx" ON "pontos_coleta"("ativo");

-- CreateIndex
CREATE INDEX "ponto_materiais_material_id_idx" ON "ponto_materiais"("material_id");

-- CreateIndex
CREATE UNIQUE INDEX "ponto_materiais_ponto_id_material_id_key" ON "ponto_materiais"("ponto_id", "material_id");

-- CreateIndex
CREATE INDEX "enderecos_usuario_id_idx" ON "enderecos"("usuario_id");

-- CreateIndex
CREATE INDEX "entregas_usuario_id_idx" ON "entregas"("usuario_id");

-- CreateIndex
CREATE INDEX "entregas_ponto_coleta_id_idx" ON "entregas"("ponto_coleta_id");

-- CreateIndex
CREATE INDEX "entregas_status_idx" ON "entregas"("status");

-- CreateIndex
CREATE INDEX "entregas_data_criacao_idx" ON "entregas"("data_criacao");

-- CreateIndex
CREATE INDEX "entrega_materiais_entrega_id_idx" ON "entrega_materiais"("entrega_id");

-- CreateIndex
CREATE INDEX "entrega_materiais_material_id_idx" ON "entrega_materiais"("material_id");

-- CreateIndex
CREATE INDEX "historico_pontos_usuario_id_idx" ON "historico_pontos"("usuario_id");

-- CreateIndex
CREATE INDEX "historico_pontos_entrega_id_idx" ON "historico_pontos"("entrega_id");

-- CreateIndex
CREATE INDEX "notificacoes_usuario_id_lida_idx" ON "notificacoes"("usuario_id", "lida");

-- AddForeignKey
ALTER TABLE "gamificacao_usuarios" ADD CONSTRAINT "gamificacao_usuarios_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pontos_coleta" ADD CONSTRAINT "pontos_coleta_criado_por_fkey" FOREIGN KEY ("criado_por") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ponto_materiais" ADD CONSTRAINT "ponto_materiais_ponto_id_fkey" FOREIGN KEY ("ponto_id") REFERENCES "pontos_coleta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ponto_materiais" ADD CONSTRAINT "ponto_materiais_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materiais"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enderecos" ADD CONSTRAINT "enderecos_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entregas" ADD CONSTRAINT "entregas_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entregas" ADD CONSTRAINT "entregas_confirmado_por_fkey" FOREIGN KEY ("confirmado_por") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entregas" ADD CONSTRAINT "entregas_ponto_coleta_id_fkey" FOREIGN KEY ("ponto_coleta_id") REFERENCES "pontos_coleta"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entregas" ADD CONSTRAINT "entregas_endereco_entrega_id_fkey" FOREIGN KEY ("endereco_entrega_id") REFERENCES "enderecos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entrega_materiais" ADD CONSTRAINT "entrega_materiais_entrega_id_fkey" FOREIGN KEY ("entrega_id") REFERENCES "entregas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entrega_materiais" ADD CONSTRAINT "entrega_materiais_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materiais"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historico_pontos" ADD CONSTRAINT "historico_pontos_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historico_pontos" ADD CONSTRAINT "historico_pontos_entrega_id_fkey" FOREIGN KEY ("entrega_id") REFERENCES "entregas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificacoes" ADD CONSTRAINT "notificacoes_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
