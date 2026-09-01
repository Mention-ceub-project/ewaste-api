import { Notificacao } from '@prisma/client';

export type NotificacaoDto = {
  id: string;
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
    titulo: notificacao.titulo,
    mensagem: notificacao.mensagem,
    lida: notificacao.lida,
    dataCriacao: notificacao.dataCriacao,
  };
}
