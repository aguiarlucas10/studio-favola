-- ═══════════════════════════════════════════════════════════════
-- Studio Favola — Esquema do banco (Supabase / PostgreSQL)
--
-- EXTRAÍDO DO BANCO REAL em 08/08/2026 (information_schema.columns +
-- pg_constraint). Antes desta data o arquivo era inferido do código e
-- estava incompleto — faltavam colunas reais (projeto, cliente,
-- forma_pagto em saidas, is_retirada_automatica, assinatura_contrato,
-- updated_at) e constraints (contratos.numero UNIQUE).
--
-- NÃO execute os CREATE TABLE em um banco que já tem dados.
--
-- MIGRAÇÕES: ver docs/migracao-2026-08/ — passos numerados para rodar
-- um de cada vez (allowlist RLS, trigger de dupla aprovação, backfill
-- do a_receber legado, RPC aprovar_ajuste). É a fonte da verdade das
-- políticas/triggers vigentes.
-- ═══════════════════════════════════════════════════════════════

-- ── usuarios ─────────────────────────────────────────────────────
-- Espelha auth.users; guarda o nome de exibição da sócia.
-- Também é a ALLOWLIST de acesso (função is_socia(), ver migração).
create table if not exists usuarios (
  id   uuid primary key references auth.users(id),
  nome text
);

