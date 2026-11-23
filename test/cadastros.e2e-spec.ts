import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ContextoDeTeste, criarApp, limparBanco } from './helpers/app';
import { comToken, criarCenario, entrar } from './helpers/cenario';

const MARIA = { nomeCompleto: 'Maria Teste', email: 'maria.teste@email.com', senha: 'teste123' };

// Rodoviária do Plano Piloto: origem usada nos testes de distância
const RODOVIARIA = { latitude: -15.7939, longitude: -47.8828 };

describe('Cadastros e consultas', () => {
  let ctx: ContextoDeTeste;
  let cenario: Awaited<ReturnType<typeof criarCenario>>;
  let tokenMaria: string;
  let tokenOng: string;
  let tokenOutraOng: string;
  let tokenAdmin: string;

  const registrarDescarte = (token: string, corpo: object) =>
    ctx.http().post('/entregas').set(comToken(token)).send(corpo);

  beforeAll(async () => {
    ctx = await criarApp();
    await limparBanco(ctx.prisma);
    cenario = await criarCenario(ctx.prisma);

    const cadastro = await ctx.http().post('/auth/register').send(MARIA).expect(201);
    tokenMaria = cadastro.body.accessToken;
    tokenOng = await entrar(ctx, 'ong@recicladf.org');
    tokenOutraOng = await entrar(ctx, 'joao.ong@email.com');
    tokenAdmin = await entrar(ctx, 'admin@ewaste.dev');
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  // -------------------------------------------------------------------------
  // Perfil
  // -------------------------------------------------------------------------
  describe('CT 015 – Edição do perfil do usuário', () => {
    it('atualiza o nome e o telefone do usuário logado', async () => {
      const resposta = await ctx
        .http()
        .patch('/usuarios/me')
        .set(comToken(tokenMaria))
        .send({ nomeCompleto: 'Maria Teste Silva', telefone: '61999990000' })
        .expect(200);

      expect(resposta.body).toMatchObject({ nomeCompleto: 'Maria Teste Silva', telefone: '61999990000' });
    });

    it('a alteração aparece ao consultar o perfil novamente', async () => {
      const { body } = await ctx.http().get('/usuarios/me').set(comToken(tokenMaria)).expect(200);

      expect(body).toMatchObject({ nomeCompleto: 'Maria Teste Silva', telefone: '61999990000' });
    });

    it('recusa telefone curto demais (400)', async () => {
      const resposta = await ctx
        .http()
        .patch('/usuarios/me')
        .set(comToken(tokenMaria))
        .send({ telefone: '123' })
        .expect(400);

      expect(resposta.body.errors.telefone).toContain('Telefone inválido');
    });
  });

  describe('CT 016 – Troca de senha', () => {
    it('exige a senha atual para definir uma nova senha (400)', async () => {
      const resposta = await ctx
        .http()
        .patch('/usuarios/me')
        .set(comToken(tokenMaria))
        .send({ novaSenha: 'novaSenha456' })
        .expect(400);

      expect(resposta.body.errors.senhaAtual).toContain('Informe a senha atual para definir uma nova senha');
    });

    it('recusa a senha atual incorreta (401)', async () => {
      const resposta = await ctx
        .http()
        .patch('/usuarios/me')
        .set(comToken(tokenMaria))
        .send({ senhaAtual: 'senhaErrada1', novaSenha: 'novaSenha456' })
        .expect(401);

      expect(resposta.body.message).toBe('Senha atual incorreta');
    });

    it('troca a senha quando a senha atual está correta', async () => {
      await ctx
        .http()
        .patch('/usuarios/me')
        .set(comToken(tokenMaria))
        .send({ senhaAtual: MARIA.senha, novaSenha: 'novaSenha456' })
        .expect(200);

      await ctx.http().post('/auth/login').send({ email: MARIA.email, senha: MARIA.senha }).expect(401);
      const login = await ctx.http().post('/auth/login').send({ email: MARIA.email, senha: 'novaSenha456' }).expect(200);
      tokenMaria = login.body.accessToken;
    });
  });

  // -------------------------------------------------------------------------
  // Catálogo de materiais
  // -------------------------------------------------------------------------
  describe('CT 019 – Listagem do catálogo de materiais', () => {
    it('lista os materiais ativos em ordem alfabética, com pontos por kg e toxicidade', async () => {
      const { body } = await ctx.http().get('/materiais?ativo=true').set(comToken(tokenMaria)).expect(200);

      expect(body.map((material: { nome: string }) => material.nome)).toEqual([
        'Celular',
        'Computador',
        'Monitor',
        'Mouse',
        'Pilhas',
      ]);
      expect(body.find((material: { nome: string }) => material.nome === 'Pilhas')).toMatchObject({
        pontosPorKg: 240,
        nivelToxicidade: 5,
        co2PorKg: 1.1,
        ativo: true,
      });
    });
  });

  describe('CT 020 – Cadastro de material pelo administrador', () => {
    it('cadastra o material com os fatores informados (201)', async () => {
      const resposta = await ctx
        .http()
        .post('/materiais')
        .set(comToken(tokenAdmin))
        .send({ nome: 'Teclado', pontosPorKg: 30, nivelToxicidade: 2, co2PorKg: 0.3, aguaPorKg: 8, energiaPorKg: 1 })
        .expect(201);

      expect(resposta.body).toMatchObject({ nome: 'Teclado', pontosPorKg: 30, nivelToxicidade: 2, co2PorKg: 0.3, ativo: true });
    });

    it('recusa um nome já cadastrado (409)', async () => {
      const resposta = await ctx
        .http()
        .post('/materiais')
        .set(comToken(tokenAdmin))
        .send({ nome: 'Teclado', pontosPorKg: 10 })
        .expect(409);

      expect(resposta.body.message).toBe('Já existe um material com este nome');
    });

    it('recusa toxicidade fora da escala de 1 a 5 (400)', async () => {
      const resposta = await ctx
        .http()
        .post('/materiais')
        .set(comToken(tokenAdmin))
        .send({ nome: 'Impressora', pontosPorKg: 50, nivelToxicidade: 6 })
        .expect(400);

      expect(resposta.body.errors.nivelToxicidade).toContain('A toxicidade vai de 1 a 5');
    });
  });

  describe('CT 021 – Desativação de material', () => {
    let idTeclado: string;

    beforeAll(async () => {
      const material = await ctx.prisma.material.findUnique({ where: { nome: 'Teclado' } });
      idTeclado = material!.id;
    });

    it('o admin desativa o material, que continua existindo com ativo = false', async () => {
      const resposta = await ctx.http().delete(`/materiais/${idTeclado}`).set(comToken(tokenAdmin)).expect(200);

      expect(resposta.body).toMatchObject({ nome: 'Teclado', ativo: false });
    });

    it('o material desativado some do catálogo de materiais ativos', async () => {
      const { body } = await ctx.http().get('/materiais?ativo=true').set(comToken(tokenMaria)).expect(200);

      expect(body.map((material: { nome: string }) => material.nome)).not.toContain('Teclado');
    });

    it('não é possível registrar descarte com o material desativado (400)', async () => {
      const resposta = await registrarDescarte(tokenMaria, {
        tipoEntrega: 'PONTO_COLETA',
        pontoColetaId: cenario.pontos.reciclaDf,
        itens: [{ materialId: idTeclado, quantidade: 1, pesoKg: 1 }],
      }).expect(400);

      expect(resposta.body.message).toBe('O material "Teclado" não está mais disponível para descarte');
    });
  });

  // -------------------------------------------------------------------------
  // Pontos de coleta
  // -------------------------------------------------------------------------
  describe('CT 022 – Listagem e busca de pontos de coleta', () => {
    it('lista os pontos de coleta ativos com os materiais aceitos', async () => {
      const { body } = await ctx.http().get('/pontos-coleta').set(comToken(tokenMaria)).expect(200);

      expect(body.map((ponto: { nome: string }) => ponto.nome)).toEqual(['Coleta Verde Taguatinga', 'ONG Recicla DF']);
      const taguatinga = body.find((ponto: { nome: string }) => ponto.nome === 'Coleta Verde Taguatinga');
      expect(taguatinga.materiaisAceitos.map((material: { nome: string }) => material.nome).sort()).toEqual([
        'Celular',
        'Mouse',
        'Pilhas',
      ]);
    });

    it('filtra os pontos pelo termo de busca', async () => {
      const { body } = await ctx.http().get('/pontos-coleta?busca=Taguatinga').set(comToken(tokenMaria)).expect(200);

      expect(body).toHaveLength(1);
      expect(body[0].nome).toBe('Coleta Verde Taguatinga');
    });
  });

  describe('CT 023 – Distância até os pontos de coleta', () => {
    const consulta = (query: string) => ctx.http().get(`/pontos-coleta?${query}`).set(comToken(tokenMaria));

    it('informa a distância e ordena do ponto mais próximo para o mais distante', async () => {
      const { body } = await consulta(`latitude=${RODOVIARIA.latitude}&longitude=${RODOVIARIA.longitude}`).expect(200);

      expect(body.map((ponto: { nome: string }) => ponto.nome)).toEqual(['ONG Recicla DF', 'Coleta Verde Taguatinga']);
      expect(body[0].distanciaKm).toBeCloseTo(0.55, 1);
      expect(body[1].distanciaKm).toBeCloseTo(19, 0);
    });

    it('filtra os pontos pelo raio informado', async () => {
      const { body } = await consulta(
        `latitude=${RODOVIARIA.latitude}&longitude=${RODOVIARIA.longitude}&raioKm=5`,
      ).expect(200);

      expect(body.map((ponto: { nome: string }) => ponto.nome)).toEqual(['ONG Recicla DF']);
    });

    it('exige latitude e longitude juntas (400)', async () => {
      const resposta = await consulta(`latitude=${RODOVIARIA.latitude}`).expect(400);

      expect(resposta.body.errors.latitude).toContain('Informe latitude e longitude juntas');
    });

    it('sem a posição do usuário, a distância não é informada', async () => {
      const { body } = await consulta('').expect(200);

      expect(body[0]).not.toHaveProperty('distanciaKm');
    });
  });

  describe('CT 024 – Cadastro de ponto de coleta pela ONG', () => {
    const novoPonto = {
      nome: 'Ponto Recicla DF - Asa Norte',
      rua: 'SQN 410 Bloco B',
      numero: '12',
      bairro: 'Asa Norte',
      cidade: 'Brasília',
      estado: 'DF',
      cep: '70865-020',
      latitude: -15.7605,
      longitude: -47.8815,
      horarioFuncionamento: 'Seg a sex, 8h às 18h',
    };
    let idNovoPonto: string;

    it('cadastra o ponto com os materiais aceitos (201)', async () => {
      const resposta = await ctx
        .http()
        .post('/pontos-coleta')
        .set(comToken(tokenOng))
        .send({ ...novoPonto, materiaisIds: [cenario.materiais.pilhas, cenario.materiais.celular] })
        .expect(201);

      expect(resposta.body).toMatchObject({
        nome: 'Ponto Recicla DF - Asa Norte',
        ativo: true,
        criadoPor: cenario.usuarios.ong.id,
        endereco: { bairro: 'Asa Norte', estado: 'DF', cep: '70865-020' },
      });
      expect(resposta.body.materiaisAceitos.map((material: { nome: string }) => material.nome).sort()).toEqual([
        'Celular',
        'Pilhas',
      ]);
      idNovoPonto = resposta.body.id;
    });

    it('recusa estado com mais de duas letras e CEP inválido (400)', async () => {
      const resposta = await ctx
        .http()
        .post('/pontos-coleta')
        .set(comToken(tokenOng))
        .send({ ...novoPonto, estado: 'DFX', cep: '123' })
        .expect(400);

      expect(resposta.body.errors.estado).toContain('Use a sigla do estado (ex.: DF)');
      expect(resposta.body.errors.cep).toContain('CEP inválido');
    });

    it('a ONG redefine a lista de materiais aceitos pelo ponto', async () => {
      const resposta = await ctx
        .http()
        .put(`/pontos-coleta/${idNovoPonto}/materiais`)
        .set(comToken(tokenOng))
        .send({ materiaisIds: [cenario.materiais.monitor] })
        .expect(200);

      expect(resposta.body.materiaisAceitos.map((material: { nome: string }) => material.nome)).toEqual(['Monitor']);
    });

    it('recusa material inexistente na lista de aceitos (400)', async () => {
      const resposta = await ctx
        .http()
        .put(`/pontos-coleta/${idNovoPonto}/materiais`)
        .set(comToken(tokenOng))
        .send({ materiaisIds: ['00000000-0000-4000-8000-000000000000'] })
        .expect(400);

      expect(resposta.body.message).toBe('Um ou mais materiais informados não existem');
    });
  });

  describe('CT 026 – Desativação de ponto de coleta', () => {
    let idPonto: string;

    beforeAll(async () => {
      const ponto = await ctx.prisma.pontoColeta.findFirst({ where: { nome: 'Ponto Recicla DF - Asa Norte' } });
      idPonto = ponto!.id;
    });

    it('outra ONG não pode desativar o ponto (403)', async () => {
      await ctx.http().delete(`/pontos-coleta/${idPonto}`).set(comToken(tokenOutraOng)).expect(403);
    });

    it('a ONG dona desativa o ponto, que continua existindo com ativo = false', async () => {
      const resposta = await ctx.http().delete(`/pontos-coleta/${idPonto}`).set(comToken(tokenOng)).expect(200);

      expect(resposta.body).toMatchObject({ ativo: false });
    });

    it('o ponto desativado some da listagem', async () => {
      const { body } = await ctx.http().get('/pontos-coleta').set(comToken(tokenMaria)).expect(200);

      expect(body.map((ponto: { id: string }) => ponto.id)).not.toContain(idPonto);
    });

    it('não é possível registrar descarte no ponto desativado (400)', async () => {
      const resposta = await registrarDescarte(tokenMaria, {
        tipoEntrega: 'PONTO_COLETA',
        pontoColetaId: idPonto,
        itens: [{ materialId: cenario.materiais.monitor, quantidade: 1, pesoKg: 2 }],
      }).expect(400);

      expect(resposta.body.message).toBe('Este ponto de coleta não está aceitando entregas');
    });
  });

  // -------------------------------------------------------------------------
  // Endereços
  // -------------------------------------------------------------------------
  describe('CT 027 – Cadastro de endereço de coleta', () => {
    const endereco = {
      cep: '70390-095',
      logradouro: 'SQS 308 Bloco C',
      numero: '204',
      complemento: 'Apto 204',
      bairro: 'Asa Sul',
      cidade: 'Brasília',
      estado: 'DF',
    };

    it('cadastra o endereço do usuário logado (201)', async () => {
      const resposta = await ctx.http().post('/enderecos').set(comToken(tokenMaria)).send(endereco).expect(201);

      expect(resposta.body).toMatchObject(endereco);
    });

    it('o endereço aparece na lista de endereços do usuário', async () => {
      const { body } = await ctx.http().get('/enderecos').set(comToken(tokenMaria)).expect(200);

      expect(body).toHaveLength(1);
      expect(body[0]).toMatchObject({ logradouro: 'SQS 308 Bloco C' });
    });

    it('recusa CEP inválido (400)', async () => {
      const resposta = await ctx
        .http()
        .post('/enderecos')
        .set(comToken(tokenMaria))
        .send({ ...endereco, cep: '7039' })
        .expect(400);

      expect(resposta.body.errors.cep).toContain('CEP inválido');
    });
  });

  describe('CT 028 – Remoção de endereço vinculado a entrega', () => {
    let idEndereco: string;

    beforeAll(async () => {
      const { body } = await ctx.http().get('/enderecos').set(comToken(tokenMaria)).expect(200);
      idEndereco = body[0].id;

      // Coleta em domicílio usando o endereço
      await registrarDescarte(tokenMaria, {
        tipoEntrega: 'DOMICILIO',
        enderecoEntregaId: idEndereco,
        itens: [{ materialId: cenario.materiais.computador, quantidade: 1, pesoKg: 6 }],
      }).expect(201);
    });

    it('outro usuário não pode remover o endereço (403)', async () => {
      const resposta = await ctx.http().delete(`/enderecos/${idEndereco}`).set(comToken(tokenOutraOng)).expect(403);

      expect(resposta.body.message).toBe('Este endereço não pertence a você');
    });

    it('o dono não pode remover um endereço usado em entrega (400)', async () => {
      const resposta = await ctx.http().delete(`/enderecos/${idEndereco}`).set(comToken(tokenMaria)).expect(400);

      expect(resposta.body.message).toBe('Este endereço está vinculado a entregas e não pode ser removido');
    });

    it('um endereço sem entregas é removido normalmente', async () => {
      const novo = await ctx
        .http()
        .post('/enderecos')
        .set(comToken(tokenMaria))
        .send({ cep: '70000-000', logradouro: 'Rua Nova', numero: '1', bairro: 'Centro', cidade: 'Brasília', estado: 'DF' })
        .expect(201);

      const resposta = await ctx.http().delete(`/enderecos/${novo.body.id}`).set(comToken(tokenMaria)).expect(200);

      expect(resposta.body).toEqual({ message: 'Endereço removido com sucesso' });
    });
  });
});
