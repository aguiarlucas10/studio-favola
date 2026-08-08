-- ═══════════════════════════════════════════════════════════════
-- PASSO 0 — DIAGNÓSTICO (só leitura; não muda nada no banco)
--
-- ⚠️ RODE CADA CONSULTA SEPARADAMENTE: selecione o bloco da consulta
-- no editor e clique em Run — se rodar o arquivo inteiro, o Supabase
-- só mostra o resultado da última. Guarde (print) cada resultado.
-- ═══════════════════════════════════════════════════════════════

-- 0.1 A migração antiga de ajustes_caixa já rodou?
--     Esperado: solicitado_por_id e aprovado_por_id na lista.
select column_name, data_type
from information_schema.columns
where table_schema='public' and table_name='ajustes_caixa'
order by ordinal_position;

-- 0.2 Triggers atuais de ajustes_caixa
select tgname, pg_get_triggerdef(oid)
from pg_trigger
where tgrelid='public.ajustes_caixa'::regclass and not tgisinternal;

-- 0.3 Políticas RLS atuais por tabela
select tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname='public'
order by tablename, policyname;

-- 0.4 Contagens (dimensiona o antigo corte de 500/800 registros)
select 'entradas' as tabela, count(*) from entradas
union all select 'saidas', count(*) from saidas
union all select 'contratos', count(*) from contratos
union all select 'rt_comissoes', count(*) from rt_comissoes;

-- 0.5 ⭐ Contratos legados que receberão o backfill do passo 04.
--     CONFIRA ESTA LISTA COM A FER antes de rodar o passo 04 —
--     contrato já quitado com a_receber desatualizado não deve entrar
--     (se houver algum, zere antes: update contratos set a_receber = 0 where id = <id>).
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

-- 0.6 Formatos de mes_ano em uso (entradas)
select mes_ano, count(*) from entradas group by mes_ano order by count(*) desc;

-- 0.6b Formatos de mes_ano em uso (saidas)
select mes_ano, count(*) from saidas group by mes_ano order by count(*) desc;

-- 0.7 ⭐ Colunas REAIS das tabelas financeiras (investiga o bug do
--     botão "Duplicar" — procure is_generated = ALWAYS ou is_identity
--     = YES fora do id). REPORTE ESTE RESULTADO.
select table_name, column_name, data_type, is_identity, is_generated, column_default
from information_schema.columns
where table_schema='public'
  and table_name in ('entradas','saidas','rt_comissoes','contratos')
order by table_name, ordinal_position;

-- 0.7b Constraints reais (mesma investigação). REPORTE ESTE RESULTADO.
select conrelid::regclass as tabela, conname, pg_get_constraintdef(oid) as definicao
from pg_constraint
where connamespace = 'public'::regnamespace
  and conrelid::regclass::text in ('entradas','saidas','rt_comissoes','contratos')
order by 1, 2;

-- 0.8 mes_ano inválido de importações CSV antigas (preview do passo 04b;
--     se voltar vazio, o passo 04b pode ser pulado)
select 'entradas' as tabela, id, data_pagamento, mes_ano, obs
from entradas
where mes_ano is not null
  and mes_ano !~ '^(\d{1,2}/\d{1,2}/\d{4}|\d{4}-\d{2}|\d{4}/\d{2}|\d{2}/\d{4})$'
union all
select 'saidas', id, data_pagamento, mes_ano, obs
from saidas
where mes_ano is not null
  and mes_ano !~ '^(\d{1,2}/\d{1,2}/\d{4}|\d{4}-\d{2}|\d{4}/\d{2}|\d{2}/\d{4})$';

-- 0.9 ⭐ Pré-requisito do passo 02 (allowlist): as DUAS sócias precisam
--     aparecer aqui. Se faltar alguma, NÃO rode o 02 antes de inseri-la.
select u.id, u.nome, au.email
from usuarios u
left join auth.users au on au.id = u.id;