-- ── contratos (página Projetos) ──────────────────────────────────
create table if not exists contratos (
  id                  serial primary key,
  numero              integer unique,   -- ⚠️ UNIQUE: duplicar contrato precisa
                                        -- omitir este campo (ver js/bulk.js)
  nome_contrato       text,
  projeto             text,             -- LEGADA: nome alternativo do projeto;
                                        -- o app usa nome_contrato, mas concilia
                                        -- RT por esta coluna quando preenchida
  cliente             text,
  contato             text,
  tipologia           text,             -- Interiores | Arquitetônico | Comercial | Arq + Int
  servico             text,             -- Projeto | Consultoria | Detalhamento | Acompanhamento
  valor_contrato      numeric default 0,
  parcelas            integer default 1,
  conta               text,             -- 'pessoal' (PF) | 'jurídica' (PJ)
  -- LEGADA/MORTA: o app calcula o "a receber" somando as entradas pendentes
  -- (contratoAReceber em js/data.js). Saldos antigos viraram entradas
  -- '[Backfill saldo legado]' (migração 2026-08, passo 04). Não gravar.
  a_receber           numeric default 0,
  metros_quadrados    text,
  data_inicio         date,
  data_fim            date,
  status              text default 'Ativo',  -- Ativo | Proposta | Pausado | Finalizado | Descontinuado
  cidade              text,
  uf                  text,
  origem              text,             -- Indicação | Family & friends | Contato comercial
  obs                 text,
  assinatura_contrato boolean default false,  -- não usada pelo app
  data_assinatura     date,                   -- não usada pelo app
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

-- ── entradas (Financeiro) ────────────────────────────────────────
create table if not exists entradas (
  id             serial primary key,
  contrato_id    integer references contratos(id),  -- sem ON DELETE: bloqueia
                                                    -- apagar contrato com lançamentos
  nome_contrato  text,
  projeto        text,          -- LEGADA (ver contratos.projeto)
  cliente        text,
  -- DÍVIDA CONHECIDA: mes_ano é texto em formato legado 'DD/MM/YYYY'
  -- (sempre dia 01). O app normaliza vários formatos em normalizaMesAno()
  -- para a chave MM/YYYY em memória. Não migrar sem plano — dados de produção.
  mes_ano        text,
  tipo_entrada   text,          -- 'projeto' | 'rt' | 'ajuste de caixa'
  fornecedor_rt  text,          -- não usada pelo app
  data_pagamento date,
  valor          numeric,
  conta          text,          -- 'pessoal' | 'jurídica'
  forma_pagto    text,          -- PIX | TED | Boleto | Cartão | Ajuste
  status         text default 'Pendente',  -- o app grava Pago | A Receber | Atrasado
  obs            text,
  -- ⚠️ GENERATED ALWAYS: calculada pelo banco como (conta = 'pessoal'), ou
  -- seja, só um atalho para "entrada caiu na conta PF". Não cria espelho nem
  -- tem efeito colateral — o espelho [TD] é responsabilidade do app.
  -- Qualquer INSERT/UPDATE que a inclua no payload é REJEITADO pelo Postgres;
  -- por isso js/bulk.js a omite ao duplicar (era a causa do bug do Duplicar).
  is_retirada_automatica boolean generated always as (conta = 'pessoal') stored,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

-- ── saidas (Financeiro / Sócias) ─────────────────────────────────
create table if not exists saidas (
  id             serial primary key,
  tipo_saida     text,          -- retirada de lucros | pró-labore | projeto despesa |
                                -- escritório despesa | marketing | honorários | imposto |
                                -- ajuste de caixa | outro
  descricao      text,          -- espelhos automáticos começam com '[TD]'
                                -- (legados: 'TD Contrato X' sem colchetes)
  data_pagamento date,
  valor          numeric,
  conta          text,
  forma_pagto    text,          -- não usada pelo app
  status         text default 'Pendente',  -- o app grava Pago | A Pagar | Atrasado
  obs            text,
  nome_contrato  text,
  mes_ano        text,          -- mesmo formato legado de entradas.mes_ano
  projeto        text,          -- LEGADA
  cliente        text,          -- não usada pelo app
  contrato_id    integer references contratos(id),
  socia          text,          -- Fernanda | Laís | Ambas | null
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

-- ── rt_comissoes (página RT / Comissões) ─────────────────────────
create table if not exists rt_comissoes (
  id                 serial primary key,
  contrato_id        integer references contratos(id),  -- existe, mas o app
                                                        -- vincula por `projeto` (texto)
  projeto            text,      -- nome_contrato do contrato relacionado
  categoria          text,      -- Marcenaria, Pedras, Iluminação, ...
  fornecedor         text,
  contato_fornecedor text,
  data_fechamento    date,
  valor_venda        numeric,
  percentual_rt      numeric,   -- fração (0.10 = 10%)
  valor_rt           numeric,   -- o modal calcula = valor_venda × percentual_rt
  parcelas           integer default 1,
  conta              text,
  a_receber          numeric default 0,
  status             text default 'A receber',  -- A receber | Pago | Inadimplência
  obs                text,
  created_at         timestamptz default now(),
  updated_at         timestamptz default now()
);

-- ── fluxo_caixa (NÃO USADA pelo app — o fluxo é calculado no cliente;
--    a query foi removida em ago/2026. A tabela permanece no banco.) ──
create table if not exists fluxo_caixa (
  id      bigint generated by default as identity primary key,
  mes_ano text
);

-- ── contas_bancarias (aba Contas do Financeiro) ──────────────────
create table if not exists contas_bancarias (
  id            bigint generated by default as identity primary key,
  nome          text,           -- Ex: Nubank PJ, C6 PF
  tipo          text,           -- Conta Corrente PJ | Conta Corrente PF | Poupança | Carteira | Outro
  saldo_atual   numeric default 0,
  atualizado_em date,
  obs           text
);

-- ── ajustes_caixa (conciliação com dupla aprovação) ──────────────
create table if not exists ajustes_caixa (
  id                bigint generated by default as identity primary key,
  created_at        timestamptz default now(),
  updated_at        timestamptz,
  valor_novo        numeric,
  valor_anterior    numeric,
  diferenca         numeric,
  motivo            text,
  data_referencia   date,
  solicitado_por    text,       -- nome de exibição (legado)
  aprovado_por      text,       -- nome de exibição (legado)
  solicitado_por_id uuid,       -- auth.users.id — identidade de verdade
  aprovado_por_id   uuid,       -- auth.users.id — identidade de verdade
  status            text        -- pendente | aprovado | rejeitado
);

-- ═══════════════════════════════════════════════════════════════
-- CONSTRAINTS REAIS (pg_constraint, 08/08/2026)
--
--   contratos.numero              UNIQUE
--   contratos.id                  PRIMARY KEY
--   entradas.contrato_id          FK → contratos(id)   (sem ON DELETE)
--   saidas.contrato_id            FK → contratos(id)   (sem ON DELETE)
--   rt_comissoes.contrato_id      FK → contratos(id)   (sem ON DELETE)
--
-- As FKs sem ON DELETE são intencionais: impedem apagar um contrato que
-- ainda tem lançamentos. O app pré-checa e explica isso ao usuário
-- (js/modais.js, deleteItem) em vez de deixar o erro cru aparecer.
--
-- NÃO HÁ constraints CHECK nos campos de status/tipo — os valores válidos
-- são convenção do app, não regra do banco.
-- ═══════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════
-- TRIGGERS (pg_trigger, 08/08/2026)
--
-- O ÚNICO trigger de negócio no banco é o de ajustes_caixa (substituído
-- pelo passo 03 da migração). contratos/entradas/saidas/rt_comissoes não
-- têm trigger algum — toda a lógica (espelhos [TD], divisão 50/50,
-- geração de parcelas) roda no cliente.
--
-- Consequência: `updated_at` tem default now() mas NUNCA é atualizado
-- (não há trigger e o app não grava a coluna) — é sempre igual a
-- created_at. Não usar como "última modificação".
-- ═══════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════
-- A COLUNA LEGADA `projeto` (contratos, entradas, saidas, rt_comissoes)
--
-- Preenchida em quase todo o histórico (ago/2026: contratos 41/42,
-- entradas 236/238, saidas 370/389, rt_comissoes 48/48), mas o app só a
-- grava em rt_comissoes — registros novos das demais tabelas nascem com
-- `projeto` nulo, enquanto `nome_contrato` é sempre preenchida.
--
-- Por isso o vínculo lançamento↔contrato (doContrato em js/data.js) casa
-- pelas DUAS colunas quando não há contrato_id. Exceção deliberada:
-- "saídas diretas" no Resultado p/ Projeto continuam exigindo
-- contrato_id — passar a usar `projeto` reclassificaria centenas de
-- saídas de "geral rateada" para "direta" e mudaria o resultado de todos
-- os projetos. Decidir com as sócias antes de mexer.
-- ═══════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════
-- RLS — Row Level Security
--
-- RLS ativo em todas as tabelas. Além da política permissiva original
-- ("authenticated full access ... using (true)"), a migração 2026-08
-- adicionou uma política RESTRICTIVE por tabela: o usuário precisa
-- estar em `usuarios` (allowlist via is_socia()). Signup público deve
-- permanecer DESABILITADO no painel do Supabase.
--
-- Políticas, triggers (protege_ajuste_caixa) e a RPC aprovar_ajuste
-- vigentes estão em docs/migracao-2026-08/ — não duplicar aqui.
-- ═══════════════════════════════════════════════════════════════
