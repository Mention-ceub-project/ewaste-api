import { Notificacao } from '@prisma/client';

export type NotificacaoDto = {
  id: string;
  entregaId: string | null;
  titulo: string;
  mensagem: string;
  lida: boolean;
  dataCriacao: Date;
};

export function paraNotificacaoDto(
  notificacao: Notificacao,
): NotificacaoDto {
  return {
    id: notificacao.id,
    entregaId: notificacao.entregaId,
    titulo: notificacao.titulo,
    mensagem: notificacao.mensagem,
    lida: notificacao.lida,
    dataCriacao: notificacao.dataCriacao,
  };
}
