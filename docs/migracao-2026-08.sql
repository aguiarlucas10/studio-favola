-- ═══════════════════════════════════════════════════════════════
-- Studio Favola — MIGRAÇÃO 2026-08
-- Rodar no SQL Editor do Supabase (https://supabase.com/dashboard),
-- projeto cvymqbjaxtricwimusld, SEÇÃO POR SEÇÃO, na ordem.
--
-- • Seção 0 é só leitura (diagnóstico) — rode primeiro e confira.
-- • Seções 1–5 são idempotentes: rodar duas vezes não duplica nada.
-- • Nada aqui apaga ou altera dados existentes, exceto a Seção 4b
--   (corrige mes_ano inválido de importações CSV antigas — com preview).
--
-- AÇÃO FORA DO SQL (painel do Supabase):
--   Authentication → Sign In / Providers → DESATIVAR "Allow new users
--   to sign up". Sem isso, qualquer pessoa na internet pode criar conta
--   e (antes da Seção 2) acessar todo o financeiro.
--   Confira também em Authentication → Users que só existem as contas
--   das duas sócias.
-- ═══════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════
-- SEÇÃO 0 — DIAGNÓSTICO (só SELECTs; rode e confira os resultados)
-- ═══════════════════════════════════════════════════════════════

-- 0.1 A migração antiga de ajustes_caixa já rodou?
--     Esperado: as colunas solicitado_por_id e aprovado_por_id na lista.
--     Se NÃO aparecerem, o "Ajuste de Caixa" está quebrado em produção
--     hoje (o app grava solicitado_por_id em todo insert) — a Seção 1
--     corrige.
select column_name, data_type
from information_schema.columns
where table_schema='public' and table_name='ajustes_caixa'
order by ordinal_position;

-- 0.2 Triggers atuais de ajustes_caixa (esperado: trg_bloqueia_auto_aprovacao
--     se a migração antiga rodou; a Seção 3 substitui por uma versão mais forte)
select tgname, pg_get_triggerdef(oid)
from pg_trigger
where tgrelid='public.ajustes_caixa'::regclass and not tgisinternal;

-- 0.3 Políticas RLS atuais por tabela
select tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname='public'
order by tablename, policyname;

-- 0.4 Contagens (o app hoje carrega no máximo 500 entradas / 800 saídas;
--     se os números abaixo se aproximarem disso, o corte silencioso do
--     histórico já é real — a correção no app remove o limite)
select 'entradas' as tabela, count(*) from entradas
union all select 'saidas', count(*) from saidas
union all select 'contratos', count(*) from contratos
union all select 'rt_comissoes', count(*) from rt_comissoes;

-- 0.5 Contratos legados que receberão o backfill da Seção 4
--     (têm a_receber digitado > 0 e nenhuma parcela pendente gerada).
--     CONFIRA ESTA LISTA COM AS SÓCIAS antes de rodar a Seção 4 —
--     contrato já quitado com a_receber desatualizado não deve entrar
--     (se houver algum, zere o a_receber dele antes:
--      update contratos set a_receber = 0 where id = <id>).
select c.id, c.nome_contrato, c.status, c.valor_contrato, c.a_receber
from contratos c
where coalesce(c.a_receber,0) > 0
  and c.status not in ('Finalizado','Descontinuado')
  and not exists (
    select 1 from entradas e
    where e.contrato_id = c.id
      and e.status <> 'Pago'
      and coalesce(e.tipo_entrada,'') <> 'rt'
  )
order by c.nome_contrato;

-- 0.6 Formatos de mes_ano em uso (confere se a normalização do app cobre tudo)
select mes_ano, count(*) from entradas group by mes_ano order by count(*) desc;
select mes_ano, count(*) from saidas   group by mes_ano order by count(*) desc;

-- 0.7 Colunas e constraints REAIS das tabelas financeiras.
--     Motivo: o schema documentado foi inferido do código, e o botão
--     "Duplicar" falha com erro que o app esconde — procure aqui por
--     colunas geradas (is_generated = ALWAYS / is_identity = YES além
--     do id) e constraints CHECK/UNIQUE que a duplicação possa violar.
--     REPORTE O RESULTADO para ajustar o app.
select table_name, column_name, data_type, is_identity, is_generated, column_default
from information_schema.columns
where table_schema='public'
  and table_name in ('entradas','saidas','rt_comissoes','contratos')
order by table_name, ordinal_position;

select conrelid::regclass as tabela, conname, pg_get_constraintdef(oid) as definicao
from pg_constraint
where connamespace = 'public'::regnamespace
  and conrelid::regclass::text in ('entradas','saidas','rt_comissoes','contratos')
order by 1, 2;

-- 0.8 mes_ano inválido gravado por importações CSV antigas (ex: '01/08/15',
--     com o DIA no lugar do ano). Estes registros somem do fluxo mensal.
--     A Seção 4b corrige a partir de data_pagamento.
select 'entradas' as tabela, id, data_pagamento, mes_ano, obs
from entradas
where mes_ano is not null
  and mes_ano !~ '^(\d{1,2}/\d{1,2}/\d{4}|\d{4}-\d{2}|\d{4}/\d{2}|\d{2}/\d{4})$'
union all
select 'saidas', id, data_pagamento, mes_ano, obs
from saidas
where mes_ano is not null
  and mes_ano !~ '^(\d{1,2}/\d{1,2}/\d{4}|\d{4}-\d{2}|\d{4}/\d{2}|\d{2}/\d{4})$';


-- ═══════════════════════════════════════════════════════════════
-- SEÇÃO 1 — Colunas de identidade em ajustes_caixa (migração antiga,
-- segura de rodar mesmo se já aplicada)
-- ═══════════════════════════════════════════════════════════════

alter table ajustes_caixa add column if not exists solicitado_por_id uuid;
alter table ajustes_caixa add column if not exists aprovado_por_id   uuid;


-- ═══════════════════════════════════════════════════════════════
-- SEÇÃO 2 — ALLOWLIST: só quem está em `usuarios` acessa os dados.
--
-- Hoje a política é "qualquer usuário autenticado tem acesso total".
-- Com signup público ligado (padrão do Supabase), qualquer pessoa
-- poderia criar conta e ler/editar tudo. As políticas RESTRICTIVE
-- abaixo fazem AND com a política permissiva existente: além de
-- autenticado, o usuário precisa existir na tabela `usuarios`.
--
-- IMPORTANTE: confirme antes que as duas sócias estão em `usuarios`
-- (select * from usuarios) — senão elas próprias perdem acesso.
-- ═══════════════════════════════════════════════════════════════

-- security definer: a checagem lê `usuarios` sem depender da RLS da
-- própria tabela (evita recursão de política).
create or replace function public.is_socia()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from usuarios where id = auth.uid());
$$;

