-- ═══════════════════════════════════════════════════════════════
-- PASSO 4 — BACKFILL do "a receber" legado.
--
-- ⚠️ RODE SÓ DEPOIS de conferir com a Fer a lista da consulta 0.5 do
-- diagnóstico — são exatamente esses contratos que ganharão a entrada.
-- Contrato já quitado com a_receber desatualizado não deve entrar:
--   update contratos set a_receber = 0 where id = <id>;
--
-- Cria UMA entrada "A Receber" por contrato legado com o saldo da
-- coluna antiga contratos.a_receber (sem data — não entra no fluxo
-- mensal nem em "próximos 30 dias"). Idempotente: quem já ganhou a
-- entrada não entra de novo.
--
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

-- Verificação: no app, o KPI "Projetos a Receber" passa a incluir esses
-- contratos, com os mesmos valores da lista 0.5.