grant execute on function public.is_socia() to authenticated;

do $$
declare t text;
begin
  foreach t in array array['usuarios','contratos','entradas','saidas',
                           'rt_comissoes','fluxo_caixa','contas_bancarias','ajustes_caixa']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists socia_only on %I', t);
    execute format(
      'create policy socia_only on %I as restrictive for all to authenticated using (is_socia()) with check (is_socia())', t);
  end loop;
end $$;

-- Verificação: logado no app, tudo continua funcionando; deslogado
-- (ou com uma conta fora de `usuarios`), nenhuma tabela retorna dados.


-- ═══════════════════════════════════════════════════════════════
-- SEÇÃO 3 — Dupla aprovação de ajuste de caixa: proteção completa.
--
-- O trigger antigo (bloqueia_auto_aprovacao) só rodava em UPDATE e não
-- amarrava os IDs ao usuário logado — dava para inserir um ajuste já
-- aprovado, aprovar em nome da outra sócia, ou abrir pedido em nome
-- dela. Esta versão cobre INSERT e UPDATE e exige auth.uid().
--
-- Obs.: rodar INSERT/UPDATE em ajustes_caixa direto pelo SQL Editor
-- passa a ser bloqueado (auth.uid() é nulo lá) — é intencional.
-- ═══════════════════════════════════════════════════════════════

create or replace function public.protege_ajuste_caixa()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if coalesce(new.status,'pendente') <> 'pendente' then
      raise exception 'Um novo ajuste deve nascer pendente.';
    end if;
    new.status := 'pendente';
    new.aprovado_por_id := null;
    if new.solicitado_por_id is null or new.solicitado_por_id is distinct from auth.uid() then
      raise exception 'O solicitante do ajuste deve ser o próprio usuário logado.';
    end if;
    return new;
  end if;

  -- UPDATE
  if new.solicitado_por_id is distinct from old.solicitado_por_id then
    raise exception 'O solicitante de um ajuste não pode ser alterado.';
  end if;
  if old.status <> 'pendente' then
    raise exception 'Um ajuste já decidido não pode ser alterado.';
  end if;
  if new.status in ('aprovado','rejeitado') then
    if new.aprovado_por_id is null or new.aprovado_por_id is distinct from auth.uid() then
      raise exception 'A decisão deve ser registrada pelo próprio usuário logado.';
    end if;
    if new.aprovado_por_id = new.solicitado_por_id then
      raise exception 'Quem solicitou o ajuste não pode aprová-lo ou rejeitá-lo.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_bloqueia_auto_aprovacao on ajustes_caixa;
drop trigger if exists trg_protege_ajuste_caixa on ajustes_caixa;
create trigger trg_protege_ajuste_caixa
  before insert or update on ajustes_caixa
  for each row execute function protege_ajuste_caixa();


-- ═══════════════════════════════════════════════════════════════
-- SEÇÃO 4 — BACKFILL do "a receber" legado.
--
-- O app passou a calcular o "A Receber" de cada contrato somando as
-- parcelas (entradas) pendentes. Contratos criados antes disso não têm
-- parcelas — sem este backfill, o dashboard mostraria R$ 0 para eles.
-- Cria UMA entrada "A Receber" por contrato legado com o saldo da
-- coluna antiga `contratos.a_receber` (sem data — não entra no fluxo
-- mensal nem em "próximos 30 dias"; some do cálculo quando for marcada
-- como Pago ou substituída por parcelas reais).
--
-- ⚠️ RODE SÓ DEPOIS de conferir a lista do item 0.5 com as sócias.
-- Idempotente: contratos que já ganharam a entrada não entram de novo.
-- REVERSÃO (se precisar):
--   delete from entradas where obs = '[Backfill saldo legado]';
-- ═══════════════════════════════════════════════════════════════

insert into entradas (contrato_id, nome_contrato, cliente, tipo_entrada,
                      valor, conta, status, obs)
select c.id, c.nome_contrato, c.cliente, 'projeto',
       c.a_receber, c.conta, 'A Receber', '[Backfill saldo legado]'
from contratos c
where coalesce(c.a_receber,0) > 0
  and c.status not in ('Finalizado','Descontinuado')
  and not exists (
    select 1 from entradas e
    where e.contrato_id = c.id
      and e.status <> 'Pago'
      and coalesce(e.tipo_entrada,'') <> 'rt'
  );


-- ═══════════════════════════════════════════════════════════════
-- SEÇÃO 4b — Corrige mes_ano inválido de importações CSV antigas
-- (bug corrigido no app: gravava '01/MM/DD' com o dia no lugar do ano).
-- Deriva o valor correto de data_pagamento. Só toca linhas com formato
-- inválido E data preenchida — confira o preview no item 0.8 antes.
-- ═══════════════════════════════════════════════════════════════

update entradas
set mes_ano = '01/' || to_char(data_pagamento, 'MM/YYYY')
where mes_ano is not null
  and mes_ano !~ '^(\d{1,2}/\d{1,2}/\d{4}|\d{4}-\d{2}|\d{4}/\d{2}|\d{2}/\d{4})$'
  and data_pagamento is not null;

update saidas
set mes_ano = '01/' || to_char(data_pagamento, 'MM/YYYY')
where mes_ano is not null
  and mes_ano !~ '^(\d{1,2}/\d{1,2}/\d{4}|\d{4}-\d{2}|\d{4}/\d{2}|\d{2}/\d{4})$'
  and data_pagamento is not null;


-- ═══════════════════════════════════════════════════════════════
-- SEÇÃO 5 — RPC de aprovação atômica.
--
-- Aprova o ajuste E lança a entrada/saída de conciliação NA MESMA
-- TRANSAÇÃO. Elimina os dois riscos do fluxo em duas etapas feito
-- pelo app: ajuste aplicado duas vezes (lançou mas não marcou
-- aprovado) e aprovado sem lançar. O app chama via
-- db.rpc('aprovar_ajuste', { p_id }).
-- ═══════════════════════════════════════════════════════════════

create or replace function public.aprovar_ajuste(p_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  a      ajustes_caixa%rowtype;
  v_uid  uuid := auth.uid();
  v_nome text;
  v_data date;
  v_mes  text;
begin
  if v_uid is null then
    raise exception 'Não autenticado.';
  end if;

  select * into a from ajustes_caixa where id = p_id for update;
  if not found then
    raise exception 'Ajuste não encontrado.';
  end if;
  if a.status <> 'pendente' then
    raise exception 'Este ajuste já foi decidido.';
  end if;
  if a.solicitado_por_id is not null and a.solicitado_por_id = v_uid then
    raise exception 'Quem solicitou o ajuste não pode aprová-lo.';
  end if;
  if coalesce(a.diferenca, 0) = 0 then
    raise exception 'Ajuste sem diferença a aplicar.';
  end if;

  select nome into v_nome from usuarios where id = v_uid;
  v_nome := coalesce(v_nome, 'sócia');
  -- data local de Brasília, não UTC (após as 21h o dia UTC já virou)
  v_data := coalesce(a.data_referencia, (now() at time zone 'America/Sao_Paulo')::date);
  v_mes  := '01/' || to_char(v_data, 'MM/YYYY');

  if a.diferenca > 0 then
    insert into entradas (nome_contrato, cliente, tipo_entrada, valor,
                          data_pagamento, conta, forma_pagto, status, mes_ano, obs)
    values (null, null, 'ajuste de caixa', a.diferenca,
            v_data, 'jurídica', 'Ajuste', 'Pago', v_mes,
            '[Ajuste de Caixa] ' || coalesce(a.motivo,'')
              || ' · aprovado por ' || coalesce(a.solicitado_por,'?') || ' e ' || v_nome);
  else
    insert into saidas (tipo_saida, descricao, valor, data_pagamento,
                        conta, socia, status, mes_ano, obs)
    values ('ajuste de caixa', '[Ajuste de Caixa] ' || coalesce(a.motivo,'Conciliação'),
            abs(a.diferenca), v_data, 'jurídica', 'Ambas', 'Pago', v_mes,
            'Aprovado por ' || coalesce(a.solicitado_por,'?') || ' e ' || v_nome);
  end if;

  update ajustes_caixa
  set status = 'aprovado', aprovado_por = v_nome,
      aprovado_por_id = v_uid, updated_at = now()
  where id = p_id;
end;
$$;

grant execute on function public.aprovar_ajuste(bigint) to authenticated;
revoke execute on function public.aprovar_ajuste(bigint) from anon, public;


-- ═══════════════════════════════════════════════════════════════
-- VERIFICAÇÃO FINAL (depois de rodar tudo)
--
-- 1. Abrir o app logado: todas as abas carregam normalmente.
-- 2. Console do navegador (F12), logado, tentar burlar a aprovação:
--      await db.from('ajustes_caixa').insert({ valor_novo: 1, status: 'aprovado' })
--    → deve falhar com o erro do trigger.
-- 3. Aba anônima, sem login: o app não mostra dado nenhum.
-- 4. Dashboard: KPI "Projetos a Receber" agora inclui os contratos
--    legados listados no item 0.5.
-- ═══════════════════════════════════════════════════════════════
